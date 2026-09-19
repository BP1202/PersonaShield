from typing import Any, List
from backend.app.detection.credential_detector import ExposureFindingDraft
from backend.app.intelligence.severity import ExposureSeverity


class FinancialDetector:
    """
    Evaluates cybersecurity risk from exposed payment handles, card numbers, and banking details.
    """

    def analyze(
        self,
        entities: List[Any],
        raw_text: str,
        tokens: List[Any],
    ) -> List[ExposureFindingDraft]:
        findings: List[ExposureFindingDraft] = []

        for ent in entities:
            e_type = getattr(ent, "entity_type", "")
            snippet = getattr(ent, "text_snippet", "")
            bbox = getattr(ent, "bbox", [0, 0, 0, 0])
            page = getattr(ent, "page_number", 1)
            e_id = getattr(ent, "id", None)
            conf = getattr(ent, "confidence", 0.95)

            if e_type == "UPI_ID":
                findings.append(
                    ExposureFindingDraft(
                        finding_type="UPI_FINANCIAL_EXPOSURE",
                        category="FINANCIAL",
                        severity=ExposureSeverity.LOW.value,
                        confidence=conf,
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"payment_rail": "UPI"},
                    )
                )
            elif e_type in ("CREDIT_CARD", "IBAN_CODE"):
                findings.append(
                    ExposureFindingDraft(
                        finding_type="CREDIT_CARD_EXPOSURE",
                        category="FINANCIAL",
                        severity=ExposureSeverity.CRITICAL.value,
                        confidence=conf,
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"payment_rail": "CARD_OR_BANK"},
                    )
                )

        return findings


financial_detector = FinancialDetector()
