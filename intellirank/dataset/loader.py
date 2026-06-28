"""
Dataset loader: orchestrates streaming, validation, and Pydantic parsing.

Produces an iterator of validated Candidate objects, collecting statistics
and handling errors gracefully.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from pydantic import ValidationError

from intellirank.dataset.reader import iter_jsonl
from intellirank.dataset.validator import validate_raw
from intellirank.logger import get_logger
from intellirank.types import Candidate

log = get_logger(__name__)


@dataclass
class LoadStats:
    """Statistics collected during dataset loading."""
    total_lines: int = 0
    valid: int = 0
    schema_errors: int = 0
    pydantic_errors: int = 0
    duplicates: int = 0
    invalid_ids: list[str] = field(default_factory=list)

    @property
    def invalid(self) -> int:
        return self.schema_errors + self.pydantic_errors + self.duplicates

    def report(self) -> str:
        return (
            f"Loaded {self.valid:,} valid candidates | "
            f"schema_errors={self.schema_errors} | "
            f"pydantic_errors={self.pydantic_errors} | "
            f"duplicates={self.duplicates}"
        )


def iter_candidates(
    path: Path,
    progress_interval: int = 10_000,
) -> Iterator[tuple[Candidate, LoadStats]]:
    """
    Stream-parse candidates.jsonl and yield (Candidate, running_stats) pairs.

    The caller receives the same `stats` object each time — it is mutated
    in-place as loading progresses. Yields only valid records.
    """
    stats = LoadStats()
    seen_ids: set[str] = set()

    for raw in iter_jsonl(path):
        stats.total_lines += 1

        if stats.total_lines % progress_interval == 0:
            log.info("  Loaded %d candidates so far...", stats.total_lines)

        # Structural validation
        result = validate_raw(raw)
        if not result.is_valid:
            stats.schema_errors += 1
            if stats.schema_errors <= 10:
                log.warning("Schema error for %r: %s", result.candidate_id, result.errors)
            continue

        cid = result.candidate_id

        # Duplicate detection
        if cid in seen_ids:
            stats.duplicates += 1
            log.debug("Duplicate candidate_id: %s", cid)
            continue
        seen_ids.add(cid)

        # Pydantic model construction (handles field-level validation)
        try:
            candidate = Candidate.model_validate(raw)
        except ValidationError as e:
            stats.pydantic_errors += 1
            if stats.pydantic_errors <= 10:
                log.warning("Pydantic error for %s: %s", cid, e)
            continue

        stats.valid += 1
        yield candidate, stats

    log.info(stats.report())


def load_all(path: Path, progress_interval: int = 10_000) -> tuple[list[Candidate], LoadStats]:
    """
    Load all candidates into memory.

    Use only for small datasets or testing. For production use iter_candidates().
    """
    candidates: list[Candidate] = []
    stats = LoadStats()
    for candidate, stats in iter_candidates(path, progress_interval):
        candidates.append(candidate)
    return candidates, stats
