"""Text normalization and pattern-matching utilities."""

from __future__ import annotations

import re
import unicodedata


# Pre-compiled pattern for whitespace normalization
_WHITESPACE_RE = re.compile(r"\s+")
# Zero-width and control characters to strip
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f​‌‍﻿­]")


def normalize_text(text: str) -> str:
    """
    Full Unicode and whitespace normalization:
    1. NFKD Unicode normalization
    2. Strip control characters and zero-width spaces
    3. Collapse whitespace
    4. Strip leading/trailing whitespace
    """
    text = unicodedata.normalize("NFKD", text)
    text = _CONTROL_CHARS_RE.sub("", text)
    text = _WHITESPACE_RE.sub(" ", text)
    return text.strip()


def to_shadow(text: str) -> str:
    """Return lowercase, normalized shadow of text for all feature extraction."""
    return normalize_text(text).lower()


def normalize_company_name(name: str) -> str:
    """Normalize a company name for lookup in CONSULTING_FIRMS."""
    name = name.lower().strip()
    # Remove only purely legal suffixes — do NOT strip descriptive words like
    # "services", "technologies", "solutions" because they are part of canonical
    # names in CONSULTING_FIRMS (e.g. "tata consultancy services").
    for suffix in [" limited", " ltd.", " ltd", " pvt.", " pvt",
                   " private", " inc.", " inc", " llc", " llp",
                   " corp.", " corp", " corporation"]:
        if name.endswith(suffix):
            name = name[: -len(suffix)].strip()
            break  # only strip one suffix
    return name


def normalize_title(title: str) -> str:
    """Lowercase and normalize a job title for seniority extraction."""
    title = title.lower().strip()
    # Normalize ordinal suffixes (sr -> senior, jr -> junior)
    title = re.sub(r"\bsr\b\.?", "senior", title)
    title = re.sub(r"\bjr\b\.?", "junior", title)
    # Remove common noise words
    for noise in [", ", " - ", " | ", " / "]:
        title = title.replace(noise, " ")
    return re.sub(r"\s+", " ", title).strip()


def normalize_location(location: str) -> str:
    """Lowercase and strip a location string for city matching."""
    return location.lower().strip()


def normalize_country(country: str) -> str:
    """Normalize country name for India detection."""
    c = country.lower().strip()
    if c in {"in", "ind"}:
        return "india"
    return c


def normalize_degree(degree: str) -> str:
    """Normalize degree string for degree scoring lookup."""
    d = degree.lower().strip()
    # Map common abbreviations
    mapping = {
        "b tech": "b.tech", "btech": "b.tech",
        "m tech": "m.tech", "mtech": "m.tech",
        "b e": "b.e.", "be": "b.e.",
        "m e": "m.e.", "me": "m.e.",
        "b sc": "b.sc", "bsc": "b.sc",
        "m sc": "m.sc", "msc": "m.sc",
        "b.s.": "m.s.", "ms": "m.s.",
        "b.s": "b.sc",
        "phd": "ph.d", "ph d": "ph.d", "ph.d.": "ph.d",
    }
    return mapping.get(d, d)


def normalize_field_of_study(field: str) -> str:
    """Normalize field of study for scoring lookup."""
    f = field.lower().strip()
    mapping = {
        "cs": "computer science",
        "cse": "computer science",
        "computer science and engineering": "computer science",
        "computer science & engineering": "computer science",
        "information technology": "information technology",
        "it": "information technology",
        "information science": "information science",
        "ece": "electronics and communication",
        "electronics & communication": "electronics and communication",
        "ee": "electrical engineering",
        "eee": "electrical engineering",
        "me": "mechanical engineering",
        "ce": "civil engineering",
        "stats": "statistics",
        "maths": "mathematics",
        "math": "mathematics",
    }
    return mapping.get(f, f)


def count_words(text: str) -> int:
    """Return the word count of a text string."""
    # str.split() is a C-level operation (~5x faster than regex split for whitespace).
    return len(text.split())


def scan_terms(text: str, terms: list[str]) -> int:
    """Count how many of the given (already lowercase) terms appear in text (lowercase)."""
    count = 0
    for term in terms:
        if term in text:
            count += 1
    return count


def scan_terms_weighted(text: str, terms: dict[str, float]) -> float:
    """Sum the weights of all terms that appear in text (text must be lowercase)."""
    total = 0.0
    for term, weight in terms.items():
        if term in text:
            total += weight
    return total
