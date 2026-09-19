"""
Tests for SafeShare download endpoint security (Check 1, Check 6).
Verifies: no internal ID leakage, invalid redaction_id → 404, ownership validation.
"""
import hashlib
import io
import uuid
from unittest.mock import patch
import pytest
from httpx import AsyncClient
from PIL import Image

from backend.app.ocr.engine import OcrExtractionResult, OcrToken


def _create_png_bytes(w: int = 200, h: int = 150) -> bytes:
    img = Image.new("RGB", (w, h), color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _upload_and_detect(client: AsyncClient) -> tuple[str, str]:
    """Helper: upload scan + extract + detect. Returns (scan_id, redaction_id)."""
    create_resp = await client.post(
        "/api/v1/scan",
        files={"file": ("test.png", io.BytesIO(_create_png_bytes()), "image/png")},
    )
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["data"]["scan_id"]

    mock_ocr = OcrExtractionResult(
        raw_text="clean text no secrets",
        normalized_text="clean text no secrets",
        tokens=[OcrToken(text="clean", confidence=0.99, bbox=[10, 10, 50, 30], page_number=1)],
    )
    with patch(
        "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
        return_value=mock_ocr,
    ):
        await client.post(f"/api/v1/scan/{scan_id}/extract")

    await client.post(f"/api/v1/scan/{scan_id}/detect")

    safeshare_resp = await client.post(f"/api/v1/scan/{scan_id}/safeshare", json={})
    assert safeshare_resp.status_code == 200
    redaction_id = safeshare_resp.json()["data"]["redaction_id"]
    return scan_id, redaction_id


@pytest.mark.asyncio
class TestDownloadSecurity:
    async def test_download_invalid_uuid_returns_404(self, client: AsyncClient):
        """Check 6: Non-existent redaction_id must return 404."""
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"/api/v1/redaction/{fake_id}/download")
        assert resp.status_code == 404

    async def test_download_valid_redaction_streams_png(self, client: AsyncClient):
        """Check 6: Valid redaction_id must stream PNG bytes with correct headers."""
        _, redaction_id = await _upload_and_detect(client)

        resp = await client.get(f"/api/v1/redaction/{redaction_id}/download")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/png"
        assert "attachment" in resp.headers.get("content-disposition", "")
        assert resp.headers.get("cache-control") == "no-store, no-cache, must-revalidate"

    async def test_download_returns_sha256_header(self, client: AsyncClient):
        """Check 7: X-SafeShare-SHA256 header must be present and valid."""
        _, redaction_id = await _upload_and_detect(client)

        resp = await client.get(f"/api/v1/redaction/{redaction_id}/download")
        assert resp.status_code == 200

        sha256_header = resp.headers.get("x-safeshare-sha256", "")
        assert len(sha256_header) == 64, "SHA-256 must be 64 hex characters"
        assert all(c in "0123456789abcdef" for c in sha256_header)

    async def test_downloaded_sha256_matches_content(self, client: AsyncClient):
        """Check 7: SHA-256 header must match the actual downloaded file bytes."""
        _, redaction_id = await _upload_and_detect(client)

        resp = await client.get(f"/api/v1/redaction/{redaction_id}/download")
        assert resp.status_code == 200

        declared_hash = resp.headers.get("x-safeshare-sha256", "")
        computed_hash = hashlib.sha256(resp.content).hexdigest()
        assert declared_hash == computed_hash, (
            "X-SafeShare-SHA256 header must match SHA-256 of downloaded body"
        )

    async def test_response_does_not_leak_original_filename(self, client: AsyncClient):
        """Check 1: Metadata endpoint must not return original_file_id or output_filename."""
        scan_id, _ = await _upload_and_detect(client)

        meta_resp = await client.get(f"/api/v1/scan/{scan_id}/safeshare")
        assert meta_resp.status_code == 200
        data = meta_resp.json()["data"]

        # These fields must NOT be present in the public response
        assert "original_file_id" not in data, "original_file_id must not be in public response"
        assert "output_filename" not in data, "output_filename must not be in public response"
        assert "scan_id" not in data, "scan_id must not be in public response"

        # These fields MUST be present
        assert "redaction_id" in data
        assert "download_url" in data
        assert "total_redacted_regions" in data
        assert "metadata_removed" in data

    async def test_response_does_not_leak_original_filename_on_generate(self, client: AsyncClient):
        """Check 1: Generate endpoint response must not contain internal identifiers."""
        create_resp = await client.post(
            "/api/v1/scan",
            files={"file": ("secret.png", io.BytesIO(_create_png_bytes()), "image/png")},
        )
        assert create_resp.status_code == 201
        scan_id = create_resp.json()["data"]["scan_id"]

        mock_ocr = OcrExtractionResult(
            raw_text="no secrets",
            normalized_text="no secrets",
            tokens=[OcrToken(text="no", confidence=0.99, bbox=[5, 5, 20, 15], page_number=1)],
        )
        with patch(
            "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
            return_value=mock_ocr,
        ):
            await client.post(f"/api/v1/scan/{scan_id}/extract")

        await client.post(f"/api/v1/scan/{scan_id}/detect")

        gen_resp = await client.post(f"/api/v1/scan/{scan_id}/safeshare", json={})
        assert gen_resp.status_code == 200
        data = gen_resp.json()["data"]

        assert "original_file_id" not in data
        assert "output_filename" not in data
        assert "scan_id" not in data

    async def test_download_content_is_valid_png(self, client: AsyncClient):
        """Check 3: Downloaded artifact must be a valid PNG with correct magic bytes."""
        _, redaction_id = await _upload_and_detect(client)

        resp = await client.get(f"/api/v1/redaction/{redaction_id}/download")
        assert resp.status_code == 200

        png_magic = b"\x89PNG\r\n\x1a\n"
        assert resp.content[:8] == png_magic, "Downloaded artifact must be a valid PNG"

        with Image.open(io.BytesIO(resp.content)) as img:
            assert img.format == "PNG"

    async def test_output_sha256_in_generate_response(self, client: AsyncClient):
        """Check 7: output_sha256 must be returned in the generate response."""
        create_resp = await client.post(
            "/api/v1/scan",
            files={"file": ("doc.png", io.BytesIO(_create_png_bytes()), "image/png")},
        )
        scan_id = create_resp.json()["data"]["scan_id"]

        mock_ocr = OcrExtractionResult(
            raw_text="test",
            normalized_text="test",
            tokens=[OcrToken(text="test", confidence=0.9, bbox=[10, 10, 40, 25], page_number=1)],
        )
        with patch(
            "backend.app.services.extraction_service.ocr_engine.extract_from_pages",
            return_value=mock_ocr,
        ):
            await client.post(f"/api/v1/scan/{scan_id}/extract")

        await client.post(f"/api/v1/scan/{scan_id}/detect")

        gen_resp = await client.post(f"/api/v1/scan/{scan_id}/safeshare", json={})
        assert gen_resp.status_code == 200
        data = gen_resp.json()["data"]

        assert "output_sha256" in data
        sha256 = data["output_sha256"]
        assert sha256 is not None
        assert len(sha256) == 64
        assert all(c in "0123456789abcdef" for c in sha256)
