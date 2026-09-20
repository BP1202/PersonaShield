from typing import Any, List, NamedTuple
from backend.app.detection.orchestrator import PreparedFinding, detection_orchestrator
from backend.app.intelligence.scoring import ScoreResult, calculate_exposure_score


class ExposureEvaluationResult(NamedTuple):
    findings: List[PreparedFinding]
    score_result: ScoreResult


class ExposureEngine:
    """
    Unified intelligence engine analyzing extracted digital artifacts to identify
    cybersecurity exposures, calculate exposure score, and formulate remediation plans.
    """

    def evaluate_scan(
        self,
        entities: List[Any],
        raw_text: str = "",
        tokens: List[Any] = None,
    ) -> ExposureEvaluationResult:
        # 1. Run detection orchestrator across all domain detectors
        findings = detection_orchestrator.evaluate_exposures(
            entities=entities,
            raw_text=raw_text,
            tokens=tokens,
        )

        # 2. Compute authoritative exposure score and risk tier
        score_result = calculate_exposure_score(findings)

        return ExposureEvaluationResult(
            findings=findings,
            score_result=score_result,
        )


exposure_engine = ExposureEngine()
