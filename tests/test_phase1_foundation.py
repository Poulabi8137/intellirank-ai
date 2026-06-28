"""Phase 1 — Project Foundation tests."""

import math
from datetime import date

import pytest

from intellirank.config import PipelineConfig, get_config
from intellirank.constants import (
    TIER_1_SKILLS, TIER_2_SKILLS, TIER_3_SKILLS, NEGATIVE_SKILLS,
    CONSULTING_FIRMS, PROFICIENCY_WEIGHTS, TIER_WEIGHTS,
    NOTICE_PERIOD_BREAKPOINTS, GITHUB_BREAKPOINTS, RECENCY_BREAKPOINTS,
)
from intellirank.logger import get_logger
from intellirank.utils.math_utils import (
    clamp, piecewise_linear, gaussian_bell, geometric_mean,
    safe_div, skill_trust_score, p95_normalize, weighted_sum,
)
from intellirank.utils.text_utils import (
    normalize_text, to_shadow, normalize_company_name,
    normalize_degree, scan_terms_weighted, count_words,
)
from intellirank.utils.date_utils import parse_date, days_since, months_between


# ---------------------------------------------------------------------------
# Config tests
# ---------------------------------------------------------------------------

class TestConfig:
    def test_default_config_builds(self):
        cfg = get_config()
        assert isinstance(cfg, PipelineConfig)

    def test_technical_fit_weights_sum_to_one(self):
        cfg = get_config()
        total = (cfg.weight_si + cfg.weight_ci + cfg.weight_ei
                 + cfg.weight_di + cfg.weight_li + cfg.weight_edu + cfg.weight_pi)
        assert abs(total - 1.0) < 1e-9

    def test_paths_are_defined(self):
        cfg = get_config()
        assert cfg.candidates_path.name == "candidates.jsonl"

    def test_top_k_is_100(self):
        assert get_config().top_k == 100

    def test_invalid_weights_raise(self):
        with pytest.raises(AssertionError):
            PipelineConfig(
                weight_si=0.40,
                weight_ci=0.20,
                weight_ei=0.15,
                weight_di=0.10,
                weight_li=0.10,
                weight_edu=0.05,
                weight_pi=0.05,
            )


# ---------------------------------------------------------------------------
# Constants tests
# ---------------------------------------------------------------------------

class TestConstants:
    def test_tier1_has_core_skills(self):
        assert "faiss" in TIER_1_SKILLS
        assert "qdrant" in TIER_1_SKILLS
        assert "rag" in TIER_1_SKILLS
        assert "sentence transformers" in TIER_1_SKILLS
        assert "learning to rank" in TIER_1_SKILLS

    def test_tier2_has_fine_tuning(self):
        assert "lora" in TIER_2_SKILLS
        assert "qlora" in TIER_2_SKILLS
        assert "pytorch" in TIER_2_SKILLS
        assert "mlflow" in TIER_2_SKILLS

    def test_tier3_has_general_ml(self):
        assert "scikit-learn" in TIER_3_SKILLS
        assert "aws" in TIER_3_SKILLS
        assert "docker" in TIER_3_SKILLS

    def test_negative_has_design_tools(self):
        assert "photoshop" in NEGATIVE_SKILLS
        assert "autocad" in NEGATIVE_SKILLS
        assert "tally" in NEGATIVE_SKILLS

    def test_consulting_firms_complete(self):
        for firm in ["tcs", "wipro", "infosys", "accenture", "cognizant",
                     "capgemini", "hcl", "tech mahindra", "hexaware"]:
            assert firm in CONSULTING_FIRMS, f"{firm} missing from CONSULTING_FIRMS"

    def test_tiers_are_disjoint(self):
        # Core tiers should not overlap (a skill in Tier-1 shouldn't be in Tier-2)
        overlap_1_2 = TIER_1_SKILLS & TIER_2_SKILLS
        assert not overlap_1_2, f"Tier-1/2 overlap: {overlap_1_2}"

    def test_proficiency_weights_ordered(self):
        assert PROFICIENCY_WEIGHTS["beginner"] < PROFICIENCY_WEIGHTS["intermediate"]
        assert PROFICIENCY_WEIGHTS["intermediate"] < PROFICIENCY_WEIGHTS["advanced"]
        assert PROFICIENCY_WEIGHTS["advanced"] < PROFICIENCY_WEIGHTS["expert"]

    def test_notice_breakpoints_sorted(self):
        days_list = [bp[0] for bp in NOTICE_PERIOD_BREAKPOINTS]
        assert days_list == sorted(days_list)

    def test_github_breakpoints_sorted(self):
        scores_list = [bp[0] for bp in GITHUB_BREAKPOINTS]
        assert scores_list == sorted(scores_list)

    def test_recency_breakpoints_sorted(self):
        days_list = [bp[0] for bp in RECENCY_BREAKPOINTS]
        assert days_list == sorted(days_list)


# ---------------------------------------------------------------------------
# Math utility tests
# ---------------------------------------------------------------------------

class TestMathUtils:
    def test_clamp_within_range(self):
        assert clamp(0.5) == 0.5

    def test_clamp_below_low(self):
        assert clamp(-1.0) == 0.0

    def test_clamp_above_high(self):
        assert clamp(2.0) == 1.0

    def test_clamp_custom_bounds(self):
        assert clamp(5.0, 2.0, 8.0) == 5.0
        assert clamp(1.0, 2.0, 8.0) == 2.0

    def test_piecewise_linear_at_breakpoint(self):
        bps = [(0, 0.0), (100, 1.0)]
        assert piecewise_linear(0, bps) == 0.0
        assert piecewise_linear(100, bps) == 1.0

    def test_piecewise_linear_interpolation(self):
        bps = [(0, 0.0), (100, 1.0)]
        assert abs(piecewise_linear(50, bps) - 0.5) < 1e-9

    def test_piecewise_linear_below_range(self):
        bps = [(10, 0.5), (100, 1.0)]
        assert piecewise_linear(0, bps) == 0.5

    def test_piecewise_linear_above_range(self):
        bps = [(0, 0.0), (100, 1.0)]
        assert piecewise_linear(200, bps) == 1.0

    def test_notice_breakpoints(self):
        bps = [(float(d), s) for d, s in NOTICE_PERIOD_BREAKPOINTS]
        # 0 days → 1.0
        assert piecewise_linear(0, bps) == 1.0
        # 30 days → 1.0
        assert piecewise_linear(30, bps) == 1.0
        # 180 days → 0.20
        assert piecewise_linear(180, bps) == 0.20
        # 60 days → 0.85
        assert abs(piecewise_linear(60, bps) - 0.85) < 1e-6

    def test_gaussian_bell_at_center(self):
        assert abs(gaussian_bell(7.0, 7.0, 3.0) - 1.0) < 1e-9

    def test_gaussian_bell_symmetric(self):
        left = gaussian_bell(4.0, 7.0, 3.0)
        right = gaussian_bell(10.0, 7.0, 3.0)
        assert abs(left - right) < 1e-9

    def test_gaussian_bell_positive(self):
        assert gaussian_bell(0.0, 7.0, 3.0) > 0.0

    def test_geometric_mean_uniform(self):
        assert abs(geometric_mean([1.0, 1.0, 1.0]) - 1.0) < 1e-9

    def test_geometric_mean_with_zero(self):
        assert geometric_mean([0.5, 0.0, 1.0]) == 0.0

    def test_geometric_mean_empty(self):
        assert geometric_mean([]) == 0.0

    def test_safe_div_normal(self):
        assert abs(safe_div(1.0, 4.0) - 0.25) < 1e-9

    def test_safe_div_zero_denominator(self):
        assert safe_div(1.0, 0.0) == 0.0

    def test_skill_trust_score_zero_endorsements(self):
        # P × log(1+0) × log(1+D) → P × 0 = 0
        assert skill_trust_score(3.0, 0, 24) == 0.0

    def test_skill_trust_score_zero_duration(self):
        # P × log(1+E) × log(1+0) → P × log(1+E) × 0 = 0
        assert skill_trust_score(3.0, 10, 0) == 0.0

    def test_skill_trust_score_positive(self):
        score = skill_trust_score(4.0, 40, 36)
        assert score > 0.0
        expected = 4.0 * math.log1p(40) * math.log1p(36)
        assert abs(score - expected) < 1e-9

    def test_p95_normalize_below_p95(self):
        assert abs(p95_normalize(50.0, 100.0) - 0.5) < 1e-9

    def test_p95_normalize_above_p95_clamped(self):
        assert p95_normalize(150.0, 100.0) == 1.0

    def test_p95_normalize_zero_p95(self):
        assert p95_normalize(50.0, 0.0) == 0.0

    def test_weighted_sum_single(self):
        assert abs(weighted_sum([0.8], [1.0]) - 0.8) < 1e-9

    def test_weighted_sum_multiple(self):
        result = weighted_sum([1.0, 0.0], [0.6, 0.4])
        assert abs(result - 0.6) < 1e-9


# ---------------------------------------------------------------------------
# Text utility tests
# ---------------------------------------------------------------------------

class TestTextUtils:
    def test_normalize_text_whitespace(self):
        assert normalize_text("hello   world") == "hello world"

    def test_normalize_text_strips(self):
        assert normalize_text("  hello  ") == "hello"

    def test_normalize_text_unicode(self):
        # Smart quotes normalized
        result = normalize_text("“hello”")
        assert "hello" in result

    def test_to_shadow_lowercase(self):
        assert to_shadow("Machine Learning") == "machine learning"

    def test_normalize_company_name_tcs(self):
        assert normalize_company_name("Tata Consultancy Services Limited") == "tata consultancy services"

    def test_normalize_company_name_infosys(self):
        assert normalize_company_name("Infosys Limited") == "infosys"

    def test_normalize_degree_btech(self):
        assert normalize_degree("B Tech") == "b.tech"
        assert normalize_degree("btech") == "b.tech"

    def test_normalize_degree_phd(self):
        assert normalize_degree("PhD") == "ph.d"

    def test_scan_terms_weighted_matches(self):
        text = "we deployed an embedding model to production serving"
        terms = {"embedding": 3.0, "production": 2.0, "xyz": 1.0}
        score = scan_terms_weighted(text, terms)
        assert abs(score - 5.0) < 1e-9  # 3.0 + 2.0

    def test_scan_terms_weighted_no_match(self):
        assert scan_terms_weighted("hello world", {"faiss": 3.0}) == 0.0

    def test_count_words(self):
        assert count_words("hello world foo") == 3

    def test_count_words_empty(self):
        assert count_words("") == 0
        assert count_words("   ") == 0


# ---------------------------------------------------------------------------
# Date utility tests
# ---------------------------------------------------------------------------

class TestDateUtils:
    def test_parse_date_valid(self):
        d = parse_date("2024-03-15")
        assert d == date(2024, 3, 15)

    def test_parse_date_none(self):
        assert parse_date(None) is None

    def test_parse_date_empty(self):
        assert parse_date("") is None

    def test_parse_date_malformed(self):
        assert parse_date("not-a-date") is None

    def test_days_since_past(self):
        d = date(2026, 1, 1)
        ref = date(2026, 6, 27)
        diff = days_since(d, ref)
        assert diff > 0

    def test_days_since_same_day(self):
        d = date(2026, 6, 27)
        assert days_since(d, d) == 0

    def test_days_since_future_clamped(self):
        d = date(2026, 12, 1)
        ref = date(2026, 6, 27)
        assert days_since(d, ref) == 0

    def test_months_between(self):
        start = date(2024, 1, 1)
        end = date(2026, 1, 1)
        assert abs(months_between(start, end) - 24.0) < 1e-9

    def test_logger_returns_logger(self):
        logger = get_logger("test")
        assert logger is not None
        assert logger.name == "test"
