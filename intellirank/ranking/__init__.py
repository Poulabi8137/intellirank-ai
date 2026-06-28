"""Candidate Ranking Engine — MCIS scoring, sorting, and explainability."""

from intellirank.ranking.explainability import (
    ExplainabilityReport,
    build_explainability_report,
    generate_reasoning,
)
from intellirank.ranking.ranker import RankedCandidate, rank_candidates
from intellirank.ranking.scorer import (
    compute_confidence_score,
    compute_technical_fit,
    score_candidate,
)

__all__ = [
    "compute_technical_fit",
    "compute_confidence_score",
    "score_candidate",
    "RankedCandidate",
    "rank_candidates",
    "ExplainabilityReport",
    "build_explainability_report",
    "generate_reasoning",
]
