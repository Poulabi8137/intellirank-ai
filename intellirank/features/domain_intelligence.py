"""
Category 3: Domain Intelligence (DI-01 through DI-04).
"""

from __future__ import annotations

from intellirank.constants import (
    AI_DOMAIN_INDUSTRIES, TALENT_TECH_SIGNALS, SEARCH_REC_SIGNALS,
)
from intellirank.types import CleanedCandidate, DomainFeatures
from intellirank.utils.math_utils import clamp, p95_normalize


def compute_domain_features(
    cleaned: CleanedCandidate,
    p95_ai_domain_months: float,
) -> DomainFeatures:
    career = cleaned.raw.career_history
    all_desc = cleaned.all_descriptions

    # --- DI-01: AI domain experience (months in AI-domain roles, p95 normalized) ---
    ai_months = 0.0
    for entry in career:
        industry = (entry.industry or "").lower().strip()
        if industry in AI_DOMAIN_INDUSTRIES:
            ai_months += entry.duration_months
    di_01 = p95_normalize(ai_months, p95_ai_domain_months)

    # --- DI-02 + DI-03: Single pass for both term sets on the same text ---
    talent_hits = 0
    search_hits = 0
    for term in TALENT_TECH_SIGNALS:
        if term in all_desc:
            talent_hits += 1
    for term in SEARCH_REC_SIGNALS:
        if term in all_desc:
            search_hits += 1
    di_02 = clamp(talent_hits / 9.0)
    di_03 = clamp(search_hits / 9.0)

    # --- DI-04: Composite ---
    di_composite = 0.40 * di_01 + 0.35 * di_03 + 0.25 * di_02
    di_composite = clamp(di_composite)

    return DomainFeatures(
        di_01=di_01,
        di_02=di_02,
        di_03=di_03,
        di_composite=di_composite,
    )
