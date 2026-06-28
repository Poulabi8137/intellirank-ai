"""
Category 2: Career Intelligence (CI-02 through CI-12).
"""

from __future__ import annotations

from intellirank.constants import (
    CONSULTING_CONTENT_TERMS, AI_TERMS_WEIGHTED, PRODUCTION_TERMS,
)
from intellirank.types import CleanedCandidate, CareerFeatures
from intellirank.utils.math_utils import clamp, safe_div, p95_normalize
from intellirank.utils.text_utils import scan_terms, count_words


_AI_TITLE_KEYWORDS = {
    "machine learning", "ml engineer", "ml researcher",
    "deep learning", "ai engineer", "ai researcher",
    "data scientist", "nlp", "computer vision",
    "research scientist", "applied scientist",
    "llm", "generative ai", "gen ai",
    "search engineer", "recommendation",
    "mlops", "ml platform",
}

_SENIOR_TITLE_WORDS = {"senior", "lead", "principal", "staff", "head", "vp", "director", "chief"}


def _has_ai_title(title: str) -> bool:
    title_lower = title.lower()
    return any(kw in title_lower for kw in _AI_TITLE_KEYWORDS)


def compute_career_features(
    cleaned: CleanedCandidate,
    p95_ai_description_score: float,
    p95_production_score: float,
) -> CareerFeatures:
    career = cleaned.raw.career_history
    company_types = cleaned.company_types
    all_desc = cleaned.all_descriptions

    # --- CI-02: Consulting exclusivity flag ---
    ci_02 = 1.0 if cleaned.is_exclusively_consulting else 0.0

    # --- CI-03: Product company experience (normalized by 48 months = 4 years) ---
    product_months = sum(
        career[i].duration_months
        for i, t in enumerate(company_types)
        if t == "product"
    )
    ci_03 = clamp(product_months / 48.0)

    # --- CI-04: Career progression score ---
    # Detect upward seniority trajectory from sorted career history
    if len(career) < 2:
        ci_04 = 0.50  # neutral; no progression data
    else:
        # Rough seniority proxy: score by title keywords
        def _seniority_score(title: str) -> float:
            t = title.lower()
            if any(w in t for w in ("chief", "vp", "vice president", "head of")):
                return 1.0
            if "principal" in t or "staff" in t:
                return 0.90
            if "senior" in t or "lead" in t or "sr" in t:
                return 0.75
            if "junior" in t or "jr" in t or "associate" in t:
                return 0.30
            if "intern" in t or "trainee" in t:
                return 0.10
            return 0.50

        # Sort by start_date to get chronological order
        from intellirank.utils.date_utils import parse_date
        dated = []
        for entry in career:
            d = parse_date(entry.start_date) if entry.start_date else None
            dated.append((d, entry))
        dated.sort(key=lambda x: (x[0] is None, x[0]))

        scores = [_seniority_score(e.title) for _, e in dated]
        # Progression: is the most recent role more senior than the earliest?
        if scores[-1] > scores[0]:
            progression = (scores[-1] - scores[0])
            ci_04 = clamp(0.50 + progression * 0.50)
        elif scores[-1] == scores[0]:
            ci_04 = 0.60  # lateral movement
        else:
            ci_04 = 0.30  # downward movement

    # --- CI-05: Job loyalty / tenure stability ---
    if not career:
        ci_05 = 0.50
    else:
        avg_months = sum(e.duration_months for e in career) / len(career)
        # 0-6 months avg = 0.10 | 12 months = 0.50 | 24+ months = 1.0
        if avg_months >= 24:
            ci_05 = 1.0
        elif avg_months >= 12:
            ci_05 = 0.50 + (avg_months - 12) / 12.0 * 0.50
        elif avg_months >= 6:
            ci_05 = 0.10 + (avg_months - 6) / 6.0 * 0.40
        else:
            ci_05 = clamp(avg_months / 6.0 * 0.10)

    # --- CI-06 + CI-07: Single pass over all_desc for both term sets ---
    # Scanning the same text twice is redundant; one combined loop halves overhead.
    raw_ai_desc = 0.0
    raw_prod = 0.0
    for term, weight in AI_TERMS_WEIGHTED.items():
        if term in all_desc:
            raw_ai_desc += weight
    for term, weight in PRODUCTION_TERMS.items():
        if term in all_desc:
            raw_prod += weight
    ci_06 = p95_normalize(raw_ai_desc, p95_ai_description_score)
    ci_07 = p95_normalize(raw_prod, p95_production_score)

    # --- CI-08: Consulting content contamination density ---
    total_words = count_words(all_desc)
    consulting_hits = scan_terms(all_desc, CONSULTING_CONTENT_TERMS)
    if total_words == 0:
        ci_08 = 0.0
    else:
        # Density per 100 words; cap at 1.0 at density of 3 per 100
        density = consulting_hits / total_words * 100.0
        ci_08 = clamp(density / 3.0)

    # --- CI-09: Title-company consistency ---
    # Check if current title plausibly matches current company type
    current_role_idx = cleaned.current_role_index
    if current_role_idx is None or not career:
        ci_09 = 0.50
    else:
        current = career[current_role_idx]
        current_type = company_types[current_role_idx] if current_role_idx < len(company_types) else "unknown"
        title_has_ai = _has_ai_title(current.title)

        if current_type == "consulting" and title_has_ai:
            # AI title at a consulting firm → moderate consistency concern
            ci_09 = 0.60
        elif current_type == "product" and title_has_ai:
            ci_09 = 1.0
        elif current_type == "research" and title_has_ai:
            ci_09 = 0.80
        elif current_type == "product":
            ci_09 = 0.75  # product company even without AI title
        else:
            ci_09 = 0.50

    # --- CI-10: Startup affinity ratio ---
    startup_months = sum(
        career[i].duration_months
        for i, t in enumerate(company_types)
        if t in ("product", "startup")
        and i < len(career)
        and (career[i].company_size or "").startswith(("1-", "11-", "51-", "201-"))
    )
    total_months = sum(e.duration_months for e in career) or 1
    ci_10 = clamp(startup_months / total_months)

    # --- CI-11: AI pivot detection ---
    # The candidate has a non-AI career background but recent AI content
    has_ai_background = ci_06 > 0.10 or ci_07 > 0.05
    has_non_ai_history = any(
        not _has_ai_title(e.title)
        for e in career[:-1]  # exclude most recent role
    ) if len(career) > 1 else False
    ci_11 = 1.0 if (has_non_ai_history and has_ai_background) else 0.0

    # --- CI-12: Composite ---
    # Apply consulting exclusivity penalty (CI-02) and contamination (CI-08)
    ci_composite = (
        0.25 * ci_06
        + 0.20 * ci_07
        + 0.15 * ci_03
        + 0.10 * ci_04
        + 0.10 * ci_05
        + 0.10 * ci_10
        + 0.05 * ci_11
        + 0.05 * ci_09
    ) * (1.0 - 0.70 * ci_02) * (1.0 - 0.15 * ci_08)
    ci_composite = clamp(ci_composite)

    return CareerFeatures(
        ci_02=ci_02,
        ci_03=ci_03,
        ci_04=ci_04,
        ci_05=ci_05,
        ci_06=ci_06,
        ci_07=ci_07,
        ci_08=ci_08,
        ci_09=ci_09,
        ci_10=ci_10,
        ci_11=ci_11,
        ci_composite=ci_composite,
    )
