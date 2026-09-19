import uuid
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db
from backend.app.schemas.response import APIResponse
from backend.app.schemas.safeshare import (
    SafeShareGenerateRequest,
    SafeShareResponseData,
)
from backend.app.services.safeshare_service import safeshare_service

router = APIRouter()


@router.post(
    "/{scan_id}/safeshare",
    response_model=APIResponse[SafeShareResponseData],
    summary="Generate SafeShare sanitized artifact",
    description=(
        "Generates a privacy-preserving sanitized copy of the uploaded artifact. "
        "Automatically redacts all detected findings using bounding box coordinates. "
        "Supports user-defined custom rectangular selection boxes and per-finding mode overrides. "
        "Strips all EXIF metadata. Saves output as a new UUID-named PNG — original is never overwritten."
    ),
)
async def generate_safeshare(
    request: Request,
    scan_id: uuid.UUID,
    body: SafeShareGenerateRequest = SafeShareGenerateRequest(),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[SafeShareResponseData]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    data = await safeshare_service.generate_safeshare(
        db=db,
        scan_id=scan_id,
        selected_finding_ids=body.selected_finding_ids,
        custom_regions=body.custom_regions,
        override_modes=body.override_modes,
        blur_intensity=body.blur_intensity,
    )

    return APIResponse(
        success=True,
        request_id=request_id,
        data=data,
        error=None,
    )


@router.get(
    "/{scan_id}/safeshare",
    response_model=APIResponse[SafeShareResponseData],
    summary="Get SafeShare artifact metadata",
    description=(
        "Retrieves metadata for the most recently generated SafeShare artifact of a scan session, "
        "including applied redaction regions, download URL, and privacy status."
    ),
)
async def get_safeshare_metadata(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[SafeShareResponseData]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    data = await safeshare_service.get_safeshare_metadata(db=db, scan_id=scan_id)

    return APIResponse(
        success=True,
        request_id=request_id,
        data=data,
        error=None,
    )


# Separate router for redaction download — mounted at /redaction prefix
download_router = APIRouter()


@download_router.get(
    "/{redaction_id}/download",
    summary="Download SafeShare sanitized PNG",
    description=(
        "Streams the sanitized, privacy-preserving PNG artifact. "
        "All EXIF and camera metadata is stripped. "
        "The response is served with Content-Disposition: attachment for safe download."
    ),
    responses={
        200: {
            "content": {"image/png": {}},
            "description": "Sanitized PNG file streamed for download",
        }
    },
)
async def download_safeshare_artifact(
    redaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    png_bytes, output_filename = await safeshare_service.get_redaction_artifact_bytes(
        db=db, redaction_id=redaction_id
    )

    return StreamingResponse(
        content=iter([png_bytes]),
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="SafeShare_sanitized.png"',
            "Content-Length": str(len(png_bytes)),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
        },
    )
