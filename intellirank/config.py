"""Configuration management for IntelliRank AI."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).parent.parent
DATASET_DIR = PROJECT_ROOT / "redrob_dataset" / "challenge_dataset" / "India_runs_data_and_ai_challenge"
CANDIDATES_JSONL = DATASET_DIR / "candidates.jsonl"
SAMPLE_CANDIDATES_JSON = DATASET_DIR / "sample_candidates.json"
VALIDATE_SUBMISSION_PY = DATASET_DIR / "validate_submission.py"
OUTPUT_DIR = PROJECT_ROOT / "output"
FEATURE_STORE_DIR = OUTPUT_DIR / "feature_store"
SUBMISSION_DIR = OUTPUT_DIR / "submissions"


@dataclass
class PipelineConfig:
    """Runtime configuration for the ranking pipeline."""

    # ---- Paths ----
    candidates_path: Path = field(default_factory=lambda: CANDIDATES_JSONL)
    output_dir: Path = field(default_factory=lambda: OUTPUT_DIR)
    feature_store_dir: Path = field(default_factory=lambda: FEATURE_STORE_DIR)
    submission_dir: Path = field(default_factory=lambda: SUBMISSION_DIR)

    # ---- Evaluation date ----
    evaluation_date_str: str = "2026-06-27"

    # ---- Submission ----
    top_k: int = 100
    participant_id: str = "intellirank_ai"

    # ---- Scoring weights (technical_fit) ----
    weight_si: float = 0.35
    weight_ci: float = 0.20
    weight_ei: float = 0.15
    weight_di: float = 0.10
    weight_li: float = 0.10
    weight_edu: float = 0.05
    weight_pi: float = 0.05

    # ---- Quality gate range ----
    quality_modifier_floor: float = 0.80   # PQ_composite=0 → 0.80× final
    quality_modifier_range: float = 0.20   # PQ_composite=1 → +0.20

    # ---- Honeypot gate ----
    honeypot_gate_floor: float = 0.05
    honeypot_gate_denominator: float = 10.0

    # ---- Logging ----
    log_level: str = field(
        default_factory=lambda: os.environ.get("INTELLIRANK_LOG_LEVEL", "INFO")
    )

    # ---- Performance ----
    progress_interval: int = 5_000   # Log progress every N candidates

    def __post_init__(self) -> None:
        total = (
            self.weight_si + self.weight_ci + self.weight_ei
            + self.weight_di + self.weight_li + self.weight_edu + self.weight_pi
        )
        assert abs(total - 1.0) < 1e-9, f"Technical fit weights must sum to 1.0, got {total}"


def get_config() -> PipelineConfig:
    """Return the default pipeline configuration."""
    return PipelineConfig()
