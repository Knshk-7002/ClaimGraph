"""JSON I/O for ClaimGraph.

The on-disk format is a single JSON object with three top-level lists:

    {
      "claims":   [...],
      "evidence": [...],
      "edges":    [...]
    }

This keeps sample datasets small, diff-able and human-editable.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .graph import ClaimGraph
from .models import Claim, Edge, Evidence


def to_dict(graph: ClaimGraph) -> dict[str, list[dict[str, Any]]]:
    """Serialize a graph to a plain ``dict`` ready for ``json.dump``."""
    return {
        "claims": [c.to_dict() for c in graph.claims],
        "evidence": [e.to_dict() for e in graph.evidence],
        "edges": [e.to_dict() for e in graph.edges],
    }


def from_dict(data: dict[str, Any]) -> ClaimGraph:
    """Build a graph from the dict format produced by :func:`to_dict`."""
    graph = ClaimGraph()
    for raw in data.get("claims", []):
        graph.add_claim(Claim.from_dict(raw))
    for raw in data.get("evidence", []):
        graph.add_evidence(Evidence.from_dict(raw))
    for raw in data.get("edges", []):
        graph.add_edge(Edge.from_dict(raw))
    return graph


def save(graph: ClaimGraph, path: str | Path) -> None:
    Path(path).write_text(json.dumps(to_dict(graph), indent=2), encoding="utf-8")


def load(path: str | Path) -> ClaimGraph:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return from_dict(data)
