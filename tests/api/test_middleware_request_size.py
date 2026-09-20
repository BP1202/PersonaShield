"""
Tests for RequestSizeLimitMiddleware (Priority 4).
Verifies that requests exceeding 15 MB are rejected with HTTP 413 Payload Too Large
before the server reads the payload into memory.
"""
import pytest
from httpx import AsyncClient
from backend.app.core.config import settings


@pytest.mark.asyncio
class TestRequestSizeLimitMiddleware:
    async def test_request_exceeding_15mb_rejected_with_413(self, client: AsyncClient):
        """Requests declaring Content-Length > 15MB must immediately return HTTP 413."""
        oversized_content_length = settings.MAX_REQUEST_BODY_BYTES + 1024  # 15 MB + 1 KB

        headers = {
            "Content-Length": str(oversized_content_length),
            "Content-Type": "application/json",
        }

        resp = await client.post("/api/v1/scan", headers=headers, content=b"fake")
        assert resp.status_code == 413
        data = resp.json()
        assert data["success"] is False
        assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"
        assert "15 MB" in data["error"]["message"]
        assert "X-Request-ID" in resp.headers

    async def test_normal_request_within_limit_passes(self, client: AsyncClient):
        """Requests with normal body sizes must pass through middleware cleanly."""
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
