"""Tests for JSON load / save round-tripping."""

from __future__ import annotations

from pathlib import Path

from claimgraph import storage


REPO_ROOT = Path(__file__).resolve().parent.parent
DATA = REPO_ROOT / "data"


def test_all_sample_datasets_load_cleanly():
    for path in sorted(DATA.glob("*.json")):
        graph = storage.load(path)
        # Each sample dataset must be a valid DAG -- if not, ClaimGraph
        # would have already raised CycleError during load.
        assert graph.stats()["claims"] >= 1


def test_round_trip_preserves_graph(tmp_path, simple_graph):
    out = tmp_path / "out.json"
    storage.save(simple_graph, out)
    restored = storage.load(out)
    assert restored.stats() == simple_graph.stats()
    assert {c.id for c in restored.claims} == {c.id for c in simple_graph.claims}
    assert {e.id for e in restored.evidence} == {e.id for e in simple_graph.evidence}
