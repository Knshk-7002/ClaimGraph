"""Confidence aggregation and topo-order propagation.

The propagation is the part of ClaimGraph that *requires* a topological
sort: a claim's final confidence blends its own intrinsic confidence with
the confidence of its prerequisites, so we must compute prerequisites
first. Visiting nodes in Kahn order makes that guarantee.

Confidence is in ``[-1, 1]``:

* ``+1`` = strongly supported
* ``0``  = neutral / no evidence
* ``-1`` = strongly contradicted

Intrinsic confidence
--------------------
Sum the signed weights of attached evidence (``+`` for supports, ``-`` for
contradicts) and squash through ``tanh`` so the result is bounded in
``[-1, 1]`` and saturates gracefully as more evidence piles on:

    intrinsic = tanh(sum_signed_weights)

Final confidence
----------------
For a claim with prerequisites ``P`` and an intrinsic confidence ``c``::

    final = alpha * c + (1 - alpha) * mean( final(p) for p in P )

If the claim has no prerequisites, ``final = c``. ``alpha`` defaults to
``0.7`` - intrinsic evidence is the dominant signal, but prerequisites
matter.

This is intentionally a *simple, transparent* aggregation. The point of
ClaimGraph is to make the *structure* visible; users who want a fancier
posterior can swap this function out.
"""

from __future__ import annotations

import math
from statistics import mean

from .algorithms import kahn_topological_sort
from .graph import ClaimGraph


def intrinsic_confidence(graph: ClaimGraph, claim_id: str) -> float:
    """Compute intrinsic confidence from a claim's directly attached evidence.

    Returns a value in ``[-1, 1]``. Claims with no evidence return ``0.0``.
    """
    if not graph.has_claim(claim_id):
        raise KeyError(f"unknown claim: {claim_id}")

    signed_sum = 0.0
    for ev in graph.evidence_for(claim_id):
        sign = 1.0 if ev.direction.value == "supports" else -1.0
        signed_sum += sign * ev.weight
    return math.tanh(signed_sum)


def compute_confidences(
    graph: ClaimGraph,
    alpha: float = 0.7,
) -> dict[str, dict[str, float]]:
    """Compute intrinsic and propagated confidence for every claim.

    Returns a mapping ``claim_id -> {"intrinsic": float, "final": float,
    "prereqs_mean": float | None}``. ``prereqs_mean`` is ``None`` for root
    claims (so the UI can label them clearly).

    Visits nodes in topological order so that a claim's prerequisites are
    always computed first. Complexity: ``O(V + E)``.
    """
    if not 0.0 <= alpha <= 1.0:
        raise ValueError(f"alpha must be in [0, 1], got {alpha}")

    order = kahn_topological_sort(graph)
    rev = graph.reverse_dependency_adjacency()
    result: dict[str, dict[str, float]] = {}

    for node in order:
        intrinsic = intrinsic_confidence(graph, node)
        prereqs = rev.get(node, [])
        if prereqs:
            prereqs_mean = mean(result[p]["final"] for p in prereqs)
            final = alpha * intrinsic + (1.0 - alpha) * prereqs_mean
        else:
            prereqs_mean = None
            final = intrinsic
        result[node] = {
            "intrinsic": intrinsic,
            "final": max(-1.0, min(1.0, final)),
            "prereqs_mean": prereqs_mean,
        }
    return result
