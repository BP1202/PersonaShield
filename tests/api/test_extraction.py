import io
import uuid
from unittest.mock import patch
import pytest
from httpx import AsyncClient
from PIL import Image

from backend.app.ocr.engine import OcrExtractionResult, OcrToken


def create_valid_png_bytes(width: int = 300, height: int = 150) -> bytes:
    """Helper generating valid PNG file bytes."""
    img = Image.new("RGB", (width, height), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_extract_scan_not_found(client: AsyncClient):
    """Verify 404 when extracting from a non-existent scan."""
    random_uuid = str(uuid.uuid4())
    response = await client.post(f"/api/v1/scan/{random_uuid}/extract")
    assert response.status_code == 404

    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_entities_scan_not_found(client: AsyncClient):
    """Verify 404 when querying entities from a non-existent scan."""
    random_uuid = str(uuid.uuid4())
    response = await client.get(f"/api/v1/scan/{random_uuid}/entities")
    assert response.status_code == 404

    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"


@pytest.mark.asyncio
async def test_extract_and_get_entities_success(client: AsyncClient):
    """Verify end-to-end extraction and entity querying with mock OCR tokens."""
    # 1. Upload scan
    png_bytes = create_valid_png_bytes()
    files = {
        "file": ("credential_leak.png", io.BytesIO(png_bytes), "image/png"),
    }
    create_resp = await client.post("/api/v1/scan", files=files)
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    # 2. Mock OCR engine to return deterministic tokens with an AWS key and PAN number
    mock_tokens = [
        OcrToken(
            text="AWS_KEY:",
            confidence=0.99,
            bbox=[10, 10, 80, 30],
            page_number=1,
        ),
        OcrToken(
            text="AKIAIOSFODNN7EXAMPLE",
            confidence=0.99,
            bbox=[90, 10, 250, 30],
            page_number=1,
        ),
        OcrToken(
            text="PAN:",
            confidence=0.98,
            bbox=[10, 40, 50, 60],
            page_number=1,
        ),
        OcrToken(
            text="ABCDE1234F",
            confidence=0.98,
            bbox=[60, 40, 160, 60],
            page_number=1,
        ),
    ]
    mock_ocr_result = OcrExtractionResult(
        raw_text="AWS_KEY: AKIAIOSFODNN7EXAMPLE\nPAN: ABCDE1234F",
        normalized_text="AWS_KEY: AKIAIOSFODNN7EXAMPLE\nPAN: ABCDE1234F",
        tokens=mock_tokens,
    )

    with patch(
        "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
        return_value=mock_ocr_result,
    ):
        extract_resp = await client.post(f"/api/v1/scan/{scan_id}/extract")

    assert extract_resp.status_code == 200
    extract_body = extract_resp.json()
    assert extract_body["success"] is True

    summary = extract_body["data"]
    assert summary["scan_id"] == scan_id
    assert summary["status"] == "COMPLETED"
    assert summary["total_entities"] >= 2
    assert summary["total_tokens"] == 4
    assert summary["entities_by_category"]["CREDENTIAL"] >= 1
    assert summary["entities_by_category"]["IDENTITY"] >= 1

    # 3. Query GET /entities endpoint
    entities_resp = await client.get(f"/api/v1/scan/{scan_id}/entities")
    assert entities_resp.status_code == 200
    entities_body = entities_resp.json()
    assert entities_body["success"] is True

    entities_list = entities_body["data"]
    assert len(entities_list) >= 2
    types_found = [e["entity_type"] for e in entities_list]
    assert "AWS_ACCESS_KEY" in types_found
    assert "PAN_NUMBER" in types_found

    aws_entity = next(
        (e for e in entities_list if e["entity_type"] == "AWS_ACCESS_KEY"), None
    )
    assert aws_entity is not None
    assert aws_entity["category"] == "CREDENTIAL"
    assert aws_entity["text_snippet"] == "AKIAIOSFODNN7EXAMPLE"
    assert aws_entity["bbox"] == [90, 10, 250, 30]

    pan_entity = next(
        (e for e in entities_list if e["entity_type"] == "PAN_NUMBER"), None
    )
    assert pan_entity is not None
    assert pan_entity["category"] == "IDENTITY"
    assert pan_entity["text_snippet"] == "ABCDE1234F"
    assert pan_entity["bbox"] == [60, 40, 160, 60]


@pytest.mark.asyncio
async def test_extract_empty_or_clean_image(client: AsyncClient):
    """Verify extraction on an image with no sensitive entities returns 0 entities cleanly."""
    png_bytes = create_valid_png_bytes()
    files = {
        "file": ("clean_doc.png", io.BytesIO(png_bytes), "image/png"),
    }
    create_resp = await client.post("/api/v1/scan", files=files)
    scan_id = create_resp.json()["data"]["scan_id"]

    mock_ocr_result = OcrExtractionResult(
        raw_text="Quarterly Team All Hands Agenda",
        normalized_text="Quarterly Team All Hands Agenda",
        tokens=[
            OcrToken(
                text="Quarterly Team All Hands Agenda",
                confidence=0.95,
                bbox=[10, 10, 200, 30],
                page_number=1,
            )
        ],
    )

    with patch(
        "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
        return_value=mock_ocr_result,
    ):
        extract_resp = await client.post(f"/api/v1/scan/{scan_id}/extract")

    assert extract_resp.status_code == 200
    summary = extract_resp.json()["data"]
    assert summary["total_entities"] == 0
    assert summary["entities_by_category"] == {}
