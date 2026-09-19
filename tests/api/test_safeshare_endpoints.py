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
async def test_safeshare_endpoints_scan_not_found(client: AsyncClient):
    random_uuid = str(uuid.uuid4())

    post_resp = await client.post(f"/api/v1/scan/{random_uuid}/safeshare", json={})
    assert post_resp.status_code == 404
    assert post_resp.json()["success"] is False

    get_resp = await client.get(f"/api/v1/scan/{random_uuid}/safeshare")
    assert get_resp.status_code == 404
    assert get_resp.json()["success"] is False


@pytest.mark.asyncio
async def test_safeshare_download_not_found(client: AsyncClient):
    random_uuid = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/redaction/{random_uuid}/download")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_safeshare_empty_findings_produces_clean_image(client: AsyncClient):
    """Upload -> Extract (no secrets) -> Detect -> SafeShare. Output equals sanitized clean image."""
    # 1. Upload
    png_bytes = create_valid_png_bytes(200, 150)
    create_resp = await client.post(
        "/api/v1/scan", files={"file": ("clean.png", io.BytesIO(png_bytes), "image/png")}
    )
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    # 2. Extract (no secrets)
    mock_ocr = OcrExtractionResult(
        raw_text="Hello World no secrets here",
        normalized_text="Hello World no secrets here",
        tokens=[OcrToken(text="Hello", confidence=0.99, bbox=[10, 10, 60, 30], page_number=1)],
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

    # 4. POST /safeshare
    safeshare_resp = await client.post(f"/api/v1/scan/{scan_id}/safeshare", json={})
    assert safeshare_resp.status_code == 200
    safeshare_body = safeshare_resp.json()
    assert safeshare_body["success"] is True

    data = safeshare_body["data"]
    assert data["scan_id"] == scan_id
    assert data["total_redacted_regions"] == 0
    assert data["applied_findings_count"] == 0
    assert data["custom_regions_count"] == 0
    assert data["metadata_removed"] is True
    assert "download_url" in data
    redaction_id = data["redaction_id"]

    # 5. GET /scan/{scan_id}/safeshare
    get_meta_resp = await client.get(f"/api/v1/scan/{scan_id}/safeshare")
    assert get_meta_resp.status_code == 200
    get_meta_data = get_meta_resp.json()["data"]
    assert get_meta_data["redaction_id"] == redaction_id

    # 6. GET /redaction/{redaction_id}/download
    download_resp = await client.get(f"/api/v1/redaction/{redaction_id}/download")
    assert download_resp.status_code == 200
    assert download_resp.headers["content-type"] == "image/png"
    assert "attachment" in download_resp.headers.get("content-disposition", "")
    # Validate it's a valid PNG
    raw_png = download_resp.content
    with Image.open(io.BytesIO(raw_png)) as img:
        assert img.format == "PNG"
    # No EXIF in downloaded image
    with Image.open(io.BytesIO(raw_png)) as img:
        exif = img.getexif()
        assert len(exif) == 0


@pytest.mark.asyncio
async def test_safeshare_end_to_end_with_findings(client: AsyncClient):
    """Upload -> Extract -> Detect -> SafeShare. Verifies bboxes are redacted."""
    # 1. Upload
    png_bytes = create_valid_png_bytes(400, 300)
    create_resp = await client.post(
        "/api/v1/scan", files={"file": ("leaked.png", io.BytesIO(png_bytes), "image/png")}
    )
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    # 2. Extract with AWS key and Aadhaar
    mock_tokens = [
        OcrToken(text="AKIAIOSFODNN7EXAMPLE", confidence=0.99, bbox=[20, 20, 200, 50], page_number=1),
        OcrToken(text="3456 7890 1234", confidence=0.95, bbox=[20, 80, 150, 110], page_number=1),
    ]
    mock_ocr = OcrExtractionResult(
        raw_text="AKIAIOSFODNN7EXAMPLE\n3456 7890 1234",
        normalized_text="AKIAIOSFODNN7EXAMPLE\n3456 7890 1234",
        tokens=mock_tokens,
    )
    with patch(
        "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
        return_value=mock_ocr,
    ):
        await client.post(f"/api/v1/scan/{scan_id}/extract")

    # 3. Detect
    detect_resp = await client.post(f"/api/v1/scan/{scan_id}/detect")
    assert detect_resp.status_code == 200
    total = detect_resp.json()["data"]["total_findings"]
    assert total >= 2

    # 4. POST /safeshare — auto-redact all findings
    safeshare_resp = await client.post(f"/api/v1/scan/{scan_id}/safeshare", json={})
    assert safeshare_resp.status_code == 200
    data = safeshare_resp.json()["data"]
    assert data["applied_findings_count"] >= 2
    assert data["total_redacted_regions"] >= 2
    assert data["metadata_removed"] is True
    redaction_id = data["redaction_id"]

    # Verify redacted_regions include blackout for AWS key
    regions = data["redacted_regions"]
    aws_region = next(
        (r for r in regions if r.get("finding_type") == "AWS_ACCESS_KEY_EXPOSURE"), None
    )
    assert aws_region is not None
    assert aws_region["mode"] == "blackout"
    assert aws_region["source"] == "finding"

    # 5. Download and verify PNG validity + no EXIF
    download_resp = await client.get(f"/api/v1/redaction/{redaction_id}/download")
    assert download_resp.status_code == 200
    assert download_resp.headers["content-type"] == "image/png"
    raw_png = download_resp.content
    with Image.open(io.BytesIO(raw_png)) as img:
        assert img.format == "PNG"
        assert img.size == (400, 300)
        assert len(img.getexif()) == 0


@pytest.mark.asyncio
async def test_safeshare_user_custom_regions(client: AsyncClient):
    """Verifies user-drawn custom rectangular boxes are applied."""
    # 1. Upload + extract + detect (no findings needed for custom test)
    png_bytes = create_valid_png_bytes(400, 300)
    create_resp = await client.post(
        "/api/v1/scan", files={"file": ("doc.png", io.BytesIO(png_bytes), "image/png")}
    )
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    mock_ocr = OcrExtractionResult(
        raw_text="Hello custom region test",
        normalized_text="Hello custom region test",
        tokens=[OcrToken(text="Hello", confidence=0.95, bbox=[10, 10, 50, 30], page_number=1)],
    )
    with patch(
        "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
        return_value=mock_ocr,
    ):
        await client.post(f"/api/v1/scan/{scan_id}/extract")

    await client.post(f"/api/v1/scan/{scan_id}/detect")

    # 2. POST /safeshare with custom user-drawn boxes
    payload = {
        "custom_regions": [
            {"bbox": [50, 50, 150, 100], "mode": "pixelate", "label": "My Name Box"},
            {"bbox": [50, 150, 250, 200], "mode": "blackout", "label": "Account Number"},
        ]
    }
    resp = await client.post(f"/api/v1/scan/{scan_id}/safeshare", json=payload)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["custom_regions_count"] == 2

    regions = data["redacted_regions"]
    custom = [r for r in regions if r.get("source") == "custom"]
    assert len(custom) == 2
    assert custom[0]["mode"] == "pixelate"
    assert custom[0]["label"] == "My Name Box"
    assert custom[1]["mode"] == "blackout"
    assert custom[1]["label"] == "Account Number"
