"""Phase 7 — Submission CSV generation tests."""

from __future__ import annotations

import csv
from pathlib import Path

import pytest

from intellirank.ranking.explainability import ExplainabilityReport
from intellirank.ranking.ranker import RankedCandidate
from intellirank.submission import (
    EXPECTED_ROWS,
    REQUIRED_HEADER,
    SubmissionResult,
    generate_submission,
    validate_submission_file,
)
from intellirank.types import CandidateFeatures

# ---------------------------------------------------------------------------
# Path to the official sample CSV included with the competition dataset
# ---------------------------------------------------------------------------
SAMPLE_CSV = (
    Path(__file__).parent.parent
    / "redrob_dataset"
    / "challenge_dataset"
    / "India_runs_data_and_ai_challenge"
    / "sample_submission.csv"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_rc(
    rank: int,
    candidate_id: str,
    score: float,
    reasoning: str = "",
) -> RankedCandidate:
    """Minimal RankedCandidate sufficient for submission tests."""
    f = CandidateFeatures(candidate_id=candidate_id)
    f.final_score = score
    f.technical_fit = round(score * 0.9, 6)
    f.confidence_score = 0.5
    f.current_title = "ML Engineer"
    f.years_of_experience = 5.0

    text = reasoning or f"ML Engineer with strong AI skills — ranked {rank}/100."
    report = ExplainabilityReport(
        candidate_id=candidate_id,
        rank=rank,
        final_score=score,
        technical_fit=round(score * 0.9, 6),
        behavioral_gate=0.80,
        quality_modifier=0.90,
        honeypot_gate=1.0,
        confidence_score=0.5,
        dim_composites={},
        dim_contributions={},
        top_dimensions=[],
        top_tier1_skills=[],
        top_tier2_skills=[],
        has_production_evidence=False,
        has_ai_description=False,
        is_hidden_gem=False,
        is_pivot_candidate=False,
        has_active_github=False,
        github_linked=False,
        notice_period_days=30,
        days_since_active=5,
        has_consulting_flag=False,
        anomaly_score=0,
        current_title="ML Engineer",
        current_company="Tech Corp",
        years_of_experience=5.0,
        location="Bangalore",
        best_assessment_skill="",
        best_assessment_score=0.0,
        strengths=[],
        weaknesses=[],
        reasoning=text,
    )
    return RankedCandidate(rank=rank, features=f, reasoning=text, report=report)


def _make_100_ranked(
    start: float = 0.9500,
    step: float = 0.0080,
) -> list[RankedCandidate]:
    """100 valid RankedCandidates with strictly decreasing scores."""
    return [
        _make_rc(rank, f"CAND_{rank:07d}", max(0.001, start - (rank - 1) * step))
        for rank in range(1, 101)
    ]


# ---------------------------------------------------------------------------
# TestSubmissionGeneration — valid cases
# ---------------------------------------------------------------------------

class TestSubmissionGeneration:
    def test_file_created(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        result = generate_submission(_make_100_ranked(), out)
        assert out.exists()

    def test_returns_submission_result_type(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        result = generate_submission(_make_100_ranked(), out)
        assert isinstance(result, SubmissionResult)

    def test_is_valid_on_clean_input(self, tmp_path: Path):
        out = tmp_path / "intellirank_ai.csv"
        result = generate_submission(_make_100_ranked(), out)
        assert result.is_valid, result.validation_errors

    def test_rows_written_is_100(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        result = generate_submission(_make_100_ranked(), out)
        assert result.rows_written == 100

    def test_csv_header_exact(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        generate_submission(_make_100_ranked(), out)
        with open(out, "r", encoding="utf-8", newline="") as f:
            header = next(csv.reader(f))
        assert header == REQUIRED_HEADER

    def test_csv_has_100_data_rows(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        generate_submission(_make_100_ranked(), out)
        with open(out, "r", encoding="utf-8", newline="") as f:
            rows = list(csv.reader(f))
        # row 0 = header, rows 1-100 = data
        assert len(rows) == 101

    def test_scores_formatted_to_4_decimal_places(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        generate_submission(_make_100_ranked(), out)
        with open(out, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                score_str = row["score"]
                assert "." in score_str
                decimal_places = len(score_str.split(".")[1])
                assert decimal_places == 4, f"Expected 4 decimal places, got {score_str!r}"

    def test_ranks_sequential_1_to_100(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        generate_submission(_make_100_ranked(), out)
        with open(out, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            ranks = [int(row["rank"]) for row in reader]
        assert ranks == list(range(1, 101))

    def test_candidate_ids_match_pattern(self, tmp_path: Path):
        import re
        pattern = re.compile(r"^CAND_[0-9]{7}$")
        out = tmp_path / "test.csv"
        generate_submission(_make_100_ranked(), out)
        with open(out, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                assert pattern.match(row["candidate_id"]), (
                    f"Bad candidate_id: {row['candidate_id']!r}"
                )

    def test_scores_non_increasing(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        generate_submission(_make_100_ranked(), out)
        with open(out, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            scores = [float(row["score"]) for row in reader]
        for i in range(1, len(scores)):
            assert scores[i] <= scores[i - 1], (
                f"Monotonicity violated: score[{i}]={scores[i]} > score[{i-1}]={scores[i-1]}"
            )

    def test_reasoning_preserved(self, tmp_path: Path):
        custom = [
            _make_rc(rank, f"CAND_{rank:07d}", 0.9 - rank * 0.008,
                     reasoning=f"Custom reasoning for rank {rank}.")
            for rank in range(1, 101)
        ]
        out = tmp_path / "test.csv"
        generate_submission(custom, out)
        with open(out, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                assert row["reasoning"] == f"Custom reasoning for rank {i + 1}."

    def test_file_is_utf8_encoded(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        generate_submission(_make_100_ranked(), out)
        # Should not raise UnicodeDecodeError
        content = out.read_text(encoding="utf-8")
        assert len(content) > 0

    def test_output_directory_created_if_missing(self, tmp_path: Path):
        deep = tmp_path / "sub" / "dir" / "out.csv"
        result = generate_submission(_make_100_ranked(), deep)
        assert deep.exists()
        assert result.is_valid

    def test_passes_official_validation_rules(self, tmp_path: Path):
        out = tmp_path / "intellirank_ai.csv"
        generate_submission(_make_100_ranked(), out)
        errors = validate_submission_file(out)
        assert errors == [], errors


# ---------------------------------------------------------------------------
# TestSubmissionPreflight — invalid inputs rejected before disk write
# ---------------------------------------------------------------------------

class TestSubmissionPreflight:
    def test_empty_input_returns_errors(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        result = generate_submission([], out)
        assert not result.is_valid
        assert not out.exists()  # no file written on pre-flight failure

    def test_wrong_count_50_returns_errors(self, tmp_path: Path):
        ranked = _make_100_ranked()[:50]
        out = tmp_path / "test.csv"
        result = generate_submission(ranked, out)
        assert not result.is_valid
        assert any("50" in e for e in result.validation_errors)

    def test_duplicate_candidate_id_detected(self, tmp_path: Path):
        ranked = _make_100_ranked()
        # Force a duplicate by overriding one candidate's ID
        ranked[5].features.candidate_id = ranked[0].features.candidate_id
        out = tmp_path / "test.csv"
        result = generate_submission(ranked, out)
        assert not result.is_valid
        assert any("duplicate" in e.lower() for e in result.validation_errors)

    def test_invalid_id_format_detected(self, tmp_path: Path):
        ranked = _make_100_ranked()
        ranked[0].features.candidate_id = "BADID_001"  # wrong format
        out = tmp_path / "test.csv"
        result = generate_submission(ranked, out)
        assert not result.is_valid
        assert any("CAND_XXXXXXX" in e or "7 digits" in e for e in result.validation_errors)

    def test_nonsequential_rank_detected(self, tmp_path: Path):
        ranked = _make_100_ranked()
        # Change rank value on one entry (mismatches position)
        object.__setattr__(ranked[5], "rank", 99)
        out = tmp_path / "test.csv"
        result = generate_submission(ranked, out)
        assert not result.is_valid

    def test_score_out_of_range_detected(self, tmp_path: Path):
        ranked = _make_100_ranked()
        ranked[0].features.final_score = 1.5  # above 1.0
        out = tmp_path / "test.csv"
        result = generate_submission(ranked, out)
        assert not result.is_valid
        assert any("range" in e.lower() or "1.000" in e for e in result.validation_errors)

    def test_non_monotonic_scores_detected(self, tmp_path: Path):
        ranked = _make_100_ranked()
        # Make rank 2 score higher than rank 1
        ranked[1].features.final_score = ranked[0].features.final_score + 0.01
        out = tmp_path / "test.csv"
        result = generate_submission(ranked, out)
        assert not result.is_valid
        assert any("non-increasing" in e.lower() or "monoton" in e.lower()
                   for e in result.validation_errors)

    def test_valid_100_candidates_no_preflight_errors(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        result = generate_submission(_make_100_ranked(), out)
        assert result.is_valid, result.validation_errors


# ---------------------------------------------------------------------------
# TestValidateSubmissionFile — file-level validator
# ---------------------------------------------------------------------------

class TestValidateSubmissionFile:
    def _write_csv(self, path: Path, rows: list[list[str]]) -> None:
        with open(path, "w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerows(rows)

    def test_valid_file_returns_no_errors(self, tmp_path: Path):
        out = tmp_path / "intellirank_ai.csv"
        generate_submission(_make_100_ranked(), out)
        assert validate_submission_file(out) == []

    def test_wrong_header_detected(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        rows = [["id", "rank", "score", "reasoning"]]
        rows += [[f"CAND_{i:07d}", str(i), "0.5000", "ok"] for i in range(1, 101)]
        self._write_csv(out, rows)
        errors = validate_submission_file(out)
        assert any("header" in e.lower() for e in errors)

    def test_too_few_rows_detected(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        rows = [REQUIRED_HEADER]
        rows += [[f"CAND_{i:07d}", str(i), "0.5000", "ok"] for i in range(1, 51)]
        self._write_csv(out, rows)
        errors = validate_submission_file(out)
        assert any("50" in e for e in errors)

    def test_duplicate_rank_detected(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        rows = [REQUIRED_HEADER]
        for i in range(1, 100):
            rows.append([f"CAND_{i:07d}", str(i), "0.5000", "ok"])
        # Row 100 has rank=1 again
        rows.append(["CAND_0000100", "1", "0.4000", "ok"])
        self._write_csv(out, rows)
        errors = validate_submission_file(out)
        assert any("duplicate rank" in e.lower() for e in errors)

    def test_duplicate_candidate_id_detected(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        rows = [REQUIRED_HEADER]
        for i in range(1, 101):
            cid = "CAND_0000001" if i == 50 else f"CAND_{i:07d}"
            rows.append([cid, str(i), f"{max(0.001, 0.95 - i * 0.008):.4f}", "ok"])
        self._write_csv(out, rows)
        errors = validate_submission_file(out)
        assert any("duplicate candidate_id" in e.lower() for e in errors)

    def test_non_monotonic_score_detected(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        rows = [REQUIRED_HEADER]
        for i in range(1, 101):
            # Make rank 2 score higher than rank 1
            score = 0.8 if i == 2 else max(0.001, 0.9 - i * 0.008)
            rows.append([f"CAND_{i:07d}", str(i), f"{score:.4f}", "ok"])
        self._write_csv(out, rows)
        errors = validate_submission_file(out)
        assert any("non-increasing" in e.lower() for e in errors)

    def test_invalid_candidate_id_format_detected(self, tmp_path: Path):
        out = tmp_path / "test.csv"
        rows = [REQUIRED_HEADER]
        for i in range(1, 101):
            cid = "INVALID_ID" if i == 5 else f"CAND_{i:07d}"
            rows.append([cid, str(i), "0.5000", "ok"])
        self._write_csv(out, rows)
        errors = validate_submission_file(out)
        assert any("7 digits" in e or "CAND_XXXXXXX" in e for e in errors)

    def test_wrong_extension_detected(self, tmp_path: Path):
        out = tmp_path / "submission.xlsx"
        out.write_text("data", encoding="utf-8")
        errors = validate_submission_file(out)
        assert any(".csv" in e.lower() for e in errors)

    @pytest.mark.skipif(
        not SAMPLE_CSV.exists(),
        reason="Competition sample_submission.csv not present",
    )
    def test_official_sample_csv_is_valid(self):
        errors = validate_submission_file(SAMPLE_CSV)
        assert errors == [], (
            f"Official sample_submission.csv failed validation:\n"
            + "\n".join(f"  - {e}" for e in errors)
        )

    def test_tie_breaking_violation_detected(self, tmp_path: Path):
        """Equal scores must have candidate_id in ascending order."""
        out = tmp_path / "test.csv"
        rows = [REQUIRED_HEADER]
        for i in range(1, 99):
            rows.append([f"CAND_{i:07d}", str(i), "0.5000", "ok"])
        # Ranks 99 and 100 share score 0.5000 but ID at rank 99 > ID at rank 100
        rows.append(["CAND_0000200", "99", "0.5000", "ok"])   # higher ID first
        rows.append(["CAND_0000100", "100", "0.5000", "ok"])  # lower ID second
        self._write_csv(out, rows)
        errors = validate_submission_file(out)
        assert any("tie-break" in e.lower() or "ascending" in e.lower() for e in errors)
