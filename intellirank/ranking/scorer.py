"""MCIS scoring engine — implements MCIS-01 through MCIS-07."""

from __future__ import annotations

from intellirank.config import PipelineConfig
from intellirank.types import CandidateFeatures
from intellirank.utils.math_utils import clamp


def compute_technical_fit(features: CandidateFeatures, config: PipelineConfig) -> float:
    """
    MCIS-01: Weighted sum of 7 dimension composites.
    Weights: SI=0.35, CI=0.20, EI=0.15, DI=0.10, LI=0.10, EDU=0.05, PI=0.05
    Output: [0.0, 1.0]
    """
    return clamp(
        config.weight_si  * features.skill.si_composite
        + config.weight_ci  * features.career.ci_composite
        + config.weight_ei  * features.experience.ei_composite
        + config.weight_di  * features.domain.di_composite
        + config.weight_li  * features.learning.li_composite
        + config.weight_edu * features.education.edu_composite
        + config.weight_pi  * features.potential.pi_composite
    )


def compute_confidence_score(features: CandidateFeatures) -> float:
    """
    MCIS-07: Geometric mean of evidence breadth and depth.
    Evidence breadth: how many independent signal types corroborate the profile.
    Evidence depth: Tier-1 skill composite (strongest predictor).
    Output: [0.0, 1.0]
    """
    si = features.skill
    ci = features.career
    li = features.learning
    edu = features.education
    ei = features.experience

    evidence_sources = 0
    if si.si_04 > 0.10:    evidence_sources += 1   # Tier-1 skill depth present
    if si.si_03 > 0.10:    evidence_sources += 2   # Assessment-backed (high value — counts double)
    if ci.ci_06 > 0.15:    evidence_sources += 1   # AI description specificity
    if ci.ci_07 > 0.10:    evidence_sources += 1   # Production deployment evidence
    if li.li_02 > 0.0:     evidence_sources += 1   # GitHub linked and active
    if li.li_01 > 0.10:    evidence_sources += 1   # AI certifications present
    if edu.edu_01 > 0.40:  evidence_sources += 1   # Recognized institution
    if ei.ei_02 > 0.80:    evidence_sources += 1   # Verifiable YOE

    evidence_breadth = evidence_sources / 9.0   # max_sources = 9
    evidence_depth = si.si_composite
    return (evidence_breadth * evidence_depth) ** 0.5


def score_candidate(features: CandidateFeatures, config: PipelineConfig) -> CandidateFeatures:
    """
    Apply MCIS-01 through MCIS-07.
    Mutates and returns the same features object with technical_fit,
    final_score, and confidence_score populated.
    """
    # MCIS-01: Technical fit (weighted sum of 7 dimension composites)
    technical_fit = compute_technical_fit(features, config)

    # MCIS-02: Recruitability gate (behavioral × availability × logistics multiplier)
    ri_master = features.recruitability.ri_master
    gated_score = technical_fit * ri_master

    # MCIS-03: Profile quality adjustment; PQ=0 → 0.80×; PQ=1 → 1.00×
    pq_composite = features.quality.pq_composite
    quality_modifier = (
        config.quality_modifier_floor
        + config.quality_modifier_range * pq_composite
    )
    quality_adjusted = gated_score * quality_modifier

    # MCIS-04: Honeypot anomaly gate; PQ_01=10 → floor at 0.05
    pq_01 = features.quality.pq_01
    honeypot_penalty = min(1.0, pq_01 / config.honeypot_gate_denominator)
    honeypot_gate = max(config.honeypot_gate_floor, 1.0 - honeypot_penalty)
    anomaly_gated = quality_adjusted * honeypot_gate

    # MCIS-05: Clip to valid submission range
    final_score = min(1.000, max(0.001, anomaly_gated))

    # MCIS-07: Confidence (not used in sort; stored for explainability)
    confidence_score = compute_confidence_score(features)

    features.technical_fit = technical_fit
    features.final_score = final_score
    features.confidence_score = confidence_score
    return features
