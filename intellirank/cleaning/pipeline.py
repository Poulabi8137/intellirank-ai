"""
Data Cleaning Pipeline — transforms a validated Candidate into a CleanedCandidate.

Applies all DC-CLEAN-XX operations defined in FEATURE_ENGINEERING.md Section 3.
All cleaning is deterministic and logged.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Optional

from intellirank.constants import (
    BOILERPLATE_SIGNATURES,
    CONSULTING_FIRMS,
    CONSULTING_INDUSTRIES,
    PRODUCT_INDUSTRIES,
    COMPANY_TYPE_PRODUCT,
)
from intellirank.types import Candidate, CareerEntry, CleanedCandidate
from intellirank.utils.date_utils import parse_date, days_since
from intellirank.utils.text_utils import (
    to_shadow,
    normalize_company_name,
)

# Evaluation date: used throughout as the reference point for age calculations
EVALUATION_DATE = date(2026, 6, 27)


# ---------------------------------------------------------------------------
# DC-CLEAN-06: Salary normalization
# ---------------------------------------------------------------------------

def _clean_salary(candidate: Candidate) -> tuple[float, bool]:
    """
    Compute salary midpoint and detect inverted range.
    Returns (midpoint_lpa, is_inverted).
    """
    sal = candidate.redrob_signals.expected_salary_range_inr_lpa
    sal_min = max(0.0, sal.min)
    sal_max = max(0.0, sal.max)
    midpoint = (sal_min + sal_max) / 2.0
    is_inverted = sal_min > sal_max
    return midpoint, is_inverted


# ---------------------------------------------------------------------------
# DC-CLEAN-02: Date parsing and validation
# ---------------------------------------------------------------------------

def _clean_dates(candidate: Candidate) -> tuple[int, bool]:
    """
    Compute days_inactive and detect signup_after_active anomaly.
    Returns (days_inactive, signup_after_active).
    """
    last_active = parse_date(candidate.redrob_signals.last_active_date)
    signup = parse_date(candidate.redrob_signals.signup_date)

    days_inactive = 0
    if last_active is not None:
        days_inactive = days_since(last_active, EVALUATION_DATE)

    signup_after_active = False
    if signup is not None and last_active is not None:
        signup_after_active = signup > last_active

    return days_inactive, signup_after_active


# ---------------------------------------------------------------------------
# DC-CLEAN-04: YOE cross-validation
# ---------------------------------------------------------------------------

def _clean_yoe(candidate: Candidate) -> tuple[float, float]:
    """
    Compute (computed_yoe, yoe_gap) from career history duration.
    Claimed YOE is in profile.years_of_experience.
    """
    total_months = sum(
        max(0, min(entry.duration_months, 240))
        for entry in candidate.career_history
    )
    computed_yoe = total_months / 12.0
    claimed_yoe = candidate.profile.years_of_experience or 0.0
    yoe_gap = abs(claimed_yoe - computed_yoe)
    return computed_yoe, yoe_gap


# ---------------------------------------------------------------------------
# DC-CLEAN-05: Text pre-processing
# ---------------------------------------------------------------------------

def _clean_text(candidate: Candidate) -> tuple[str, str]:
    """
    Build all_descriptions shadow and summary_lower.
    Returns (all_descriptions_lower, summary_lower).
    """
    # Join raw descriptions and normalize once — NFKD is idempotent so
    # pre-normalizing each piece then re-normalizing the join is redundant.
    raw_desc = " ".join(
        entry.description for entry in candidate.career_history if entry.description
    )
    all_descriptions = to_shadow(raw_desc)

    summary = candidate.profile.summary or ""
    summary_lower = to_shadow(summary)

    return all_descriptions, summary_lower


# ---------------------------------------------------------------------------
# DC-CLEAN-06: Boilerplate detection
# ---------------------------------------------------------------------------

def _detect_boilerplate(summary_lower: str) -> bool:
    """Return True if the summary matches 2+ boilerplate signatures."""
    if not summary_lower.strip():
        return True  # Empty summary = boilerplate
    hits = sum(1 for sig in BOILERPLATE_SIGNATURES if sig in summary_lower)
    return hits >= 2


# ---------------------------------------------------------------------------
# DC-CLEAN-07: Skill pre-processing
# ---------------------------------------------------------------------------

def _clean_skills(candidate: Candidate) -> frozenset[str]:
    """Build lowercase skill name set."""
    return frozenset(s.name.lower().strip() for s in candidate.skills if s.name.strip())


# ---------------------------------------------------------------------------
# DC-CLEAN-08: Company type classification
# ---------------------------------------------------------------------------

def _classify_company_type(company: str, industry: Optional[str]) -> str:
    """
    Classify a company/role as: consulting | product | startup | research | unknown.
    """
    company_norm = normalize_company_name(company)
    industry_lower = (industry or "").lower().strip()

    # Consulting first (hard disqualifier)
    if company_norm in CONSULTING_FIRMS:
        return "consulting"
    if industry_lower in CONSULTING_INDUSTRIES:
        return "consulting"
    if any(term in company_norm for term in ["consulting", "outsourc", "staffing", "services pvt"]):
        return "consulting"

    # Research
    if any(term in company_norm for term in ["university", "institute", "lab", "research", "iit", "iisc"]):
        return "research"
    if industry_lower in {"research", "academia", "education"}:
        return "research"

    # Product / tech
    if company_norm in COMPANY_TYPE_PRODUCT:
        return "product"
    if industry_lower in PRODUCT_INDUSTRIES:
        return "product"

    # Startup signal: small company size
    return "unknown"


def _classify_company_types(candidate: Candidate) -> tuple[list[str], bool]:
    """
    Classify each career entry. Returns (company_types, is_exclusively_consulting).
    """
    types = []
    for entry in candidate.career_history:
        t = _classify_company_type(entry.company, entry.industry)
        types.append(t)

    is_excl_consulting = bool(types) and all(t == "consulting" for t in types)
    return types, is_excl_consulting


# ---------------------------------------------------------------------------
# DC-CLEAN-09: Current role identification
# ---------------------------------------------------------------------------

def _find_current_role_index(candidate: Candidate) -> Optional[int]:
    for i, entry in enumerate(candidate.career_history):
        if entry.is_current:
            return i
    return None


# ---------------------------------------------------------------------------
# Master cleaning function
# ---------------------------------------------------------------------------

def clean_candidate(candidate: Candidate) -> CleanedCandidate:
    """
    Apply all DC-CLEAN-XX operations to produce a CleanedCandidate.

    This is the single entry point for the data cleaning pipeline.
    """
    salary_midpoint, salary_is_inverted = _clean_salary(candidate)
    days_inactive, signup_after_active = _clean_dates(candidate)
    computed_yoe, yoe_gap = _clean_yoe(candidate)
    all_descriptions, summary_lower = _clean_text(candidate)
    is_boilerplate = _detect_boilerplate(summary_lower)
    all_skills_set = _clean_skills(candidate)
    company_types, is_excl_consulting = _classify_company_types(candidate)
    current_role_index = _find_current_role_index(candidate)

    return CleanedCandidate(
        raw=candidate,
        salary_midpoint=salary_midpoint,
        salary_is_inverted=salary_is_inverted,
        days_inactive=days_inactive,
        signup_after_active=signup_after_active,
        computed_yoe=computed_yoe,
        yoe_gap=yoe_gap,
        all_descriptions=all_descriptions,
        summary_lower=summary_lower,
        all_skills_set=all_skills_set,
        is_boilerplate_summary=is_boilerplate,
        company_types=company_types,
        is_exclusively_consulting=is_excl_consulting,
        current_role_index=current_role_index,
    )
