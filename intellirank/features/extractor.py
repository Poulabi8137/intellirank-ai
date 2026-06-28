"""
Feature extraction orchestrator.

Calls all 10 intelligence dimension modules in dependency-safe order
and assembles a CandidateFeatures record.
"""

from __future__ import annotations

from intellirank.cleaning.pipeline import clean_candidate
from intellirank.features.behavioral_intelligence import compute_behavioral_features
from intellirank.features.candidate_potential import compute_potential_features
from intellirank.features.career_intelligence import compute_career_features
from intellirank.features.corpus_stats import CorpusStats
from intellirank.features.domain_intelligence import compute_domain_features
from intellirank.features.education_intelligence import compute_education_features
from intellirank.features.experience_intelligence import compute_experience_features
from intellirank.features.learning_intelligence import compute_learning_features
from intellirank.features.profile_quality import compute_quality_features
from intellirank.features.recruitability import compute_recruitability_features
from intellirank.features.skill_intelligence import compute_skill_features
from intellirank.types import Candidate, CandidateFeatures, CleanedCandidate
from intellirank.utils.math_utils import clamp


def extract_features(
    candidate: Candidate,
    corpus: CorpusStats,
) -> CandidateFeatures:
    """
    Full feature extraction pipeline for one candidate.
    Returns a CandidateFeatures with all sub-features and composites populated.
    """
    # Stage 3-4: Clean and derive Layer 1 fields
    cleaned = clean_candidate(candidate)

    # Stage 5: Feature extraction in dependency-safe order

    # Layer 3: Dimension sub-features (no cross-dimension deps)
    si = compute_skill_features(
        cleaned,
        p95_jd_skill_score=corpus.p95_jd_skill_score,
        p95_tier1_depth_score=corpus.p95_tier1_depth_score,
    )
    ci = compute_career_features(
        cleaned,
        p95_ai_description_score=corpus.p95_ai_description_score,
        p95_production_score=corpus.p95_production_score,
    )
    di = compute_domain_features(
        cleaned,
        p95_ai_domain_months=corpus.p95_ai_domain_months,
    )
    ei = compute_experience_features(cleaned)
    edu = compute_education_features(cleaned)
    li = compute_learning_features(cleaned)
    bi = compute_behavioral_features(
        cleaned,
        p95_bi02_response_quality=corpus.p95_bi02_response_quality,
    )

    # Layer 3.5: Recruitability (depends on BI)
    ri = compute_recruitability_features(cleaned, bi)

    # Layer 3.5: Cross-dimension potential (depends on SI, CI, EI, EDU, LI, RI)
    pi = compute_potential_features(cleaned, si, ci, ei, edu, li, ri)

    # Layer 3.5: Quality (depends on CI, EI)
    pq = compute_quality_features(cleaned, ci, ei)

    # Stage 6: Explainability metadata
    skills = cleaned.raw.skills
    assessments = cleaned.raw.redrob_signals.skill_assessment_scores
    from intellirank.constants import TIER_1_SKILLS, TIER_2_SKILLS
    from intellirank.utils.math_utils import skill_trust_score
    from intellirank.constants import PROFICIENCY_WEIGHTS

    tier1_skills_scored = []
    tier2_skills_scored = []
    for s in skills:
        name_lower = s.name.lower().strip()
        p = PROFICIENCY_WEIGHTS.get(s.proficiency, 1.0)
        trust = skill_trust_score(p, s.endorsements, s.duration_months)
        if name_lower in TIER_1_SKILLS:
            tier1_skills_scored.append((s.name, trust))
        elif name_lower in TIER_2_SKILLS:
            tier2_skills_scored.append((s.name, trust))

    tier1_skills_scored.sort(key=lambda x: x[1], reverse=True)
    tier2_skills_scored.sort(key=lambda x: x[1], reverse=True)

    top_tier1 = [name for name, _ in tier1_skills_scored[:3]]
    top_tier2 = [name for name, _ in tier2_skills_scored[:2]]

    best_assessment_skill = ""
    best_assessment_score = 0.0
    for skill_name, score in sorted(assessments.items(), key=lambda x: x[1], reverse=True):
        best_assessment_skill = skill_name
        best_assessment_score = score / 100.0
        break

    profile = cleaned.raw.profile

    return CandidateFeatures(
        candidate_id=candidate.candidate_id,
        skill=si,
        career=ci,
        domain=di,
        experience=ei,
        education=edu,
        learning=li,
        behavioral=bi,
        recruitability=ri,
        potential=pi,
        quality=pq,
        # Explainability fields
        top_tier1_skills=top_tier1,
        top_tier2_skills=top_tier2,
        has_production_evidence=ci.ci_07 > 0.10,
        has_ai_description=ci.ci_06 > 0.10,
        is_hidden_gem=pi.pi_03 > 0.30,
        is_pivot_candidate=ci.ci_11 == 1.0,
        has_active_github=cleaned.raw.redrob_signals.github_activity_score > 30,
        notice_period_days=cleaned.raw.redrob_signals.notice_period_days,
        days_since_active=cleaned.days_inactive,
        has_consulting_flag=ci.ci_02 == 1.0,
        github_linked=cleaned.raw.redrob_signals.github_activity_score >= 0,
        current_title=profile.current_title or "",
        current_company=profile.current_company or "",
        years_of_experience=profile.years_of_experience or 0.0,
        location=profile.location or "",
        best_assessment_skill=best_assessment_skill,
        best_assessment_score=best_assessment_score,
    )
