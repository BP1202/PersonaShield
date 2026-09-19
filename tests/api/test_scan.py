import io
import uuid
import pytest
from httpx import AsyncClient

# Valid sample file bytes with proper magic signatures
VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
)
VALID_PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
VALID_JPEG_BYTES = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb"


@pytest.mark.asyncio
async def test_create_scan_valid_png(client: AsyncClient):
    files = {
        "file": ("screenshot.png", io.BytesIO(VALID_PNG_BYTES), "image/png"),
    }
    response = await client.post("/api/v1/scan", files=files)
    assert response.status_code == 201

    data = response.json()
    assert "scan_id" in data
    assert data["status"] == "PENDING"
    assert "file_id" in data
    assert data["original_filename"] == "screenshot.png"
    assert data["file_size_bytes"] == len(VALID_PNG_BYTES)
    assert "x-request-id" in response.headers


@pytest.mark.asyncio
async def test_create_scan_valid_pdf(client: AsyncClient):
    files = {
        "file": ("document.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf"),
    }
    response = await client.post("/api/v1/scan", files=files)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "PENDING"


@pytest.mark.asyncio
async def test_reject_executable_upload(client: AsyncClient):
    files = {
        "file": ("malware.exe", io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00"), "application/octet-stream"),
    }
    response = await client.post("/api/v1/scan", files=files)
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "error_code" in data
    assert "request_id" in data


@pytest.mark.asyncio
async def test_reject_double_extension(client: AsyncClient):
    files = {
        "file": ("report.pdf.exe", io.BytesIO(VALID_PDF_BYTES), "application/pdf"),
    }
    response = await client.post("/api/v1/scan", files=files)
    assert response.status_code == 400
    assert "double extension" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reject_hidden_file(client: AsyncClient):
    files = {
        "file": (".secret.png", io.BytesIO(VALID_PNG_BYTES), "image/png"),
    }
    response = await client.post("/api/v1/scan", files=files)
    assert response.status_code == 400
    assert "hidden" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reject_magic_signature_spoof(client: AsyncClient):
    # Claims to be PNG, but payload is plain text
    fake_png = b"Plain text file pretending to be image"
    files = {
        "file": ("fake.png", io.BytesIO(fake_png), "image/png"),
    }
    response = await client.post("/api/v1/scan", files=files)
    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reject_empty_file(client: AsyncClient):
    files = {
        "file": ("empty.png", io.BytesIO(b""), "image/png"),
    }
    response = await client.post("/api/v1/scan", files=files)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_scan_session_status(client: AsyncClient):
    # First, create a scan session
    files = {
        "file": ("photo.jpg", io.BytesIO(VALID_JPEG_BYTES), "image/jpeg"),
    }
    create_resp = await client.post("/api/v1/scan", files=files)
    assert create_resp.status_code == 201
    scan_id = create_resp.json()["scan_id"]

    # Query status
    status_resp = await client.get(f"/api/v1/scan/{scan_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["scan_id"] == scan_id
    assert data["status"] == "PENDING"
    assert data["original_filename"] == "photo.jpg"
    assert data["mime_type"] == "image/jpeg"
    assert data["file_size_bytes"] == len(VALID_JPEG_BYTES)


@pytest.mark.asyncio
async def test_get_scan_session_not_found(client: AsyncClient):
    random_uuid = str(uuid.uuid4())
    response = await client.get(f"/api/v1/scan/{random_uuid}")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_get_scan_session_invalid_uuid(client: AsyncClient):
    response = await client.get("/api/v1/scan/invalid-uuid-string")
    assert response.status_code == 422
