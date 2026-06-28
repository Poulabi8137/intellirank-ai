"""
Submission CSV generation for the Redrob AI Hackathon.

Specification (from validate_submission.py, sections 2–3):
  Format  : CSV, UTF-8, no BOM
  Row 1   : header → candidate_id,rank,score,reasoning  (exact order)
  Rows 2–101: exactly 100 data rows
  candidate_id : CAND_[0-9]{7}
  rank         : integer 1–100, each appearing exactly once
  score        : float, non-increasing by rank; equal-score ties broken by
                 candidate_id ascending
  reasoning    : free text (1–2 sentences recommended by spec)

Note: The competition validator (validate_submission.py) explicitly accepts
only .csv files. openpyxl is not used.
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path

from intellirank.logger import get_logger
from intellirank.ranking.ranker import RankedCandidate

log = get_logger(__name__)

REQUIRED_HEADER: list[str] = ["candidate_id", "rank", "score", "reasoning"]
CANDIDATE_ID_RE = re.compile(r"^CAND_[0-9]{7}$")
EXPECTED_ROWS: int = 100
SCORE_PRECISION: int = 4


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class SubmissionResult:
    """Outcome of a submission write attempt."""
    path: Path
    rows_written: int
    validation_errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return not self.validation_errors


# ---------------------------------------------------------------------------
# Pre-flight validation (checks ranked candidates before disk I/O)
# ---------------------------------------------------------------------------

def _preflight(ranked: list[RankedCandidate]) -> list[str]:
    """
    Validate ranked candidates before writing to disk.
    Returns a list of error strings (empty list = all clear).
    """
    errors: list[str] = []

    if len(ranked) != EXPECTED_ROWS:
        errors.append(
            f"Expected exactly {EXPECTED_ROWS} ranked candidates; got {len(ranked)}."
        )

    seen_ids: set[str] = set()
    seen_ranks: set[int] = set()

    for i, rc in enumerate(ranked):
        cid = rc.features.candidate_id
        rank = rc.rank
        score = rc.features.final_score

        if not CANDIDATE_ID_RE.match(cid):
            errors.append(
                f"Position {i + 1}: candidate_id {cid!r} must match CAND_XXXXXXX (7 digits)."
            )

        if cid in seen_ids:
            errors.append(f"Position {i + 1}: duplicate candidate_id {cid!r}.")
        else:
            seen_ids.add(cid)

        expected_rank = i + 1
        if rank != expected_rank:
            errors.append(
                f"Position {i + 1}: rank={rank} but expected {expected_rank}."
            )
        if rank in seen_ranks:
            errors.append(f"Position {i + 1}: duplicate rank {rank}.")
        else:
            seen_ranks.add(rank)

        if not (0.001 <= score <= 1.000):
            errors.append(
                f"Position {i + 1}: score={score!r} out of valid range [0.001, 1.000]."
            )

    # Monotonicity (float level, before formatting)
    for i in range(1, len(ranked)):
        s_prev = ranked[i - 1].features.final_score
        s_curr = ranked[i].features.final_score
        if s_curr > s_prev:
            errors.append(
                f"Scores not non-increasing: "
                f"rank {i} ({s_prev:.6f}) < rank {i + 1} ({s_curr:.6f})."
            )

    return errors


# ---------------------------------------------------------------------------
# Submission writer
# ---------------------------------------------------------------------------

def generate_submission(
    ranked: list[RankedCandidate],
    output_path: Path,
    participant_id: str = "intellirank_ai",
) -> SubmissionResult:
    """
    Write a competition-compliant submission CSV.

    Validates ranked candidates before writing, then re-validates the output
    file using the same rules as the official validate_submission.py to ensure
    disk-level correctness.

    Args:
        ranked: Exactly 100 RankedCandidates produced by rank_candidates().
        output_path: Destination (.csv extension enforced at validation).
                     Parent directory is created automatically.
        participant_id: Used in log messages only.

    Returns:
        SubmissionResult(path, rows_written, validation_errors).
        is_valid is True only when validation_errors is empty.
    """
    log.info("Generating submission for '%s' → %s", participant_id, output_path)

    # Pre-flight: validate inputs before touching disk
    preflight_errors = _preflight(ranked)
    if preflight_errors:
        for e in preflight_errors:
            log.error("Pre-flight error: %s", e)
        return SubmissionResult(
            path=output_path,
            rows_written=0,
            validation_errors=preflight_errors,
        )

    # Write
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(REQUIRED_HEADER)
        for rc in ranked:
            writer.writerow([
                rc.features.candidate_id,
                rc.rank,
                format(rc.features.final_score, f".{SCORE_PRECISION}f"),
                rc.reasoning,
            ])

    log.info("Written: %s (%d data rows)", output_path, len(ranked))

    # Post-write: validate the file we just wrote
    post_errors = validate_submission_file(output_path)
    if post_errors:
        for e in post_errors:
            log.error("Post-write validation: %s", e)
    else:
        log.info("File passes official validation rules: %s", output_path)

    return SubmissionResult(
        path=output_path,
        rows_written=len(ranked),
        validation_errors=post_errors,
    )


# ---------------------------------------------------------------------------
# File-level validator (mirrors validate_submission.py exactly)
# ---------------------------------------------------------------------------

def validate_submission_file(path: Path) -> list[str]:
    """
    Validate a submission CSV against the official competition rules.

    Mirrors validate_submission.py logic without subprocess overhead so tests
    can call it directly without shell access.

    Returns a list of error strings (empty = valid).
    """
    errors: list[str] = []

    if path.suffix.lower() != ".csv":
        errors.append("Filename must use a .csv extension.")

    try:
        with open(path, "r", encoding="utf-8", newline="") as fh:
            reader = csv.reader(fh)

            try:
                header = next(reader)
            except StopIteration:
                errors.append("Row 1 must be the header row; file is empty.")
                return errors

            if header != REQUIRED_HEADER:
                errors.append(
                    f"Row 1 (header) must be exactly {','.join(REQUIRED_HEADER)}; "
                    f"found: {','.join(header)}."
                )

            data_rows = [row for row in reader if any(c.strip() for c in row)]

    except UnicodeDecodeError:
        errors.append("File must be UTF-8 encoded.")
        return errors
    except OSError as e:
        errors.append(f"Cannot read file: {e}")
        return errors

    if len(data_rows) != EXPECTED_ROWS:
        errors.append(
            f"Expected {EXPECTED_ROWS} data rows after header; found {len(data_rows)}."
        )

    seen_ids: set[str] = set()
    seen_ranks: set[int] = set()
    by_rank: list[tuple[int, float, str]] = []

    for i, cells in enumerate(data_rows):
        row_num = 2 + i

        if len(cells) != len(REQUIRED_HEADER):
            errors.append(
                f"Row {row_num}: expected {len(REQUIRED_HEADER)} columns, got {len(cells)}."
            )
            continue

        row = dict(zip(REQUIRED_HEADER, cells))
        cid = row["candidate_id"].strip()
        rank_s = row["rank"].strip()
        score_s = row["score"].strip()

        if not cid:
            errors.append(f"Row {row_num}: candidate_id is required.")
        elif not CANDIDATE_ID_RE.match(cid):
            errors.append(
                f"Row {row_num}: candidate_id must match CAND_XXXXXXX (7 digits)."
            )
        elif cid in seen_ids:
            errors.append(f"Row {row_num}: duplicate candidate_id '{cid}'.")
        else:
            seen_ids.add(cid)

        rank: int | None = None
        try:
            rank = int(rank_s)
            if str(rank) != rank_s:
                raise ValueError("not a clean integer string")
            if not 1 <= rank <= 100:
                errors.append(f"Row {row_num}: rank must be between 1 and 100.")
                rank = None
            elif rank in seen_ranks:
                errors.append(f"Row {row_num}: duplicate rank {rank}.")
                rank = None
            else:
                seen_ranks.add(rank)
        except ValueError:
            errors.append(f"Row {row_num}: rank must be an integer (1–100).")

        score: float | None = None
        try:
            score = float(score_s)
        except ValueError:
            errors.append(f"Row {row_num}: score must be a float.")

        if rank is not None and score is not None and cid:
            by_rank.append((rank, score, cid))

    missing = set(range(1, 101)) - seen_ranks
    if missing:
        errors.append(
            f"Each rank 1–100 must appear exactly once; missing: {sorted(missing)}"
        )

    by_rank.sort(key=lambda x: x[0])

    for i in range(len(by_rank) - 1):
        r1, s1, _ = by_rank[i]
        r2, s2, _ = by_rank[i + 1]
        if s1 < s2:
            errors.append(
                f"score must be non-increasing by rank: rank {r1} ({s1}) < rank {r2} ({s2})."
            )

    for i in range(len(by_rank) - 1):
        r1, s1, c1 = by_rank[i]
        r2, s2, c2 = by_rank[i + 1]
        if s1 == s2 and c1 > c2:
            errors.append(
                f"Equal scores at ranks {r1} and {r2}: "
                f"tie-break requires candidate_id ascending ({c1!r} > {c2!r})."
            )

    return errors
