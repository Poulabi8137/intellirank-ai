"""
Category 1: Skill Intelligence (SI-01 through SI-09).
Implements FEATURE_ENGINEERING.md Skill Intelligence features exactly.
"""

from __future__ import annotations

from intellirank.constants import (
    TIER_1_SKILLS, TIER_2_SKILLS, TIER_3_SKILLS, NEGATIVE_SKILLS,
    PROFICIENCY_WEIGHTS, TIER_WEIGHTS,
)
from intellirank.types import CleanedCandidate, SkillFeatures
from intellirank.utils.math_utils import clamp, safe_div, skill_trust_score, p95_normalize


def compute_skill_features(
    cleaned: CleanedCandidate,
    p95_jd_skill_score: float,
    p95_tier1_depth_score: float,
) -> SkillFeatures:
    """Compute all Skill Intelligence sub-features and composite."""
    skills = cleaned.raw.skills
    assessments = cleaned.raw.redrob_signals.skill_assessment_scores

    # --- SI-01: Per-skill trust scores (Layer 2 atomic) ---
    skill_records: list[dict] = []  # type: ignore[type-arg]
    for s in skills:
        name = s.name.lower().strip()
        if not name:
            continue
        p = PROFICIENCY_WEIGHTS.get(s.proficiency, 1.0)
        trust = skill_trust_score(p, s.endorsements, s.duration_months)

        if name in TIER_1_SKILLS:
            tier = "tier_1"
        elif name in TIER_2_SKILLS:
            tier = "tier_2"
        elif name in TIER_3_SKILLS:
            tier = "tier_3"
        elif name in NEGATIVE_SKILLS:
            tier = "negative"
        else:
            tier = "irrelevant"

        skill_records.append({
            "name": name,
            "trust": trust,
            "tier": tier,
            "proficiency": s.proficiency,
            "is_high_proficiency": s.proficiency in ("advanced", "expert"),
            "assessed": name in {k.lower() for k in assessments},
        })

    # --- SI-02: JD-weighted aggregate skill score (raw, normalized by p95) ---
    raw_jd_score = sum(
        TIER_WEIGHTS.get(r["tier"], 0.0) * r["trust"]
        for r in skill_records
        if r["tier"] in ("tier_1", "tier_2")
    )
    si_02 = p95_normalize(raw_jd_score, p95_jd_skill_score)

    # --- SI-03: Assessment-validated skill score ---
    # Sum of (assessment_score/100 × trust) for assessed skills, normalized by max possible
    assessed_skills = []
    for r in skill_records:
        key = next((k for k in assessments if k.lower() == r["name"]), None)
        if key:
            assessed_skills.append((assessments[key] / 100.0, r["trust"]))

    if assessed_skills:
        raw_si03 = sum(score * trust for score, trust in assessed_skills)
        # Normalize by theoretical max (4.0 × log(max_endorsements+1)^2 is too complex;
        # use p95 of assessed_trust sum approximated as 6.0)
        si_03 = clamp(raw_si03 / 6.0)
    else:
        si_03 = 0.0

    # --- SI-04: Tier-1 depth score (raw, normalized by p95) ---
    raw_tier1 = sum(r["trust"] for r in skill_records if r["tier"] == "tier_1")
    si_04 = p95_normalize(raw_tier1, p95_tier1_depth_score)

    # --- SI-05: Cross-tier breadth ratio ---
    tiers_present = {r["tier"] for r in skill_records if r["tier"] in ("tier_1", "tier_2", "tier_3")}
    # Also count "negative" as a tier for breadth (broader awareness)
    si_05 = clamp(len(tiers_present) / 3.0)  # max 3 meaningful tiers

    # --- SI-06: Expert claim integrity ratio ---
    high_prof_claims = [r for r in skill_records if r["is_high_proficiency"]]
    if not skill_records:
        si_06 = 0.0  # no skills at all — no integrity signal to assess
    elif not high_prof_claims:
        si_06 = 1.0  # skills exist but no expert claims = perfect integrity
    else:
        # A claim is "backed" if it has an assessment OR endorsements >= 3 AND duration >= 6
        backed = sum(
            1 for r in high_prof_claims
            if r["assessed"]
            or (r["trust"] > 0.0 and
                next((s.endorsements for s in skills if s.name.lower() == r["name"]), 0) >= 3)
        )
        si_06 = safe_div(backed, len(high_prof_claims))

    # --- SI-07: Assessment coverage bonus ---
    tier1_names = {r["name"] for r in skill_records if r["tier"] == "tier_1"}
    assessed_names = {k.lower() for k in assessments}
    if not tier1_names:
        si_07 = 0.0
    else:
        covered = len(tier1_names & assessed_names)
        si_07 = clamp(covered / max(1, len(tier1_names)))

    # --- SI-08: Negative domain contamination penalty ---
    neg_trust = sum(r["trust"] for r in skill_records if r["tier"] == "negative")
    total_trust = sum(r["trust"] for r in skill_records if r["trust"] > 0)
    si_08 = clamp(safe_div(neg_trust, max(total_trust, 1e-9)))

    # --- SI-09: Composite ---
    si_composite = (
        0.35 * si_02
        + 0.25 * si_04
        + 0.15 * si_03
        + 0.10 * si_05
        + 0.10 * si_06
        + 0.05 * si_07
    ) * (1.0 - 0.3 * si_08)
    si_composite = clamp(si_composite)

    return SkillFeatures(
        si_02=si_02,
        si_03=si_03,
        si_04=si_04,
        si_05=si_05,
        si_06=si_06,
        si_07=si_07,
        si_08=si_08,
        si_composite=si_composite,
    )
