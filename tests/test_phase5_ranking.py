"""Phase 5 — Candidate Ranking Engine tests."""

from __future__ import annotations

import pytest

from intellirank.config import PipelineConfig, get_config
from intellirank.features.corpus_stats import CorpusStats
from intellirank.features.extractor import extract_features
from intellirank.ranking.explainability import (
    ExplainabilityReport,
    build_explainability_report,
    generate_reasoning,
)
from intellirank.ranking.ranker import RankedCandidate, rank_candidates
from intellirank.ranking.scorer import (
    compute_confidence_score,
    compute_technical_fit,
    score_candidate,
)
from intellirank.types import Candidate, CandidateFeatures


# ---------------------------------------------------------------------------
# Shared test configuration
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
# Helpers
# ---------------------------------------------------------------------------

def _make_raw_candidate(**kwargs) -> Candidate:
    base = {
        "candidate_id": "CAND_0000001",
        "profile": {
            "current_title": "Senior ML Engineer",
            "years_of_experience": 7.0,
            "location": "Noida",
            "country": "India",
            "current_company": "OpenAI",
            "summary": (
                "deployed faiss vector search with rag pipeline. "
                "fine-tuned sentence-transformers for production embeddings."
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
                    "sentence-transformers for production embedding system. "
                    "serving 1M queries with sub-10ms latency at scale."
                ),
            },
        ],
        "education": [
            {
                "institution": "IIT Bombay",
                "degree": "B.Tech",
                "field_of_study": "Computer Science",
                "start_year": 2014,
                "end_year": 2018,
                "tier": "tier_1",
            }
        ],
        "skills": [
            {"name": "FAISS", "proficiency": "expert", "endorsements": 40, "duration_months": 36},
            {"name": "Qdrant", "proficiency": "advanced", "endorsements": 20, "duration_months": 24},
            {"name": "Sentence Transformers", "proficiency": "expert", "endorsements": 35, "duration_months": 30},
            {"name": "RAG", "proficiency": "advanced", "endorsements": 25, "duration_months": 24},
            {"name": "PyTorch", "proficiency": "expert", "endorsements": 50, "duration_months": 48},
        ],
        "certifications": [
            {"name": "Deep Learning Specialization", "issuer": "deeplearning.ai", "year": 2023}
        ],
        "redrob_signals": {
            "profile_completeness_score": 92.0,
            "signup_date": "2025-01-01",
            "last_active_date": "2026-06-25",
            "open_to_work_flag": True,
            "recruiter_response_rate": 0.85,
            "avg_response_time_hours": 3.0,
            "skill_assessment_scores": {"FAISS": 85.0, "PyTorch": 90.0},
            "connection_count": 500,
            "notice_period_days": 30,
            "expected_salary_range_inr_lpa": {"min": 30.0, "max": 45.0},
            "preferred_work_mode": "hybrid",
            "willing_to_relocate": True,
            "github_activity_score": 85.0,
            "interview_completion_rate": 0.90,
            "offer_acceptance_rate": 0.80,
            "verified_email": True,
            "verified_phone": True,
            "linkedin_connected": True,
        },
    }
    base.update(kwargs)
    return Candidate.model_validate(base)


def _extract(raw: Candidate) -> CandidateFeatures:
    return extract_features(raw, DEFAULT_CORPUS)


def _strong_features() -> CandidateFeatures:
    return _extract(_make_raw_candidate())


def _blank(candidate_id: str = "CAND_0000001") -> CandidateFeatures:
    """All-default (zero) features for gate boundary testing."""
    return CandidateFeatures(candidate_id=candidate_id)


def _make_n_features(n: int) -> list[CandidateFeatures]:
    """Build n features with strictly decreasing scores (no ties)."""
    result = []
    for i in range(n):
        cid = f"CAND_{i:07d}"
        f = CandidateFeatures(candidate_id=cid)
        composite = max(0.01, (n - i) / (n + 1))
        f.skill.si_composite = composite
        f.career.ci_composite = composite * 0.8
        f.experience.ei_composite = composite * 0.7
        f.domain.di_composite = composite * 0.6
        f.learning.li_composite = composite * 0.5
        f.education.edu_composite = composite * 0.4
        f.potential.pi_composite = composite * 0.3
        f.recruitability.ri_master = 0.80
        f.quality.pq_composite = 0.60
        f.quality.pq_01 = 0
        f.notice_period_days = 30
        f.days_since_active = 10
        f.current_title = "ML Engineer"
        f.years_of_experience = float(i % 10 + 1)
        result.append(f)
    return result


def _identical_score_features(candidate_ids: list[str]) -> list[CandidateFeatures]:
    """Build features all sharing the same composite values (tie scenario)."""
    result = []
    for cid in candidate_ids:
        f = CandidateFeatures(candidate_id=cid)
        f.skill.si_composite = 0.50
        f.recruitability.ri_master = 0.80
        f.quality.pq_composite = 0.60
        f.quality.pq_01 = 0
        f.current_title = "ML Engineer"
        f.years_of_experience = 5.0
        result.append(f)
    return result


# ---------------------------------------------------------------------------
# TestComputeTechnicalFit
# ---------------------------------------------------------------------------

class TestComputeTechnicalFit:
    def test_perfect_candidate_returns_one(self):
        f = _blank()
        f.skill.si_composite = 1.0
        f.career.ci_composite = 1.0
        f.experience.ei_composite = 1.0
        f.domain.di_composite = 1.0
        f.learning.li_composite = 1.0
        f.education.edu_composite = 1.0
        f.potential.pi_composite = 1.0
        assert abs(compute_technical_fit(f, CFG) - 1.0) < 1e-9

    def test_zero_candidate_returns_zero(self):
        f = _blank()
        assert compute_technical_fit(f, CFG) == 0.0

    def test_si_only_contribution(self):
        f = _blank()
        f.skill.si_composite = 1.0
        tf = compute_technical_fit(f, CFG)
        assert abs(tf - CFG.weight_si) < 1e-9

    def test_weights_sum_to_one(self):
        total = (
            CFG.weight_si + CFG.weight_ci + CFG.weight_ei
            + CFG.weight_di + CFG.weight_li + CFG.weight_edu + CFG.weight_pi
        )
        assert abs(total - 1.0) < 1e-9

    def test_technical_fit_in_range(self):
        f = _strong_features()
        tf = compute_technical_fit(f, CFG)
        assert 0.0 <= tf <= 1.0


# ---------------------------------------------------------------------------
# TestScoreCandidate
# ---------------------------------------------------------------------------

class TestScoreCandidate:
    def test_populates_technical_fit(self):
        f = _blank()
        f.skill.si_composite = 0.80
        score_candidate(f, CFG)
        assert f.technical_fit == pytest.approx(CFG.weight_si * 0.80, abs=1e-9)

    def test_populates_final_score_above_floor(self):
        f = _blank()
        f.skill.si_composite = 0.50
        f.recruitability.ri_master = 0.80
        score_candidate(f, CFG)
        assert f.final_score >= 0.001

    def test_populates_confidence_score(self):
        f = _blank()
        score_candidate(f, CFG)
        assert isinstance(f.confidence_score, float)
        assert 0.0 <= f.confidence_score <= 1.0

    def test_quality_modifier_floor_at_pq_zero(self):
        # pq_composite=0 → modifier=0.80; for a candidate with no technical_fit this
        # still clips to 0.001. Verify the formula by checking a detached computation.
        f = _blank()
        f.skill.si_composite = 1.0          # technical_fit = 0.35
        f.recruitability.ri_master = 1.0    # gated_score = 0.35
        f.quality.pq_composite = 0.0        # modifier = 0.80
        f.quality.pq_01 = 0                 # gate = 1.0
        score_candidate(f, CFG)
        expected = 0.35 * 1.0 * (0.80 + 0.20 * 0.0) * 1.0
        assert abs(f.final_score - expected) < 1e-6

    def test_quality_modifier_ceiling_at_pq_one(self):
        f = _blank()
        f.skill.si_composite = 1.0
        f.recruitability.ri_master = 1.0
        f.quality.pq_composite = 1.0        # modifier = 1.00
        f.quality.pq_01 = 0
        score_candidate(f, CFG)
        expected = 0.35 * 1.0 * (0.80 + 0.20 * 1.0) * 1.0
        assert abs(f.final_score - expected) < 1e-6

    def test_honeypot_gate_zero_pq01(self):
        f = _blank()
        f.skill.si_composite = 1.0
        f.recruitability.ri_master = 1.0
        f.quality.pq_composite = 1.0
        f.quality.pq_01 = 0              # gate = 1.0 (no penalty)
        score_candidate(f, CFG)
        expected = 0.35 * 1.0 * 1.0 * 1.0
        assert abs(f.final_score - expected) < 1e-6

    def test_honeypot_gate_ten_pq01_enforces_floor(self):
        f = _blank()
        f.skill.si_composite = 1.0
        f.recruitability.ri_master = 1.0
        f.quality.pq_composite = 1.0
        f.quality.pq_01 = 10             # penalty=1.0 → gate = max(0.05, 0.0) = 0.05
        score_candidate(f, CFG)
        expected = 0.35 * 1.0 * 1.0 * 0.05
        assert abs(f.final_score - expected) < 1e-6

    def test_honeypot_gate_five_pq01(self):
        f = _blank()
        f.skill.si_composite = 1.0
        f.recruitability.ri_master = 1.0
        f.quality.pq_composite = 1.0
        f.quality.pq_01 = 5              # penalty=0.5 → gate=0.5
        score_candidate(f, CFG)
        expected = 0.35 * 1.0 * 1.0 * 0.5
        assert abs(f.final_score - expected) < 1e-6

    def test_final_score_minimum_floor(self):
        f = _blank()
        # All-zero composites → technical_fit=0; score clips to 0.001
        score_candidate(f, CFG)
        assert f.final_score >= 0.001

    def test_final_score_maximum_ceiling(self):
        f = _blank()
        f.skill.si_composite = 1.0
        f.career.ci_composite = 1.0
        f.experience.ei_composite = 1.0
        f.domain.di_composite = 1.0
        f.learning.li_composite = 1.0
        f.education.edu_composite = 1.0
        f.potential.pi_composite = 1.0
        f.recruitability.ri_master = 1.0
        f.quality.pq_composite = 1.0
        f.quality.pq_01 = 0
        score_candidate(f, CFG)
        assert f.final_score <= 1.000

    def test_low_ri_master_gates_score(self):
        f_high_ri = _blank("CAND_A")
        f_high_ri.skill.si_composite = 0.80
        f_high_ri.recruitability.ri_master = 0.90
        f_high_ri.quality.pq_composite = 0.60
        score_candidate(f_high_ri, CFG)

        f_low_ri = _blank("CAND_B")
        f_low_ri.skill.si_composite = 0.80
        f_low_ri.recruitability.ri_master = 0.05   # near-minimum
        f_low_ri.quality.pq_composite = 0.60
        score_candidate(f_low_ri, CFG)

        assert f_high_ri.final_score > f_low_ri.final_score * 5

    def test_strong_candidate_meaningful_final_score(self):
        f = _strong_features()
        score_candidate(f, CFG)
        assert f.final_score > 0.05


# ---------------------------------------------------------------------------
# TestComputeConfidenceScore
# ---------------------------------------------------------------------------

class TestComputeConfidenceScore:
    def test_no_evidence_returns_zero(self):
        f = _blank()
        assert compute_confidence_score(f) == 0.0

    def test_assessment_backed_higher_than_no_assessment(self):
        f_assessed = _blank("CAND_A")
        f_assessed.skill.si_composite = 0.60
        f_assessed.skill.si_03 = 0.40       # assessment-backed
        f_assessed.skill.si_04 = 0.30

        f_none = _blank("CAND_B")
        f_none.skill.si_composite = 0.60
        # si_03=0 by default

        assert compute_confidence_score(f_assessed) > compute_confidence_score(f_none)

    def test_confidence_score_in_range(self):
        f = _strong_features()
        c = compute_confidence_score(f)
        assert 0.0 <= c <= 1.0

    def test_strong_candidate_has_positive_confidence(self):
        f = _strong_features()
        c = compute_confidence_score(f)
        assert c > 0.0


# ---------------------------------------------------------------------------
# TestRankCandidates
# ---------------------------------------------------------------------------

class TestRankCandidates:
    def test_empty_list_returns_empty(self):
        assert rank_candidates([], CFG) == []

    def test_single_candidate_rank_one(self):
        result = rank_candidates([_blank()], CFG)
        assert len(result) == 1
        assert result[0].rank == 1

    def test_fewer_than_k_returns_all(self):
        features = _make_n_features(50)
        result = rank_candidates(features, CFG)
        assert len(result) == 50

    def test_k_or_more_returns_top_k(self):
        features = _make_n_features(200)
        result = rank_candidates(features, CFG)
        assert len(result) == CFG.top_k

    def test_rank_numbers_sequential(self):
        features = _make_n_features(10)
        result = rank_candidates(features, CFG)
        for i, rc in enumerate(result, start=1):
            assert rc.rank == i

    def test_no_duplicate_candidate_ids(self):
        features = _make_n_features(150)
        result = rank_candidates(features, CFG)
        ids = [rc.features.candidate_id for rc in result]
        assert len(ids) == len(set(ids))

    def test_best_candidate_ranked_first(self):
        features = _make_n_features(20)
        result = rank_candidates(features, CFG)
        # CAND_0000000 has the highest composite (n / (n+1) = 20/21 ≈ 0.952)
        assert result[0].features.candidate_id == "CAND_0000000"

    def test_scores_non_increasing(self):
        features = _make_n_features(150)
        result = rank_candidates(features, CFG)
        for i in range(1, len(result)):
            assert result[i].features.final_score <= result[i - 1].features.final_score

    def test_tie_breaking_lower_id_ranks_higher(self):
        # All candidates have identical composites → same final_score
        ids = ["CAND_0000003", "CAND_0000001", "CAND_0000002"]
        features = _identical_score_features(ids)
        result = rank_candidates(features, CFG)
        ranked_ids = [rc.features.candidate_id for rc in result]
        assert ranked_ids == ["CAND_0000001", "CAND_0000002", "CAND_0000003"]

    def test_result_type_is_ranked_candidate(self):
        result = rank_candidates(_make_n_features(3), CFG)
        for rc in result:
            assert isinstance(rc, RankedCandidate)

    def test_reasoning_populated_for_all(self):
        result = rank_candidates(_make_n_features(5), CFG)
        for rc in result:
            assert isinstance(rc.reasoning, str)
            assert len(rc.reasoning) > 0

    def test_report_rank_matches_ranked_candidate_rank(self):
        result = rank_candidates(_make_n_features(5), CFG)
        for rc in result:
            assert rc.report.rank == rc.rank


# ---------------------------------------------------------------------------
# TestGenerateReasoning
# ---------------------------------------------------------------------------

class TestGenerateReasoning:
    def test_returns_non_empty_string(self):
        f = _blank()
        f.current_title = "ML Engineer"
        f.years_of_experience = 4.0
        r = generate_reasoning(f, 1)
        assert isinstance(r, str) and len(r) > 0

    def test_length_reasonable(self):
        f = _blank()
        f.current_title = "Senior ML Engineer"
        f.years_of_experience = 7.0
        f.top_tier1_skills = ["FAISS", "Qdrant"]
        f.has_production_evidence = True
        r = generate_reasoning(f, 1)
        assert len(r) <= 500

    def test_notice_over_60_included_in_reasoning(self):
        f = _blank()
        f.current_title = "ML Engineer"
        f.years_of_experience = 5.0
        f.notice_period_days = 90
        r = generate_reasoning(f, 10)
        assert "90" in r and "notice" in r.lower()

    def test_hidden_gem_mentions_non_ai_title(self):
        f = _blank()
        f.current_title = "Software Developer"
        f.years_of_experience = 6.0
        f.is_hidden_gem = True
        r = generate_reasoning(f, 5)
        assert "non-AI" in r

    def test_rank_80_acknowledges_threshold(self):
        f = _blank()
        f.current_title = "Data Analyst"
        f.years_of_experience = 3.0
        r = generate_reasoning(f, 85)
        assert "threshold" in r.lower()

    def test_tier1_skill_appears_in_reasoning(self):
        f = _blank()
        f.current_title = "ML Engineer"
        f.years_of_experience = 5.0
        f.top_tier1_skills = ["FAISS", "RAG"]
        r = generate_reasoning(f, 1)
        assert "FAISS" in r or "RAG" in r

    def test_no_hallucinated_skills(self):
        f = _blank()
        f.current_title = "ML Engineer"
        f.years_of_experience = 5.0
        f.top_tier1_skills = ["FAISS"]
        r = generate_reasoning(f, 1)
        # Skills not in top_tier1_skills should not appear
        assert "Qdrant" not in r
        assert "LangChain" not in r

    def test_four_ranks_produce_four_different_openings(self):
        f = _blank()
        f.current_title = "ML Engineer"
        f.years_of_experience = 5.0
        f.location = "Noida"
        reasonings = [generate_reasoning(f, rank) for rank in [1, 2, 3, 4]]
        # Each (rank-1)%4 selects a different template → openings differ
        first_words = [r.split(" — ")[0].split(".")[0] for r in reasonings]
        assert len(set(first_words)) == 4

    def test_consulting_flag_in_reasoning(self):
        f = _blank()
        f.current_title = "AI Consultant"
        f.years_of_experience = 8.0
        f.has_consulting_flag = True
        r = generate_reasoning(f, 10)
        assert "consulting" in r.lower()


# ---------------------------------------------------------------------------
# TestBuildExplainabilityReport
# ---------------------------------------------------------------------------

class TestBuildExplainabilityReport:
    def _scored_blank(self, candidate_id: str = "CAND_0000001") -> CandidateFeatures:
        f = _blank(candidate_id)
        f.skill.si_composite = 0.60
        f.career.ci_composite = 0.40
        f.recruitability.ri_master = 0.75
        f.quality.pq_composite = 0.50
        f.quality.pq_01 = 0
        f.current_title = "ML Engineer"
        f.years_of_experience = 5.0
        score_candidate(f, CFG)
        return f

    def test_report_final_score_matches_features(self):
        f = self._scored_blank()
        report = build_explainability_report(f, CFG, 1)
        assert report.final_score == f.final_score

    def test_report_rank_matches_argument(self):
        f = self._scored_blank()
        for rank in [1, 50, 100]:
            report = build_explainability_report(f, CFG, rank)
            assert report.rank == rank

    def test_top_dimensions_has_seven_entries(self):
        f = self._scored_blank()
        report = build_explainability_report(f, CFG, 1)
        assert len(report.top_dimensions) == 7

    def test_dim_contributions_sum_approximates_technical_fit(self):
        f = self._scored_blank()
        report = build_explainability_report(f, CFG, 1)
        contribution_sum = sum(report.dim_contributions.values())
        assert abs(contribution_sum - f.technical_fit) < 1e-6

    def test_quality_modifier_computed_correctly(self):
        f = self._scored_blank()
        f.quality.pq_composite = 0.50
        score_candidate(f, CFG)
        report = build_explainability_report(f, CFG, 1)
        expected_modifier = CFG.quality_modifier_floor + CFG.quality_modifier_range * 0.50
        assert abs(report.quality_modifier - expected_modifier) < 1e-9

    def test_honeypot_gate_correct_for_pq01_zero(self):
        f = self._scored_blank()
        f.quality.pq_01 = 0
        score_candidate(f, CFG)
        report = build_explainability_report(f, CFG, 1)
        assert abs(report.honeypot_gate - 1.0) < 1e-9

    def test_strengths_nonempty_for_strong_candidate(self):
        f = _strong_features()
        score_candidate(f, CFG)
        report = build_explainability_report(f, CFG, 1)
        assert len(report.strengths) > 0

    def test_weaknesses_consulting_flag_in_weaknesses(self):
        f = self._scored_blank()
        f.has_consulting_flag = True
        score_candidate(f, CFG)
        report = build_explainability_report(f, CFG, 50)
        assert any("consulting" in w.lower() for w in report.weaknesses)

    def test_weaknesses_long_notice_in_weaknesses(self):
        f = self._scored_blank()
        f.notice_period_days = 120
        score_candidate(f, CFG)
        report = build_explainability_report(f, CFG, 10)
        assert any("notice" in w.lower() or "120" in w for w in report.weaknesses)

    def test_candidate_id_propagated_to_report(self):
        f = self._scored_blank("CAND_0099999")
        report = build_explainability_report(f, CFG, 1)
        assert report.candidate_id == "CAND_0099999"

    def test_behavioral_gate_equals_ri_master(self):
        f = self._scored_blank()
        f.recruitability.ri_master = 0.65
        score_candidate(f, CFG)
        report = build_explainability_report(f, CFG, 1)
        assert abs(report.behavioral_gate - 0.65) < 1e-9

    def test_anomaly_score_propagated_from_pq01(self):
        f = self._scored_blank()
        f.quality.pq_01 = 3
        score_candidate(f, CFG)
        report = build_explainability_report(f, CFG, 1)
        assert report.anomaly_score == 3
