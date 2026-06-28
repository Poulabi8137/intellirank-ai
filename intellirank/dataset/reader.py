"""
Streaming JSONL reader for the Redrob candidates dataset.

Streams records one at a time — never loads the full 465MB file into memory.
Uses orjson for fast parsing.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Iterator

import orjson

from intellirank.logger import get_logger

log = get_logger(__name__)


def iter_jsonl(path: Path, encoding: str = "utf-8") -> Iterator[dict]:  # type: ignore[type-arg]
    """
    Stream-parse a JSONL file, yielding one dict per line.

    Skips blank lines. Logs and skips malformed JSON lines without raising.
    Each call opens the file fresh so multiple passes are safe.
    """
    errors = 0
    count = 0
    with io.open(path, "rb") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line:
                continue
            try:
                record = orjson.loads(line)
                count += 1
                yield record
            except orjson.JSONDecodeError as e:
                errors += 1
                log.warning("JSON parse error at line ~%d: %s", count + errors, e)

    if errors:
        log.warning("Completed with %d JSON parse errors out of ~%d lines", errors, count + errors)


def count_lines(path: Path) -> int:
    """Fast line count for a JSONL file (used for progress estimation)."""
    count = 0
    with io.open(path, "rb") as f:
        for line in f:
            if line.strip():
                count += 1
    return count
