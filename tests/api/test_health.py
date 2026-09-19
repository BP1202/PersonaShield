import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_healthy(client: AsyncClient, monkeypatch):
    async def mock_check_db_healthy():
        return True

    monkeypatch.setattr(
        "backend.app.api.v1.endpoints.health.check_db_connection",
        mock_check_db_healthy,
    )

    response = await client.get("/api/v1/health")
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert "request_id" in body

    data = body["data"]
    assert data["status"] == "healthy"
    assert data["database"] == "healthy"
    assert data["service"] == "backend"

    # Verify version is stripped (Fix 6)
    assert "version" not in data
    assert "version" not in body

    # Verify UUID Request ID header is present
    assert "x-request-id" in response.headers
    request_id = response.headers["x-request-id"]
    uuid.UUID(request_id)

    # Security check: verify no secrets or internal db URLs leaked
    content_str = response.text.lower()
    assert "password" not in content_str
    assert "secret" not in content_str
    assert "postgres:" not in content_str


@pytest.mark.asyncio
async def test_health_endpoint_degraded(client: AsyncClient, monkeypatch):
    async def mock_check_db_unhealthy():
        return False

    monkeypatch.setattr(
        "backend.app.api.v1.endpoints.health.check_db_connection",
        mock_check_db_unhealthy,
    )

    response = await client.get("/api/v1/health")
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "degraded"
    assert body["data"]["database"] == "unhealthy"
