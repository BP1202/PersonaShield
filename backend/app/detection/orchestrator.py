from typing import Any, Dict, List, NamedTuple, Optional
import uuid

from backend.app.detection.credential_detector import (
    ExposureFindingDraft,
    credential_detector,
)
from backend.app.detection.identity_detector import identity_detector
from backend.app.detection.financial_detector import financial_detector
from backend.app.detection.workplace_detector import workplace_detector
from backend.app.detection.privacy_detector import privacy_detector
from backend.app.intelligence.confidence_explainer import explain_finding_confidence
from backend.app.intelligence.evidence_formatter import format_evidence
from backend.app.intelligence.recommendation_engine import get_recommendation


class PreparedFinding(NamedTuple):
    finding_type: str
    category: str
    attack_surface: str
    exposure_vector: str
    severity: str
    confidence: float
    confidence_reasons: List[str]
    entity_id: Optional[uuid.UUID]
    evidence: Dict[str, Any]
    recommendation: Dict[str, Any]


ATTACK_SURFACE_MAP: Dict[str, str] = {
    "CREDENTIAL": "Developer",
    "IDENTITY": "Identity",
    "FINANCIAL": "Financial",
    "WORKPLACE": "Workplace",
    "PRIVACY": "Privacy",
}

EXPOSURE_VECTOR_MAP: Dict[str, str] = {
    "CREDENTIAL": "Credential Leakage",
    "IDENTITY": "Identity Theft",
    "FINANCIAL": "Financial Fraud",
    "WORKPLACE": "Corporate Reconnaissance",
    "PRIVACY": "Privacy Exposure",
}


class DetectionOrchestrator:
    """
    Coordinates domain-specific exposure detectors over extracted OCR entities.
    Produces finalized, evidence-backed cybersecurity findings with actionable recommendations.
    """

    def __init__(self):
        self.detectors = [
            credential_detector,
            identity_detector,
            financial_detector,
            workplace_detector,
            privacy_detector,
        ]

    def evaluate_exposures(
        self,
        entities: List[Any],
        raw_text: str = "",
        tokens: List[Any] = None,
    ) -> List[PreparedFinding]:
        tokens = tokens or []
        drafts: List[ExposureFindingDraft] = []

        # 1. Run all domain detectors
        for detector in self.detectors:
            try:
                results = detector.analyze(entities, raw_text, tokens)
                drafts.extend(results)
            except Exception:
                # Keep platform resilient if one detector encounters unexpected input
                continue

        # 2. Deduplicate drafts by (finding_type, raw_snippet)
        seen_keys = set()
        prepared_findings: List[PreparedFinding] = []

        for d in drafts:
            dedup_key = (d.finding_type, d.raw_snippet.strip().lower())
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            # Format evidence with safe secret masking
            evidence_dict = format_evidence(
                bbox=d.bbox,
                raw_snippet=d.raw_snippet,
                page_number=d.page_number,
                entity_type=d.finding_type,
            )
            # Add metadata
            if d.metadata:
                evidence_dict.update(d.metadata)

            # Get deterministic remediation playbook
            recommendation_dict = get_recommendation(d.finding_type)

            # Attack Surface & Exposure Vector
            attack_surface = ATTACK_SURFACE_MAP.get(d.category, "Privacy")
            exposure_vector = EXPOSURE_VECTOR_MAP.get(d.category, "Privacy Exposure")

            # Explainable AI confidence reasons
            has_valid_bbox = bool(d.bbox and d.bbox != [0, 0, 0, 0])
            confidence_reasons = explain_finding_confidence(
                finding_type=d.finding_type,
                confidence=d.confidence,
                has_bbox=has_valid_bbox,
                is_compound=("COMBINED" in d.finding_type),
            )

            prepared_findings.append(
                PreparedFinding(
                    finding_type=d.finding_type,
                    category=d.category,
                    attack_surface=attack_surface,
                    exposure_vector=exposure_vector,
                    severity=d.severity,
                    confidence=d.confidence,
                    confidence_reasons=confidence_reasons,
                    entity_id=d.entity_id,
                    evidence=evidence_dict,
                    recommendation=recommendation_dict,
                )
            )

        return prepared_findings


detection_orchestrator = DetectionOrchestrator()
