"""
Category 7: Behavioral Intelligence (BI-01 through BI-06).
"""

from __future__ import annotations

from intellirank.constants import RECENCY_BREAKPOINTS
from intellirank.types import CleanedCandidate, BehavioralFeatures
from intellirank.utils.math_utils import clamp, piecewise_linear


def compute_behavioral_features(
    cleaned: CleanedCandidate,
    p95_bi02_response_quality: float,
) -> BehavioralFeatures:
    signals = cleaned.raw.redrob_signals

    # --- BI-01: Platform recency (piecewise based on days_inactive) ---
    days = cleaned.days_inactive
    bps = [(float(d), s) for d, s in RECENCY_BREAKPOINTS]
    bi_01 = piecewise_linear(float(days), bps)

    # --- BI-02: Recruiter response quality ---
    rr = signals.recruiter_response_rate
    avg_hours = signals.avg_response_time_hours

    # Speed factor (higher = faster response)
    if avg_hours <= 2:
        speed_factor = 1.0
    elif avg_hours <= 24:
        speed_factor = 1.0 - (avg_hours - 2.0) / 22.0 * 0.20
    elif avg_hours <= 72:
        speed_factor = 0.80 - (avg_hours - 24.0) / 48.0 * 0.30
    elif avg_hours <= 168:
        speed_factor = 0.50 - (avg_hours - 72.0) / 96.0 * 0.30
    else:
        speed_factor = 0.20

    raw_bi02 = rr * speed_factor
    bi_02 = clamp(raw_bi02 / p95_bi02_response_quality)

    # --- BI-03: Interview reliability (piecewise) ---
    icr = signals.interview_completion_rate
    if icr < 0.30:
        bi_03 = icr * 0.50
    elif icr < 0.70:
        bi_03 = 0.15 + (icr - 0.30) / 0.40 * 0.50
    else:
        bi_03 = 0.65 + (icr - 0.70) / 0.30 * 0.35
    bi_03 = clamp(bi_03)

    # --- BI-04: Offer behavior ---
    oar = signals.offer_acceptance_rate
    if oar < 0:  # sentinel: no prior offers
        bi_04 = 0.65  # neutral default
    elif oar >= 0.70:
        bi_04 = 0.80 + (oar - 0.70) / 0.30 * 0.20
    elif oar >= 0.30:
        bi_04 = 0.50 + (oar - 0.30) / 0.40 * 0.30
    else:
        bi_04 = oar / 0.30 * 0.50
    bi_04 = clamp(bi_04)

    # --- BI-05: Platform engagement index ---
    saved_norm = clamp(signals.saved_by_recruiters_30d / 10.0)
    apps_norm = clamp(signals.applications_submitted_30d / 5.0)
    views_norm = clamp(signals.profile_views_received_30d / 50.0)
    bi_05 = 0.55 * saved_norm + 0.30 * apps_norm + 0.15 * views_norm
    bi_05 = clamp(bi_05)

    # --- BI-06: Composite ---
    bi_composite = (
        0.40 * bi_01
        + 0.30 * bi_02
        + 0.20 * bi_03
        + 0.10 * bi_04
    )
    bi_composite = clamp(bi_composite)

    return BehavioralFeatures(
        bi_01=bi_01,
        bi_02=bi_02,
        bi_03=bi_03,
        bi_04=bi_04,
        bi_05=bi_05,
        bi_composite=bi_composite,
    )
