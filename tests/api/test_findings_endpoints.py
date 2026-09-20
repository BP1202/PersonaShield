import io
import uuid
from unittest.mock import patch
import pytest
from httpx import AsyncClient
from PIL import Image

from backend.app.ocr.engine import OcrExtractionResult, OcrToken


def create_valid_png_bytes(width: int = 300, height: int = 150) -> bytes:
    img = Image.new("RGB", (width, height), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_detect_exposures_scan_not_found(client: AsyncClient):
    random_uuid = str(uuid.uuid4())
    resp = await client.post(f"/api/v1/scan/{random_uuid}/detect")
    assert resp.status_code == 404
    assert resp.json()["success"] is False


@pytest.mark.asyncio
async def test_get_findings_scan_not_found(client: AsyncClient):
    random_uuid = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/scan/{random_uuid}/findings")
    assert resp.status_code == 404
    assert resp.json()["success"] is False


@pytest.mark.asyncio
async def test_get_score_scan_not_found(client: AsyncClient):
    random_uuid = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/scan/{random_uuid}/score")
    assert resp.status_code == 404
    assert resp.json()["success"] is False


@pytest.mark.asyncio
async def test_end_to_end_detect_findings_and_score(client: AsyncClient):
    # 1. Upload screenshot
    png_bytes = create_valid_png_bytes()
    files = {
        "file": ("aws_leak.png", io.BytesIO(png_bytes), "image/png"),
    }
    create_resp = await client.post("/api/v1/scan", files=files)
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    # 2. Extract with mock OCR tokens containing an AWS key and Aadhaar number
    mock_tokens = [
        OcrToken(text="AWS:", confidence=0.99, bbox=[10, 10, 50, 30], page_number=1),
        OcrToken(text="AKIAIOSFODNN7EXAMPLE", confidence=0.99, bbox=[60, 10, 220, 30], page_number=1),
        OcrToken(text="Aadhaar:", confidence=0.95, bbox=[10, 40, 80, 60], page_number=1),
        OcrToken(text="3456 7890 1234", confidence=0.95, bbox=[90, 40, 200, 60], page_number=1),
    ]
    mock_ocr = OcrExtractionResult(
        raw_text="AWS: AKIAIOSFODNN7EXAMPLE\nAadhaar: 3456 7890 1234",
        normalized_text="AWS: AKIAIOSFODNN7EXAMPLE\nAadhaar: 3456 7890 1234",
        tokens=mock_tokens,
    )

    with patch(
        "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
        return_value=mock_ocr,
    ):
        extract_resp = await client.post(f"/api/v1/scan/{scan_id}/extract")
        assert extract_resp.status_code == 200

    # 3. Trigger Exposure Detection POST /detect
    detect_resp = await client.post(f"/api/v1/scan/{scan_id}/detect")
    assert detect_resp.status_code == 200
    detect_body = detect_resp.json()
    assert detect_body["success"] is True

    detect_data = detect_body["data"]
    assert detect_data["scan_id"] == scan_id
    assert detect_data["total_findings"] >= 2
    assert detect_data["exposure_score"] >= 65  # 35 (AWS) + 20 (Aadhaar) + 10 (compound bonus) = 65
    assert detect_data["risk_level"] in ("HIGH", "CRITICAL")
    assert len(detect_data["findings"]) >= 2

    # Check evidence masking and recommendations
    aws_finding = next((f for f in detect_data["findings"] if f["finding_type"] == "AWS_ACCESS_KEY_EXPOSURE"), None)
    assert aws_finding is not None
    assert aws_finding["severity"] == "CRITICAL"
    assert "AKIA" in aws_finding["evidence"]["masked_value"]
    assert "remediation" in str(aws_finding["recommendation"]).lower() or "rotate" in str(aws_finding["recommendation"]).lower() or "deactivate" in str(aws_finding["recommendation"]).lower()

    # 4. Query GET /findings
    findings_resp = await client.get(f"/api/v1/scan/{scan_id}/findings")
    assert findings_resp.status_code == 200
    findings_body = findings_resp.json()
    assert findings_body["success"] is True
    assert len(findings_body["data"]) >= 2

    # 5. Query GET /score
    score_resp = await client.get(f"/api/v1/scan/{scan_id}/score")
    assert score_resp.status_code == 200
    score_body = score_resp.json()
    assert score_body["success"] is True

    score_data = score_body["data"]
    assert score_data["score"] == detect_data["exposure_score"]
    assert score_data["critical_count"] >= 1
    assert score_data["high_count"] >= 1
    assert "CREDENTIAL" in score_data["breakdown"]
    assert "IDENTITY" in score_data["breakdown"]
