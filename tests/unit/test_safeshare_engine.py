import io
import uuid
from PIL import Image
import pytest

from backend.app.redaction.engine import RedactionEngine, safeshare_engine


def create_test_image_bytes(width: int = 300, height: int = 200) -> bytes:
    img = Image.new("RGB", (width, height), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_redaction_engine_maps_default_modes():
    engine = RedactionEngine()
    assert engine.determine_mode("AWS_ACCESS_KEY_EXPOSURE") == "blackout"
    assert engine.determine_mode("GITHUB_TOKEN_EXPOSURE") == "blackout"
    assert engine.determine_mode("DATABASE_CONNECTION_STRING_EXPOSURE") == "blackout"
    assert engine.determine_mode("AADHAAR_EXPOSURE") == "blur"
    assert engine.determine_mode("PAN_EXPOSURE") == "blur"
    assert engine.determine_mode("QR_CODE_EXPOSURE") == "blur"
    assert engine.determine_mode("PHONE_EXPOSURE") == "pixelate"
    assert engine.determine_mode("EMAIL_EXPOSURE") == "pixelate"
    assert engine.determine_mode("CREDIT_CARD_EXPOSURE") == "partial_blur"
    assert engine.determine_mode("UNKNOWN_TYPE") == "blur"


def test_redaction_engine_multiple_findings():
    img_bytes = create_test_image_bytes(400, 300)
    finding1_id = str(uuid.uuid4())
    finding2_id = str(uuid.uuid4())

    findings = [
        {
            "id": finding1_id,
            "finding_type": "AWS_ACCESS_KEY_EXPOSURE",
            "evidence": {"bbox": [20, 20, 150, 50], "masked_value": "AKIA***"},
        },
        {
            "id": finding2_id,
            "finding_type": "PHONE_EXPOSURE",
            "evidence": {"bbox": [20, 80, 120, 110], "masked_value": "+91 98***"},
        },
    ]

    sanitized, applied = safeshare_engine.redact(img_bytes, findings=findings)
    assert len(sanitized) > 0
    assert len(applied) == 2
    assert applied[0]["mode"] == "blackout"
    assert applied[0]["finding_type"] == "AWS_ACCESS_KEY_EXPOSURE"
    assert applied[1]["mode"] == "pixelate"
    assert applied[1]["finding_type"] == "PHONE_EXPOSURE"


def test_redaction_engine_with_user_custom_regions():
    img_bytes = create_test_image_bytes(400, 300)
    custom_regions = [
        {
            "bbox": [50, 50, 120, 100],
            "mode": "pixelate",
            "label": "User Custom Box 1",
        },
        {
            "bbox": [150, 50, 220, 100],
            "mode": "blur",
            "label": "User Custom Box 2",
        },
    ]

    sanitized, applied = safeshare_engine.redact(
        img_bytes,
        findings=[],
        custom_regions=custom_regions,
    )
    assert len(sanitized) > 0
    assert len(applied) == 2
    assert applied[0]["source"] == "custom"
    assert applied[0]["mode"] == "pixelate"
    assert applied[0]["label"] == "User Custom Box 1"
    assert applied[1]["source"] == "custom"
    assert applied[1]["mode"] == "blur"
    assert applied[1]["label"] == "User Custom Box 2"


def test_redaction_engine_selected_findings_filtering():
    img_bytes = create_test_image_bytes(400, 300)
    id1 = str(uuid.uuid4())
    id2 = str(uuid.uuid4())

    findings = [
        {
            "id": id1,
            "finding_type": "AWS_ACCESS_KEY_EXPOSURE",
            "evidence": {"bbox": [10, 10, 80, 30]},
        },
        {
            "id": id2,
            "finding_type": "AADHAAR_EXPOSURE",
            "evidence": {"bbox": [10, 50, 80, 70]},
        },
    ]

    # Redact ONLY id1
    sanitized, applied = safeshare_engine.redact(
        img_bytes,
        findings=findings,
        selected_finding_ids=[id1],
    )
    assert len(applied) == 1
    assert applied[0]["finding_id"] == id1


def test_redaction_engine_empty_findings_produces_clean_image():
    img_bytes = create_test_image_bytes(100, 100)
    sanitized, applied = safeshare_engine.redact(img_bytes, findings=[])
    assert len(applied) == 0
    assert len(sanitized) > 0
    with Image.open(io.BytesIO(sanitized)) as img:
        assert img.size == (100, 100)
        assert img.format == "PNG"
