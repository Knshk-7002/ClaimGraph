# Algorithms in ClaimGraph

This document is a short DAA write-up of the algorithms that power
ClaimGraph. The codebase implements every algorithm by hand (no NetworkX) so
that the pipeline from data structure to topological sort to confidence
propagation is fully visible.

All algorithms operate on the **dependency subgraph** of the ClaimGraph.
`supports` and `contradicts` edges are stored separately and are *not*
constrained to be acyclic.

In what follows `V` is the number of claims and `E` is the number of
`depends_on` edges.

## Graph orientation

A `DEPENDS_ON` edge `source -> target` semantically means *"the source claim
rests on the target claim"*. For topological work we want the order
*prerequisite then dependent*, so the algorithm modules use the
**prerequisite-to-dependent adjacency**:

```
ClaimGraph.dependency_adjacency()
   -> { prerequisite : [dependent, ...] }
```

A topological sort over this view therefore yields an order in which every
prerequisite appears before any claim that uses it.

## 1. Kahn's algorithm (in-degree topological sort)

`claimgraph.algorithms.kahn_topological_sort`

```
1.  compute in-degree for every node
2.  queue <- all nodes with in-degree 0  (sorted for determinism)
3.  while queue is not empty:
        n = queue.pop_front()
        order.append(n)
        for each neighbour m of n:
            in_degree[m] -= 1
            if in_degree[m] == 0: queue.push_back(m)
4.  if len(order) != V: there is a cycle.
```

* **Complexity:** `O(V + E)` time, `O(V)` extra space.
* **Determinism:** we sort the initial roots and the per-node neighbour
  list before pushing, so the function is a pure function of the graph
  structure.
* **Use in ClaimGraph:** primary ordering used by the confidence engine.

## 2. DFS topological sort with white / gray / black coloring

`claimgraph.algorithms.dfs_topological_sort`

```
WHITE = unvisited, GRAY = on the current DFS stack, BLACK = finished
visit(n):
    color[n] = GRAY
    push n onto stack
    for each neighbour m of n:
        if color[m] == GRAY: cycle detected (n -> m is a back edge)
        elif color[m] == WHITE: visit(m)
    pop n from stack
    color[n] = BLACK
    append n to output
output is reversed at the end -> topological order
```

* **Complexity:** `O(V + E)` time, `O(V)` extra space (recursion stack +
  color array).
* **Cycle handling:** as soon as a `GRAY` neighbour is found we walk the
  current stack back to that node and report it as the witness cycle (used
  in the error message).
* **Use in ClaimGraph:** alternate ordering API and the workhorse for
  `has_cycle`.

## 3. Cycle prevention on edge insertion

`claimgraph.graph.ClaimGraph._would_create_cycle`

Before inserting `DEPENDS_ON source -> target` we ask: is there already a
prerequisite-to-dependent path `target ~> source` in the current DAG? If
yes, the new edge would close a cycle. Implemented as a single DFS / BFS
over the prerequisite-to-dependent adjacency starting from `target`,
short-circuiting if we hit `source`.

* **Complexity:** `O(V + E)`.

This guarantees the graph stored in the system is *always* a DAG, so every
other algorithm can assume so.

## 4. Longest path to a target (critical reasoning chain)

`claimgraph.algorithms.longest_path_to`

Longest path is NP-hard on general graphs, but trivial on DAGs: process
nodes in topological order and relax outgoing edges.

```
order = kahn_topological_sort(graph)
dist[v] = 0; parent[v] = None  for every v
for v in order:
    for u in dependents(v):
        if dist[v] + 1 > dist[u]:
            dist[u] = dist[v] + 1
            parent[u] = v
# reconstruct from parent[] starting at target
```

* **Complexity:** `O(V + E)` time, `O(V)` extra space.
* **Use in ClaimGraph:** the UI's "longest reasoning chain" button - the
  deepest sequence of claims one must trust before trusting the selected
  claim.

## 5. All paths to a target

`claimgraph.algorithms.all_paths_to`

A depth-first traversal of the dependent-to-prerequisite adjacency
starting at the target, accumulating each completed path that hits a root.

* **Complexity:** `O(V + E + sum_of_path_lengths)`. For the small graphs
  ClaimGraph deals with (hackathon / classroom scale) this is fine; on
  pathological dense DAGs the number of paths can be exponential and a
  caller would want to switch to path-counting DP instead.

## 6. Transitive dependencies (reachability)

`claimgraph.algorithms.transitive_dependencies`

A breadth-first traversal of the dependent-to-prerequisite adjacency.

* **Complexity:** `O(V + E)`.
* **Use in ClaimGraph:** "this claim ultimately depends on these N claims".

## 7. Confidence propagation in topological order

`claimgraph.confidence.compute_confidences`

The full pipeline that ties the DAG to the application semantics:

```
intrinsic(c)  = tanh( sum( sign(e) * strength(e) * source_quality(e) for e in evidence_of(c) ) )

for c in topological_order:                          # Kahn order
    if c has prerequisites P:
        prereq_mean = mean( final(p) for p in P )
        final(c)    = alpha * intrinsic(c) + (1 - alpha) * prereq_mean
    else:
        final(c)    = intrinsic(c)
```

Visiting in topological order guarantees that `final(p)` is computed for
every prerequisite `p` *before* it is needed by any of its dependents -
which is precisely why this engine *requires* a topological sort.

* **Complexity:** `O(V + E)` time, dominated by the sort.
* `alpha` is a tunable knob in `[0, 1]` (default `0.7`); higher values
  weight a claim's own evidence more, lower values weight its
  prerequisites more.
* The final value is clamped to `[-1, 1]` so a long chain of mildly
  supportive prerequisites cannot drive a claim's confidence outside the
  natural bounds.

## Summary of asymptotic costs

| operation                                 | time     | space   |
|-------------------------------------------|----------|---------|
| Kahn topological sort                     | `O(V+E)` | `O(V)`  |
| DFS topological sort                      | `O(V+E)` | `O(V)`  |
| cycle detection / `has_cycle`             | `O(V+E)` | `O(V)`  |
| `_would_create_cycle` (per edge add)      | `O(V+E)` | `O(V)`  |
| longest reasoning chain to a claim        | `O(V+E)` | `O(V)`  |
| transitive dependencies                   | `O(V+E)` | `O(V)`  |
| confidence propagation                    | `O(V+E)` | `O(V)`  |

All operations are linear in the size of the dependency DAG - the
ClaimGraph is built so that "ask any reasoning question" stays linear-time
even as the graph grows.
