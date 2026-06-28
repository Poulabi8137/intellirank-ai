"""
Category 5: Education Intelligence (EDU-01 through EDU-04).
"""

from __future__ import annotations

from intellirank.constants import (
    EDUCATION_TIER_SCORES, FIELD_SCORES, DEGREE_SCORES,
)
from intellirank.types import CleanedCandidate, EducationFeatures
from intellirank.utils.math_utils import clamp
from intellirank.utils.text_utils import normalize_field_of_study, normalize_degree


def _best_education_tier(cleaned: CleanedCandidate) -> float:
    """Return the highest institution prestige score across all education entries."""
    best = 0.0
    for edu in cleaned.raw.education:
        tier_str = (edu.tier or "unknown").lower().strip()
        score = EDUCATION_TIER_SCORES.get(tier_str, EDUCATION_TIER_SCORES["unknown"])
        best = max(best, score)
    return best


def _best_field_score(cleaned: CleanedCandidate) -> float:
    """Return the highest field-of-study alignment score across all education entries."""
    best = 0.0
    for edu in cleaned.raw.education:
        field = (edu.field_of_study or "").lower().strip()
        field_norm = normalize_field_of_study(field)
        # Exact match first
        score = FIELD_SCORES.get(field_norm, None)
        if score is None:
            # Partial match: find the best key contained in the field string
            score = 0.0
            for key, val in FIELD_SCORES.items():
                if key and key in field_norm:
                    score = max(score, val)
        best = max(best, score)
    return best


def _best_degree_score(cleaned: CleanedCandidate) -> float:
    """Return the highest degree level score across all education entries."""
    best = 0.0
    for edu in cleaned.raw.education:
        degree = (edu.degree or "").lower().strip()
        degree_norm = normalize_degree(degree)
        score = DEGREE_SCORES.get(degree_norm, None)
        if score is None:
            # Partial match
            score = 0.0
            for key, val in DEGREE_SCORES.items():
                if key and key in degree_norm:
                    score = max(score, val)
        best = max(best, score)
    return best


def compute_education_features(cleaned: CleanedCandidate) -> EducationFeatures:
    if not cleaned.raw.education:
        return EducationFeatures(
            edu_01=0.0, edu_02=0.0, edu_03=0.0, edu_composite=0.0
        )

    edu_01 = _best_education_tier(cleaned)
    edu_02 = _best_field_score(cleaned)
    edu_03 = _best_degree_score(cleaned)

    edu_composite = (
        0.40 * edu_01
        + 0.40 * edu_02
        + 0.20 * edu_03
    )
    edu_composite = clamp(edu_composite)

    return EducationFeatures(
        edu_01=edu_01,
        edu_02=edu_02,
        edu_03=edu_03,
        edu_composite=edu_composite,
    )
