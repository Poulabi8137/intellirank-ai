"""
Category 9: Candidate Potential Intelligence (PI-01 through PI-05).
"""

from __future__ import annotations

import math

from intellirank.constants import AI_ROLE_TITLE_KEYWORDS
from intellirank.types import (
    CleanedCandidate, SkillFeatures, CareerFeatures,
    ExperienceFeatures, EducationFeatures, LearningFeatures,
    RecruitabilityFeatures, PotentialFeatures,
)
from intellirank.utils.math_utils import clamp, geometric_mean


def compute_potential_features(
    cleaned: CleanedCandidate,
    si: SkillFeatures,
    ci: CareerFeatures,
    ei: ExperienceFeatures,
    edu: EducationFeatures,
    li: LearningFeatures,
    ri: RecruitabilityFeatures,
) -> PotentialFeatures:
    profile = cleaned.raw.profile

    # --- PI-01: Age-adjusted skill premium ---
    yoe = max(0.0, profile.years_of_experience or 0.0)
    expected_si = min(1.0, yoe / 12.0)
    skill_premium = max(0.0, si.si_composite - expected_si)
    pi_01 = clamp(skill_premium / 0.40)

    # --- PI-02: Academic-career excellence ---
    career_execution = 0.60 * ci.ci_07 + 0.40 * ci.ci_03
    combined = (edu.edu_01 * career_execution) ** 0.5
    synergy_bonus = 0.20 if (edu.edu_01 > 0.70 and career_execution > 0.60) else 0.0
    pi_02 = clamp(combined + synergy_bonus)

    # --- PI-03: Hidden gem pattern ---
    current_title = (profile.current_title or "").lower()
    has_obvious_ai_title = any(kw in current_title for kw in AI_ROLE_TITLE_KEYWORDS)

    if has_obvious_ai_title:
        pi_03 = 0.0
    else:
        hidden_gem_raw = 0.50 * si.si_04 + 0.50 * ci.ci_06
        if si.si_04 < 0.10 or ci.ci_06 < 0.10:
            pi_03 = hidden_gem_raw * 0.5
        else:
            pi_03 = clamp(hidden_gem_raw * 1.30)

    # --- PI-04: Founding team readiness ---
    # Requires: Tier-1 skill depth + startup affinity + learning + availability + loyalty
    components = [
        si.si_04,       # Tier-1 skill depth
        ci.ci_10,       # Startup affinity
        max(li.li_02, 0.25),  # GitHub (floor 0.25 if no GitHub)
        ri.ri_02,       # Short notice period
        ci.ci_05,       # Job loyalty
    ]
    pi_04 = clamp(geometric_mean(components))

    # --- PI-05: Composite ---
    pi_composite = (
        0.40 * pi_03
        + 0.30 * pi_04
        + 0.20 * pi_01
        + 0.10 * pi_02
    )
    pi_composite = clamp(pi_composite)

    return PotentialFeatures(
        pi_01=pi_01,
        pi_02=pi_02,
        pi_03=pi_03,
        pi_04=pi_04,
        pi_composite=pi_composite,
    )
