"""
Category 6: Learning Intelligence (LI-01 through LI-06).
"""

from __future__ import annotations

from intellirank.constants import (
    CERT_QUALITY_RULES, GITHUB_BREAKPOINTS,
    TIER_1_SKILLS, TIER_2_SKILLS, TIER_3_SKILLS,
)
from intellirank.types import CleanedCandidate, LearningFeatures
from intellirank.utils.math_utils import clamp, piecewise_linear
from intellirank.utils.text_utils import to_shadow, scan_terms_weighted
from intellirank.constants import AI_TERMS_WEIGHTED


_CERT_RECENCY_DECAY = {
    2026: 1.00, 2025: 0.95, 2024: 0.90, 2023: 0.80,
    2022: 0.70, 2021: 0.60, 2020: 0.50,
}

_SELF_LEARNING_TERMS = {
    "coursera": 1.5, "udemy": 1.2, "udacity": 1.5,
    "fast.ai": 2.0, "fastai": 2.0,
    "deeplearning.ai": 2.0, "deep learning specialization": 2.0,
    "kaggle": 1.5, "competition": 1.5,
    "side project": 1.5, "personal project": 1.5, "open source": 2.0,
    "blog": 1.0, "paper": 1.5, "arxiv": 2.0, "published": 2.0,
    "fine-tun": 1.5, "self-taught": 1.5, "self taught": 1.5,
    "hobby project": 1.5, "weekend project": 1.5,
}


def _cert_quality(name: str, issuer: str) -> float:
    """Match a certification against CERT_QUALITY_RULES."""
    name_lower = (name or "").lower()
    issuer_lower = (issuer or "").lower()
    for rule_issuer, rule_name, score in CERT_QUALITY_RULES:
        issuer_match = (not rule_issuer) or (rule_issuer in issuer_lower)
        name_match = (not rule_name) or (rule_name in name_lower)
        if issuer_match and name_match:
            return score
    return 0.20


def compute_learning_features(cleaned: CleanedCandidate) -> LearningFeatures:
    certs = cleaned.raw.certifications
    signals = cleaned.raw.redrob_signals
    all_desc = cleaned.all_descriptions
    summary = cleaned.summary_lower

    # --- LI-01: AI certification quality score ---
    if not certs:
        li_01 = 0.0
    else:
        cert_scores = []
        for cert in certs:
            name = cert.name or ""
            issuer = cert.issuer or ""
            year = cert.year or 2020
            quality = _cert_quality(name, issuer)
            decay = _CERT_RECENCY_DECAY.get(year, 0.40)
            cert_scores.append(quality * decay)
        cert_scores.sort(reverse=True)
        # Diminishing returns: first cert full, second cert 60%, third cert 30%
        weights = [1.0, 0.60, 0.30]
        li_01 = sum(s * w for s, w in zip(cert_scores, weights))
        li_01 = clamp(li_01)

    # --- LI-02: GitHub activity (piecewise, based on github_activity_score) ---
    github = signals.github_activity_score
    if github < 0:  # sentinel: not linked
        li_02 = 0.0
    else:
        bps = [(float(x), y) for x, y in GITHUB_BREAKPOINTS]
        li_02 = piecewise_linear(github, bps)

    # --- LI-03: Career pivot / growth signal ---
    # Proxy: recent roles show higher seniority than earlier roles (reuse CI-04 signal)
    career = cleaned.raw.career_history
    if len(career) < 2:
        li_03 = 0.30
    else:
        from intellirank.utils.date_utils import parse_date
        dated = []
        for entry in career:
            d = parse_date(entry.start_date) if entry.start_date else None
            dated.append((d, entry))
        dated.sort(key=lambda x: (x[0] is None, x[0]))
        # Has AI appeared in later roles but not earlier?
        first_title = (dated[0][1].title or "").lower()
        last_title = (dated[-1][1].title or "").lower()
        from intellirank.constants import AI_ROLE_TITLE_KEYWORDS
        first_has_ai = any(kw in first_title for kw in AI_ROLE_TITLE_KEYWORDS)
        last_has_ai = any(kw in last_title for kw in AI_ROLE_TITLE_KEYWORDS)
        if last_has_ai and not first_has_ai:
            li_03 = 0.80  # Clear pivot toward AI
        elif last_has_ai and first_has_ai:
            li_03 = 0.60  # Consistent AI trajectory
        else:
            li_03 = 0.20  # No AI trajectory

    # --- LI-04: Self-directed learning signal (summary + description scan) ---
    combined = all_desc + " " + summary
    raw_learn = scan_terms_weighted(combined, _SELF_LEARNING_TERMS)
    li_04 = clamp(raw_learn / 8.0)  # 8 points = max signal
    # Boilerplate check: if boilerplate summary, summary contributes 0
    if cleaned.is_boilerplate_summary:
        raw_learn = scan_terms_weighted(all_desc, _SELF_LEARNING_TERMS)
        li_04 = clamp(raw_learn / 8.0)

    # --- LI-05: Skill layer diversity ---
    all_skills_set = cleaned.all_skills_set
    tier1_present = bool(all_skills_set & TIER_1_SKILLS)
    tier2_present = bool(all_skills_set & TIER_2_SKILLS)
    tier3_present = bool(all_skills_set & TIER_3_SKILLS)
    layers = sum([tier1_present, tier2_present, tier3_present])
    li_05 = clamp(layers / 3.0)

    # --- LI-06: Composite ---
    li_composite = (
        0.30 * li_02
        + 0.25 * li_01
        + 0.20 * li_05
        + 0.15 * li_04
        + 0.10 * li_03
    )
    li_composite = clamp(li_composite)

    return LearningFeatures(
        li_01=li_01,
        li_02=li_02,
        li_03=li_03,
        li_04=li_04,
        li_05=li_05,
        li_composite=li_composite,
    )
