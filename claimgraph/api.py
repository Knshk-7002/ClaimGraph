"""Flask HTTP layer for ClaimGraph.

The Flask app holds a single :class:`~claimgraph.graph.ClaimGraph` and a
mapping of available sample datasets. Routes are kept thin - they delegate
all graph work to :mod:`claimgraph.graph`, :mod:`claimgraph.algorithms` and
:mod:`claimgraph.confidence`.

Key endpoints
-------------
* ``GET  /api/health``                     liveness probe.
* ``GET  /api/datasets``                   list available sample datasets.
* ``POST /api/load/<name>``                load a sample dataset.
* ``GET  /api/graph``                      full graph + confidences + topo order.
* ``POST /api/claims``                     add a claim.
* ``POST /api/evidence``                   add an evidence unit.
* ``POST /api/edges``                      add a typed edge.
* ``DELETE /api/edges``                    remove an edge.
* ``GET  /api/topo``                       Kahn topological order.
* ``GET  /api/topo/dfs``                   DFS topological order.
* ``GET  /api/longest-path/<claim_id>``    longest reasoning chain to a claim.
* ``GET  /api/paths/<claim_id>``           all reasoning paths to a claim.
* ``GET  /api/dependencies/<claim_id>``    transitive prerequisites.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from flask import Blueprint, Flask, jsonify, request, send_from_directory

from . import algorithms, confidence, storage
from .graph import ClaimGraph, CycleError
from .models import Claim, Edge, EdgeType, Evidence, EvidenceDirection

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
STATIC_DIR = REPO_ROOT / "static"


def _available_datasets() -> dict[str, Path]:
    if not DATA_DIR.exists():
        return {}
    return {p.stem: p for p in sorted(DATA_DIR.glob("*.json"))}


def _serialize_graph(graph: ClaimGraph) -> dict[str, Any]:
    try:
        topo = algorithms.kahn_topological_sort(graph)
    except ValueError:
        topo = []
    try:
        conf = confidence.compute_confidences(graph)
    except ValueError:
        conf = {}
    try:
        depth = algorithms.levels(graph)
    except ValueError:
        depth = {}
    return {
        "claims": [c.to_dict() for c in graph.claims],
        "evidence": [e.to_dict() for e in graph.evidence],
        "edges": [e.to_dict() for e in graph.edges],
        "topological_order": topo,
        "confidence": conf,
        "levels": depth,
        "stats": graph.stats(),
    }


def create_app(graph: ClaimGraph | None = None) -> Flask:
    """Create the Flask app bound to a (possibly pre-populated) graph."""
    app = Flask(
        __name__,
        static_folder=str(STATIC_DIR),
        static_url_path="",
    )
    app.config["GRAPH"] = graph if graph is not None else ClaimGraph()
    app.register_blueprint(_build_blueprint())

    @app.route("/")
    def index() -> Any:
        return send_from_directory(str(STATIC_DIR), "index.html")

    return app


def _build_blueprint() -> Blueprint:
    bp = Blueprint("claimgraph", __name__, url_prefix="/api")

    def _g() -> ClaimGraph:
        from flask import current_app

        return current_app.config["GRAPH"]

    @bp.get("/health")
    def health() -> Any:
        return jsonify({"status": "ok"})

    @bp.get("/datasets")
    def datasets() -> Any:
        return jsonify({"datasets": sorted(_available_datasets().keys())})

    @bp.post("/load/<name>")
    def load_dataset(name: str) -> Any:
        from flask import current_app

        avail = _available_datasets()
        if name not in avail:
            return jsonify({"error": f"unknown dataset: {name}"}), 404
        current_app.config["GRAPH"] = storage.load(avail[name])
        return jsonify(_serialize_graph(current_app.config["GRAPH"]))

    @bp.post("/reset")
    def reset() -> Any:
        from flask import current_app

        current_app.config["GRAPH"] = ClaimGraph()
        return jsonify(_serialize_graph(current_app.config["GRAPH"]))

    @bp.get("/graph")
    def get_graph() -> Any:
        return jsonify(_serialize_graph(_g()))

    @bp.post("/claims")
    def add_claim() -> Any:
        payload = request.get_json(silent=True) or {}
        text = payload.get("text", "").strip()
        if not text:
            return jsonify({"error": "claim text is required"}), 400
        claim = Claim(
            id=payload.get("id") or f"c_{uuid.uuid4().hex[:8]}",
            text=text,
            tags=list(payload.get("tags", [])),
            context=payload.get("context", ""),
        )
        try:
            _g().add_claim(claim)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(claim.to_dict()), 201

    @bp.delete("/claims/<claim_id>")
    def delete_claim(claim_id: str) -> Any:
        try:
            _g().remove_claim(claim_id)
        except KeyError as exc:
            return jsonify({"error": str(exc)}), 404
        return jsonify({"removed": claim_id})

    @bp.post("/evidence")
    def add_evidence() -> Any:
        payload = request.get_json(silent=True) or {}
        required = ("claim_id", "source", "direction")
        missing = [k for k in required if not payload.get(k)]
        if missing:
            return jsonify({"error": f"missing fields: {missing}"}), 400
        try:
            ev = Evidence(
                id=payload.get("id") or f"e_{uuid.uuid4().hex[:8]}",
                claim_id=payload["claim_id"],
                source=payload["source"],
                direction=EvidenceDirection(payload["direction"]),
                strength=float(payload.get("strength", 0.5)),
                source_quality=float(payload.get("source_quality", 0.5)),
                notes=payload.get("notes", ""),
            )
            _g().add_evidence(ev)
        except (KeyError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(ev.to_dict()), 201

    @bp.delete("/evidence/<evidence_id>")
    def delete_evidence(evidence_id: str) -> Any:
        try:
            _g().remove_evidence(evidence_id)
        except KeyError as exc:
            return jsonify({"error": str(exc)}), 404
        return jsonify({"removed": evidence_id})

    @bp.post("/edges")
    def add_edge() -> Any:
        payload = request.get_json(silent=True) or {}
        required = ("source", "target", "type")
        missing = [k for k in required if not payload.get(k)]
        if missing:
            return jsonify({"error": f"missing fields: {missing}"}), 400
        try:
            edge = Edge(
                source=payload["source"],
                target=payload["target"],
                type=EdgeType(payload["type"]),
                weight=float(payload.get("weight", 1.0)),
                notes=payload.get("notes", ""),
            )
            _g().add_edge(edge)
        except CycleError as exc:
            return jsonify({"error": str(exc), "code": "cycle"}), 409
        except (KeyError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify(edge.to_dict()), 201

    @bp.delete("/edges")
    def delete_edge() -> Any:
        payload = request.get_json(silent=True) or {}
        try:
            _g().remove_edge(
                payload["source"], payload["target"], EdgeType(payload["type"])
            )
        except (KeyError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 400
        return jsonify({"removed": payload})

    @bp.get("/topo")
    def topo() -> Any:
        try:
            return jsonify({"order": algorithms.kahn_topological_sort(_g())})
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 409

    @bp.get("/topo/dfs")
    def topo_dfs() -> Any:
        try:
            return jsonify({"order": algorithms.dfs_topological_sort(_g())})
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 409

    @bp.get("/longest-path/<claim_id>")
    def longest_path(claim_id: str) -> Any:
        try:
            path = algorithms.longest_path_to(_g(), claim_id)
        except KeyError as exc:
            return jsonify({"error": str(exc)}), 404
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 409
        return jsonify({"path": path, "length": max(0, len(path) - 1)})

    @bp.get("/paths/<claim_id>")
    def all_paths(claim_id: str) -> Any:
        try:
            paths = algorithms.all_paths_to(_g(), claim_id)
        except KeyError as exc:
            return jsonify({"error": str(exc)}), 404
        return jsonify({"paths": paths, "count": len(paths)})

    @bp.get("/dependencies/<claim_id>")
    def deps(claim_id: str) -> Any:
        try:
            tdeps = algorithms.transitive_dependencies(_g(), claim_id)
        except KeyError as exc:
            return jsonify({"error": str(exc)}), 404
        return jsonify({"claim_id": claim_id, "dependencies": sorted(tdeps)})

    return bp
