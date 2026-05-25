"""The in-memory :class:`ClaimGraph` container.

Responsibilities:

* hold claims, evidence and typed edges,
* enforce the DAG invariant on dependency edges,
* expose adjacency views the algorithms in :mod:`claimgraph.algorithms`
  operate on.

The class itself is intentionally algorithm-light - graph algorithms live in
:mod:`claimgraph.algorithms` so they can be unit-tested in isolation.
"""

from __future__ import annotations

from typing import Iterable

from .models import Claim, Edge, EdgeType, Evidence


class CycleError(ValueError):
    """Raised when an operation would create a cycle in the dependency DAG."""


class ClaimGraph:
    """An in-memory ClaimGraph.

    The dependency subgraph is kept acyclic at all times: :meth:`add_edge`
    refuses to add a ``DEPENDS_ON`` edge whose insertion would close a cycle.
    """

    def __init__(self) -> None:
        self._claims: dict[str, Claim] = {}
        self._evidence: dict[str, Evidence] = {}
        self._edges: list[Edge] = []

    # ------------------------------------------------------------------ #
    # Claims                                                              #
    # ------------------------------------------------------------------ #
    def add_claim(self, claim: Claim) -> Claim:
        if claim.id in self._claims:
            raise ValueError(f"claim id already exists: {claim.id}")
        self._claims[claim.id] = claim
        return claim

    def get_claim(self, claim_id: str) -> Claim:
        if claim_id not in self._claims:
            raise KeyError(f"unknown claim: {claim_id}")
        return self._claims[claim_id]

    def has_claim(self, claim_id: str) -> bool:
        return claim_id in self._claims

    def remove_claim(self, claim_id: str) -> None:
        """Remove a claim and all evidence / edges that reference it."""
        if claim_id not in self._claims:
            raise KeyError(f"unknown claim: {claim_id}")
        del self._claims[claim_id]
        self._evidence = {
            eid: ev for eid, ev in self._evidence.items() if ev.claim_id != claim_id
        }
        self._edges = [
            e for e in self._edges if e.source != claim_id and e.target != claim_id
        ]

    @property
    def claims(self) -> list[Claim]:
        return list(self._claims.values())

    # ------------------------------------------------------------------ #
    # Evidence                                                            #
    # ------------------------------------------------------------------ #
    def add_evidence(self, evidence: Evidence) -> Evidence:
        if evidence.id in self._evidence:
            raise ValueError(f"evidence id already exists: {evidence.id}")
        if evidence.claim_id not in self._claims:
            raise KeyError(f"unknown claim for evidence: {evidence.claim_id}")
        self._evidence[evidence.id] = evidence
        return evidence

    def remove_evidence(self, evidence_id: str) -> None:
        if evidence_id not in self._evidence:
            raise KeyError(f"unknown evidence: {evidence_id}")
        del self._evidence[evidence_id]

    def evidence_for(self, claim_id: str) -> list[Evidence]:
        if claim_id not in self._claims:
            raise KeyError(f"unknown claim: {claim_id}")
        return [ev for ev in self._evidence.values() if ev.claim_id == claim_id]

    @property
    def evidence(self) -> list[Evidence]:
        return list(self._evidence.values())

    # ------------------------------------------------------------------ #
    # Edges                                                               #
    # ------------------------------------------------------------------ #
    def add_edge(self, edge: Edge) -> Edge:
        """Add a typed edge.

        Refuses to create a ``DEPENDS_ON`` edge if doing so would introduce
        a cycle in the dependency DAG (raises :class:`CycleError`).
        """
        if edge.source not in self._claims:
            raise KeyError(f"unknown source claim: {edge.source}")
        if edge.target not in self._claims:
            raise KeyError(f"unknown target claim: {edge.target}")
        if edge.source == edge.target:
            raise ValueError("self-loops are not allowed")

        if any(
            e.source == edge.source and e.target == edge.target and e.type == edge.type
            for e in self._edges
        ):
            raise ValueError(
                f"duplicate edge: {edge.source} -[{edge.type.value}]-> {edge.target}"
            )

        if edge.type is EdgeType.DEPENDS_ON and self._would_create_cycle(
            edge.source, edge.target
        ):
            raise CycleError(
                f"adding DEPENDS_ON {edge.source} -> {edge.target} would create a cycle"
            )

        self._edges.append(edge)
        return edge

    def remove_edge(self, source: str, target: str, edge_type: EdgeType) -> None:
        before = len(self._edges)
        self._edges = [
            e
            for e in self._edges
            if not (e.source == source and e.target == target and e.type == edge_type)
        ]
        if len(self._edges) == before:
            raise KeyError(
                f"no such edge: {source} -[{edge_type.value}]-> {target}"
            )

    @property
    def edges(self) -> list[Edge]:
        return list(self._edges)

    def edges_of_type(self, edge_type: EdgeType) -> list[Edge]:
        return [e for e in self._edges if e.type == edge_type]

    # ------------------------------------------------------------------ #
    # Adjacency views used by algorithms                                  #
    # ------------------------------------------------------------------ #
    def dependency_adjacency(self) -> dict[str, list[str]]:
        """Adjacency for the dependency DAG, oriented from prerequisite to dependent.

        A ``DEPENDS_ON`` edge ``A -> B`` (claim A rests on claim B) is stored
        in the returned dict as ``B -> [A, ...]``, because topological sort
        needs to visit B (a prerequisite) before A (the dependent).
        """
        adj: dict[str, list[str]] = {cid: [] for cid in self._claims}
        for edge in self._edges:
            if edge.type is EdgeType.DEPENDS_ON:
                adj[edge.target].append(edge.source)
        return adj

    def reverse_dependency_adjacency(self) -> dict[str, list[str]]:
        """Adjacency from dependent to its direct prerequisites.

        Convenient for confidence propagation: to compute claim ``A``'s
        confidence we need its direct prerequisites, which is exactly this
        view.
        """
        adj: dict[str, list[str]] = {cid: [] for cid in self._claims}
        for edge in self._edges:
            if edge.type is EdgeType.DEPENDS_ON:
                adj[edge.source].append(edge.target)
        return adj

    # ------------------------------------------------------------------ #
    # Internal: would adding source -> target close a cycle?              #
    # ------------------------------------------------------------------ #
    def _would_create_cycle(self, source: str, target: str) -> bool:
        """True iff a DEPENDS_ON edge ``source -> target`` would create a cycle.

        A new DEPENDS_ON edge ``source -> target`` adds ``target -> source``
        in the prerequisite-to-dependent adjacency. That closes a cycle iff
        the existing graph already contains a path ``source ~> target`` in
        that same orientation - i.e. ``target`` is already a (transitive)
        dependent of ``source``.
        """
        adj = self.dependency_adjacency()
        stack = [source]
        seen: set[str] = set()
        while stack:
            node = stack.pop()
            if node == target:
                return True
            if node in seen:
                continue
            seen.add(node)
            stack.extend(adj.get(node, ()))
        return False

    # ------------------------------------------------------------------ #
    # Bulk helpers                                                        #
    # ------------------------------------------------------------------ #
    def bulk_add(
        self,
        claims: Iterable[Claim] = (),
        evidence: Iterable[Evidence] = (),
        edges: Iterable[Edge] = (),
    ) -> None:
        for c in claims:
            self.add_claim(c)
        for e in evidence:
            self.add_evidence(e)
        for edge in edges:
            self.add_edge(edge)

    def stats(self) -> dict[str, int]:
        return {
            "claims": len(self._claims),
            "evidence": len(self._evidence),
            "edges": len(self._edges),
            "depends_on_edges": sum(
                1 for e in self._edges if e.type is EdgeType.DEPENDS_ON
            ),
            "supports_edges": sum(
                1 for e in self._edges if e.type is EdgeType.SUPPORTS
            ),
            "contradicts_edges": sum(
                1 for e in self._edges if e.type is EdgeType.CONTRADICTS
            ),
        }
