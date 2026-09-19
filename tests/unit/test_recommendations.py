import pytest
from backend.app.intelligence.evidence_formatter import (
    format_evidence,
    mask_aadhaar,
    mask_database_url,
    mask_pan,
    mask_phone,
    mask_secret,
)
from backend.app.intelligence.recommendation_engine import get_recommendation


def test_mask_secret():
    # Long secret
    secret = "sk-proj-1234567890abcdefghijklmn"
    masked = mask_secret(secret, prefix_len=7, suffix_len=4)
    assert masked.startswith("sk-proj")
    assert masked.endswith("klmn")
    assert "1234567890" not in masked


def test_mask_aadhaar():
    aadhaar = "3456 7890 1234"
    masked = mask_aadhaar(aadhaar)
    assert masked == "XXXX-XXXX-1234"


def test_mask_pan():
    pan = "ABCDE1234F"
    masked = mask_pan(pan)
    assert masked == "ABCDE****F"


def test_mask_database_url():
    db_url = "postgresql://dbuser:supersecretpass@db.internal:5432/production"
    masked = mask_database_url(db_url)
    assert "supersecretpass" not in masked
    assert "dbuser:********@db.internal" in masked


def test_recommendation_catalog_coverage():
    rec = get_recommendation("OPENAI_API_KEY_EXPOSURE")
    assert rec["priority"] == "Immediate"
    assert len(rec["action_steps"]) >= 2
    assert "OpenAI" in rec["title"]

    default_rec = get_recommendation("UNKNOWN_EXPOSURE_TYPE")
    assert "title" in default_rec
    assert "action_steps" in default_rec
