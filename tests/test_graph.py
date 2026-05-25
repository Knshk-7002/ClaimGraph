"""Tests for the ClaimGraph container itself."""

from __future__ import annotations

import pytest

from claimgraph import Claim, ClaimGraph, CycleError, Edge, EdgeType, Evidence
from claimgraph.models import EvidenceDirection


def test_add_and_get_claim(empty_graph: ClaimGraph):
    c = Claim(id="x", text="hello")
    empty_graph.add_claim(c)
    assert empty_graph.has_claim("x")
    assert empty_graph.get_claim("x") is c


def test_duplicate_claim_id_rejected(empty_graph: ClaimGraph):
    empty_graph.add_claim(Claim(id="x", text="a"))
    with pytest.raises(ValueError):
        empty_graph.add_claim(Claim(id="x", text="b"))


def test_evidence_requires_known_claim(empty_graph: ClaimGraph):
    with pytest.raises(KeyError):
        empty_graph.add_evidence(
            Evidence(
                id="e",
                claim_id="missing",
                source="paper",
                direction=EvidenceDirection.SUPPORTS,
            )
        )


def test_self_loop_rejected(empty_graph: ClaimGraph):
    empty_graph.add_claim(Claim(id="a", text="A"))
    with pytest.raises(ValueError):
        empty_graph.add_edge(Edge(source="a", target="a", type=EdgeType.DEPENDS_ON))


def test_duplicate_edge_rejected(simple_graph: ClaimGraph):
    with pytest.raises(ValueError):
        simple_graph.add_edge(Edge(source="B", target="A", type=EdgeType.DEPENDS_ON))


def test_cycle_creation_rejected(simple_graph: ClaimGraph):
    # In the simple graph D depends on B and B depends on A. Adding
    # A depends_on D would close a cycle. Verify the API refuses it.
    with pytest.raises(CycleError):
        simple_graph.add_edge(Edge(source="A", target="D", type=EdgeType.DEPENDS_ON))


def test_supports_edge_can_be_cyclic(simple_graph: ClaimGraph):
    # Supports edges form an arbitrary directed graph (no DAG constraint).
    simple_graph.add_edge(Edge(source="A", target="D", type=EdgeType.SUPPORTS))
    simple_graph.add_edge(Edge(source="D", target="A", type=EdgeType.SUPPORTS))
    assert (
        len(simple_graph.edges_of_type(EdgeType.SUPPORTS)) == 2
    )


def test_remove_claim_cleans_up_edges_and_evidence(simple_graph: ClaimGraph):
    simple_graph.remove_claim("D")
    assert not simple_graph.has_claim("D")
    assert all(e.source != "D" and e.target != "D" for e in simple_graph.edges)
    assert all(ev.claim_id != "D" for ev in simple_graph.evidence)


def test_dependency_adjacency_orientation(simple_graph: ClaimGraph):
    # adjacency is prerequisite -> dependent
    adj = simple_graph.dependency_adjacency()
    assert set(adj["A"]) == {"B", "C"}
    assert set(adj["B"]) == {"D"}
    assert set(adj["C"]) == {"D"}
    assert adj["D"] == []


def test_reverse_dependency_adjacency_orientation(simple_graph: ClaimGraph):
    rev = simple_graph.reverse_dependency_adjacency()
    assert rev["A"] == []
    assert rev["B"] == ["A"]
    assert rev["C"] == ["A"]
    assert set(rev["D"]) == {"B", "C"}


def test_stats(simple_graph: ClaimGraph):
    s = simple_graph.stats()
    assert s["claims"] == 4
    assert s["depends_on_edges"] == 4
