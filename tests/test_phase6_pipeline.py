"""Phase 6 — End-to-End Candidate Ranking Pipeline integration tests."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from intellirank.config import PipelineConfig, get_config
from intellirank.features.corpus_stats import CorpusStats
from intellirank.pipeline import PipelineResult, run_pipeline_from_candidates
from intellirank.ranking.ranker import RankedCandidate
from intellirank.types import Candidate


# ---------------------------------------------------------------------------
# Shared fixtures
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

CFG = get_config()


# ---------------------------------------------------------------------------
# Candidate builders
# ---------------------------------------------------------------------------

def _make_candidate(
    candidate_id: str = "CAND_0000001",
    yoe: float = 7.0,
    skills: list[dict] | None = None,  # type: ignore[type-arg]
    github: float = 85.0,
    notice: int = 30,
    last_active: str = "2026-06-25",
    open_to_work: bool = True,
) -> Candidate:
    if skills is None:
        skills = [
            {"name": "FAISS", "proficiency": "expert", "endorsements": 40, "duration_months": 36},
            {"name": "Qdrant", "proficiency": "advanced", "endorsements": 20, "duration_months": 24},
            {"name": "Sentence Transformers", "proficiency": "expert", "endorsements": 30, "duration_months": 30},
            {"name": "RAG", "proficiency": "advanced", "endorsements": 25, "duration_months": 24},
            {"name": "Python", "proficiency": "expert", "endorsements": 50, "duration_months": 48},
        ]
    return Candidate.model_validate({
        "candidate_id": candidate_id,
        "profile": {
            "current_title": "ML Engineer",
            "years_of_experience": yoe,
            "location": "Bangalore",
            "country": "India",
            "current_company": "Startup AI",
            "summary": "built rag pipeline with faiss vector search for production embedding system.",
        },
        "career_history": [
            {
                "company": "Startup AI",
                "title": "ML Engineer",
                "start_date": "2021-01-01",
                "end_date": None,
                "duration_months": int(yoe * 12),
                "is_current": True,
                "industry": "Technology",
                "description": "deployed faiss rag pipeline serving 500k queries per day.",
            }
        ],
        "skills": skills,
        "redrob_signals": {
            "last_active_date": last_active,
            "signup_date": "2024-01-01",
            "notice_period_days": notice,
            "github_activity_score": github,
            "open_to_work_flag": open_to_work,
            "recruiter_response_rate": 0.80,
            "avg_response_time_hours": 4.0,
            "profile_completeness_score": 85.0,
            "verified_email": True,
            "verified_phone": True,
        },
    })


def _make_weak_candidate(candidate_id: str) -> Candidate:
    """No AI skills, inactive, long notice — expected to rank low."""
    return Candidate.model_validate({
        "candidate_id": candidate_id,
        "profile": {
            "current_title": "HR Manager",
            "years_of_experience": 5.0,
            "location": "Unknown City",
            "country": "India",
        },
        "skills": [
            {"name": "MS Excel", "proficiency": "intermediate", "endorsements": 2, "duration_months": 12},
        ],
        "redrob_signals": {
            "last_active_date": "2024-01-01",
            "notice_period_days": 120,
            "github_activity_score": -1.0,
            "open_to_work_flag": False,
        },
    })


def _make_n_candidates(n: int, strong: bool = True) -> list[Candidate]:
    """Build n candidates with unique IDs."""
    return [
        _make_candidate(candidate_id=f"CAND_{i:07d}")
        if strong
        else _make_weak_candidate(f"CAND_{i:07d}")
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# TestPipelineComplete
# ---------------------------------------------------------------------------

class TestPipelineComplete:
    def test_returns_pipeline_result_type(self):
        candidates = _make_n_candidates(5)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        assert isinstance(result, PipelineResult)

    def test_ranked_list_populated(self):
        candidates = _make_n_candidates(5)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        assert len(result.ranked) == 5
        assert all(isinstance(rc, RankedCandidate) for rc in result.ranked)

    def test_ranks_sequential_from_one(self):
        candidates = _make_n_candidates(10)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        ranks = [rc.rank for rc in result.ranked]
        assert ranks == list(range(1, len(result.ranked) + 1))

    def test_scores_non_increasing(self):
        candidates = _make_n_candidates(10)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        scores = [rc.features.final_score for rc in result.ranked]
        for i in range(1, len(scores)):
            assert scores[i] <= scores[i - 1], (
                f"Score at rank {i + 1} ({scores[i]:.6f}) > rank {i} ({scores[i - 1]:.6f})"
            )

    def test_all_final_scores_in_valid_range(self):
        candidates = _make_n_candidates(10)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        for rc in result.ranked:
            assert 0.001 <= rc.features.final_score <= 1.000

    def test_candidate_ids_unique_in_result(self):
        candidates = _make_n_candidates(15)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        ids = [rc.features.candidate_id for rc in result.ranked]
        assert len(ids) == len(set(ids))

    def test_reasoning_non_empty_for_all(self):
        candidates = _make_n_candidates(5)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        for rc in result.ranked:
            assert isinstance(rc.reasoning, str) and len(rc.reasoning) > 0

    def test_corpus_propagated_to_result(self):
        candidates = _make_n_candidates(3)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        assert result.corpus is DEFAULT_CORPUS

    def test_load_stats_valid_count_matches_extracted(self):
        candidates = _make_n_candidates(8)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        assert result.load_stats.valid == result.total_features_extracted

    def test_elapsed_seconds_positive(self):
        candidates = _make_n_candidates(5)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        assert result.elapsed_seconds > 0.0


# ---------------------------------------------------------------------------
# TestPipelineEmpty
# ---------------------------------------------------------------------------

class TestPipelineEmpty:
    def test_empty_candidates_returns_empty_ranked(self):
        result = run_pipeline_from_candidates([], DEFAULT_CORPUS, CFG)
        assert result.ranked == []

    def test_empty_candidates_zero_errors(self):
        result = run_pipeline_from_candidates([], DEFAULT_CORPUS, CFG)
        assert result.extraction_errors == 0

    def test_empty_candidates_zero_extracted(self):
        result = run_pipeline_from_candidates([], DEFAULT_CORPUS, CFG)
        assert result.total_features_extracted == 0

    def test_empty_candidates_elapsed_positive(self):
        result = run_pipeline_from_candidates([], DEFAULT_CORPUS, CFG)
        assert result.elapsed_seconds >= 0.0


# ---------------------------------------------------------------------------
# TestMalformedCandidates
# ---------------------------------------------------------------------------

class TestMalformedCandidates:
    def test_extraction_error_skipped_gracefully(self):
        """A candidate that raises during extract_features is counted in errors
        and skipped; the rest proceed normally."""
        candidates = _make_n_candidates(5)
        call_count = [0]

        original_extract = __import__(
            "intellirank.features.extractor", fromlist=["extract_features"]
        ).extract_features

        def failing_on_third(candidate, corpus):
            call_count[0] += 1
            if call_count[0] == 3:
                raise ValueError("Simulated extraction failure")
            return original_extract(candidate, corpus)

        with patch("intellirank.pipeline.extract_features", side_effect=failing_on_third):
            result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)

        assert result.extraction_errors == 1
        assert result.total_features_extracted == 4
        assert len(result.ranked) == 4

    def test_all_malformed_returns_empty_ranked(self):
        """If every candidate fails extraction, ranked is empty."""
        candidates = _make_n_candidates(3)

        with patch(
            "intellirank.pipeline.extract_features",
            side_effect=RuntimeError("every candidate fails"),
        ):
            result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)

        assert result.ranked == []
        assert result.extraction_errors == 3
        assert result.total_features_extracted == 0

    def test_pipeline_continues_after_extraction_error(self):
        """Pipeline completes fully even when some candidates fail."""
        candidates = _make_n_candidates(10)
        original_extract = __import__(
            "intellirank.features.extractor", fromlist=["extract_features"]
        ).extract_features
        fail_ids = {"CAND_0000002", "CAND_0000005", "CAND_0000008"}

        def selective_fail(candidate, corpus):
            if candidate.candidate_id in fail_ids:
                raise ValueError(f"Simulated fail for {candidate.candidate_id}")
            return original_extract(candidate, corpus)

        with patch("intellirank.pipeline.extract_features", side_effect=selective_fail):
            result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)

        assert result.extraction_errors == 3
        assert result.total_features_extracted == 7
        # No failed IDs should appear in the ranked list
        ranked_ids = {rc.features.candidate_id for rc in result.ranked}
        assert ranked_ids.isdisjoint(fail_ids)


# ---------------------------------------------------------------------------
# TestDuplicateCandidates
# ---------------------------------------------------------------------------

class TestDuplicateCandidates:
    def test_duplicate_ids_both_extracted_in_memory(self):
        """In-memory pipeline does not deduplicate — that is iter_candidates' role.
        Both copies are extracted and available for ranking."""
        c1 = _make_candidate("CAND_DUPE")
        c2 = _make_candidate("CAND_DUPE")
        result = run_pipeline_from_candidates([c1, c2], DEFAULT_CORPUS, CFG)
        # Both should be extracted
        assert result.total_features_extracted == 2

    def test_unique_ids_no_collision(self):
        candidates = _make_n_candidates(10)
        ids = [c.candidate_id for c in candidates]
        assert len(ids) == len(set(ids))  # sanity: our helper produces unique IDs


# ---------------------------------------------------------------------------
# TestLargeDataset
# ---------------------------------------------------------------------------

class TestLargeDataset:
    def test_200_candidates_complete_in_time(self):
        """200 candidates should rank in well under 10 seconds (CPU-only)."""
        import time

        candidates = _make_n_candidates(200)
        t0 = time.monotonic()
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        elapsed = time.monotonic() - t0

        assert elapsed < 10.0, f"Pipeline took {elapsed:.1f}s for 200 candidates"
        assert result.total_features_extracted == 200

    def test_200_candidates_top_k_enforced(self):
        """With 200 candidates, only top_k (100) are returned."""
        candidates = _make_n_candidates(200)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        assert len(result.ranked) == CFG.top_k

    def test_custom_top_k(self):
        """Verify top_k config is respected."""
        cfg = PipelineConfig(top_k=10)
        candidates = _make_n_candidates(50)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, cfg)
        assert len(result.ranked) == 10


# ---------------------------------------------------------------------------
# TestDeterministicOutput
# ---------------------------------------------------------------------------

class TestDeterministicOutput:
    def test_same_input_produces_same_ranking(self):
        """Two identical runs must produce identical rankings."""
        candidates = _make_n_candidates(10)

        result_a = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        result_b = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)

        ids_a = [rc.features.candidate_id for rc in result_a.ranked]
        ids_b = [rc.features.candidate_id for rc in result_b.ranked]
        assert ids_a == ids_b

    def test_same_input_produces_same_scores(self):
        """Scores must be identical across two runs."""
        candidates = _make_n_candidates(10)

        result_a = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        result_b = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)

        scores_a = [rc.features.final_score for rc in result_a.ranked]
        scores_b = [rc.features.final_score for rc in result_b.ranked]
        assert scores_a == scores_b

    def test_same_input_produces_same_reasoning(self):
        """Reasoning strings must be identical across two runs."""
        candidates = _make_n_candidates(5)

        result_a = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        result_b = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)

        reasoning_a = [rc.reasoning for rc in result_a.ranked]
        reasoning_b = [rc.reasoning for rc in result_b.ranked]
        assert reasoning_a == reasoning_b


# ---------------------------------------------------------------------------
# TestPerformanceSanity
# ---------------------------------------------------------------------------

class TestPerformanceSanity:
    def test_strong_candidate_outranks_weak_candidate(self):
        """A candidate with Tier-1 AI skills should rank above one with no AI skills."""
        strong = _make_candidate("CAND_STRONG")
        weak = _make_weak_candidate("CAND_WEAK")

        result = run_pipeline_from_candidates([strong, weak], DEFAULT_CORPUS, CFG)
        ranked_ids = [rc.features.candidate_id for rc in result.ranked]

        assert ranked_ids.index("CAND_STRONG") < ranked_ids.index("CAND_WEAK")

    def test_pipeline_result_extraction_count(self):
        n = 15
        candidates = _make_n_candidates(n)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        assert result.total_features_extracted == n
        assert result.extraction_errors == 0

    def test_all_reports_have_correct_rank(self):
        """Every RankedCandidate.report.rank must match the position in the list."""
        candidates = _make_n_candidates(10)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        for rc in result.ranked:
            assert rc.report.rank == rc.rank

    def test_confidence_scores_populated(self):
        """confidence_score should be set (non-negative) for all ranked candidates."""
        candidates = _make_n_candidates(5)
        result = run_pipeline_from_candidates(candidates, DEFAULT_CORPUS, CFG)
        for rc in result.ranked:
            assert rc.features.confidence_score >= 0.0
