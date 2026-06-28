"""Explainability: structured score decomposition and reasoning string generation."""

from __future__ import annotations

from dataclasses import dataclass

from intellirank.config import PipelineConfig
from intellirank.constants import TIER_1_CITIES
from intellirank.types import CandidateFeatures
from intellirank.utils.text_utils import normalize_location


def _is_tier1_city(location: str) -> bool:
    loc = normalize_location(location)
    return any(city in loc for city in TIER_1_CITIES)


def _infer_domain_label(features: CandidateFeatures) -> str:
    if features.top_tier1_skills:
        return "AI/ML retrieval"
    if features.career.ci_06 > 0.10:
        return "AI engineering"
    if features.domain.di_03 > 0.10:
        return "search and recommendation"
    return "technical"


def _build_strengths(features: CandidateFeatures, config: PipelineConfig) -> list[str]:
    si = features.skill
    ci = features.career
    li = features.learning
    edu = features.education
    bi = features.behavioral
    ri = features.recruitability

    strengths: list[str] = []

    if features.best_assessment_skill and features.best_assessment_score > 0.50:
        pct = int(features.best_assessment_score * 100)
        strengths.append(
            f"Objective assessment: {features.best_assessment_skill} ({pct}%)"
        )

    if si.si_composite > 0.60 and features.top_tier1_skills:
        skill_list = ", ".join(features.top_tier1_skills[:2])
        strengths.append(f"Strong Tier-1 AI skill coverage: {skill_list}")
    elif si.si_04 > 0.25 and features.top_tier1_skills:
        strengths.append(f"Tier-1 skill depth: {features.top_tier1_skills[0]}")

    if ci.ci_07 > 0.20:
        strengths.append("Production ML deployment evidence in role descriptions")
    elif ci.ci_06 > 0.25:
        strengths.append("Strong AI-specific career description evidence")

    if features.has_active_github:
        strengths.append("Active GitHub contributor — hands-on coding evidence")

    if features.is_hidden_gem:
        strengths.append("Hidden gem: non-AI title masks strong retrieval background")

    if features.is_pivot_candidate:
        strengths.append("AI career pivot — growth mindset demonstrated")

    if edu.edu_01 >= 0.75:
        strengths.append("Tier-1 academic institution (IIT/IISc/BITS)")

    if ci.ci_03 > 0.50:
        strengths.append("Substantial product company experience")

    if bi.bi_01 > 0.80 and ri.ri_master > 0.55:
        strengths.append("Highly recruitable: active, responsive, and available")

    return strengths[:3]


def _build_weaknesses(features: CandidateFeatures, config: PipelineConfig) -> list[str]:
    si = features.skill
    ci = features.career
    ri = features.recruitability
    pq = features.quality

    weaknesses: list[str] = []

    if features.has_consulting_flag:
        weaknesses.append("Exclusively consulting background — core JD disqualifier")

    if si.si_04 < 0.05:
        weaknesses.append("No Tier-1 AI skills (FAISS/Qdrant/RAG/embeddings) detected")
    elif si.si_composite < 0.15:
        weaknesses.append("Weak JD-aligned skill coverage overall")

    if features.days_since_active > 180:
        weaknesses.append(
            f"Platform inactive {features.days_since_active} days — recruitability concern"
        )
    elif features.days_since_active > 90:
        weaknesses.append(f"Platform inactive {features.days_since_active} days")

    if features.notice_period_days > 90:
        weaknesses.append(
            f"Long notice period: {features.notice_period_days} days (JD prefers ≤30)"
        )
    elif features.notice_period_days > 60:
        weaknesses.append(f"Notice period: {features.notice_period_days} days")

    if pq.pq_01 >= 4:
        weaknesses.append(
            f"Profile data anomalies: {pq.pq_01} integrity signals flagged"
        )
    elif pq.pq_01 >= 2:
        weaknesses.append(f"Minor profile data concerns ({pq.pq_01} anomaly signals)")

    if ri.ri_master < 0.30:
        weaknesses.append("Very low recruitability score constrains final ranking")
    elif ci.ci_08 > 0.50:
        weaknesses.append("Consulting-style vocabulary detected in role descriptions")

    return weaknesses[:3]


def _opening_phrase(features: CandidateFeatures, rank: int) -> str:
    """
    Generate one of 4 opening templates, rotating by (rank - 1) % 4.
    Different candidates produce different phrasing even within the same template
    because their title, yoe, and location differ.
    """
    title = features.current_title or "AI/ML Engineer"
    yoe = features.years_of_experience
    location = features.location or ""

    variant = (rank - 1) % 4

    if variant == 0:
        yoe_str = f"{int(yoe)}yr" if yoe == int(yoe) else f"{yoe:.1f}yr"
        return f"{title} with {yoe_str} experience"

    if variant == 1:
        yoe_int = int(yoe)
        if yoe_int >= 1:
            return f"{yoe_int}-year AI/ML professional"
        return "Early-career AI professional"

    if variant == 2:
        if _is_tier1_city(location):
            city = location.split(",")[0].strip().title()
            return f"Based in {city}, {title.lower()}"
        domain = _infer_domain_label(features)
        return f"Strong {domain} background"

    # variant == 3
    return "Technical AI/ML professional"


def generate_reasoning(features: CandidateFeatures, rank: int) -> str:
    """
    Generate a 1–2 sentence reasoning string for a ranked candidate.
    Follows MCIS-06 honesty rules: no hallucinated skills, no invented YOE.
    Mandatory disclosures: notice > 60 days, is_hidden_gem, rank >= 80.
    """
    opening = _opening_phrase(features, rank)
    tier1 = features.top_tier1_skills
    tier2 = features.top_tier2_skills
    company = features.current_company or ""
    notice = features.notice_period_days
    days_inactive = features.days_since_active

    # --- Sentence 1: Opening + up to 2 primary positive signals ---
    signals: list[str] = []

    if features.is_hidden_gem:
        signals.append(
            "non-AI title but strong retrieval/embedding evidence in role descriptions"
        )

    if tier1:
        if len(tier1) >= 2:
            signals.append(f"expertise in {tier1[0]} and {tier1[1]}")
        else:
            signals.append(f"hands-on {tier1[0]} experience")
    elif tier2:
        signals.append(f"background in {tier2[0]}")

    if features.has_production_evidence:
        if company and (rank - 1) % 2 == 0:
            signals.append(f"production ML deployments at {company}")
        else:
            signals.append("production ML deployment evidence")
    elif features.has_ai_description and not tier1:
        signals.append("AI-specific experience in career descriptions")

    if features.best_assessment_skill and features.best_assessment_score > 0.60:
        pct = int(features.best_assessment_score * 100)
        signals.append(
            f"assessment-validated in {features.best_assessment_skill} ({pct}%)"
        )

    if features.has_active_github and (rank - 1) % 2 == 0:
        signals.append("active GitHub contributor")

    if features.is_pivot_candidate and not features.is_hidden_gem:
        signals.append("AI career pivot from prior background")

    if _is_tier1_city(features.location or "") and (rank - 1) % 4 != 2:
        city = (features.location or "").split(",")[0].strip().title()
        signals.append(f"based in {city}")

    if signals:
        sentence1 = f"{opening} — {', '.join(signals[:2])}."
    else:
        sentence1 = f"{opening}."

    # --- Sentence 2: Extra signals, mandatory concerns, rank acknowledgement ---
    s2_parts: list[str] = []

    if len(signals) > 2:
        s2_parts.append(f"Also: {', '.join(signals[2:4])}")

    concerns: list[str] = []
    if notice > 60:
        concerns.append(f"{notice}-day notice period")
    if features.has_consulting_flag:
        concerns.append("consulting-only background (JD caution)")
    if days_inactive > 180:
        concerns.append(f"inactive {days_inactive}d on platform")
    if features.quality.pq_01 >= 2 and rank <= 20:
        concerns.append(f"profile anomalies flagged (score={features.quality.pq_01})")

    if concerns:
        label = "Concerns:" if s2_parts else "Note:"
        s2_parts.append(f"{label} {'; '.join(concerns[:2])}")

    if rank >= 80:
        s2_parts.append(
            f"Ranked {rank}/100 — at threshold; adjacent skills noted but below typical top-50"
        )
    elif rank >= 50:
        s2_parts.append(f"Ranked {rank}/100")

    sentence2 = "; ".join(s2_parts)
    if sentence2 and not sentence2.endswith("."):
        sentence2 += "."

    return (sentence1 + (" " + sentence2 if sentence2 else "")).strip()


@dataclass
class ExplainabilityReport:
    """Full score decomposition and human-readable interpretation for one ranked candidate."""

    # Identity
    candidate_id: str
    rank: int

    # MCIS component breakdown
    final_score: float
    technical_fit: float
    behavioral_gate: float      # RI_master
    quality_modifier: float     # 0.80 + 0.20 × PQ_composite
    honeypot_gate: float        # max(0.05, 1 − PQ_01 / 10)
    confidence_score: float

    # Dimension scores
    dim_composites: dict[str, float]       # raw composite per dimension
    dim_contributions: dict[str, float]    # weight × composite (weighted contribution to TF)
    top_dimensions: list[str]              # dimension names sorted by contribution (highest first)

    # Positive signals (from extractor metadata)
    top_tier1_skills: list[str]
    top_tier2_skills: list[str]
    has_production_evidence: bool
    has_ai_description: bool
    is_hidden_gem: bool
    is_pivot_candidate: bool
    has_active_github: bool
    github_linked: bool

    # Concerns
    notice_period_days: int
    days_since_active: int
    has_consulting_flag: bool
    anomaly_score: int           # PQ_01 raw count

    # Identity details
    current_title: str
    current_company: str
    years_of_experience: float
    location: str
    best_assessment_skill: str
    best_assessment_score: float

    # Human-readable interpretation
    strengths: list[str]         # up to 3 key positive signals
    weaknesses: list[str]        # up to 3 key concerns
    reasoning: str               # 1–2 sentence submission reasoning


def build_explainability_report(
    features: CandidateFeatures,
    config: PipelineConfig,
    rank: int,
) -> ExplainabilityReport:
    """Build a complete ExplainabilityReport for an already-scored, ranked candidate."""

    # Recompute MCIS intermediates (deterministic from features + config)
    ri_master = features.recruitability.ri_master
    pq_composite = features.quality.pq_composite
    pq_01 = features.quality.pq_01

    quality_modifier = (
        config.quality_modifier_floor + config.quality_modifier_range * pq_composite
    )
    honeypot_penalty = min(1.0, pq_01 / config.honeypot_gate_denominator)
    honeypot_gate = max(config.honeypot_gate_floor, 1.0 - honeypot_penalty)

    dim_composites: dict[str, float] = {
        "Skill Intelligence":      features.skill.si_composite,
        "Career Intelligence":     features.career.ci_composite,
        "Experience Intelligence": features.experience.ei_composite,
        "Domain Intelligence":     features.domain.di_composite,
        "Learning Intelligence":   features.learning.li_composite,
        "Education Intelligence":  features.education.edu_composite,
        "Candidate Potential":     features.potential.pi_composite,
    }
    dim_contributions: dict[str, float] = {
        "Skill Intelligence":      config.weight_si  * features.skill.si_composite,
        "Career Intelligence":     config.weight_ci  * features.career.ci_composite,
        "Experience Intelligence": config.weight_ei  * features.experience.ei_composite,
        "Domain Intelligence":     config.weight_di  * features.domain.di_composite,
        "Learning Intelligence":   config.weight_li  * features.learning.li_composite,
        "Education Intelligence":  config.weight_edu * features.education.edu_composite,
        "Candidate Potential":     config.weight_pi  * features.potential.pi_composite,
    }
    top_dimensions = sorted(
        dim_contributions.keys(),
        key=lambda k: dim_contributions[k],
        reverse=True,
    )

    return ExplainabilityReport(
        candidate_id=features.candidate_id,
        rank=rank,
        final_score=features.final_score,
        technical_fit=features.technical_fit,
        behavioral_gate=ri_master,
        quality_modifier=quality_modifier,
        honeypot_gate=honeypot_gate,
        confidence_score=features.confidence_score,
        dim_composites=dim_composites,
        dim_contributions=dim_contributions,
        top_dimensions=list(top_dimensions),
        top_tier1_skills=list(features.top_tier1_skills),
        top_tier2_skills=list(features.top_tier2_skills),
        has_production_evidence=features.has_production_evidence,
        has_ai_description=features.has_ai_description,
        is_hidden_gem=features.is_hidden_gem,
        is_pivot_candidate=features.is_pivot_candidate,
        has_active_github=features.has_active_github,
        github_linked=features.github_linked,
        notice_period_days=features.notice_period_days,
        days_since_active=features.days_since_active,
        has_consulting_flag=features.has_consulting_flag,
        anomaly_score=pq_01,
        current_title=features.current_title,
        current_company=features.current_company,
        years_of_experience=features.years_of_experience,
        location=features.location,
        best_assessment_skill=features.best_assessment_skill,
        best_assessment_score=features.best_assessment_score,
        strengths=_build_strengths(features, config),
        weaknesses=_build_weaknesses(features, config),
        reasoning=generate_reasoning(features, rank),
    )
