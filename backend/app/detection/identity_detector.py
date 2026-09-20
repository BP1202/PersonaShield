from typing import Any, List
from backend.app.detection.credential_detector import ExposureFindingDraft
from backend.app.intelligence.severity import ExposureSeverity


class IdentityDetector:
    """
    Evaluates cybersecurity risk from identity documents and compound identity exposures.
    """

    def analyze(
        self,
        entities: List[Any],
        raw_text: str,
        tokens: List[Any],
    ) -> List[ExposureFindingDraft]:
        findings: List[ExposureFindingDraft] = []
        has_aadhaar = False
        has_pan = False
        has_passport = False
        aadhaar_box = [0, 0, 0, 0]
        pan_box = [0, 0, 0, 0]

        for ent in entities:
            e_type = getattr(ent, "entity_type", "")
            snippet = getattr(ent, "text_snippet", "")
            bbox = getattr(ent, "bbox", [0, 0, 0, 0])
            page = getattr(ent, "page_number", 1)
            e_id = getattr(ent, "id", None)
            conf = getattr(ent, "confidence", 0.95)

            if e_type == "AADHAAR_NUMBER":
                has_aadhaar = True
                aadhaar_box = bbox
                findings.append(
                    ExposureFindingDraft(
                        finding_type="AADHAAR_EXPOSURE",
                        category="IDENTITY",
                        severity=ExposureSeverity.HIGH.value,
                        confidence=conf,
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"id_type": "AADHAAR"},
                    )
                )
            elif e_type == "PAN_NUMBER":
                has_pan = True
                pan_box = bbox
                findings.append(
                    ExposureFindingDraft(
                        finding_type="PAN_EXPOSURE",
                        category="IDENTITY",
                        severity=ExposureSeverity.MEDIUM.value,
                        confidence=conf,
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"id_type": "PAN"},
                    )
                )
            elif e_type == "PASSPORT_NUMBER":
                has_passport = True
                findings.append(
                    ExposureFindingDraft(
                        finding_type="PASSPORT_EXPOSURE",
                        category="IDENTITY",
                        severity=ExposureSeverity.HIGH.value,
                        confidence=conf,
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"id_type": "PASSPORT"},
                    )
                )

        # Compound identity threat: Aadhaar + PAN exposed together enables synthetic KYC fraud
        if has_aadhaar and has_pan:
            union_box = [
                min(aadhaar_box[0], pan_box[0]),
                min(aadhaar_box[1], pan_box[1]),
                max(aadhaar_box[2], pan_box[2]),
                max(aadhaar_box[3], pan_box[3]),
            ]
            findings.append(
                ExposureFindingDraft(
                    finding_type="COMBINED_IDENTITY_RISK",
                    category="IDENTITY",
                    severity=ExposureSeverity.CRITICAL.value,
                    confidence=0.99,
                    entity_id=None,
                    bbox=union_box,
                    page_number=1,
                    raw_snippet="Co-exposure of Aadhaar and PAN identity documents",
                    metadata={"vector": "KYC_SPOOFING_RISK"},
                )
            )

        return findings


identity_detector = IdentityDetector()
