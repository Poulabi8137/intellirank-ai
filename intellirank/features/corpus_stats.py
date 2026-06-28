"""
Stage 1: Corpus Statistics Pass.

Streams all candidates once to compute 95th-percentile normalization
denominators. Required before any normalized feature can be computed.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from intellirank.constants import (
    AI_TERMS_WEIGHTED, PRODUCTION_TERMS, TIER_1_SKILLS,
    TIER_2_SKILLS, PROFICIENCY_WEIGHTS, AI_DOMAIN_INDUSTRIES,
)
from intellirank.dataset.reader import iter_jsonl
from intellirank.logger import get_logger
from intellirank.utils.math_utils import skill_trust_score
from intellirank.utils.text_utils import to_shadow, scan_terms_weighted

log = get_logger(__name__)


@dataclass
class CorpusStats:
    """95th-percentile normalization denominators, computed over the full corpus."""
    p95_jd_skill_score: float = 1.0
    p95_tier1_depth_score: float = 1.0
    p95_ai_description_score: float = 1.0
    p95_production_score: float = 1.0
    p95_bi02_response_quality: float = 1.0
    p95_ai_domain_months: float = 1.0
    total_candidates: int = 0

    def as_dict(self) -> dict[str, float]:
        return {
            "p95_jd_skill_score": self.p95_jd_skill_score,
            "p95_tier1_depth_score": self.p95_tier1_depth_score,
            "p95_ai_description_score": self.p95_ai_description_score,
            "p95_production_score": self.p95_production_score,
            "p95_bi02_response_quality": self.p95_bi02_response_quality,
            "p95_ai_domain_months": self.p95_ai_domain_months,
        }


def _percentile(sorted_values: list[float], p: float) -> float:
    """Compute the p-th percentile of a pre-sorted list."""
    if not sorted_values:
        return 1.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    idx = p / 100.0 * (len(sorted_values) - 1)
    lo = int(idx)
    hi = min(lo + 1, len(sorted_values) - 1)
    frac = idx - lo
    return sorted_values[lo] + frac * (sorted_values[hi] - sorted_values[lo])


def _raw_jd_skill_score(skills: list[dict]) -> float:  # type: ignore[type-arg]
    """Compute the raw (un-normalized) JD-weighted skill aggregate."""
    from intellirank.constants import TIER_WEIGHTS
    total = 0.0
    for s in skills:
        name = (s.get("name") or "").lower().strip()
        proficiency = (s.get("proficiency") or "beginner").lower()
        endorsements = max(0, int(s.get("endorsements") or 0))
        duration = max(0, min(int(s.get("duration_months") or 0), 240))
        p = PROFICIENCY_WEIGHTS.get(proficiency, 1.0)
        trust = skill_trust_score(p, endorsements, duration)

        if name in TIER_1_SKILLS:
            tier_w = TIER_WEIGHTS["tier_1"]
        elif name in TIER_2_SKILLS:
            tier_w = TIER_WEIGHTS["tier_2"]
        else:
            tier_w = 0.0  # Only Tier-1 and Tier-2 contribute to JD score

        total += tier_w * trust
    return total


def _raw_tier1_depth(skills: list[dict]) -> float:  # type: ignore[type-arg]
    """Raw Tier-1 depth aggregate (trust scores of Tier-1 skills only)."""
    total = 0.0
    for s in skills:
        name = (s.get("name") or "").lower().strip()
        if name not in TIER_1_SKILLS:
            continue
        proficiency = (s.get("proficiency") or "beginner").lower()
        endorsements = max(0, int(s.get("endorsements") or 0))
        duration = max(0, min(int(s.get("duration_months") or 0), 240))
        p = PROFICIENCY_WEIGHTS.get(proficiency, 1.0)
        total += skill_trust_score(p, endorsements, duration)
    return total


def _raw_desc_scores(career_history: list[dict]) -> tuple[float, float]:  # type: ignore[type-arg]
    """Raw AI description + production scores in a single text-normalization pass."""
    raw_desc = " ".join(
        role.get("description") or ""
        for role in career_history
        if role.get("description")
    )
    all_desc = to_shadow(raw_desc)
    ai_score = 0.0
    prod_score = 0.0
    for term, weight in AI_TERMS_WEIGHTED.items():
        if term in all_desc:
            ai_score += weight
    for term, weight in PRODUCTION_TERMS.items():
        if term in all_desc:
            prod_score += weight
    return ai_score, prod_score


def _raw_bi02_score(signals: dict) -> float:  # type: ignore[type-arg]
    """Raw BI-02 recruiter response quality score."""
    rr = float(signals.get("recruiter_response_rate") or 0.0)
    rr = max(0.0, min(1.0, rr))
    avg_hours = float(signals.get("avg_response_time_hours") or 0.0)
    # Speed factor: 0-2h → 1.0; 24h → 0.8; 72h → 0.5; 168h+ → 0.2
    if avg_hours <= 2:
        speed_factor = 1.0
    elif avg_hours <= 24:
        speed_factor = 1.0 - (avg_hours - 2) / 22 * 0.2
    elif avg_hours <= 72:
        speed_factor = 0.8 - (avg_hours - 24) / 48 * 0.3
    elif avg_hours <= 168:
        speed_factor = 0.5 - (avg_hours - 72) / 96 * 0.3
    else:
        speed_factor = 0.2
    return rr * speed_factor


def _raw_ai_domain_months(career_history: list[dict]) -> float:  # type: ignore[type-arg]
    """Total months spent in AI-domain roles."""
    total = 0.0
    for role in career_history:
        industry = (role.get("industry") or "").lower().strip()
        if industry in AI_DOMAIN_INDUSTRIES:
            total += max(0, min(int(role.get("duration_months") or 0), 240))
    return total


def compute_corpus_stats(path: Path, progress_interval: int = 20_000) -> CorpusStats:
    """
    Single-pass stream over candidates.jsonl to compute 95th-percentile stats.
    Stores only 6 float arrays of 100K values (≈ 4.8MB total) — no records kept.
    """
    log.info("Stage 1: Computing corpus statistics from %s ...", path.name)

    raw_jd: list[float] = []
    raw_tier1: list[float] = []
    raw_ai_desc: list[float] = []
    raw_prod: list[float] = []
    raw_bi02: list[float] = []
    raw_ai_months: list[float] = []

    count = 0
    for record in iter_jsonl(path):
        count += 1
        if count % progress_interval == 0:
            log.info("  Corpus stats pass: %d candidates processed...", count)

        skills = record.get("skills") or []
        career = record.get("career_history") or []
        signals = record.get("redrob_signals") or {}

        raw_jd.append(_raw_jd_skill_score(skills))
        raw_tier1.append(_raw_tier1_depth(skills))
        ai_desc, prod = _raw_desc_scores(career)
        raw_ai_desc.append(ai_desc)
        raw_prod.append(prod)
        raw_bi02.append(_raw_bi02_score(signals))
        raw_ai_months.append(_raw_ai_domain_months(career))

    log.info("  Corpus stats pass complete: %d candidates", count)

    raw_jd.sort()
    raw_tier1.sort()
    raw_ai_desc.sort()
    raw_prod.sort()
    raw_bi02.sort()
    raw_ai_months.sort()

    # Floor at 1.0 to prevent division by zero for empty distributions
    stats = CorpusStats(
        p95_jd_skill_score=max(1.0, _percentile(raw_jd, 95)),
        p95_tier1_depth_score=max(1.0, _percentile(raw_tier1, 95)),
        p95_ai_description_score=max(1.0, _percentile(raw_ai_desc, 95)),
        p95_production_score=max(1.0, _percentile(raw_prod, 95)),
        p95_bi02_response_quality=max(0.01, _percentile(raw_bi02, 95)),
        p95_ai_domain_months=max(1.0, _percentile(raw_ai_months, 95)),
        total_candidates=count,
    )

    log.info(
        "Corpus stats: p95_jd_skill=%.2f | p95_tier1=%.2f | "
        "p95_ai_desc=%.2f | p95_prod=%.2f | p95_bi02=%.3f | p95_ai_months=%.1f",
        stats.p95_jd_skill_score, stats.p95_tier1_depth_score,
        stats.p95_ai_description_score, stats.p95_production_score,
        stats.p95_bi02_response_quality, stats.p95_ai_domain_months,
    )
    return stats
