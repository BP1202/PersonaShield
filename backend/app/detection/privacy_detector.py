from typing import Any, List
from backend.app.detection.credential_detector import ExposureFindingDraft
from backend.app.intelligence.severity import ExposureSeverity


class PrivacyDetector:
    """
    Evaluates personal privacy leakage from phone numbers and personal email addresses.
    """

    def analyze(
        self,
        entities: List[Any],
        raw_text: str,
        tokens: List[Any],
    ) -> List[ExposureFindingDraft]:
        findings: List[ExposureFindingDraft] = []
        seen = set()

        for ent in entities:
            e_type = getattr(ent, "entity_type", "")
            snippet = getattr(ent, "text_snippet", "")
            bbox = getattr(ent, "bbox", [0, 0, 0, 0])
            page = getattr(ent, "page_number", 1)
            e_id = getattr(ent, "id", None)
            conf = getattr(ent, "confidence", 0.90)

            if snippet in seen:
                continue

            if e_type == "PHONE_NUMBER":
                seen.add(snippet)
                findings.append(
                    ExposureFindingDraft(
                        finding_type="PHONE_EXPOSURE",
                        category="PRIVACY",
                        severity=ExposureSeverity.LOW.value,
                        confidence=conf,
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"pii_type": "PHONE"},
                    )
                )
            elif e_type == "EMAIL_ADDRESS":
                seen.add(snippet)
                findings.append(
                    ExposureFindingDraft(
                        finding_type="EMAIL_EXPOSURE",
                        category="PRIVACY",
                        severity=ExposureSeverity.LOW.value,
                        confidence=conf,
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"pii_type": "EMAIL"},
                    )
                )

        return findings


privacy_detector = PrivacyDetector()
