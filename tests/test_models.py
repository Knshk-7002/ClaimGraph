"""Tests for the simple dataclass models."""

from __future__ import annotations

import pytest

from claimgraph.models import (
    Claim,
    Edge,
    EdgeType,
    Evidence,
    EvidenceDirection,
)


def test_evidence_weight_is_product_of_strength_and_source_quality():
    ev = Evidence(
        id="e1",
        claim_id="c1",
        source="paper",
        direction=EvidenceDirection.SUPPORTS,
        strength=0.5,
        source_quality=0.4,
    )
    assert ev.weight == pytest.approx(0.2)


@pytest.mark.parametrize("bad", [-0.01, 1.01, 2.0, -1.0])
def test_evidence_rejects_out_of_range_strength(bad):
    with pytest.raises(ValueError):
        Evidence(
            id="e",
            claim_id="c",
            source="s",
            direction=EvidenceDirection.SUPPORTS,
            strength=bad,
        )


def test_evidence_round_trip_dict():
    ev = Evidence(
        id="e",
        claim_id="c",
        source="paper",
        direction=EvidenceDirection.CONTRADICTS,
        strength=0.6,
        source_quality=0.7,
        notes="hello",
    )
    restored = Evidence.from_dict(ev.to_dict())
    assert restored == ev


def test_edge_accepts_string_type():
    e = Edge(source="a", target="b", type="depends_on")  # type: ignore[arg-type]
    assert e.type is EdgeType.DEPENDS_ON


def test_claim_round_trip_dict():
    c = Claim(id="c1", text="hello", tags=["x", "y"], context="ctx")
    assert Claim.from_dict(c.to_dict()) == c
