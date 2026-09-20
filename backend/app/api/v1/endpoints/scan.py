import uuid
from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db
from backend.app.schemas.response import APIResponse, success_response
from backend.app.schemas.scan import (
    ScanCreateResponseData,
    ScanFileData,
    ScanStatusResponseData,
)
from backend.app.services.scan_service import scan_service
from backend.app.services.storage_service import storage_service

router = APIRouter()


@router.post(
    "",
    response_model=APIResponse[ScanCreateResponseData],
    status_code=status.HTTP_201_CREATED,
    summary="Create Scan Session",
    description="Uploads a digital artifact to create a new scan session with strict security validation and SHA-256 fingerprinting.",
)
async def create_scan(
    request: Request,
    file: UploadFile = File(..., description="Digital artifact to scan (PNG, JPG, PDF, WEBP)"),
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ScanCreateResponseData]:
    request_id = getattr(request.state, "request_id", "unknown")
    scan_session = await scan_service.create_scan_session(db=db, upload_file=file)

    payload = ScanCreateResponseData(
        scan_id=scan_session.id,
        status=scan_session.status,
        file_id=scan_session.file.id,
        display_filename=scan_session.file.display_filename,
        file_size_bytes=scan_session.file.file_size_bytes,
        sha256_hash=scan_session.file.sha256_hash,
        created_at=scan_session.created_at,
    )
    return success_response(data=payload, request_id=request_id)


@router.get(
    "/{scan_id}",
    response_model=APIResponse[ScanStatusResponseData],
    status_code=status.HTTP_200_OK,
    summary="Get Scan Session Status",
    description="Retrieves the current status and file metadata of a scan session by UUID.",
)
async def get_scan_status(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ScanStatusResponseData]:
    request_id = getattr(request.state, "request_id", "unknown")
    scan_session = await scan_service.get_scan_session(db=db, scan_id=scan_id)

    file_data = ScanFileData(
        file_id=scan_session.file.id,
        stored_filename=scan_session.file.stored_filename,
        display_filename=scan_session.file.display_filename,
        mime_type=scan_session.file.mime_type,
        file_size_bytes=scan_session.file.file_size_bytes,
        sha256_hash=scan_session.file.sha256_hash,
        created_at=scan_session.file.created_at,
    )

    payload = ScanStatusResponseData(
        scan_id=scan_session.id,
        status=scan_session.status,
        created_at=scan_session.created_at,
        updated_at=scan_session.updated_at,
        file=file_data,
    )
    return success_response(data=payload, request_id=request_id)


@router.get(
    "/{scan_id}/preview",
    summary="Get Scan Artifact Image Preview",
    description="Streams the original upload artifact for visual verification and bounding box overlay in frontend canvas.",
)
async def get_scan_preview(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import FileResponse
    scan_session = await scan_service.get_scan_session(db=db, scan_id=scan_id)
    if not scan_session.file:
        from backend.app.core.exceptions import ResourceNotFoundError
        raise ResourceNotFoundError(f"File for scan '{scan_id}' not found")

    file_path = (storage_service.upload_dir / scan_session.file.stored_filename).resolve()
    if not file_path.exists() or not file_path.is_file():
        from backend.app.core.exceptions import ResourceNotFoundError
        raise ResourceNotFoundError("Artifact missing on disk")

    return FileResponse(
        path=str(file_path),
        media_type=scan_session.file.mime_type or "image/png",
        headers={
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )
