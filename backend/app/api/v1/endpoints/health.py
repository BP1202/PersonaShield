from fastapi import APIRouter, Request, status

from backend.app.core.database import check_db_connection
from backend.app.schemas.health import HealthData
from backend.app.schemas.response import APIResponse, success_response

router = APIRouter()


@router.get(
    "/health",
    response_model=APIResponse[HealthData],
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns high-level system and database health status without disclosing sensitive system internals.",
)
async def get_health(request: Request) -> APIResponse[HealthData]:
    db_ok = await check_db_connection()
    request_id = getattr(request.state, "request_id", "unknown")

    payload = HealthData(
        status="healthy" if db_ok else "degraded",
        database="healthy" if db_ok else "unhealthy",
        service="backend",
    )
    return success_response(data=payload, request_id=request_id)
