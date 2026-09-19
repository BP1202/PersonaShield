import uuid
from fastapi import APIRouter, Depends, Request
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
        "Automatically redacts all detected findings using stored bounding box coordinates — "
        "never re-runs OCR. "
        "Supports user-defined custom rectangular selection boxes and per-finding mode overrides. "
        "Strips all EXIF, GPS, and camera metadata via full image reconstruction. "
        "Saves output as a new UUID-named PNG — original upload is never overwritten or returned."
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
        "Retrieves metadata for the most recently generated SafeShare artifact. "
        "Returns only the opaque redaction_id and download URL. "
        "No original upload path, filename, or internal file IDs are exposed."
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
        "Ownership is validated internally via database relationship — "
        "no caller-supplied scan_id is trusted. "
        "All EXIF and camera metadata is stripped. "
        "The response is served with Content-Disposition: attachment for safe download. "
        "X-SafeShare-SHA256 header contains the SHA-256 integrity fingerprint for verification."
    ),
    responses={
        200: {
            "content": {"image/png": {}},
            "description": "Sanitized PNG streamed for download",
        }
    },
)
async def download_safeshare_artifact(
    redaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Check 6: redaction_id is validated against DB records.
    Ownership verified via scan_session_id relationship — no attacker-controlled scan_id.
    Streams only the sanitized artifact; original upload path is never exposed.
    """
    png_bytes, sha256_hash = await safeshare_service.get_redaction_artifact_bytes(
        db=db, redaction_id=redaction_id
    )

    headers = {
        "Content-Disposition": 'attachment; filename="SafeShare_sanitized.png"',
        "Content-Length": str(len(png_bytes)),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
    }

    if sha256_hash:
        headers["X-SafeShare-SHA256"] = sha256_hash

    return StreamingResponse(
        content=iter([png_bytes]),
        media_type="image/png",
        headers=headers,
    )
