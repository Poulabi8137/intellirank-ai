"""
Category 10: Profile Quality Intelligence (PQ-01 through PQ-05).
"""

from __future__ import annotations

from intellirank.constants import AI_TERMS_WEIGHTED
from intellirank.types import (
    CleanedCandidate, CareerFeatures, ExperienceFeatures, QualityFeatures,
)
from intellirank.utils.math_utils import clamp, safe_div
from intellirank.utils.text_utils import scan_terms_weighted, count_words


def compute_quality_features(
    cleaned: CleanedCandidate,
    ci: CareerFeatures,
    ei: ExperienceFeatures,
) -> QualityFeatures:
    signals = cleaned.raw.redrob_signals
    profile = cleaned.raw.profile

    # --- PQ-01: Honeypot anomaly accumulator (raw integer) ---
    pq_01 = 0

    # Signal 1: signup > last_active (date impossibility)
    if cleaned.signup_after_active:
        pq_01 += 4

    # Signal 2: expert skills with duration_months=0 (impossible)
    expert_zero_duration = sum(
        1 for s in cleaned.raw.skills
        if s.proficiency in ("advanced", "expert") and s.duration_months == 0
    )
    pq_01 += min(10, expert_zero_duration * 2)

    # Signal 3: large YOE discrepancy
    if cleaned.yoe_gap > 5:
        pq_01 += 3

    # Signal 4: AI title but near-zero AI description evidence
    current_title = (profile.current_title or "").lower()
    from intellirank.constants import AI_ROLE_TITLE_KEYWORDS
    has_ai_title = any(kw in current_title for kw in AI_ROLE_TITLE_KEYWORDS)
    if has_ai_title and ci.ci_06 < 0.05:
        pq_01 += 3

    # Signal 5: no title-company consistency (title doesn't match any role)
    if ci.ci_09 == 0.0:
        pq_01 += 2

    # Signal 6: very high completeness + no assessments + no certs (suspicious)
    pcs = signals.profile_completeness_score
    has_assessments = bool(signals.skill_assessment_scores)
    has_certs = bool(cleaned.raw.certifications)
    if pcs >= 90 and not has_assessments and not has_certs:
        pq_01 += 1

    # --- PQ-02: Summary quality ---
    if cleaned.is_boilerplate_summary:
        pq_02 = 0.0
    else:
        summary = cleaned.summary_lower
        if not summary.strip():
            pq_02 = 0.0
        else:
            word_count = count_words(summary)
            if word_count < 20:
                pq_02 = 0.10
            else:
                raw_ai_spec = scan_terms_weighted(summary, AI_TERMS_WEIGHTED)
                # Normalize: 10 points = strong signal; density per 100 words
                density = raw_ai_spec / max(word_count, 1) * 100
                pq_02 = clamp(density / 5.0)  # 5 points per 100 words = max

    # --- PQ-03: Profile completeness ---
    pcs = clamp(pcs / 100.0)
    if pcs < 0.40:
        pq_03 = pcs ** 2 / 0.40  # quadratic penalty
    else:
        pq_03 = pcs
    pq_03 = clamp(pq_03)

    # --- PQ-04: Cross-field consistency ---
    # Average of: title consistency + experience verification + industry match + company match
    title_ok = ci.ci_09  # title matches company type
    exp_ok = ei.ei_02    # claimed YOE matches computed YOE

    # Industry match: profile.current_industry matches current career entry
    current_role_idx = cleaned.current_role_index
    if current_role_idx is not None and cleaned.raw.career_history:
        current_entry = cleaned.raw.career_history[current_role_idx]
        profile_industry = (profile.current_industry or "").lower().strip()
        role_industry = (current_entry.industry or "").lower().strip()
        industry_match = 1.0 if (profile_industry and role_industry and profile_industry == role_industry) else 0.5
        company_match = 1.0 if (
            (profile.current_company or "").lower().strip()
            == (current_entry.company or "").lower().strip()
        ) else 0.5
    else:
        industry_match = 0.5
        company_match = 0.5

    pq_04 = (title_ok + exp_ok + industry_match + company_match) / 4.0
    pq_04 = clamp(pq_04)

    # --- PQ-05: Composite ---
    # Invert PQ-01 for composite (lower anomaly = better quality)
    honeypot_component = max(0.0, 1.0 - pq_01 / 8.0)
    pq_composite = (
        0.40 * honeypot_component
        + 0.25 * pq_02
        + 0.20 * pq_03
        + 0.15 * pq_04
    )
    pq_composite = clamp(pq_composite)

    return QualityFeatures(
        pq_01=pq_01,
        pq_02=pq_02,
        pq_03=pq_03,
        pq_04=pq_04,
        pq_composite=pq_composite,
    )
