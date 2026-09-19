import pytest
from backend.app.detection.regex_detectors import regex_detector_engine


def test_detect_aws_access_key():
    """Verify detection of AWS IAM / STS access keys."""
    text = "Deploying with key AKIAIOSFODNN7EXAMPLE and secret"
    matches = regex_detector_engine.detect_entities(text)
    aws_matches = [m for m in matches if m.entity_type == "AWS_ACCESS_KEY"]

    assert len(aws_matches) == 1
    assert aws_matches[0].category == "CREDENTIAL"
    assert aws_matches[0].text_snippet == "AKIAIOSFODNN7EXAMPLE"
    assert aws_matches[0].confidence >= 0.99


def test_detect_github_token():
    """Verify detection of GitHub PATs."""
    # Constructed dynamically to prevent static secret scanner alerts on mock test tokens
    gh_prefix = "ghp"
    ghp = f"{gh_prefix}_000000000000000000000000000000000000"  # gitguardian:ignore
    text = f"curl -H 'Authorization: token {ghp}' https://api.github.com"
    matches = regex_detector_engine.detect_entities(text)
    gh_matches = [m for m in matches if m.entity_type == "GITHUB_TOKEN"]

    assert len(gh_matches) == 1
    assert gh_matches[0].category == "CREDENTIAL"
    assert gh_matches[0].text_snippet == ghp


def test_detect_slack_token():
    """Verify detection of Slack bot/user tokens."""
    # Constructed dynamically to prevent static secret scanner alerts on mock test tokens
    slack_prefix = "xoxb"
    slack_token = f"{slack_prefix}-000000000000-000000000000-MockTestTokenNotReal0000"  # gitguardian:ignore
    text = f"Bot token: {slack_token}"
    matches = regex_detector_engine.detect_entities(text)
    slack_matches = [m for m in matches if m.entity_type == "SLACK_TOKEN"]

    assert len(slack_matches) == 1
    assert slack_matches[0].category == "CREDENTIAL"
    assert slack_matches[0].text_snippet == slack_token


def test_detect_jwt_token():
    """Verify detection of JSON Web Tokens."""
    header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    payload = "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ"
    sig = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    jwt_token = f"{header}.{payload}.{sig}"
    text = f"Bearer {jwt_token}"

    matches = regex_detector_engine.detect_entities(text)
    jwt_matches = [m for m in matches if m.entity_type == "JWT_TOKEN"]

    assert len(jwt_matches) == 1
    assert jwt_matches[0].category == "CREDENTIAL"
    assert jwt_matches[0].text_snippet == jwt_token


def test_detect_aadhaar_number():
    """Verify detection of 12-digit Aadhaar numbers (with or without spaces)."""
    text = "Citizen Aadhaar: 3456 7890 1234 and unspaced 456789012345"
    matches = regex_detector_engine.detect_entities(text)
    aadhaar_matches = [m for m in matches if m.entity_type == "AADHAAR_NUMBER"]

    assert len(aadhaar_matches) == 2
    assert aadhaar_matches[0].category == "IDENTITY"
    assert aadhaar_matches[0].text_snippet == "3456 7890 1234"
    assert aadhaar_matches[1].text_snippet == "456789012345"


def test_detect_pan_number():
    """Verify detection of Indian PAN card numbers."""
    text = "Tax ID PAN: ABCDE1234F recorded in file"
    matches = regex_detector_engine.detect_entities(text)
    pan_matches = [m for m in matches if m.entity_type == "PAN_NUMBER"]

    assert len(pan_matches) == 1
    assert pan_matches[0].category == "IDENTITY"
    assert pan_matches[0].text_snippet == "ABCDE1234F"


def test_detect_passport_number():
    """Verify detection of Indian Passport numbers."""
    text = "Passport No: K1234567 valid until 2030"
    matches = regex_detector_engine.detect_entities(text)
    passport_matches = [m for m in matches if m.entity_type == "PASSPORT_NUMBER"]

    assert len(passport_matches) == 1
    assert passport_matches[0].category == "IDENTITY"
    assert passport_matches[0].text_snippet == "K1234567"


def test_detect_upi_id():
    """Verify detection of standard UPI VPA handles."""
    text = "Send payment to receiver@okaxis or business@paytm"
    matches = regex_detector_engine.detect_entities(text)
    upi_matches = [m for m in matches if m.entity_type == "UPI_ID"]

    assert len(upi_matches) == 2
    assert upi_matches[0].category == "FINANCIAL"
    assert upi_matches[0].text_snippet == "receiver@okaxis"
    assert upi_matches[1].text_snippet == "business@paytm"


def test_detect_email_and_phone():
    """Verify detection of email addresses and phone numbers."""
    text = "Reach developer at security-team@personashield.com or call +91 9876543210"
    matches = regex_detector_engine.detect_entities(text)

    emails = [m for m in matches if m.entity_type == "EMAIL_ADDRESS"]
    assert len(emails) == 1
    assert emails[0].text_snippet == "security-team@personashield.com"

    phones = [m for m in matches if m.entity_type == "PHONE_NUMBER"]
    assert len(phones) == 1
    assert "9876543210" in phones[0].text_snippet


def test_detect_url():
    """Verify detection of URLs."""
    text = "Documentation at https://internal-vault.company.local/keys"
    matches = regex_detector_engine.detect_entities(text)
    urls = [m for m in matches if m.entity_type == "URL"]

    assert len(urls) == 1
    assert urls[0].category == "WORKPLACE"
    assert urls[0].text_snippet == "https://internal-vault.company.local/keys"


def test_detect_empty_or_clean_text():
    """Verify no false positives on clean or empty text."""
    assert regex_detector_engine.detect_entities("") == []
    assert regex_detector_engine.detect_entities("   ") == []
    clean_text = "This is a simple meeting invitation for our weekly architecture review."
    assert regex_detector_engine.detect_entities(clean_text) == []
