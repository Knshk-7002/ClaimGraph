"""Core data models for ClaimGraph.

These are deliberately small, JSON-friendly dataclasses. No business logic
lives here - it all lives in :mod:`claimgraph.graph`, :mod:`claimgraph.algorithms`
and :mod:`claimgraph.confidence`.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any


class EdgeType(str, Enum):
    """Kinds of edges in a ClaimGraph.

    Only :attr:`DEPENDS_ON` edges are constrained to form a DAG; the others
    may form arbitrary directed graphs.
    """

    DEPENDS_ON = "depends_on"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"


class EvidenceDirection(str, Enum):
    """Whether an evidence unit supports or contradicts its claim."""

    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"


@dataclass
class Evidence:
    """A single evidence unit attached to a claim.

    Attributes
    ----------
    id:
        Stable identifier (unique within a graph).
    claim_id:
        The claim this evidence is attached to.
    source:
        Free-text source description (paper title, URL, ...).
    direction:
        Whether the evidence supports or contradicts the claim.
    strength:
        Methodological strength in ``[0, 1]`` - e.g. sample size /
        replication / experimental design.
    source_quality:
        Reliability of the source in ``[0, 1]`` - e.g. peer-reviewed
        meta-analysis vs. blog post.
    notes:
        Optional free-text notes.
    """

    id: str
    claim_id: str
    source: str
    direction: EvidenceDirection
    strength: float = 0.5
    source_quality: float = 0.5
    notes: str = ""

    def __post_init__(self) -> None:
        if isinstance(self.direction, str):
            self.direction = EvidenceDirection(self.direction)
        if not 0.0 <= self.strength <= 1.0:
            raise ValueError(f"strength must be in [0, 1], got {self.strength}")
        if not 0.0 <= self.source_quality <= 1.0:
            raise ValueError(
                f"source_quality must be in [0, 1], got {self.source_quality}"
            )

    @property
    def weight(self) -> float:
        """Combined evidence weight ``strength * source_quality``."""
        return self.strength * self.source_quality

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["direction"] = self.direction.value
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Evidence":
        return cls(
            id=d["id"],
            claim_id=d["claim_id"],
            source=d.get("source", ""),
            direction=EvidenceDirection(d.get("direction", "supports")),
            strength=float(d.get("strength", 0.5)),
            source_quality=float(d.get("source_quality", 0.5)),
            notes=d.get("notes", ""),
        )


@dataclass
class Claim:
    """A narrow, testable statement.

    Confidence is **not** stored on the claim itself - it is computed by
    :func:`claimgraph.confidence.compute_confidences` from the evidence and
    the dependency DAG, so it can never drift out of sync with the graph.
    """

    id: str
    text: str
    tags: list[str] = field(default_factory=list)
    context: str = ""
    created_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Claim":
        return cls(
            id=d["id"],
            text=d["text"],
            tags=list(d.get("tags", [])),
            context=d.get("context", ""),
            created_at=d.get("created_at", ""),
        )


@dataclass
class Edge:
    """A typed directed edge between two claims.

    For :attr:`EdgeType.DEPENDS_ON` the convention is ``source DEPENDS_ON
    target``: the source claim's truth rests on the target claim. The
    dependency graph used by topological sort has its edges oriented from
    *dependency* (target) to *dependent* (source) - see
    :meth:`claimgraph.graph.ClaimGraph.dependency_adjacency`.
    """

    source: str
    target: str
    type: EdgeType
    weight: float = 1.0
    notes: str = ""

    def __post_init__(self) -> None:
        if isinstance(self.type, str):
            self.type = EdgeType(self.type)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "type": self.type.value,
            "weight": self.weight,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Edge":
        return cls(
            source=d["source"],
            target=d["target"],
            type=EdgeType(d["type"]),
            weight=float(d.get("weight", 1.0)),
            notes=d.get("notes", ""),
        )
