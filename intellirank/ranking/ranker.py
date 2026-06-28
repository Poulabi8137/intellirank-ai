"""Candidate ranking: score all candidates, sort, select top-k, enforce monotonicity."""

from __future__ import annotations

from dataclasses import dataclass

from intellirank.config import PipelineConfig
from intellirank.ranking.explainability import ExplainabilityReport, build_explainability_report
from intellirank.ranking.scorer import score_candidate
from intellirank.types import CandidateFeatures


@dataclass
class RankedCandidate:
    """One entry in the final ranked list (ranks 1–top_k)."""
    rank: int
    features: CandidateFeatures
    reasoning: str
    report: ExplainabilityReport


def rank_candidates(
    all_features: list[CandidateFeatures],
    config: PipelineConfig,
) -> list[RankedCandidate]:
    """
    Score all candidates, sort by final_score, select top-k, enforce monotonicity.

    Sorting key: primary = -round(final_score, 3) descending;
                 secondary = candidate_id ascending (deterministic tie-break).
    Monotonicity: scores[i] >= scores[i+1] for all i (corrects floating-point edge cases).

    Returns a list of RankedCandidate ordered rank 1 through min(top_k, len(all_features)).
    """
    if not all_features:
        return []

    # Stage 8: Score every candidate (idempotent — safe to call on pre-scored features)
    for f in all_features:
        score_candidate(f, config)

    # Stage 9: Sort — rounded score descending, then candidate_id ascending for ties
    sorted_features = sorted(
        all_features,
        key=lambda f: (-round(f.final_score, 3), f.candidate_id),
    )

    # Select top-k
    top = sorted_features[: config.top_k]

    # Enforce score monotonicity (floating-point violations after tie-breaking)
    for i in range(1, len(top)):
        if top[i].final_score > top[i - 1].final_score:
            top[i].final_score = max(0.001, top[i - 1].final_score - 0.0001)

    # Stage 10: Build RankedCandidate objects with explainability reports
    result: list[RankedCandidate] = []
    for rank_idx, features in enumerate(top, start=1):
        report = build_explainability_report(features, config, rank_idx)
        result.append(
            RankedCandidate(
                rank=rank_idx,
                features=features,
                reasoning=report.reasoning,
                report=report,
            )
        )

    return result
