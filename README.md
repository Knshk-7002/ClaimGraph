# ClaimGraph

> Knowledge is not a list of facts. Knowledge is a network of claims
> supported or challenged by evidence.

ClaimGraph is a small system that treats knowledge as a **DAG of claims and
evidence** and computes a confidence score for every claim by propagating
evidence along the DAG **in topological order**.

The interesting part of the project is the **DAG engine** (the "DAA core"):

- a hand-rolled `ClaimGraph` data structure that keeps the dependency
  subgraph acyclic by construction,
- two textbook topological sorts (Kahn and DFS coloring), both `O(V + E)`,
- DAG longest-path used to surface the deepest reasoning chain behind any
  claim,
- transitive dependency reachability and full path enumeration,
- a confidence propagation pass that is *itself* a topological-order
  dynamic program.

See [`docs/ALGORITHMS.md`](docs/ALGORITHMS.md) for the full DAA write-up
with pseudocode and complexities.

## Demo

```bash
pip install -r requirements.txt
python app.py
# then open http://127.0.0.1:5000
```

Use the **Dataset** dropdown in the header to try one of three sample
graphs:

- `remote_work` - the "does remote work reduce productivity?" walkthrough
  from the project brief.
- `intermittent_fasting` - whether IF improves insulin sensitivity.
- `ai_hallucinations` - whether LLMs hallucinate more when trained on
  synthetic data.

In the UI you can:

- click any node to see its evidence, intrinsic vs propagated confidence,
  prerequisites, dependents, and every reasoning path leading to it;
- add new claims, evidence, and edges - confidences re-propagate live;
- click **Show topo order** to highlight nodes in Kahn order;
- click **Longest reasoning chain** on a selected node to see its longest
  prerequisite path.

`depends_on` edges are validated: an edge that would create a cycle is
rejected with a clear error, both at the API layer and in the UI.

## Layout

```
ClaimGraph/
  app.py                     # Flask dev server entry point
  claimgraph/
    models.py                # Claim, Evidence, Edge, EdgeType, EvidenceDirection
    graph.py                 # ClaimGraph - DAG container, cycle-safe edge adds
    algorithms.py            # DAA core: Kahn / DFS / longest-path / paths /
                             # transitive deps / level assignment
    confidence.py            # evidence -> intrinsic score, then topo-order propagation
    storage.py               # JSON load / save for whole graphs
    api.py                   # Flask blueprint + JSON HTTP layer
  static/                    # index.html + style.css + app.js (Cytoscape.js UI)
  data/                      # sample graphs (one JSON file each)
  tests/                     # pytest suites (models / graph / algorithms / storage / api)
  docs/ALGORITHMS.md         # DAA write-up: pseudocode + complexities
```

## API

| method | path                                  | what it does                                      |
|--------|---------------------------------------|---------------------------------------------------|
| GET    | `/api/health`                         | liveness probe                                    |
| GET    | `/api/datasets`                       | list sample dataset names                         |
| POST   | `/api/load/<name>`                    | replace the in-memory graph with a sample dataset |
| POST   | `/api/reset`                          | empty the in-memory graph                         |
| GET    | `/api/graph`                          | full graph + confidences + Kahn order + levels    |
| POST   | `/api/claims`                         | add a claim                                       |
| DELETE | `/api/claims/<claim_id>`              | remove a claim and its evidence / edges           |
| POST   | `/api/evidence`                       | attach an evidence unit to a claim                |
| DELETE | `/api/evidence/<evidence_id>`         | remove an evidence unit                           |
| POST   | `/api/edges`                          | add a typed edge (returns `409` on cycle)         |
| DELETE | `/api/edges`                          | remove a typed edge                               |
| GET    | `/api/topo`                           | Kahn topological order                            |
| GET    | `/api/topo/dfs`                       | DFS topological order                             |
| GET    | `/api/longest-path/<claim_id>`        | longest dependency chain to a claim               |
| GET    | `/api/paths/<claim_id>`               | all dependency paths from roots to a claim        |
| GET    | `/api/dependencies/<claim_id>`        | transitive prerequisites of a claim               |

## Algorithms at a glance

| operation                                 | implementation                            | complexity |
|-------------------------------------------|-------------------------------------------|------------|
| topological sort (primary)                | Kahn (in-degree BFS)                      | `O(V + E)` |
| topological sort (alternate)              | DFS coloring (white / gray / black)       | `O(V + E)` |
| cycle detection on edge insertion         | reachability BFS                          | `O(V + E)` |
| longest reasoning chain to a claim        | topological-order DAG DP                  | `O(V + E)` |
| all reasoning paths to a claim            | depth-first enumeration                   | linear in output |
| transitive dependencies                   | BFS over prerequisite adjacency           | `O(V + E)` |
| confidence propagation                    | tanh of weighted evidence + topo-order DP | `O(V + E)` |

Full pseudocode + space costs in [`docs/ALGORITHMS.md`](docs/ALGORITHMS.md).

## Confidence model

Each claim's confidence is in `[-1, 1]` (`+1` strongly supported, `0`
neutral, `-1` strongly contradicted).

1. **Intrinsic confidence** from a claim's own evidence:
   `tanh( sum_e sign(e) * strength(e) * source_quality(e) )`
   - `sign(e)` is `+1` for supporting and `-1` for contradicting evidence;
   - `tanh` keeps the result in `[-1, 1]` and saturates as more evidence
     piles on.
2. **Final confidence** blends the intrinsic score with the mean final
   confidence of its prerequisites:
   `final(c) = alpha * intrinsic(c) + (1 - alpha) * mean(final(p) for p in prereqs(c))`
   - `alpha` defaults to `0.7`;
   - root claims get `final = intrinsic` (no prerequisites).

Because the second step needs *prerequisites first*, the engine **requires
a topological sort** - that's the DAG / topo-sort backbone of the project.

## Running the tests

```bash
pip install -r requirements-dev.txt
pytest -v
```

The suite covers:

- the data models (validation + round-trip),
- the `ClaimGraph` container (cycle guard, edge / claim / evidence
  lifecycle),
- the algorithms (Kahn, DFS, longest path, transitive deps, propagation),
- JSON storage round-trips on the shipped sample datasets,
- the Flask API (graph endpoint, cycle rejection with `409`, reasoning
  paths, dataset loader).

## License

Apache-2.0 - see [`LICENSE`](LICENSE).
