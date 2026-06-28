"""Phase 3 — Data Cleaning Pipeline tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from intellirank.cleaning.pipeline import (
    clean_candidate,
    _clean_salary,
    _clean_dates,
    _clean_yoe,
    _clean_text,
    _detect_boilerplate,
    _clean_skills,
    _classify_company_type,
    _classify_company_types,
    _find_current_role_index,
)
from intellirank.types import (
    Candidate, CareerEntry, SkillEntry, SalaryRange,
    RedrobSignals, Profile,
)


# ---------------------------------------------------------------------------
# Test fixture helpers
# ---------------------------------------------------------------------------

def _make_candidate(**overrides) -> Candidate:  # type: ignore[type-arg]
    base = {
        "candidate_id": "CAND_0000001",
        "profile": {
            "current_title": "ML Engineer",
            "years_of_experience": 5.0,
            "location": "Noida",
            "country": "India",
        },
        "career_history": [
            {
                "company": "TechCorp",
                "title": "ML Engineer",
                "start_date": "2022-01-01",
                "end_date": None,
                "duration_months": 24,
                "is_current": True,
                "industry": "Technology",
                "description": "Deployed FAISS-based vector search at scale.",
            }
        ],
        "education": [],
        "skills": [
            {"name": "Python", "proficiency": "advanced", "endorsements": 10, "duration_months": 36}
        ],
        "certifications": [],
        "languages": [],
        "redrob_signals": {
            "profile_completeness_score": 75.0,
            "signup_date": "2025-01-01",
            "last_active_date": "2026-06-01",
            "open_to_work_flag": True,
            "recruiter_response_rate": 0.8,
            "avg_response_time_hours": 2.0,
            "notice_period_days": 30,
            "expected_salary_range_inr_lpa": {"min": 25.0, "max": 40.0},
            "preferred_work_mode": "hybrid",
            "github_activity_score": 75.0,
            "interview_completion_rate": 0.9,
            "offer_acceptance_rate": 0.8,
            "verified_email": True,
            "verified_phone": True,
        },
    }
    base.update(overrides)
    return Candidate.model_validate(base)


# ---------------------------------------------------------------------------
# DC-CLEAN-06: Salary tests
# ---------------------------------------------------------------------------

class TestSalaryCleaning:
    def test_normal_salary_midpoint(self):
        c = _make_candidate()
        midpoint, inverted = _clean_salary(c)
        assert abs(midpoint - 32.5) < 1e-9
        assert not inverted

    def test_inverted_salary_detected(self):
        c = _make_candidate()
        c.redrob_signals.expected_salary_range_inr_lpa.min = 50.0
        c.redrob_signals.expected_salary_range_inr_lpa.max = 30.0
        midpoint, inverted = _clean_salary(c)
        assert abs(midpoint - 40.0) < 1e-9  # (50+30)/2
        assert inverted

    def test_zero_salary_midpoint(self):
        c = _make_candidate()
        c.redrob_signals.expected_salary_range_inr_lpa.min = 0.0
        c.redrob_signals.expected_salary_range_inr_lpa.max = 0.0
        midpoint, inverted = _clean_salary(c)
        assert midpoint == 0.0
        assert not inverted


# ---------------------------------------------------------------------------
# DC-CLEAN-02: Date cleaning tests
# ---------------------------------------------------------------------------

class TestDateCleaning:
    def test_days_inactive_recent(self):
        c = _make_candidate()
        # last_active = 2026-06-01 → 26 days before eval date 2026-06-27
        days_inactive, _ = _clean_dates(c)
        assert days_inactive == 26

    def test_signup_before_active_not_anomaly(self):
        c = _make_candidate()
        # signup=2025-01-01, last_active=2026-06-01 → normal
        _, signup_after = _clean_dates(c)
        assert not signup_after

    def test_signup_after_active_is_anomaly(self):
        c = _make_candidate()
        c.redrob_signals.signup_date = "2026-07-01"    # future signup
        c.redrob_signals.last_active_date = "2025-01-01"  # earlier last_active
        _, signup_after = _clean_dates(c)
        assert signup_after

    def test_missing_last_active_returns_zero(self):
        c = _make_candidate()
        c.redrob_signals.last_active_date = None
        days_inactive, _ = _clean_dates(c)
        assert days_inactive == 0


# ---------------------------------------------------------------------------
# DC-CLEAN-04: YOE cross-validation
# ---------------------------------------------------------------------------

class TestYoeCrossValidation:
    def test_consistent_yoe(self):
        c = _make_candidate()
        # career: 24 months = 2 years; profile says 5.0 → gap=3.0
        computed, gap = _clean_yoe(c)
        assert abs(computed - 2.0) < 0.01
        assert abs(gap - 3.0) < 0.01

    def test_zero_career_history(self):
        c = _make_candidate()
        c.career_history = []
        computed, gap = _clean_yoe(c)
        assert computed == 0.0
        assert gap == 5.0  # claimed=5.0, computed=0.0

    def test_multiple_roles_summed(self):
        from intellirank.types import CareerEntry
        c = _make_candidate()
        c.career_history = [
            CareerEntry(company="A", title="Eng", duration_months=24, is_current=False),
            CareerEntry(company="B", title="Eng", duration_months=36, is_current=True),
        ]
        computed, _ = _clean_yoe(c)
        assert abs(computed - 5.0) < 0.01


# ---------------------------------------------------------------------------
# DC-CLEAN-05: Text pre-processing
# ---------------------------------------------------------------------------

class TestTextPreprocessing:
    def test_descriptions_joined_and_lowercased(self):
        c = _make_candidate()
        all_desc, _ = _clean_text(c)
        assert "faiss" in all_desc
        assert "FAISS" not in all_desc  # must be lowercase

    def test_summary_lowercased(self):
        c = _make_candidate()
        c.profile.summary = "Machine Learning Expert"
        _, summary_lower = _clean_text(c)
        assert summary_lower == "machine learning expert"

    def test_empty_descriptions_produce_empty_string(self):
        c = _make_candidate()
        for entry in c.career_history:
            entry.description = None
        all_desc, _ = _clean_text(c)
        assert all_desc == ""

    def test_whitespace_collapsed(self):
        c = _make_candidate()
        c.career_history[0].description = "deployed   vector    search"
        all_desc, _ = _clean_text(c)
        assert "deployed vector search" in all_desc


# ---------------------------------------------------------------------------
# Boilerplate detection
# ---------------------------------------------------------------------------

class TestBoilerplateDetection:
    def test_boilerplate_summary_detected(self):
        # Two known signatures from BOILERPLATE_SIGNATURES
        text = (
            "i've been curious about how ai tools could augment my work. "
            "i've experimented with chatgpt for productivity."
        )
        assert _detect_boilerplate(text)

    def test_genuine_summary_not_boilerplate(self):
        text = (
            "deployed faiss-based dense retrieval pipeline serving 1M+ queries "
            "per day with sub-10ms p99 latency. fine-tuned sentence-transformers "
            "for domain-specific embedding quality."
        )
        assert not _detect_boilerplate(text)

    def test_empty_summary_is_boilerplate(self):
        assert _detect_boilerplate("")
        assert _detect_boilerplate("   ")

    def test_single_signature_not_boilerplate(self):
        # Only one signature → not flagged (requires 2+)
        text = "i've been curious about how ai tools could augment my work."
        assert not _detect_boilerplate(text)


# ---------------------------------------------------------------------------
# DC-CLEAN-07: Skill pre-processing
# ---------------------------------------------------------------------------

class TestSkillPreprocessing:
    def test_skills_lowercased(self):
        c = _make_candidate()
        skill_set = _clean_skills(c)
        assert "python" in skill_set

    def test_empty_skills(self):
        c = _make_candidate()
        c.skills = []
        skill_set = _clean_skills(c)
        assert len(skill_set) == 0

    def test_duplicate_skill_names_deduped(self):
        from intellirank.types import SkillEntry
        c = _make_candidate()
        c.skills = [
            SkillEntry(name="Python", proficiency="advanced", endorsements=10, duration_months=36),
            SkillEntry(name="python", proficiency="intermediate", endorsements=5, duration_months=12),
        ]
        skill_set = _clean_skills(c)
        assert len(skill_set) == 1
        assert "python" in skill_set


# ---------------------------------------------------------------------------
# DC-CLEAN-08: Company classification
# ---------------------------------------------------------------------------

class TestCompanyClassification:
    def test_consulting_firm_by_name(self):
        assert _classify_company_type("TCS", "IT Services") == "consulting"
        assert _classify_company_type("Wipro Limited", "IT Services") == "consulting"
        assert _classify_company_type("Infosys", "IT Consulting") == "consulting"
        assert _classify_company_type("Accenture", "Consulting") == "consulting"
        assert _classify_company_type("Cognizant", "IT Services") == "consulting"

    def test_consulting_by_industry(self):
        result = _classify_company_type("UnknownFirm", "IT Services")
        assert result == "consulting"

    def test_product_company(self):
        result = _classify_company_type("Google", "Technology")
        # Google not in CONSULTING_FIRMS, industry "Technology" is product
        assert result == "product"

    def test_research_by_institution_name(self):
        result = _classify_company_type("IIT Bombay", "Education")
        assert result == "research"

    def test_unknown_company(self):
        result = _classify_company_type("Random Startup XYZ", "Retail")
        # Not consulting, not product known, not research → unknown
        assert result == "unknown"

    def test_exclusively_consulting_true(self):
        from intellirank.types import CareerEntry
        c = _make_candidate()
        c.career_history = [
            CareerEntry(company="TCS", title="Dev", duration_months=24, is_current=False,
                       industry="IT Services"),
            CareerEntry(company="Wipro", title="Dev", duration_months=36, is_current=True,
                       industry="IT Services"),
        ]
        types, is_excl = _classify_company_types(c)
        assert is_excl

    def test_exclusively_consulting_false_mixed(self):
        from intellirank.types import CareerEntry
        c = _make_candidate()
        c.career_history = [
            CareerEntry(company="TCS", title="Dev", duration_months=24, is_current=False,
                       industry="IT Services"),
            CareerEntry(company="OpenAI", title="MLE", duration_months=24, is_current=True,
                       industry="Technology"),
        ]
        types, is_excl = _classify_company_types(c)
        assert not is_excl


# ---------------------------------------------------------------------------
# Full cleaning pipeline integration
# ---------------------------------------------------------------------------

class TestCleaningPipeline:
    def test_clean_candidate_returns_cleaned_candidate(self):
        c = _make_candidate()
        cleaned = clean_candidate(c)
        assert cleaned.raw.candidate_id == "CAND_0000001"

    def test_clean_candidate_salary_midpoint(self):
        c = _make_candidate()
        cleaned = clean_candidate(c)
        assert abs(cleaned.salary_midpoint - 32.5) < 1e-9

    def test_clean_candidate_days_inactive(self):
        c = _make_candidate()
        cleaned = clean_candidate(c)
        assert cleaned.days_inactive == 26

    def test_clean_candidate_descriptions_populated(self):
        c = _make_candidate()
        cleaned = clean_candidate(c)
        assert "faiss" in cleaned.all_descriptions

    def test_clean_candidate_skills_set(self):
        c = _make_candidate()
        cleaned = clean_candidate(c)
        assert "python" in cleaned.all_skills_set

    def test_clean_candidate_not_boilerplate(self):
        c = _make_candidate()
        cleaned = clean_candidate(c)
        # Summary is None, so boilerplate = True (empty summary)
        assert cleaned.is_boilerplate_summary  # default: summary is None

    def test_clean_candidate_current_role_found(self):
        c = _make_candidate()
        cleaned = clean_candidate(c)
        assert cleaned.current_role_index == 0

    def test_clean_candidate_no_current_role(self):
        c = _make_candidate()
        for entry in c.career_history:
            entry.is_current = False
        cleaned = clean_candidate(c)
        assert cleaned.current_role_index is None

    def test_boilerplate_candidate_detected(self):
        c = _make_candidate()
        c.profile.summary = (
            "i've been curious about how ai tools could augment my work. "
            "i've experimented with chatgpt for productivity."
        )
        cleaned = clean_candidate(c)
        assert cleaned.is_boilerplate_summary

    def test_inverted_salary_flagged(self):
        c = _make_candidate()
        c.redrob_signals.expected_salary_range_inr_lpa.min = 50.0
        c.redrob_signals.expected_salary_range_inr_lpa.max = 20.0
        cleaned = clean_candidate(c)
        assert cleaned.salary_is_inverted
