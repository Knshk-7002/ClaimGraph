"""DAG algorithms powering ClaimGraph.

Every algorithm in this module is implemented from scratch (no NetworkX) to
make the DAA content of the project explicit. All algorithms run in
``O(V + E)`` time over the dependency DAG.

* :func:`kahn_topological_sort` - BFS-style topological sort by in-degree.
* :func:`dfs_topological_sort`  - DFS-based topological sort with white /
  gray / black coloring (also returns a cycle witness if one exists).
* :func:`has_cycle`             - cycle detection on the dependency
  subgraph (uses the DFS coloring routine).
* :func:`longest_path_to`       - longest path to a target node in the DAG
  using topological-order DP.
* :func:`all_paths_to`          - enumerate every path from a root to a
  target claim (depth-first).
* :func:`transitive_dependencies` - reachability over the
  dependent-to-prerequisite adjacency.

All public functions take a :class:`~claimgraph.graph.ClaimGraph` and never
mutate it.
"""

from __future__ import annotations

from collections import deque
from typing import Iterable

from .graph import ClaimGraph


# --------------------------------------------------------------------------- #
# Topological sorts                                                           #
# --------------------------------------------------------------------------- #
def kahn_topological_sort(graph: ClaimGraph) -> list[str]:
    """Kahn's algorithm: BFS over a queue of zero-in-degree nodes.

    Returns the claim ids in an order such that every dependency precedes
    its dependents. Raises :class:`ValueError` if the dependency subgraph
    contains a cycle (which the :class:`~claimgraph.graph.ClaimGraph` API
    normally prevents, but the algorithm is defensive).

    Complexity: ``O(V + E)``.
    """
    adj = graph.dependency_adjacency()
    in_degree: dict[str, int] = {node: 0 for node in adj}
    for node, neighbors in adj.items():
        for nb in neighbors:
            in_degree[nb] += 1

    # Stable order: insert sorted root claim ids so the output is deterministic.
    queue: deque[str] = deque(sorted(n for n, d in in_degree.items() if d == 0))
    order: list[str] = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for nb in sorted(adj.get(node, ())):
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                queue.append(nb)

    if len(order) != len(adj):
        raise ValueError("dependency graph contains a cycle (Kahn)")
    return order


# Colors for DFS-based topo sort
_WHITE, _GRAY, _BLACK = 0, 1, 2


def dfs_topological_sort(graph: ClaimGraph) -> list[str]:
    """DFS-based topological sort using white / gray / black coloring.

    Equivalent in output to :func:`kahn_topological_sort` (modulo tie
    breaking). Raises :class:`ValueError` with a cycle witness if one is
    found.

    Complexity: ``O(V + E)``.
    """
    adj = graph.dependency_adjacency()
    color: dict[str, int] = {n: _WHITE for n in adj}
    order: list[str] = []
    cycle_path: list[str] = []

    def visit(node: str, stack: list[str]) -> None:
        color[node] = _GRAY
        stack.append(node)
        for nb in sorted(adj.get(node, ())):
            if color[nb] == _GRAY:
                # Found a back edge -> cycle. Record the witness and stop.
                idx = stack.index(nb)
                cycle_path[:] = stack[idx:] + [nb]
                raise _CycleFound
            if color[nb] == _WHITE:
                visit(nb, stack)
        stack.pop()
        color[node] = _BLACK
        order.append(node)

    try:
        for node in sorted(adj):
            if color[node] == _WHITE:
                visit(node, [])
    except _CycleFound:
        raise ValueError(
            "dependency graph contains a cycle (DFS): "
            + " -> ".join(cycle_path)
        )

    order.reverse()
    return order


class _CycleFound(Exception):
    """Internal control-flow exception used to unwind a DFS on cycle hit."""


def has_cycle(graph: ClaimGraph) -> bool:
    """Return True iff the dependency subgraph contains a cycle.

    Uses the DFS coloring algorithm; runs in ``O(V + E)``.
    """
    try:
        dfs_topological_sort(graph)
    except ValueError:
        return True
    return False


# --------------------------------------------------------------------------- #
# Longest path / reasoning chain                                              #
# --------------------------------------------------------------------------- #
def longest_path_to(graph: ClaimGraph, target: str) -> list[str]:
    """Longest dependency path ending at ``target``.

    Classic DAG longest-path algorithm: relax edges in topological order.
    Returns the sequence of claim ids from a root (no dependencies) down to
    ``target``. Complexity: ``O(V + E)``.
    """
    if not graph.has_claim(target):
        raise KeyError(f"unknown claim: {target}")

    order = kahn_topological_sort(graph)
    adj = graph.dependency_adjacency()

    # dist[node] = length of longest path from any root ending at node
    dist: dict[str, int] = {n: 0 for n in order}
    parent: dict[str, str | None] = {n: None for n in order}

    for node in order:
        for nb in adj.get(node, ()):
            if dist[node] + 1 > dist[nb]:
                dist[nb] = dist[node] + 1
                parent[nb] = node

    path: list[str] = []
    cur: str | None = target
    while cur is not None:
        path.append(cur)
        cur = parent[cur]
    path.reverse()
    return path


def all_paths_to(graph: ClaimGraph, target: str) -> list[list[str]]:
    """Every dependency path from a root claim down to ``target``.

    A root is a claim with no incoming dependency edges (no prerequisites
    of its own). Returned paths are oriented prerequisite -> ... -> target.

    Complexity: ``O(V + E + sum_of_path_lengths)``.
    """
    if not graph.has_claim(target):
        raise KeyError(f"unknown claim: {target}")

    rev = graph.reverse_dependency_adjacency()  # node -> direct prerequisites
    paths: list[list[str]] = []

    def dfs(node: str, suffix: list[str]) -> None:
        suffix = [node] + suffix
        prereqs = rev.get(node, ())
        if not prereqs:
            paths.append(suffix)
            return
        for prereq in prereqs:
            dfs(prereq, suffix)

    dfs(target, [])
    # Each accumulated suffix already runs prerequisite -> ... -> target.
    return paths


def transitive_dependencies(graph: ClaimGraph, node: str) -> set[str]:
    """All claims ``node`` transitively depends on (excluding ``node`` itself).

    Performs a BFS over the dependent-to-prerequisite adjacency.
    Complexity: ``O(V + E)``.
    """
    if not graph.has_claim(node):
        raise KeyError(f"unknown claim: {node}")

    rev = graph.reverse_dependency_adjacency()
    seen: set[str] = set()
    queue: deque[str] = deque(rev.get(node, ()))
    while queue:
        cur = queue.popleft()
        if cur in seen:
            continue
        seen.add(cur)
        queue.extend(rev.get(cur, ()))
    return seen


# --------------------------------------------------------------------------- #
# Misc                                                                        #
# --------------------------------------------------------------------------- #
def roots(graph: ClaimGraph) -> list[str]:
    """Claims with no prerequisites - the starting points of the DAG."""
    rev = graph.reverse_dependency_adjacency()
    return sorted(n for n, prereqs in rev.items() if not prereqs)


def leaves(graph: ClaimGraph) -> list[str]:
    """Claims that nothing else depends on."""
    adj = graph.dependency_adjacency()
    return sorted(n for n, deps in adj.items() if not deps)


def levels(graph: ClaimGraph) -> dict[str, int]:
    """Assign each claim a depth equal to the length of its longest
    prerequisite chain.

    Useful for "layered" rendering: roots are level 0, claims that depend
    only on roots are level 1, and so on. Complexity: ``O(V + E)``.
    """
    order = kahn_topological_sort(graph)
    rev = graph.reverse_dependency_adjacency()
    depth: dict[str, int] = {}
    for node in order:
        prereqs = rev.get(node, ())
        depth[node] = 1 + max((depth[p] for p in prereqs), default=-1)
    return depth


def iter_edges_in_topological_order(graph: ClaimGraph) -> Iterable[tuple[str, str]]:
    """Yield dependency edges in topological order of their *sources*.

    Handy when you want to animate edges in the UI in a stable order.
    """
    adj = graph.dependency_adjacency()
    for src in kahn_topological_sort(graph):
        for dst in sorted(adj.get(src, ())):
            yield src, dst
