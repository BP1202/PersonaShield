import re
from typing import Any, List
from backend.app.detection.credential_detector import ExposureFindingDraft
from backend.app.intelligence.severity import ExposureSeverity

INTERNAL_HOST_PATTERNS = [
    re.compile(r"https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})", re.IGNORECASE),
    re.compile(r"https?://[a-zA-Z0-9_\-\.]+\.(internal|corp|local|lan|vault)\b", re.IGNORECASE),
    re.compile(r"https?://[a-zA-Z0-9_\-\.]+\.atlassian\.net/(browse|jira)/", re.IGNORECASE),
    re.compile(r"https?://join\.slack\.com/t/[a-zA-Z0-9_\-\.]+/shared_invite/", re.IGNORECASE),
]


class WorkplaceDetector:
    """
    Evaluates cybersecurity exposure from internal corporate URLs, Jira tickets, and private IPs.
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

            if e_type == "URL" and snippet not in seen:
                for pat in INTERNAL_HOST_PATTERNS:
                    if pat.search(snippet):
                        seen.add(snippet)
                        findings.append(
                            ExposureFindingDraft(
                                finding_type="INTERNAL_WORKPLACE_EXPOSURE",
                                category="WORKPLACE",
                                severity=ExposureSeverity.MEDIUM.value,
                                confidence=0.90,
                                entity_id=e_id,
                                bbox=bbox,
                                page_number=page,
                                raw_snippet=snippet,
                                metadata={"target": "INTERNAL_INFRASTRUCTURE"},
                            )
                        )
                        break

        return findings


workplace_detector = WorkplaceDetector()
