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
async def test_report_endpoints_scan_not_found(client: AsyncClient):
    random_uuid = str(uuid.uuid4())

    post_resp = await client.post(f"/api/v1/scan/{random_uuid}/report")
    assert post_resp.status_code == 404
    assert post_resp.json()["success"] is False

    get_resp = await client.get(f"/api/v1/scan/{random_uuid}/report")
    assert get_resp.status_code == 404
    assert get_resp.json()["success"] is False

    sum_resp = await client.get(f"/api/v1/scan/{random_uuid}/summary")
    assert sum_resp.status_code == 404
    assert sum_resp.json()["success"] is False


@pytest.mark.asyncio
async def test_report_clean_scan(client: AsyncClient):
    # 1. Upload screenshot
    png_bytes = create_valid_png_bytes()
    files = {"file": ("clean_doc.png", io.BytesIO(png_bytes), "image/png")}
    create_resp = await client.post("/api/v1/scan", files=files)
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    # 2. Extract with empty OCR tokens
    mock_ocr = OcrExtractionResult(
        raw_text="Hello World Clean Document",
        normalized_text="Hello World Clean Document",
        tokens=[OcrToken(text="Hello", confidence=0.99, bbox=[10, 10, 50, 30], page_number=1)],
    )

    with patch(
        "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
        return_value=mock_ocr,
    ):
        extract_resp = await client.post(f"/api/v1/scan/{scan_id}/extract")
        assert extract_resp.status_code == 200

    # 3. Detect
    detect_resp = await client.post(f"/api/v1/scan/{scan_id}/detect")
    assert detect_resp.status_code == 200
    assert detect_resp.json()["data"]["total_findings"] == 0

    # 4. Generate report POST /report
    report_resp = await client.post(f"/api/v1/scan/{scan_id}/report")
    assert report_resp.status_code == 200
    report_body = report_resp.json()
    assert report_body["success"] is True

    report_data = report_body["data"]
    assert report_data["scan_id"] == scan_id
    assert report_data["receipt"]["exposure_score"] == 0
    assert report_data["receipt"]["risk_level"] == "SAFE"
    assert report_data["receipt"]["total_findings"] == 0
    assert report_data["receipt"]["safeshare_ready"] is False
    assert report_data["safeshare_available"] is False
    assert len(report_data["evidence_cards"]) == 0
    assert len(report_data["exposure_chains"]) == 0

    # 5. Query GET /summary
    summary_resp = await client.get(f"/api/v1/scan/{scan_id}/summary")
    assert summary_resp.status_code == 200
    summary_body = summary_resp.json()
    assert summary_body["success"] is True
    assert summary_body["data"]["scan_id"] == scan_id
    assert summary_body["data"]["exposure_score"] == 0
    assert summary_body["data"]["risk_level"] == "SAFE"
    assert summary_body["data"]["safeshare_ready"] is False


@pytest.mark.asyncio
async def test_end_to_end_report_generation_and_snapshot(client: AsyncClient):
    # 1. Upload screenshot
    png_bytes = create_valid_png_bytes()
    files = {"file": ("leaked_creds.png", io.BytesIO(png_bytes), "image/png")}
    create_resp = await client.post("/api/v1/scan", files=files)
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    # 2. Extract with AWS key and Aadhaar number
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

    # 3. Detect
    detect_resp = await client.post(f"/api/v1/scan/{scan_id}/detect")
    assert detect_resp.status_code == 200

    # 4. Generate Report POST /report
    post_report_resp = await client.post(f"/api/v1/scan/{scan_id}/report")
    assert post_report_resp.status_code == 200
    post_report_data = post_report_resp.json()["data"]

    # Verify receipt details
    receipt = post_report_data["receipt"]
    assert receipt["scan_id"] == scan_id
    assert receipt["exposure_score"] >= 65
    assert receipt["risk_level"] in ("HIGH", "CRITICAL")
    assert receipt["total_findings"] >= 2
    assert receipt["safeshare_ready"] is True
    assert post_report_data["safeshare_available"] is True
    assert "Developer" in receipt["threat_categories"]
    assert "Identity" in receipt["threat_categories"]

    # Verify evidence cards have attack surface, exposure vector, confidence reasons
    evidence_cards = post_report_data["evidence_cards"]
    assert len(evidence_cards) >= 2
    aws_card = next(c for c in evidence_cards if c["finding_type"] == "AWS_ACCESS_KEY_EXPOSURE")
    assert aws_card["attack_surface"] == "Developer"
    assert aws_card["exposure_vector"] == "Credential Leakage"
    assert len(aws_card["confidence_reasons"]) >= 2
    assert "AKIA" in aws_card["masked_value"]

    # Verify exposure chains
    chains = post_report_data["exposure_chains"]
    assert len(chains) >= 2
    aws_chain = next(c for c in chains if c["finding_type"] == "AWS_ACCESS_KEY_EXPOSURE")
    assert len(aws_chain["steps"]) == 3
    assert aws_chain["steps"][0]["stage"] == "Observation"
    assert aws_chain["steps"][1]["stage"] == "Potential Abuse"
    assert aws_chain["steps"][2]["stage"] == "Remediation"

    # 5. Query GET /report (verify it retrieves persisted snapshot)
    get_report_resp = await client.get(f"/api/v1/scan/{scan_id}/report")
    assert get_report_resp.status_code == 200
    get_report_data = get_report_resp.json()["data"]
    assert get_report_data["scan_id"] == scan_id
    assert get_report_data["receipt"]["exposure_score"] == receipt["exposure_score"]
    assert len(get_report_data["evidence_cards"]) == len(evidence_cards)

    # 6. Query GET /summary (Cyber Safety Receipt)
    summary_resp = await client.get(f"/api/v1/scan/{scan_id}/summary")
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()["data"]
    assert summary_data["scan_id"] == scan_id
    assert summary_data["exposure_score"] == receipt["exposure_score"]
    assert summary_data["risk_level"] == receipt["risk_level"]
    assert summary_data["total_findings"] == receipt["total_findings"]
    assert summary_data["safeshare_ready"] is True
