"""Shared pytest fixtures for ClaimGraph tests."""

from __future__ import annotations

import pytest

from claimgraph import (
    Claim,
    ClaimGraph,
    Edge,
    EdgeType,
    Evidence,
    EvidenceDirection,
)


@pytest.fixture
def empty_graph() -> ClaimGraph:
    return ClaimGraph()


def _make_simple_graph() -> ClaimGraph:
    """A small DAG used across tests.

    Topology (DEPENDS_ON edges, arrows point from dependent to prerequisite):

        D depends_on B, C
        B depends_on A
        C depends_on A

    So Kahn order is one of:
        A -> B -> C -> D
        A -> C -> B -> D

    Each claim has one supports evidence so confidences are non-zero.
    """
    g = ClaimGraph()
    for cid, text in [
        ("A", "Claim A"),
        ("B", "Claim B"),
        ("C", "Claim C"),
        ("D", "Claim D"),
    ]:
        g.add_claim(Claim(id=cid, text=text))
    g.add_evidence(
        Evidence(
            id="A_e",
            claim_id="A",
            source="paperA",
            direction=EvidenceDirection.SUPPORTS,
            strength=0.8,
            source_quality=0.9,
        )
    )
    g.add_evidence(
        Evidence(
            id="B_e",
            claim_id="B",
            source="paperB",
            direction=EvidenceDirection.SUPPORTS,
            strength=0.6,
            source_quality=0.7,
        )
    )
    g.add_evidence(
        Evidence(
            id="C_e",
            claim_id="C",
            source="paperC",
            direction=EvidenceDirection.CONTRADICTS,
            strength=0.5,
            source_quality=0.5,
        )
    )
    g.add_evidence(
        Evidence(
            id="D_e",
            claim_id="D",
            source="paperD",
            direction=EvidenceDirection.SUPPORTS,
            strength=0.4,
            source_quality=0.6,
        )
    )
    g.add_edge(Edge(source="B", target="A", type=EdgeType.DEPENDS_ON))
    g.add_edge(Edge(source="C", target="A", type=EdgeType.DEPENDS_ON))
    g.add_edge(Edge(source="D", target="B", type=EdgeType.DEPENDS_ON))
    g.add_edge(Edge(source="D", target="C", type=EdgeType.DEPENDS_ON))
    return g


@pytest.fixture
def simple_graph() -> ClaimGraph:
    return _make_simple_graph()
