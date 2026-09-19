import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "version" in data
    assert "timestamp" in data

    # Verify UUID Request ID header is present
    assert "x-request-id" in response.headers
    request_id = response.headers["x-request-id"]
    # Check that it's a valid UUID
    uuid.UUID(request_id)

    # Security check: verify no secrets or internal db URLs leaked in response
    content_str = response.text.lower()
    assert "password" not in content_str
    assert "secret" not in content_str
    assert "postgres:" not in content_str
