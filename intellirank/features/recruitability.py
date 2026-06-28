"""
Category 8: Recruitability Intelligence (RI-01 through RI-07).
"""

from __future__ import annotations

from intellirank.constants import (
    NOTICE_PERIOD_BREAKPOINTS, TIER_1_CITIES, TIER_2_CITIES,
    WORK_MODE_SCORES, SALARY_CENTER_LPA, SALARY_DEVIATION_NORM,
)
from intellirank.types import CleanedCandidate, BehavioralFeatures, RecruitabilityFeatures
from intellirank.utils.math_utils import clamp, piecewise_linear
from intellirank.utils.text_utils import normalize_location, normalize_country


def compute_recruitability_features(
    cleaned: CleanedCandidate,
    behavioral: BehavioralFeatures,
) -> RecruitabilityFeatures:
    signals = cleaned.raw.redrob_signals
    profile = cleaned.raw.profile

    # --- RI-01: Open-to-work modifier ---
    # open_to_work=True → 1.10; False → 0.85
    ri_01 = 1.10 if signals.open_to_work_flag else 0.85

    # --- RI-02: Notice period fit (piecewise) ---
    bps = [(float(d), s) for d, s in NOTICE_PERIOD_BREAKPOINTS]
    ri_02 = piecewise_linear(float(signals.notice_period_days), bps)

    # --- RI-03: Location fit ---
    location = normalize_location(profile.location or "")
    country = normalize_country(profile.country or "")
    willing = signals.willing_to_relocate

    if any(city in location for city in TIER_1_CITIES):
        ri_03 = 1.00
    elif any(city in location for city in TIER_2_CITIES):
        if willing:
            ri_03 = 0.80
        else:
            ri_03 = 0.65
    elif country == "india":
        if willing:
            ri_03 = 0.70
        else:
            ri_03 = 0.50
    else:  # diaspora / outside India
        if willing:
            ri_03 = 0.40
        else:
            ri_03 = 0.20

    # --- RI-04: Work mode compatibility ---
    mode = (signals.preferred_work_mode or "").lower().strip()
    ri_04 = WORK_MODE_SCORES.get(mode, 0.75)  # 0.75 default for unknown

    # --- RI-05: Contact reachability ---
    email_score = 0.50 if signals.verified_email else 0.0
    phone_score = 0.40 if signals.verified_phone else 0.0
    linkedin_score = 0.10 if signals.linkedin_connected else 0.0
    ri_05 = email_score + phone_score + linkedin_score
    # Floor: if neither email nor phone verified, minimum is 0.10
    if not signals.verified_email and not signals.verified_phone:
        ri_05 = max(0.10, ri_05)
    ri_05 = clamp(ri_05)

    # --- RI-06: Salary budget alignment ---
    midpoint = cleaned.salary_midpoint
    deviation = abs(midpoint - SALARY_CENTER_LPA)
    ri_06 = max(0.20, 1.0 - deviation / SALARY_DEVIATION_NORM)
    ri_06 = clamp(ri_06)

    # --- RI-07: Master recruitability multiplier ---
    # Step 1: behavioral gate (from BI composite)
    behavioral_gate = (
        0.40 * behavioral.bi_01
        + 0.30 * behavioral.bi_02
        + 0.20 * behavioral.bi_03
        + 0.10 * behavioral.bi_04
    )
    behavioral_gate = clamp(behavioral_gate)

    # Step 2: open-to-work modifier [0.77, 1.00]
    otw_modifier = 0.77 + 0.23 * ((ri_01 - 0.85) / 0.25)
    otw_modifier = clamp(otw_modifier, 0.77, 1.00)

    # Step 3: notice period floor [0.20, 1.00]
    notice_floor = ri_02

    # Step 4: contact reachability floor [0.55, 1.00]
    contact_floor = 0.50 + 0.50 * ri_05

    # Step 5: logistics [0.80, 1.00]
    logistics = 0.65 * ri_03 + 0.35 * ri_04
    logistics_modifier = 0.80 + 0.20 * logistics

    # Step 6: salary modifier [0.85+, 1.00]
    salary_modifier = 0.85 + 0.15 * ri_06

    ri_master = (
        behavioral_gate
        * otw_modifier
        * notice_floor
        * contact_floor
        * logistics_modifier
        * salary_modifier
    )
    ri_master = clamp(ri_master, 0.05, 1.00)

    return RecruitabilityFeatures(
        ri_01=ri_01,
        ri_02=ri_02,
        ri_03=ri_03,
        ri_04=ri_04,
        ri_05=ri_05,
        ri_06=ri_06,
        ri_master=ri_master,
    )
