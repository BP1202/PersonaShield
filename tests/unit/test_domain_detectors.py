import pytest
from backend.app.detection.credential_detector import credential_detector
from backend.app.detection.identity_detector import identity_detector
from backend.app.detection.financial_detector import financial_detector
from backend.app.detection.workplace_detector import workplace_detector
from backend.app.detection.privacy_detector import privacy_detector


class DummyEntity:
    def __init__(self, entity_type: str, text_snippet: str, category: str = "CREDENTIAL", confidence: float = 0.99, bbox: list = None):
        self.entity_type = entity_type
        self.text_snippet = text_snippet
        self.category = category
        self.confidence = confidence
        self.bbox = bbox or [10, 10, 100, 30]
        self.page_number = 1
        self.id = None


def test_credential_detector_aws_and_jwt():
    entities = [
        DummyEntity("AWS_ACCESS_KEY", "AKIAIOSFODNN7EXAMPLE"),
        DummyEntity("JWT_TOKEN", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig"),
    ]
    findings = credential_detector.analyze(entities, raw_text="", tokens=[])

    types = [f.finding_type for f in findings]
    assert "AWS_ACCESS_KEY_EXPOSURE" in types
    assert "JWT_TOKEN_EXPOSURE" in types

    aws_f = next(f for f in findings if f.finding_type == "AWS_ACCESS_KEY_EXPOSURE")
    assert aws_f.severity == "CRITICAL"
    assert aws_f.confidence >= 0.99


def test_credential_detector_db_uri_and_openai_in_raw_text():
    raw_text = "Connect with postgresql://dbadmin:secretpass123@db.internal:5432/proddb using sk-mock012345678901234567890123"
    findings = credential_detector.analyze(entities=[], raw_text=raw_text, tokens=[])

    types = [f.finding_type for f in findings]
    assert "DATABASE_CONNECTION_STRING_EXPOSURE" in types
    assert "OPENAI_API_KEY_EXPOSURE" in types

    db_f = next(f for f in findings if f.finding_type == "DATABASE_CONNECTION_STRING_EXPOSURE")
    assert db_f.severity == "CRITICAL"


def test_identity_detector_individual_and_compound_risk():
    # Co-exposure of Aadhaar and PAN should generate COMBINED_IDENTITY_RISK
    entities = [
        DummyEntity("AADHAAR_NUMBER", "3456 7890 1234", category="IDENTITY", bbox=[10, 10, 50, 30]),
        DummyEntity("PAN_NUMBER", "ABCDE1234F", category="IDENTITY", bbox=[60, 10, 120, 30]),
    ]
    findings = identity_detector.analyze(entities, raw_text="", tokens=[])

    types = [f.finding_type for f in findings]
    assert "AADHAAR_EXPOSURE" in types
    assert "PAN_EXPOSURE" in types
    assert "COMBINED_IDENTITY_RISK" in types

    compound = next(f for f in findings if f.finding_type == "COMBINED_IDENTITY_RISK")
    assert compound.severity == "CRITICAL"
    assert compound.bbox == [10, 10, 120, 30]


def test_financial_detector_upi_and_cards():
    entities = [
        DummyEntity("UPI_ID", "merchant@okaxis", category="FINANCIAL"),
        DummyEntity("CREDIT_CARD", "4532123456789012", category="FINANCIAL"),
    ]
    findings = financial_detector.analyze(entities, raw_text="", tokens=[])

    types = [f.finding_type for f in findings]
    assert "UPI_FINANCIAL_EXPOSURE" in types
    assert "CREDIT_CARD_EXPOSURE" in types


def test_workplace_detector_internal_urls():
    entities = [
        DummyEntity("URL", "http://10.240.12.1/admin", category="WORKPLACE"),
        DummyEntity("URL", "https://security-vault.corp/keys", category="WORKPLACE"),
        DummyEntity("URL", "https://public-news.com/today", category="WORKPLACE"),
    ]
    findings = workplace_detector.analyze(entities, raw_text="", tokens=[])

    types = [f.finding_type for f in findings]
    assert len(findings) == 2
    assert all(f.finding_type == "INTERNAL_WORKPLACE_EXPOSURE" for f in findings)


def test_privacy_detector_phone_and_email():
    entities = [
        DummyEntity("PHONE_NUMBER", "+91 9876543210", category="PRIVACY"),
        DummyEntity("EMAIL_ADDRESS", "test.user@company.com", category="PRIVACY"),
    ]
    findings = privacy_detector.analyze(entities, raw_text="", tokens=[])

    types = [f.finding_type for f in findings]
    assert "PHONE_EXPOSURE" in types
    assert "EMAIL_EXPOSURE" in types
