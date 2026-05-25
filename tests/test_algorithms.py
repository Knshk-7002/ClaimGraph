"""Tests for the DAG algorithms (the DAA core of ClaimGraph)."""

from __future__ import annotations

import pytest

from claimgraph import (
    Claim,
    ClaimGraph,
    Edge,
    EdgeType,
    algorithms,
    confidence,
)


def _order_index(order: list[str], node: str) -> int:
    return order.index(node)


def test_kahn_topological_sort_respects_dependencies(simple_graph: ClaimGraph):
    order = algorithms.kahn_topological_sort(simple_graph)
    # Every depends-on edge in the dependent-on-prerequisite form (target is
    # the prerequisite) must place the prerequisite before the dependent in
    # the order.
    for edge in simple_graph.edges:
        if edge.type is EdgeType.DEPENDS_ON:
            prereq, dependent = edge.target, edge.source
            assert _order_index(order, prereq) < _order_index(order, dependent)


def test_dfs_topological_sort_respects_dependencies(simple_graph: ClaimGraph):
    order = algorithms.dfs_topological_sort(simple_graph)
    for edge in simple_graph.edges:
        if edge.type is EdgeType.DEPENDS_ON:
            prereq, dependent = edge.target, edge.source
            assert _order_index(order, prereq) < _order_index(order, dependent)


def test_kahn_and_dfs_agree_on_node_set(simple_graph: ClaimGraph):
    kahn = algorithms.kahn_topological_sort(simple_graph)
    dfs = algorithms.dfs_topological_sort(simple_graph)
    assert set(kahn) == set(dfs)
    assert len(kahn) == len(dfs) == len(simple_graph.claims)


def test_kahn_is_deterministic(simple_graph: ClaimGraph):
    a = algorithms.kahn_topological_sort(simple_graph)
    b = algorithms.kahn_topological_sort(simple_graph)
    assert a == b


def test_has_cycle_false_on_clean_dag(simple_graph: ClaimGraph):
    assert algorithms.has_cycle(simple_graph) is False


def test_has_cycle_detects_cycle_inserted_by_hand():
    # Bypass the public API's cycle guard to verify the detection algorithm.
    g = ClaimGraph()
    for cid in "ABC":
        g.add_claim(Claim(id=cid, text=cid))
    g.add_edge(Edge(source="A", target="B", type=EdgeType.DEPENDS_ON))
    g.add_edge(Edge(source="B", target="C", type=EdgeType.DEPENDS_ON))
    # Manually close the cycle by appending to the internal edge list.
    g._edges.append(Edge(source="C", target="A", type=EdgeType.DEPENDS_ON))  # type: ignore[attr-defined]
    assert algorithms.has_cycle(g) is True
    with pytest.raises(ValueError):
        algorithms.kahn_topological_sort(g)
    with pytest.raises(ValueError):
        algorithms.dfs_topological_sort(g)


def test_roots_and_leaves(simple_graph: ClaimGraph):
    assert algorithms.roots(simple_graph) == ["A"]
    assert algorithms.leaves(simple_graph) == ["D"]


def test_levels(simple_graph: ClaimGraph):
    levels = algorithms.levels(simple_graph)
    assert levels["A"] == 0
    assert levels["B"] == 1
    assert levels["C"] == 1
    assert levels["D"] == 2


def test_transitive_dependencies(simple_graph: ClaimGraph):
    assert algorithms.transitive_dependencies(simple_graph, "D") == {"A", "B", "C"}
    assert algorithms.transitive_dependencies(simple_graph, "B") == {"A"}
    assert algorithms.transitive_dependencies(simple_graph, "A") == set()


def test_longest_path_to_leaf(simple_graph: ClaimGraph):
    path = algorithms.longest_path_to(simple_graph, "D")
    assert path[0] == "A"
    assert path[-1] == "D"
    # The DAG only has one root and one leaf, so the longest path has length 2.
    assert len(path) == 3


def test_all_paths_to_leaf(simple_graph: ClaimGraph):
    paths = algorithms.all_paths_to(simple_graph, "D")
    # Two routes: A -> B -> D and A -> C -> D
    assert {tuple(p) for p in paths} == {
        ("A", "B", "D"),
        ("A", "C", "D"),
    }


def test_unknown_node_raises_key_error(simple_graph: ClaimGraph):
    with pytest.raises(KeyError):
        algorithms.longest_path_to(simple_graph, "nope")
    with pytest.raises(KeyError):
        algorithms.transitive_dependencies(simple_graph, "nope")
    with pytest.raises(KeyError):
        algorithms.all_paths_to(simple_graph, "nope")


def test_iter_edges_in_topological_order_is_consistent(simple_graph: ClaimGraph):
    order = algorithms.kahn_topological_sort(simple_graph)
    pairs = list(algorithms.iter_edges_in_topological_order(simple_graph))
    # All pairs are valid edges and the source order is non-decreasing in topo.
    src_indices = [order.index(s) for s, _ in pairs]
    assert src_indices == sorted(src_indices)


# --------------------------------------------------------------------------- #
# Confidence propagation                                                      #
# --------------------------------------------------------------------------- #
def test_confidence_propagation_visits_in_topo_order(simple_graph: ClaimGraph):
    conf = confidence.compute_confidences(simple_graph, alpha=0.7)
    # All claims have an entry, all values are in [-1, 1].
    assert set(conf.keys()) == {"A", "B", "C", "D"}
    for v in conf.values():
        assert -1.0 <= v["final"] <= 1.0
        assert -1.0 <= v["intrinsic"] <= 1.0

    # A is a root, so final == intrinsic and prereqs_mean is None.
    assert conf["A"]["prereqs_mean"] is None
    assert conf["A"]["final"] == pytest.approx(conf["A"]["intrinsic"])

    # B depends on A only, so prereqs_mean == conf[A].final
    assert conf["B"]["prereqs_mean"] == pytest.approx(conf["A"]["final"])

    # D depends on B and C, so prereqs_mean == mean(B.final, C.final)
    assert conf["D"]["prereqs_mean"] == pytest.approx(
        (conf["B"]["final"] + conf["C"]["final"]) / 2.0
    )

    # And the propagation formula holds for D
    alpha = 0.7
    expected_d = alpha * conf["D"]["intrinsic"] + (1 - alpha) * conf["D"]["prereqs_mean"]
    assert conf["D"]["final"] == pytest.approx(max(-1.0, min(1.0, expected_d)))


def test_confidence_adding_supporting_evidence_increases_intrinsic(empty_graph):
    empty_graph.add_claim(Claim(id="x", text="x"))
    from claimgraph.models import Evidence, EvidenceDirection

    before = confidence.intrinsic_confidence(empty_graph, "x")
    assert before == 0.0
    empty_graph.add_evidence(
        Evidence(
            id="ev",
            claim_id="x",
            source="paper",
            direction=EvidenceDirection.SUPPORTS,
            strength=0.9,
            source_quality=0.9,
        )
    )
    after = confidence.intrinsic_confidence(empty_graph, "x")
    assert after > before


def test_confidence_contradicting_evidence_reduces_score(empty_graph):
    empty_graph.add_claim(Claim(id="x", text="x"))
    from claimgraph.models import Evidence, EvidenceDirection

    empty_graph.add_evidence(
        Evidence(
            id="s",
            claim_id="x",
            source="paper",
            direction=EvidenceDirection.SUPPORTS,
            strength=0.5,
            source_quality=0.5,
        )
    )
    before = confidence.intrinsic_confidence(empty_graph, "x")
    empty_graph.add_evidence(
        Evidence(
            id="c",
            claim_id="x",
            source="paper2",
            direction=EvidenceDirection.CONTRADICTS,
            strength=0.9,
            source_quality=0.9,
        )
    )
    after = confidence.intrinsic_confidence(empty_graph, "x")
    assert after < before
