"""ClaimGraph - a DAG-based knowledge structure for claims and evidence.

The package is organised around three concerns:

* ``models``      - immutable data carriers (Claim, Evidence, Edge).
* ``graph``       - the in-memory ClaimGraph (nodes + typed edge sets).
* ``algorithms``  - graph algorithms that operate on the dependency DAG:
                    topological sort (Kahn + DFS), cycle detection, longest
                    path, all-paths, transitive closure.
* ``confidence``  - evidence aggregation and topo-order confidence
                    propagation.
* ``storage``     - JSON load / save of a whole graph.
* ``api``         - Flask blueprint exposing the graph over HTTP.

The dependency subgraph is always a DAG; support and contradiction edges may
form arbitrary graphs.
"""

from .models import Claim, Evidence, Edge, EdgeType, EvidenceDirection
from .graph import ClaimGraph, CycleError
from .algorithms import (
    kahn_topological_sort,
    dfs_topological_sort,
    has_cycle,
    longest_path_to,
    all_paths_to,
    transitive_dependencies,
)
from .confidence import compute_confidences, intrinsic_confidence

__all__ = [
    "Claim",
    "Evidence",
    "Edge",
    "EdgeType",
    "EvidenceDirection",
    "ClaimGraph",
    "CycleError",
    "kahn_topological_sort",
    "dfs_topological_sort",
    "has_cycle",
    "longest_path_to",
    "all_paths_to",
    "transitive_dependencies",
    "compute_confidences",
    "intrinsic_confidence",
]
