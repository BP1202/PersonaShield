from enum import Enum
from typing import Dict


class ExposureSeverity(str, Enum):
    """Cybersecurity exposure severity classifications."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    SAFE = "SAFE"


# Relative weight applied to individual finding severities
SEVERITY_WEIGHTS: Dict[str, int] = {
    ExposureSeverity.CRITICAL.value: 35,
    ExposureSeverity.HIGH.value: 20,
    ExposureSeverity.MEDIUM.value: 10,
    ExposureSeverity.LOW.value: 5,
    ExposureSeverity.SAFE.value: 0,
}


def get_risk_level_from_score(score: int) -> str:
    """Classifies an overall score into standard risk tier."""
    if score >= 80:
        return ExposureSeverity.CRITICAL.value
    elif score >= 60:
        return ExposureSeverity.HIGH.value
    elif score >= 30:
        return ExposureSeverity.MEDIUM.value
    elif score >= 1:
        return ExposureSeverity.LOW.value
    return ExposureSeverity.SAFE.value
