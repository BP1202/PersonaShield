from typing import Any, Dict, List, NamedTuple

from backend.app.intelligence.severity import (
    ExposureSeverity,
    SEVERITY_WEIGHTS,
    get_risk_level_from_score,
)


class ScoreResult(NamedTuple):
    total_score: int
    risk_level: str
    breakdown_by_category: Dict[str, Dict[str, Any]]
    severity_counts: Dict[str, int]


def calculate_exposure_score(findings: List[Any]) -> ScoreResult:
    """
    Computes an authoritative cybersecurity Exposure Score between 0 and 100.
    
    Formula:
    - Base points awarded per severity level:
        CRITICAL: 35 pts each
        HIGH: 20 pts each
        MEDIUM: 10 pts each
        LOW: 5 pts each
    - Multi-vector synergy bonus:
        If multiple risk categories collide (e.g. CREDENTIAL + WORKPLACE, or IDENTITY + FINANCIAL),
        adds +10 compound vector risk.
    - Clamped strictly between [0, 100].
    """
    if not findings:
        return ScoreResult(
            total_score=0,
            risk_level=ExposureSeverity.SAFE.value,
            breakdown_by_category={},
            severity_counts={
                ExposureSeverity.CRITICAL.value: 0,
                ExposureSeverity.HIGH.value: 0,
                ExposureSeverity.MEDIUM.value: 0,
                ExposureSeverity.LOW.value: 0,
            },
        )

    severity_counts = {
        ExposureSeverity.CRITICAL.value: 0,
        ExposureSeverity.HIGH.value: 0,
        ExposureSeverity.MEDIUM.value: 0,
        ExposureSeverity.LOW.value: 0,
    }

    category_breakdown: Dict[str, Dict[str, Any]] = {}
    categories_seen = set()
    raw_score = 0

    for finding in findings:
        sev = getattr(finding, "severity", "LOW")
        cat = getattr(finding, "category", "PRIVACY")

        # Increment severity counts
        if sev in severity_counts:
            severity_counts[sev] += 1

        categories_seen.add(cat)

        # Base severity score
        points = SEVERITY_WEIGHTS.get(sev, 5)
        raw_score += points

        # Accumulate breakdown
        if cat not in category_breakdown:
            category_breakdown[cat] = {
                "score_points": 0,
                "findings_count": 0,
            }
        category_breakdown[cat]["score_points"] += points
        category_breakdown[cat]["findings_count"] += 1

    # Cross-vector compounding penalty:
    # Multiple distinct categories elevate lateral movement and social engineering risk
    if len(categories_seen) >= 2:
        raw_score += 10
        # Distribute compounding points in breakdown
        if "COMPOUND_VECTOR" not in category_breakdown:
            category_breakdown["COMPOUND_VECTOR"] = {
                "score_points": 10,
                "findings_count": len(categories_seen),
            }

    # Clamp score to max 100
    final_score = min(100, max(0, raw_score))
    risk_level = get_risk_level_from_score(final_score)

    return ScoreResult(
        total_score=final_score,
        risk_level=risk_level,
        breakdown_by_category=category_breakdown,
        severity_counts=severity_counts,
    )
