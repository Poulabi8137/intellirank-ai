"""Date parsing and validation utilities."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional


def parse_date(date_str: Optional[str]) -> Optional[date]:
    """
    Parse an ISO-8601 date string (YYYY-MM-DD) to a date object.
    Returns None for null, empty, or malformed strings.
    """
    if not date_str:
        return None
    # Fast path for the dominant YYYY-MM-DD format (C-level, avoids strptime/setlocale overhead).
    if len(date_str) == 10 and date_str[4] == "-" and date_str[7] == "-":
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            pass
    # Slow path for YYYY-MM and YYYY formats.
    for fmt in ("%Y-%m", "%Y"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def days_between(d1: date, d2: date) -> int:
    """Return (d2 - d1).days — positive if d2 is later."""
    return (d2 - d1).days


def days_since(d: date, reference: date) -> int:
    """Days elapsed from d to reference. Clamped to >= 0."""
    diff = (reference - d).days
    return max(0, diff)


def months_between(start: date, end: date) -> float:
    """Approximate month count between two dates."""
    return max(0.0, (end.year - start.year) * 12 + (end.month - start.month))
