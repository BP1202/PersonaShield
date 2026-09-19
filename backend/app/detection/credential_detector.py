import re
from typing import Any, List, NamedTuple, Optional
import uuid

from backend.app.intelligence.severity import ExposureSeverity


class ExposureFindingDraft(NamedTuple):
    finding_type: str
    category: str
    severity: str
    confidence: float
    entity_id: Optional[uuid.UUID]
    bbox: List[int]
    page_number: int
    raw_snippet: str
    metadata: dict


OPENAI_KEY_PATTERN = re.compile(r"\b(sk-[a-zA-Z0-9_-]{20,80})\b")
STRIPE_KEY_PATTERN = re.compile(r"\b((?:sk_live|rk_live)_[0-9a-zA-Z]{24,34})\b")
ANTHROPIC_KEY_PATTERN = re.compile(r"\b(sk-ant-[0-9a-zA-Z_\-]{30,100})\b")
DB_URI_PATTERN = re.compile(
    r"\b((?:postgres|postgresql|mysql|mongodb|redis):\/\/(?:[a-zA-Z0-9_\-\.%]+(?::[^\s@/]+)?@)?[a-zA-Z0-9_\-\.]+(?::\d+)?\/[a-zA-Z0-9_\-\.\?&=]+)\b",
    re.IGNORECASE,
)


class CredentialDetector:
    """
    Evaluates cybersecurity risk from extracted credentials and connection strings.
    """

    def analyze(
        self,
        entities: List[Any],
        raw_text: str,
        tokens: List[Any],
    ) -> List[ExposureFindingDraft]:
        findings: List[ExposureFindingDraft] = []
        seen_snippets = set()

        # 1. Process extracted ScanEntity records
        for ent in entities:
            e_type = getattr(ent, "entity_type", "")
            snippet = getattr(ent, "text_snippet", "")
            bbox = getattr(ent, "bbox", [0, 0, 0, 0])
            page = getattr(ent, "page_number", 1)
            e_id = getattr(ent, "id", None)

            if snippet in seen_snippets:
                continue

            if e_type == "AWS_ACCESS_KEY":
                seen_snippets.add(snippet)
                findings.append(
                    ExposureFindingDraft(
                        finding_type="AWS_ACCESS_KEY_EXPOSURE",
                        category="CREDENTIAL",
                        severity=ExposureSeverity.CRITICAL.value,
                        confidence=getattr(ent, "confidence", 0.99),
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"cloud_provider": "AWS"},
                    )
                )
            elif e_type == "GITHUB_TOKEN":
                seen_snippets.add(snippet)
                findings.append(
                    ExposureFindingDraft(
                        finding_type="GITHUB_TOKEN_EXPOSURE",
                        category="CREDENTIAL",
                        severity=ExposureSeverity.CRITICAL.value,
                        confidence=getattr(ent, "confidence", 0.99),
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"provider": "GitHub"},
                    )
                )
            elif e_type == "SLACK_TOKEN":
                seen_snippets.add(snippet)
                findings.append(
                    ExposureFindingDraft(
                        finding_type="SLACK_TOKEN_EXPOSURE",
                        category="CREDENTIAL",
                        severity=ExposureSeverity.CRITICAL.value,
                        confidence=getattr(ent, "confidence", 0.98),
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"provider": "Slack"},
                    )
                )
            elif e_type == "JWT_TOKEN":
                seen_snippets.add(snippet)
                findings.append(
                    ExposureFindingDraft(
                        finding_type="JWT_TOKEN_EXPOSURE",
                        category="CREDENTIAL",
                        severity=ExposureSeverity.HIGH.value,
                        confidence=getattr(ent, "confidence", 0.95),
                        entity_id=e_id,
                        bbox=bbox,
                        page_number=page,
                        raw_snippet=snippet,
                        metadata={"token_format": "JSON_WEB_TOKEN"},
                    )
                )

        # 2. Text scanning for DB URIs, OpenAI, Stripe, Anthropic keys
        if raw_text:
            # DB URIs
            for m in DB_URI_PATTERN.finditer(raw_text):
                db_url = m.group(1).strip()
                if db_url not in seen_snippets:
                    seen_snippets.add(db_url)
                    findings.append(
                        ExposureFindingDraft(
                            finding_type="DATABASE_CONNECTION_STRING_EXPOSURE",
                            category="CREDENTIAL",
                            severity=ExposureSeverity.CRITICAL.value,
                            confidence=0.98,
                            entity_id=None,
                            bbox=[0, 0, 0, 0],
                            page_number=1,
                            raw_snippet=db_url,
                            metadata={"db_type": db_url.split(":")[0]},
                        )
                    )

            # OpenAI keys
            for m in OPENAI_KEY_PATTERN.finditer(raw_text):
                oai_key = m.group(1).strip()
                if oai_key not in seen_snippets:
                    seen_snippets.add(oai_key)
                    findings.append(
                        ExposureFindingDraft(
                            finding_type="OPENAI_API_KEY_EXPOSURE",
                            category="CREDENTIAL",
                            severity=ExposureSeverity.CRITICAL.value,
                            confidence=0.99,
                            entity_id=None,
                            bbox=[0, 0, 0, 0],
                            page_number=1,
                            raw_snippet=oai_key,
                            metadata={"provider": "OpenAI"},
                        )
                    )

            # Stripe keys
            for m in STRIPE_KEY_PATTERN.finditer(raw_text):
                stripe_key = m.group(1).strip()
                if stripe_key not in seen_snippets:
                    seen_snippets.add(stripe_key)
                    findings.append(
                        ExposureFindingDraft(
                            finding_type="STRIPE_KEY_EXPOSURE",
                            category="CREDENTIAL",
                            severity=ExposureSeverity.CRITICAL.value,
                            confidence=0.99,
                            entity_id=None,
                            bbox=[0, 0, 0, 0],
                            page_number=1,
                            raw_snippet=stripe_key,
                            metadata={"provider": "Stripe"},
                        )
                    )

            # Anthropic keys
            for m in ANTHROPIC_KEY_PATTERN.finditer(raw_text):
                ant_key = m.group(1).strip()
                if ant_key not in seen_snippets:
                    seen_snippets.add(ant_key)
                    findings.append(
                        ExposureFindingDraft(
                            finding_type="ANTHROPIC_API_KEY_EXPOSURE",
                            category="CREDENTIAL",
                            severity=ExposureSeverity.CRITICAL.value,
                            confidence=0.99,
                            entity_id=None,
                            bbox=[0, 0, 0, 0],
                            page_number=1,
                            raw_snippet=ant_key,
                            metadata={"provider": "Anthropic"},
                        )
                    )

        return findings


credential_detector = CredentialDetector()
