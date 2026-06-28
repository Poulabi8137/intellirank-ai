"""Phase 4 — Feature Engineering Engine tests."""

from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from intellirank.cleaning.pipeline import clean_candidate
from intellirank.config import SAMPLE_CANDIDATES_JSON
from intellirank.features.behavioral_intelligence import compute_behavioral_features
from intellirank.features.candidate_potential import compute_potential_features
from intellirank.features.career_intelligence import compute_career_features
from intellirank.features.corpus_stats import CorpusStats, _percentile, _raw_jd_skill_score
from intellirank.features.domain_intelligence import compute_domain_features
from intellirank.features.education_intelligence import compute_education_features
from intellirank.features.experience_intelligence import compute_experience_features
from intellirank.features.extractor import extract_features
from intellirank.features.learning_intelligence import compute_learning_features
from intellirank.features.profile_quality import compute_quality_features
from intellirank.features.recruitability import compute_recruitability_features
from intellirank.features.skill_intelligence import compute_skill_features
from intellirank.types import Candidate, CandidateFeatures


# ---------------------------------------------------------------------------
# Default corpus stats for tests (realistic but not corpus-computed)
# ---------------------------------------------------------------------------

DEFAULT_CORPUS = CorpusStats(
    p95_jd_skill_score=80.0,
    p95_tier1_depth_score=30.0,
    p95_ai_description_score=25.0,
    p95_production_score=15.0,
    p95_bi02_response_quality=0.60,
    p95_ai_domain_months=48.0,
    total_candidates=100,
)


def _make_candidate(**kwargs) -> Candidate:  # type: ignore[type-arg]
    base = {
        "candidate_id": "CAND_0000001",
        "profile": {
            "current_title": "Senior ML Engineer",
            "years_of_experience": 7.0,
            "location": "Noida",
            "country": "India",
            "current_company": "OpenAI",
            "current_industry": "Technology",
            "summary": (
                "deployed faiss vector search system with rag pipeline "
                "serving 1M queries per day with sub-10ms latency. "
                "fine-tuned sentence-transformers for domain-specific embeddings."
            ),
        },
        "career_history": [
            {
                "company": "OpenAI",
                "title": "Senior ML Engineer",
                "start_date": "2022-01-01",
                "end_date": None,
                "duration_months": 36,
                "is_current": True,
                "industry": "Technology",
                "company_size": "501-1000",
                "description": (
                    "deployed faiss vector search, rag pipeline, "
                    "sentence-transformers fine-tuning for production embedding system. "
                    "serving 1M queries per day with sub-10ms latency at scale."
                ),
            },
            {
                "company": "Startup XYZ",
                "title": "ML Engineer",
                "start_date": "2019-01-01",
                "end_date": "2022-01-01",
                "duration_months": 36,
                "is_current": False,
                "industry": "Technology",
                "company_size": "51-200",
                "description": "Built recommendation system with collaborative filtering and NLP."
            },
        ],
        "education": [
            {
                "institution": "IIT Bombay",
                "degree": "B.Tech",
                "field_of_study": "Computer Science",
                "start_year": 2014,
                "end_year": 2018,
                "grade": "8.5 CGPA",
                "tier": "tier_1",
            }
        ],
        "skills": [
            {"name": "FAISS", "proficiency": "expert", "endorsements": 40, "duration_months": 36},
            {"name": "Qdrant", "proficiency": "advanced", "endorsements": 20, "duration_months": 24},
            {"name": "Sentence Transformers", "proficiency": "expert", "endorsements": 35, "duration_months": 30},
            {"name": "RAG", "proficiency": "advanced", "endorsements": 25, "duration_months": 24},
            {"name": "PyTorch", "proficiency": "expert", "endorsements": 50, "duration_months": 48},
            {"name": "LoRA", "proficiency": "advanced", "endorsements": 15, "duration_months": 18},
            {"name": "MLflow", "proficiency": "advanced", "endorsements": 12, "duration_months": 24},
            {"name": "Python", "proficiency": "expert", "endorsements": 60, "duration_months": 60},
            {"name": "Docker", "proficiency": "advanced", "endorsements": 20, "duration_months": 36},
        ],
        "certifications": [
            {"name": "Deep Learning Specialization", "issuer": "deeplearning.ai", "year": 2023}
        ],
        "languages": [],
        "redrob_signals": {
            "profile_completeness_score": 92.0,
            "signup_date": "2025-01-01",
            "last_active_date": "2026-06-25",
            "open_to_work_flag": True,
            "profile_views_received_30d": 45,
            "applications_submitted_30d": 3,
            "recruiter_response_rate": 0.85,
            "avg_response_time_hours": 3.0,
            "skill_assessment_scores": {
                "FAISS": 85.0,
                "PyTorch": 90.0,
            },
            "connection_count": 500,
            "endorsements_received": 120,
            "notice_period_days": 30,
            "expected_salary_range_inr_lpa": {"min": 30.0, "max": 45.0},
            "preferred_work_mode": "hybrid",
            "willing_to_relocate": True,
            "github_activity_score": 85.0,
            "search_appearance_30d": 300,
            "saved_by_recruiters_30d": 8,
            "interview_completion_rate": 0.90,
            "offer_acceptance_rate": 0.80,
            "verified_email": True,
            "verified_phone": True,
            "linkedin_connected": True,
        },
    }
    base.update(kwargs)
    return Candidate.model_validate(base)


def _cleaned(candidate=None):
    if candidate is None:
        candidate = _make_candidate()
    return clean_candidate(candidate)


# ---------------------------------------------------------------------------
# Corpus stats tests
# ---------------------------------------------------------------------------

class TestCorpusStats:
    def test_percentile_single_value(self):
        assert _percentile([5.0], 95) == 5.0

    def test_percentile_uniform(self):
        values = [float(i) for i in range(101)]
        p50 = _percentile(values, 50)
        assert abs(p50 - 50.0) < 1.0

    def test_percentile_p95(self):
        values = sorted([float(i) for i in range(100)])
        p95 = _percentile(values, 95)
        assert p95 >= 94.0 and p95 <= 100.0

    def test_raw_jd_skill_score_with_tier1(self):
        skills = [{"name": "FAISS", "proficiency": "expert", "endorsements": 40, "duration_months": 36}]
        score = _raw_jd_skill_score(skills)
        assert score > 0

    def test_raw_jd_skill_score_irrelevant_skills(self):
        skills = [{"name": "Photoshop", "proficiency": "expert", "endorsements": 40, "duration_months": 36}]
        score = _raw_jd_skill_score(skills)
        assert score == 0.0

    def test_default_corpus_has_valid_values(self):
        assert DEFAULT_CORPUS.p95_jd_skill_score > 0
        assert DEFAULT_CORPUS.p95_tier1_depth_score > 0
        assert DEFAULT_CORPUS.p95_bi02_response_quality > 0


# ---------------------------------------------------------------------------
# Skill Intelligence tests
# ---------------------------------------------------------------------------

class TestSkillIntelligence:
    def test_strong_tier1_candidate_high_si_composite(self):
        cleaned = _cleaned()
        si = compute_skill_features(cleaned, DEFAULT_CORPUS.p95_jd_skill_score,
                                    DEFAULT_CORPUS.p95_tier1_depth_score)
        assert si.si_composite > 0.50
        assert si.si_04 > 0.0  # Tier-1 depth

    def test_no_skills_all_zero(self):
        c = _make_candidate()
        c.skills = []
        cleaned = clean_candidate(c)
        si = compute_skill_features(cleaned, DEFAULT_CORPUS.p95_jd_skill_score,
                                    DEFAULT_CORPUS.p95_tier1_depth_score)
        assert si.si_composite == 0.0
        assert si.si_02 == 0.0
        assert si.si_04 == 0.0

    def test_negative_skills_penalize_composite(self):
        from intellirank.types import SkillEntry
        c = _make_candidate()
        c.skills = [
            SkillEntry(name="Photoshop", proficiency="expert", endorsements=100, duration_months=100),
        ]
        cleaned = clean_candidate(c)
        si = compute_skill_features(cleaned, DEFAULT_CORPUS.p95_jd_skill_score,
                                    DEFAULT_CORPUS.p95_tier1_depth_score)
        assert si.si_08 > 0.0  # Negative contamination

    def test_all_features_in_range(self):
        cleaned = _cleaned()
        si = compute_skill_features(cleaned, 80.0, 30.0)
        for attr in ["si_02", "si_03", "si_04", "si_05", "si_06", "si_07", "si_08", "si_composite"]:
            val = getattr(si, attr)
            assert 0.0 <= val <= 1.0, f"{attr}={val} out of range"

    def test_assessment_boosts_si03(self):
        cleaned = _cleaned()
        si = compute_skill_features(cleaned, 80.0, 30.0)
        assert si.si_03 > 0.0  # Has assessments for FAISS and PyTorch


# ---------------------------------------------------------------------------
# Career Intelligence tests
# ---------------------------------------------------------------------------

class TestCareerIntelligence:
    def test_strong_ai_candidate_high_ci_composite(self):
        cleaned = _cleaned()
        ci = compute_career_features(cleaned, DEFAULT_CORPUS.p95_ai_description_score,
                                     DEFAULT_CORPUS.p95_production_score)
        assert ci.ci_composite > 0.20
        assert ci.ci_06 > 0.0  # AI description evidence

    def test_consulting_only_penalizes_ci02(self):
        from intellirank.types import CareerEntry
        c = _make_candidate()
        c.career_history = [
            CareerEntry(company="TCS", title="Dev", duration_months=48, is_current=True,
                       industry="IT Services"),
        ]
        cleaned = clean_candidate(c)
        ci = compute_career_features(cleaned, 25.0, 15.0)
        assert ci.ci_02 == 1.0
        assert ci.ci_composite < 0.35  # Heavily penalized (70% reduction)

    def test_ci_all_features_in_range(self):
        cleaned = _cleaned()
        ci = compute_career_features(cleaned, 25.0, 15.0)
        for attr in ["ci_02", "ci_03", "ci_04", "ci_05", "ci_06", "ci_07",
                     "ci_08", "ci_09", "ci_10", "ci_11", "ci_composite"]:
            val = getattr(ci, attr)
            assert 0.0 <= val <= 1.0, f"{attr}={val} out of range"

    def test_production_evidence_detected(self):
        cleaned = _cleaned()
        ci = compute_career_features(cleaned, 25.0, 15.0)
        assert ci.ci_07 > 0.0  # "deployed", "at scale", "latency" in description


# ---------------------------------------------------------------------------
# Experience Intelligence tests
# ---------------------------------------------------------------------------

class TestExperienceIntelligence:
    def test_7yr_yoe_peak_gaussian(self):
        c = _make_candidate()
        c.profile.years_of_experience = 7.0
        cleaned = clean_candidate(c)
        ei = compute_experience_features(cleaned)
        assert abs(ei.ei_01 - 1.0) < 1e-6

    def test_0yr_yoe_low_but_positive(self):
        c = _make_candidate()
        c.profile.years_of_experience = 0.0
        cleaned = clean_candidate(c)
        ei = compute_experience_features(cleaned)
        assert ei.ei_01 > 0.0
        assert ei.ei_01 < 0.5

    def test_senior_coder_high_ei04(self):
        cleaned = _cleaned()
        ei = compute_experience_features(cleaned)
        assert ei.ei_04 >= 0.70  # "deployed", "built", "implemented" in descriptions

    def test_ei_all_features_in_range(self):
        cleaned = _cleaned()
        ei = compute_experience_features(cleaned)
        for attr in ["ei_01", "ei_02", "ei_03", "ei_04", "ei_composite"]:
            val = getattr(ei, attr)
            assert 0.0 <= val <= 1.0, f"{attr}={val} out of range"


# ---------------------------------------------------------------------------
# Education Intelligence tests
# ---------------------------------------------------------------------------

class TestEducationIntelligence:
    def test_iit_cs_btech_high_score(self):
        cleaned = _cleaned()
        edu = compute_education_features(cleaned)
        assert edu.edu_01 == 1.0  # tier_1
        assert edu.edu_02 >= 0.90  # Computer Science
        assert edu.edu_composite > 0.70

    def test_no_education_all_zero(self):
        c = _make_candidate()
        c.education = []
        cleaned = clean_candidate(c)
        edu = compute_education_features(cleaned)
        assert edu.edu_composite == 0.0

    def test_edu_features_in_range(self):
        cleaned = _cleaned()
        edu = compute_education_features(cleaned)
        for attr in ["edu_01", "edu_02", "edu_03", "edu_composite"]:
            val = getattr(edu, attr)
            assert 0.0 <= val <= 1.0, f"{attr}={val} out of range"


# ---------------------------------------------------------------------------
# Learning Intelligence tests
# ---------------------------------------------------------------------------

class TestLearningIntelligence:
    def test_active_github_high_li02(self):
        cleaned = _cleaned()
        li = compute_learning_features(cleaned)
        assert li.li_02 > 0.80  # github_activity_score=85

    def test_no_github_li02_zero(self):
        c = _make_candidate()
        c.redrob_signals.github_activity_score = -1.0
        cleaned = clean_candidate(c)
        li = compute_learning_features(cleaned)
        assert li.li_02 == 0.0

    def test_certification_quality(self):
        cleaned = _cleaned()
        li = compute_learning_features(cleaned)
        assert li.li_01 > 0.0  # Has deeplearning.ai cert

    def test_li_features_in_range(self):
        cleaned = _cleaned()
        li = compute_learning_features(cleaned)
        for attr in ["li_01", "li_02", "li_03", "li_04", "li_05", "li_composite"]:
            val = getattr(li, attr)
            assert 0.0 <= val <= 1.0, f"{attr}={val} out of range"


# ---------------------------------------------------------------------------
# Behavioral Intelligence tests
# ---------------------------------------------------------------------------

class TestBehavioralIntelligence:
    def test_recently_active_high_bi01(self):
        cleaned = _cleaned()  # last_active=2026-06-25, eval=2026-06-27 → 2 days
        bi = compute_behavioral_features(cleaned, DEFAULT_CORPUS.p95_bi02_response_quality)
        assert bi.bi_01 == 1.0  # within 30-day window

    def test_high_response_rate_bi02(self):
        cleaned = _cleaned()
        bi = compute_behavioral_features(cleaned, DEFAULT_CORPUS.p95_bi02_response_quality)
        assert bi.bi_02 > 0.0

    def test_bi_features_in_range(self):
        cleaned = _cleaned()
        bi = compute_behavioral_features(cleaned, 0.60)
        for attr in ["bi_01", "bi_02", "bi_03", "bi_04", "bi_05", "bi_composite"]:
            val = getattr(bi, attr)
            assert 0.0 <= val <= 1.0, f"{attr}={val} out of range"

    def test_no_prior_offers_neutral_bi04(self):
        c = _make_candidate()
        c.redrob_signals.offer_acceptance_rate = -1.0
        cleaned = clean_candidate(c)
        bi = compute_behavioral_features(cleaned, 0.60)
        assert abs(bi.bi_04 - 0.65) < 0.01


# ---------------------------------------------------------------------------
# Recruitability tests
# ---------------------------------------------------------------------------

class TestRecruitability:
    def test_noida_hybrid_high_ri(self):
        cleaned = _cleaned()
        bi = compute_behavioral_features(cleaned, 0.60)
        ri = compute_recruitability_features(cleaned, bi)
        assert ri.ri_03 == 1.00  # Noida = Tier-1 city
        assert ri.ri_04 == 1.00  # hybrid = perfect match

    def test_open_to_work_sets_ri01(self):
        c = _make_candidate()
        c.redrob_signals.open_to_work_flag = True
        cleaned = clean_candidate(c)
        bi = compute_behavioral_features(cleaned, 0.60)
        ri = compute_recruitability_features(cleaned, bi)
        assert ri.ri_01 == 1.10

    def test_ri_master_in_range(self):
        cleaned = _cleaned()
        bi = compute_behavioral_features(cleaned, 0.60)
        ri = compute_recruitability_features(cleaned, bi)
        assert 0.05 <= ri.ri_master <= 1.00

    def test_180_day_notice_low_ri02(self):
        c = _make_candidate()
        c.redrob_signals.notice_period_days = 180
        cleaned = clean_candidate(c)
        bi = compute_behavioral_features(cleaned, 0.60)
        ri = compute_recruitability_features(cleaned, bi)
        assert ri.ri_02 == 0.20


# ---------------------------------------------------------------------------
# Full extractor integration test
# ---------------------------------------------------------------------------

class TestExtractor:
    def test_extract_features_returns_all_scores(self):
        c = _make_candidate()
        features = extract_features(c, DEFAULT_CORPUS)
        assert features.candidate_id == "CAND_0000001"
        assert features.skill.si_composite >= 0.0
        assert features.career.ci_composite >= 0.0
        assert features.recruitability.ri_master >= 0.05

    def test_strong_candidate_high_scores(self):
        c = _make_candidate()
        features = extract_features(c, DEFAULT_CORPUS)
        # This ideal candidate should have strong composites
        assert features.skill.si_composite > 0.40
        assert features.career.ci_composite > 0.15
        assert features.education.edu_composite > 0.60
        assert features.learning.li_composite > 0.30

    def test_all_composites_in_range(self):
        c = _make_candidate()
        features = extract_features(c, DEFAULT_CORPUS)
        for attr in [
            "skill.si_composite", "career.ci_composite", "domain.di_composite",
            "experience.ei_composite", "education.edu_composite",
            "learning.li_composite", "behavioral.bi_composite",
            "potential.pi_composite", "quality.pq_composite",
        ]:
            parts = attr.split(".")
            val = getattr(getattr(features, parts[0]), parts[1])
            assert 0.0 <= val <= 1.0, f"{attr}={val} out of range"

    def test_recruitability_master_in_range(self):
        c = _make_candidate()
        features = extract_features(c, DEFAULT_CORPUS)
        assert 0.05 <= features.recruitability.ri_master <= 1.00

    def test_explainability_fields_populated(self):
        c = _make_candidate()
        features = extract_features(c, DEFAULT_CORPUS)
        assert len(features.top_tier1_skills) > 0
        assert features.current_title == "Senior ML Engineer"
        assert features.location == "Noida"

    def test_hidden_gem_detection(self):
        """A non-AI titled candidate with strong Tier-1 skills should be detected as hidden gem."""
        c = _make_candidate()
        c.profile.current_title = "Backend Engineer"  # Non-AI title
        features = extract_features(c, DEFAULT_CORPUS)
        assert features.is_hidden_gem

    def test_consulting_only_candidate_flagged(self):
        from intellirank.types import CareerEntry
        c = _make_candidate()
        c.career_history = [
            CareerEntry(company="TCS", title="Java Developer", duration_months=60, is_current=True,
                       industry="IT Services"),
        ]
        c.skills = []
        features = extract_features(c, DEFAULT_CORPUS)
        assert features.has_consulting_flag
        assert features.career.ci_02 == 1.0


# ---------------------------------------------------------------------------
# Sample candidates integration test
# ---------------------------------------------------------------------------

class TestSampleCandidatesFeatures:
    def test_all_sample_candidates_extract_without_error(self):
        if not SAMPLE_CANDIDATES_JSON.exists():
            pytest.skip("sample_candidates.json not found")

        with open(SAMPLE_CANDIDATES_JSON, "r", encoding="utf-8") as f:
            records = json.load(f)

        for raw in records:
            c = Candidate.model_validate(raw)
            features = extract_features(c, DEFAULT_CORPUS)
            assert features.candidate_id == c.candidate_id
            assert 0.05 <= features.recruitability.ri_master <= 1.00
