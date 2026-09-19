import re
from typing import Dict, List, NamedTuple


class RegexMatch(NamedTuple):
    category: str
    entity_type: str
    text_snippet: str
    start_char: int
    end_char: int
    confidence: float


# Compiled deterministic regex patterns adhering to RULES.md
DETECTOR_PATTERNS = [
    # 1. Credentials
    {
        "category": "CREDENTIAL",
        "entity_type": "AWS_ACCESS_KEY",
        "pattern": re.compile(r"\b((?:AKIA|ASIA|AROA)[0-9A-Z]{16})\b"),
        "confidence": 0.99,
    },
    {
        "category": "CREDENTIAL",
        "entity_type": "GITHUB_TOKEN",
        "pattern": re.compile(r"\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b"),
        "confidence": 0.99,
    },
    {
        "category": "CREDENTIAL",
        "entity_type": "SLACK_TOKEN",
        "pattern": re.compile(r"\b(xox[baprs](?:-[0-9a-zA-Z]{8,48})+)\b"),
        "confidence": 0.98,
    },
    {
        "category": "CREDENTIAL",
        "entity_type": "JWT_TOKEN",
        "pattern": re.compile(
            r"\b(ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b"
        ),
        "confidence": 0.95,
    },

    # 2. Identity
    {
        "category": "IDENTITY",
        "entity_type": "AADHAAR_NUMBER",
        "pattern": re.compile(r"\b([2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4})\b"),
        "confidence": 0.95,
    },
    {
        "category": "IDENTITY",
        "entity_type": "PAN_NUMBER",
        "pattern": re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b"),
        "confidence": 0.98,
    },
    {
        "category": "IDENTITY",
        "entity_type": "PASSPORT_NUMBER",
        "pattern": re.compile(r"\b([A-Z][1-9][0-9]{6})\b"),
        "confidence": 0.90,
    },

    # 3. Financial
    {
        "category": "FINANCIAL",
        "entity_type": "UPI_ID",
        "pattern": re.compile(
            r"\b([a-zA-Z0-9.\-_]{3,64}@(okhdfcbank|okicici|oksbi|okaxis|paytm|upi|ybl|axl|ibl|barodampay|postbank))\b",
            re.IGNORECASE,
        ),
        "confidence": 0.95,
    },

    # 4. Privacy & Workplace
    {
        "category": "PRIVACY",
        "entity_type": "EMAIL_ADDRESS",
        "pattern": re.compile(r"\b([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b"),
        "confidence": 0.95,
    },
    {
        "category": "PRIVACY",
        "entity_type": "PHONE_NUMBER",
        "pattern": re.compile(
            r"\b((?:\+91[\s-]?)?[6-9]\d{9})\b"
        ),
        "confidence": 0.90,
    },
    {
        "category": "WORKPLACE",
        "entity_type": "URL",
        "pattern": re.compile(r"\b(https?://[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+)\b"),
        "confidence": 0.95,
    },
]


class RegexDetectorEngine:
    """
    Deterministic regex detection engine for high-confidence cybersecurity findings.
    """

    def __init__(self):
        self.patterns = DETECTOR_PATTERNS

    def detect_entities(self, text: str) -> List[RegexMatch]:
        """
        Scans normalized OCR text and returns deterministic entity matches.
        """
        if not text or not text.strip():
            return []

        matches: List[RegexMatch] = []
        for det in self.patterns:
            category = det["category"]
            entity_type = det["entity_type"]
            pattern: re.Pattern = det["pattern"]
            confidence = det["confidence"]

            for m in pattern.finditer(text):
                val = m.group(1).strip()
                matches.append(
                    RegexMatch(
                        category=category,
                        entity_type=entity_type,
                        text_snippet=val,
                        start_char=m.start(1),
                        end_char=m.end(1),
                        confidence=confidence,
                    )
                )

        return matches


regex_detector_engine = RegexDetectorEngine()
