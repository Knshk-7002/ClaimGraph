"""End-to-end tests for the Flask API."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from claimgraph.api import create_app
from claimgraph.graph import ClaimGraph


@pytest.fixture
def client(simple_graph):
    app = create_app(simple_graph)
    app.config["TESTING"] = True
    return app.test_client()


@pytest.fixture
def empty_client():
    app = create_app(ClaimGraph())
    app.config["TESTING"] = True
    return app.test_client()


def test_health_endpoint(empty_client):
    res = empty_client.get("/api/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


def test_graph_endpoint_returns_topology_and_confidence(client):
    res = client.get("/api/graph")
    assert res.status_code == 200
    body = res.get_json()
    assert {c["id"] for c in body["claims"]} == {"A", "B", "C", "D"}
    assert body["topological_order"][0] == "A"
    assert body["topological_order"][-1] == "D"
    assert set(body["confidence"].keys()) == {"A", "B", "C", "D"}


def test_add_claim_and_evidence_flow(empty_client):
    res = empty_client.post(
        "/api/claims",
        data=json.dumps({"id": "x", "text": "hello"}),
        content_type="application/json",
    )
    assert res.status_code == 201

    res = empty_client.post(
        "/api/evidence",
        data=json.dumps(
            {
                "claim_id": "x",
                "source": "paper",
                "direction": "supports",
                "strength": 0.8,
                "source_quality": 0.9,
            }
        ),
        content_type="application/json",
    )
    assert res.status_code == 201

    graph = empty_client.get("/api/graph").get_json()
    assert graph["stats"]["claims"] == 1
    assert graph["stats"]["evidence"] == 1
    assert graph["confidence"]["x"]["final"] > 0


def test_cycle_edge_is_rejected_with_409(client):
    # Adding A depends_on D would close a cycle in the simple graph.
    res = client.post(
        "/api/edges",
        data=json.dumps({"source": "A", "target": "D", "type": "depends_on"}),
        content_type="application/json",
    )
    assert res.status_code == 409
    body = res.get_json()
    assert body.get("code") == "cycle"


def test_longest_path_endpoint(client):
    res = client.get("/api/longest-path/D")
    assert res.status_code == 200
    body = res.get_json()
    assert body["path"][0] == "A"
    assert body["path"][-1] == "D"
    assert body["length"] == len(body["path"]) - 1


def test_all_paths_endpoint(client):
    res = client.get("/api/paths/D")
    body = res.get_json()
    assert body["count"] == 2
    assert {tuple(p) for p in body["paths"]} == {
        ("A", "B", "D"),
        ("A", "C", "D"),
    }


def test_dependencies_endpoint(client):
    res = client.get("/api/dependencies/D")
    body = res.get_json()
    assert set(body["dependencies"]) == {"A", "B", "C"}


def test_topo_dfs_endpoint(client):
    res = client.get("/api/topo/dfs")
    body = res.get_json()
    assert body["order"][0] == "A"
    assert body["order"][-1] == "D"


def test_dataset_listing_and_load(empty_client):
    res = empty_client.get("/api/datasets")
    body = res.get_json()
    # We ship three sample datasets.
    assert {"remote_work", "intermittent_fasting", "ai_hallucinations"}.issubset(
        set(body["datasets"])
    )

    res = empty_client.post("/api/load/remote_work")
    assert res.status_code == 200
    body = res.get_json()
    assert body["stats"]["claims"] > 0
    assert body["topological_order"]


def test_unknown_dataset_returns_404(empty_client):
    res = empty_client.post("/api/load/does_not_exist")
    assert res.status_code == 404


def test_missing_claim_returns_404(client):
    res = client.get("/api/longest-path/nope")
    assert res.status_code == 404
