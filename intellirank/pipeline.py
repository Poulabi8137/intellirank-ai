"""
End-to-end candidate ranking pipeline.

Orchestrates the existing backend components in the correct sequence:
  1. Corpus statistics (single streaming pass)
  2. Dataset loading + validation (streaming)
  3. Feature extraction (per-candidate)
  4. Candidate scoring + ranking

Contains no business logic — delegates entirely to the specialist modules.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from intellirank.config import PipelineConfig, get_config
from intellirank.dataset.loader import LoadStats, iter_candidates
from intellirank.features.corpus_stats import CorpusStats, compute_corpus_stats
from intellirank.features.extractor import extract_features
from intellirank.logger import get_logger
from intellirank.ranking.ranker import RankedCandidate, rank_candidates
from intellirank.types import Candidate, CandidateFeatures

log = get_logger(__name__)


@dataclass
class PipelineResult:
    """Complete output of a pipeline run."""

    ranked: list[RankedCandidate]       # Top-k ranked candidates (ranks 1–top_k)
    load_stats: LoadStats               # Loading/validation statistics
    corpus: CorpusStats                 # p95 normalization denominators used
    elapsed_seconds: float              # Total wall-clock time
    total_features_extracted: int       # Candidates that completed feature extraction
    extraction_errors: int = 0          # Candidates that failed during feature extraction


def run_pipeline(
    path: Path,
    config: Optional[PipelineConfig] = None,
) -> PipelineResult:
    """
    Full production pipeline over a JSONL dataset file.

    Performs two streaming passes:
      Pass 1 — corpus statistics (raw JSONL, no Pydantic overhead)
      Pass 2 — load + validate + clean + extract + score + rank

    Args:
        path: Path to candidates.jsonl
        config: Pipeline configuration; defaults to PipelineConfig()

    Returns:
        PipelineResult with the top-k ranked candidates.
    """
    config = config or get_config()
    t0 = time.monotonic()

    # Stage 1: Single-pass corpus statistics
    corpus = compute_corpus_stats(path, config.progress_interval)

    # Stages 2–5: Stream-load, validate, and extract features
    log.info(
        "Stages 2-5: Loading candidates and extracting features from %s ...",
        path.name,
    )
    all_features: list[CandidateFeatures] = []
    extraction_errors = 0
    final_stats = LoadStats()

    for candidate, stats in iter_candidates(path, config.progress_interval):
        final_stats = stats  # stats is mutated in-place by iter_candidates
        try:
            features = extract_features(candidate, corpus)
            all_features.append(features)
        except Exception as exc:
            extraction_errors += 1
            log.warning(
                "Feature extraction failed for %s: %s",
                candidate.candidate_id, exc,
            )
        n = len(all_features)
        if n > 0 and n % config.progress_interval == 0:
            log.info("  Feature extraction progress: %d extracted", n)

    log.info(
        "Stages 2-5 complete: %d features extracted | %d extraction errors",
        len(all_features), extraction_errors,
    )

    # Stages 6–7: Score and rank
    log.info(
        "Stages 6-7: Ranking %d candidates (top-%d) ...",
        len(all_features), config.top_k,
    )
    ranked = rank_candidates(all_features, config)

    elapsed = time.monotonic() - t0
    log.info(
        "Pipeline complete in %.1fs | ranked top-%d from %d candidates",
        elapsed, len(ranked), len(all_features),
    )

    return PipelineResult(
        ranked=ranked,
        load_stats=final_stats,
        corpus=corpus,
        elapsed_seconds=elapsed,
        total_features_extracted=len(all_features),
        extraction_errors=extraction_errors,
    )


def run_pipeline_from_candidates(
    candidates: list[Candidate],
    corpus: CorpusStats,
    config: Optional[PipelineConfig] = None,
) -> PipelineResult:
    """
    In-memory pipeline for testing and evaluation: skips file I/O.

    Accepts pre-validated Candidate objects and a pre-computed CorpusStats.
    Gracefully skips any candidate that raises during feature extraction and
    continues with the remainder.

    Args:
        candidates: Pre-validated Candidate objects.
        corpus: Pre-computed corpus statistics.
        config: Pipeline configuration; defaults to PipelineConfig().

    Returns:
        PipelineResult with the top-k ranked candidates.
    """
    config = config or get_config()
    t0 = time.monotonic()

    log.info(
        "In-memory pipeline: extracting features for %d candidates ...",
        len(candidates),
    )

    all_features: list[CandidateFeatures] = []
    extraction_errors = 0

    for i, candidate in enumerate(candidates):
        try:
            features = extract_features(candidate, corpus)
            all_features.append(features)
        except Exception as exc:
            extraction_errors += 1
            log.warning(
                "Feature extraction failed for %s: %s",
                candidate.candidate_id, exc,
            )
        n = i + 1
        if n % config.progress_interval == 0:
            log.info("  Extracted %d/%d features ...", len(all_features), len(candidates))

    log.info(
        "Feature extraction complete: %d/%d succeeded | %d errors",
        len(all_features), len(candidates), extraction_errors,
    )

    ranked = rank_candidates(all_features, config)

    elapsed = time.monotonic() - t0
    log.info(
        "In-memory pipeline complete in %.3fs | %d ranked",
        elapsed, len(ranked),
    )

    load_stats = LoadStats(
        total_lines=len(candidates),
        valid=len(all_features),
    )

    return PipelineResult(
        ranked=ranked,
        load_stats=load_stats,
        corpus=corpus,
        elapsed_seconds=elapsed,
        total_features_extracted=len(all_features),
        extraction_errors=extraction_errors,
    )
