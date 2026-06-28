"""
Schema validation for raw candidate dicts parsed from JSONL.

Validates structural integrity before Pydantic model construction.
Returns a ValidationResult rather than raising, so the pipeline can
continue processing valid records without stopping on a single bad one.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

_CANDIDATE_ID_RE = re.compile(r"^CAND_[0-9]{7}$")


@dataclass
class ValidationResult:
    is_valid: bool
    candidate_id: str = ""
    errors: list[str] = field(default_factory=list)


def validate_raw(record: dict[str, Any]) -> ValidationResult:  # type: ignore[type-arg]
    """
    Validate a raw candidate dict against structural rules.
    Does NOT validate field contents — Pydantic handles that.
    """
    errors: list[str] = []

    # candidate_id
    cid = record.get("candidate_id", "")
    if not isinstance(cid, str) or not _CANDIDATE_ID_RE.match(cid):
        errors.append(f"Invalid candidate_id: {cid!r}")
        return ValidationResult(is_valid=False, errors=errors)

    # Required top-level keys
    for key in ("profile", "career_history", "education", "skills", "redrob_signals"):
        if key not in record:
            errors.append(f"Missing required key: {key!r}")

    # career_history must be a list
    if "career_history" in record and not isinstance(record["career_history"], list):
        errors.append("career_history must be a list")

    # skills must be a list
    if "skills" in record and not isinstance(record["skills"], list):
        errors.append("skills must be a list")

    # education must be a list
    if "education" in record and not isinstance(record["education"], list):
        errors.append("education must be a list")

    # redrob_signals must be a dict
    if "redrob_signals" in record and not isinstance(record["redrob_signals"], dict):
        errors.append("redrob_signals must be a dict")

    # profile must be a dict
    if "profile" in record and not isinstance(record["profile"], dict):
        errors.append("profile must be a dict")

    is_valid = len(errors) == 0
    return ValidationResult(is_valid=is_valid, candidate_id=cid, errors=errors)
