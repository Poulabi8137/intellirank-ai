"""Mathematical utility functions for feature computation."""

from __future__ import annotations

import math
from typing import Sequence


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    """Clamp a float to [low, high]."""
    return max(low, min(high, value))


def piecewise_linear(value: float, breakpoints: Sequence[tuple[float, float]]) -> float:
    """
    Piecewise-linear interpolation through a list of (x, y) breakpoints.
    breakpoints must be sorted by x ascending.
    Values outside the range are clamped to the first/last y value.
    """
    if not breakpoints:
        return 0.0

    if value <= breakpoints[0][0]:
        return breakpoints[0][1]

    if value >= breakpoints[-1][0]:
        return breakpoints[-1][1]

    for i in range(len(breakpoints) - 1):
        x0, y0 = breakpoints[i]
        x1, y1 = breakpoints[i + 1]
        if x0 <= value <= x1:
            if x1 == x0:
                return y0
            t = (value - x0) / (x1 - x0)
            return y0 + t * (y1 - y0)

    return breakpoints[-1][1]


def gaussian_bell(value: float, center: float, sigma: float) -> float:
    """Gaussian bell curve: exp(-(value - center)^2 / (2 * sigma^2))."""
    return math.exp(-((value - center) ** 2) / (2 * sigma ** 2))


def geometric_mean(values: Sequence[float]) -> float:
    """Geometric mean of a non-empty sequence of non-negative floats."""
    if not values:
        return 0.0
    product = 1.0
    for v in values:
        product *= max(0.0, v)
    return product ** (1.0 / len(values))


def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Division that returns default when denominator is zero."""
    if denominator == 0.0:
        return default
    return numerator / denominator


def log1p_norm(value: float) -> float:
    """log(1 + value), value clamped to >= 0."""
    return math.log1p(max(0.0, value))


def skill_trust_score(proficiency_weight: float, endorsements: int, duration_months: int) -> float:
    """
    Core skill trust formula: P × log(1+E) × log(1+D).
    From FEATURE_ENGINEERING.md SI-01.
    """
    return proficiency_weight * log1p_norm(float(endorsements)) * log1p_norm(float(duration_months))


def p95_normalize(raw: float, p95: float) -> float:
    """Normalize raw value by 95th-percentile corpus value, clamped to [0, 1]."""
    if p95 <= 0.0:
        return 0.0
    return clamp(raw / p95)


def weighted_sum(values: Sequence[float], weights: Sequence[float]) -> float:
    """Weighted sum of values. Assumes weights sum to 1.0."""
    return sum(v * w for v, w in zip(values, weights))
