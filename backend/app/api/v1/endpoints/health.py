from datetime import datetime, timezone
from fastapi import APIRouter, status

from backend.app.core.config import settings
from backend.app.core.database import check_db_connection
from backend.app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns high-level system and database health status without disclosing sensitive system internals.",
)
async def get_health() -> HealthResponse:
    db_ok = await check_db_connection()
    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        database="healthy" if db_ok else "unhealthy",
        version=settings.APP_VERSION,
        timestamp=datetime.now(timezone.utc),
    )
