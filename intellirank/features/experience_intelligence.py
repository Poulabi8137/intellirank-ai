"""
Category 4: Experience Intelligence (EI-01 through EI-05).
"""

from __future__ import annotations

import math

from intellirank.constants import (
    AI_ROLE_TITLE_KEYWORDS, YOE_IDEAL, YOE_SIGMA, AI_TENURE_NORM_MONTHS,
)
from intellirank.types import CleanedCandidate, ExperienceFeatures
from intellirank.utils.math_utils import clamp, gaussian_bell


_CODING_SIGNALS = {
    "implemented", "built", "developed", "wrote", "coded", "engineered",
    "deployed", "architected", "designed and implemented",
    "production code", "open-source", "github", "pull request",
    "refactored", "optimized", "shipped",
}

_MANAGER_SIGNALS = {
    "managed team", "led team", "team lead", "people manager",
    "reporting to me", "direct reports", "performance review",
    "headcount", "hiring plan", "organization", "org",
}


def _has_coding_evidence(all_descriptions: str) -> bool:
    return any(sig in all_descriptions for sig in _CODING_SIGNALS)


def _has_manager_without_coding(all_descriptions: str) -> bool:
    has_mgmt = any(sig in all_descriptions for sig in _MANAGER_SIGNALS)
    has_coding = _has_coding_evidence(all_descriptions)
    return has_mgmt and not has_coding


def compute_experience_features(cleaned: CleanedCandidate) -> ExperienceFeatures:
    profile = cleaned.raw.profile
    career = cleaned.raw.career_history
    all_desc = cleaned.all_descriptions

    claimed_yoe = profile.years_of_experience or 0.0

    # --- EI-01: YOE band fit (Gaussian bell, center=7 years, sigma=3) ---
    ei_01 = gaussian_bell(claimed_yoe, YOE_IDEAL, YOE_SIGMA)
    # Cap at 1.0 (it naturally stays below 1.0 except exactly at center)
    ei_01 = clamp(ei_01)

    # --- EI-02: Experience verification (1 - gap/5, floored at 0) ---
    gap = cleaned.yoe_gap
    ei_02 = clamp(max(0.0, 1.0 - gap / 5.0))

    # --- EI-03: Applied AI tenure (months in AI-title roles / 48) ---
    ai_role_months = 0.0
    for entry in career:
        title_lower = (entry.title or "").lower()
        if any(kw in title_lower for kw in AI_ROLE_TITLE_KEYWORDS):
            ai_role_months += entry.duration_months
    ei_03 = clamp(ai_role_months / AI_TENURE_NORM_MONTHS)

    # --- EI-04: Seniority-coding alignment ---
    # Senior people who still write code score high; managers who don't code score low
    current_title = (profile.current_title or "").lower()
    is_senior = any(w in current_title for w in ("senior", "lead", "principal", "staff", "vp", "head"))
    is_manager = any(w in current_title for w in ("manager", "director", "vp", "head of"))
    has_coding = _has_coding_evidence(all_desc)
    github = cleaned.raw.redrob_signals.github_activity_score

    if is_manager and not has_coding:
        ei_04 = 0.20  # Manager who stopped coding → JD disqualifier signal
    elif is_senior and has_coding:
        ei_04 = 1.00
    elif is_senior and not has_coding:
        # Check GitHub as fallback
        if github > 30:
            ei_04 = 0.70
        else:
            ei_04 = 0.40
    elif has_coding:
        ei_04 = 0.80
    else:
        ei_04 = 0.50  # No evidence either way

    # --- EI-05: Composite ---
    ei_composite = (
        0.40 * ei_01
        + 0.30 * ei_03
        + 0.20 * ei_04
        + 0.10 * ei_02
    )
    ei_composite = clamp(ei_composite)

    return ExperienceFeatures(
        ei_01=ei_01,
        ei_02=ei_02,
        ei_03=ei_03,
        ei_04=ei_04,
        ei_composite=ei_composite,
    )
