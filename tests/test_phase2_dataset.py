"""Phase 2 — Dataset Layer tests."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import orjson
import pytest

from intellirank.config import SAMPLE_CANDIDATES_JSON, CANDIDATES_JSONL
from intellirank.dataset.loader import iter_candidates, load_all, LoadStats
from intellirank.dataset.reader import iter_jsonl
from intellirank.dataset.validator import validate_raw, ValidationResult
from intellirank.types import Candidate, SkillEntry, CareerEntry


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_jsonl(records: list[dict], tmp_path: Path) -> Path:  # type: ignore[type-arg]
    p = tmp_path / "test.jsonl"
    with open(p, "wb") as f:
        for r in records:
            f.write(orjson.dumps(r) + b"\n")
    return p


def _minimal_candidate(cid: str = "CAND_0000001") -> dict:  # type: ignore[type-arg]
    return {
        "candidate_id": cid,
        "profile": {
            "current_title": "ML Engineer",
            "years_of_experience": 5.0,
            "location": "Noida",
            "country": "India",
        },
        "career_history": [
            {
                "company": "OpenAI",
                "title": "ML Engineer",
                "start_date": "2022-01-01",
                "end_date": None,
                "duration_months": 24,
                "is_current": True,
                "industry": "Technology",
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


# ---------------------------------------------------------------------------
# Validator tests
# ---------------------------------------------------------------------------

class TestValidator:
    def test_valid_record(self):
        result = validate_raw(_minimal_candidate())
        assert result.is_valid
        assert result.candidate_id == "CAND_0000001"
        assert result.errors == []

    def test_missing_candidate_id(self):
        r = _minimal_candidate()
        del r["candidate_id"]
        result = validate_raw(r)
        assert not result.is_valid

    def test_invalid_candidate_id_format(self):
        r = _minimal_candidate()
        r["candidate_id"] = "INVALID_ID"
        result = validate_raw(r)
        assert not result.is_valid

    def test_candidate_id_wrong_digit_count(self):
        r = _minimal_candidate()
        r["candidate_id"] = "CAND_001"  # only 3 digits
        result = validate_raw(r)
        assert not result.is_valid

    def test_missing_profile_key(self):
        r = _minimal_candidate()
        del r["profile"]
        result = validate_raw(r)
        assert not result.is_valid
        assert any("profile" in e for e in result.errors)

    def test_missing_skills_key(self):
        r = _minimal_candidate()
        del r["skills"]
        result = validate_raw(r)
        assert not result.is_valid

    def test_wrong_type_career_history(self):
        r = _minimal_candidate()
        r["career_history"] = "not a list"
        result = validate_raw(r)
        assert not result.is_valid

    def test_wrong_type_skills(self):
        r = _minimal_candidate()
        r["skills"] = {"name": "Python"}
        result = validate_raw(r)
        assert not result.is_valid

    def test_valid_all_ids_from_1_to_7(self):
        for i in range(1, 8):
            cid = f"CAND_{i:07d}"
            r = _minimal_candidate(cid)
            result = validate_raw(r)
            assert result.is_valid, f"Should be valid: {cid}"


# ---------------------------------------------------------------------------
# JSONL reader tests
# ---------------------------------------------------------------------------

class TestJsonlReader:
    def test_reads_valid_jsonl(self, tmp_path: Path):
        records = [{"a": 1}, {"b": 2}]
        p = tmp_path / "test.jsonl"
        with open(p, "wb") as f:
            for r in records:
                f.write(orjson.dumps(r) + b"\n")
        result = list(iter_jsonl(p))
        assert len(result) == 2

    def test_skips_blank_lines(self, tmp_path: Path):
        p = tmp_path / "test.jsonl"
        with open(p, "wb") as f:
            f.write(b'{"a": 1}\n\n\n{"b": 2}\n')
        result = list(iter_jsonl(p))
        assert len(result) == 2

    def test_skips_malformed_json(self, tmp_path: Path):
        p = tmp_path / "test.jsonl"
        with open(p, "wb") as f:
            f.write(b'{"a": 1}\nnot json\n{"b": 2}\n')
        result = list(iter_jsonl(p))
        assert len(result) == 2  # malformed line skipped

    def test_handles_empty_file(self, tmp_path: Path):
        p = tmp_path / "empty.jsonl"
        p.write_bytes(b"")
        assert list(iter_jsonl(p)) == []


# ---------------------------------------------------------------------------
# Loader tests
# ---------------------------------------------------------------------------

class TestLoader:
    def test_loads_valid_candidate(self, tmp_path: Path):
        p = _make_jsonl([_minimal_candidate()], tmp_path)
        candidates, stats = load_all(p)
        assert stats.valid == 1
        assert len(candidates) == 1
        assert candidates[0].candidate_id == "CAND_0000001"

    def test_skips_duplicate_ids(self, tmp_path: Path):
        records = [_minimal_candidate("CAND_0000001"), _minimal_candidate("CAND_0000001")]
        p = _make_jsonl(records, tmp_path)
        candidates, stats = load_all(p)
        assert stats.valid == 1
        assert stats.duplicates == 1

    def test_skips_invalid_records(self, tmp_path: Path):
        bad = {"candidate_id": "BAD", "profile": {}, "career_history": [],
               "education": [], "skills": [], "redrob_signals": {}}
        p = _make_jsonl([_minimal_candidate(), bad], tmp_path)
        candidates, stats = load_all(p)
        assert stats.valid == 1
        assert stats.schema_errors == 1

    def test_multiple_candidates(self, tmp_path: Path):
        records = [_minimal_candidate(f"CAND_{i:07d}") for i in range(1, 6)]
        p = _make_jsonl(records, tmp_path)
        candidates, stats = load_all(p)
        assert stats.valid == 5
        assert stats.invalid == 0

    def test_stats_report_string(self, tmp_path: Path):
        p = _make_jsonl([_minimal_candidate()], tmp_path)
        _, stats = load_all(p)
        report = stats.report()
        assert "valid" in report.lower()


# ---------------------------------------------------------------------------
# Pydantic model tests
# ---------------------------------------------------------------------------

class TestCandidateModel:
    def test_candidate_parses_minimal(self):
        c = Candidate.model_validate(_minimal_candidate())
        assert c.candidate_id == "CAND_0000001"
        assert c.profile.current_title == "ML Engineer"
        assert len(c.skills) == 1

    def test_skill_proficiency_normalized(self):
        r = _minimal_candidate()
        r["skills"][0]["proficiency"] = "ADVANCED"
        c = Candidate.model_validate(r)
        assert c.skills[0].proficiency == "advanced"

    def test_skill_invalid_proficiency_defaults_beginner(self):
        r = _minimal_candidate()
        r["skills"][0]["proficiency"] = "godmode"
        c = Candidate.model_validate(r)
        assert c.skills[0].proficiency == "beginner"

    def test_skill_duration_clamped(self):
        r = _minimal_candidate()
        r["skills"][0]["duration_months"] = 9999
        c = Candidate.model_validate(r)
        assert c.skills[0].duration_months == 240

    def test_github_score_sentinel(self):
        r = _minimal_candidate()
        r["redrob_signals"]["github_activity_score"] = -1
        c = Candidate.model_validate(r)
        assert c.redrob_signals.github_activity_score == -1.0

    def test_github_score_clamped_to_100(self):
        r = _minimal_candidate()
        r["redrob_signals"]["github_activity_score"] = 150
        c = Candidate.model_validate(r)
        assert c.redrob_signals.github_activity_score == 100.0

    def test_offer_acceptance_rate_sentinel(self):
        r = _minimal_candidate()
        r["redrob_signals"]["offer_acceptance_rate"] = -1
        c = Candidate.model_validate(r)
        assert c.redrob_signals.offer_acceptance_rate == -1.0

    def test_salary_range_parsed(self):
        r = _minimal_candidate()
        c = Candidate.model_validate(r)
        assert c.redrob_signals.expected_salary_range_inr_lpa.min == 25.0
        assert c.redrob_signals.expected_salary_range_inr_lpa.max == 40.0

    def test_empty_skills_list(self):
        r = _minimal_candidate()
        r["skills"] = []
        c = Candidate.model_validate(r)
        assert c.skills == []

    def test_missing_optional_fields_have_defaults(self):
        r = _minimal_candidate()
        del r["certifications"]
        del r["languages"]
        c = Candidate.model_validate(r)
        assert c.certifications == []
        assert c.languages == []


# ---------------------------------------------------------------------------
# Integration: load sample_candidates.json (small real file)
# ---------------------------------------------------------------------------

class TestSampleDataIntegration:
    def test_sample_candidates_json_loads(self):
        """Verify the real sample_candidates.json parses without errors."""
        if not SAMPLE_CANDIDATES_JSON.exists():
            pytest.skip("sample_candidates.json not found")

        with open(SAMPLE_CANDIDATES_JSON, "r", encoding="utf-8") as f:
            records = json.load(f)

        candidates = []
        errors = 0
        for raw in records:
            result = validate_raw(raw)
            if not result.is_valid:
                errors += 1
                continue
            try:
                c = Candidate.model_validate(raw)
                candidates.append(c)
            except Exception:
                errors += 1

        assert errors == 0, f"{errors} errors in sample_candidates.json"
        assert len(candidates) >= 2

    def test_sample_candidates_have_required_fields(self):
        if not SAMPLE_CANDIDATES_JSON.exists():
            pytest.skip("sample_candidates.json not found")

        with open(SAMPLE_CANDIDATES_JSON, "r", encoding="utf-8") as f:
            records = json.load(f)

        for raw in records:
            c = Candidate.model_validate(raw)
            assert c.candidate_id.startswith("CAND_")
            assert c.profile is not None
            assert c.redrob_signals is not None
