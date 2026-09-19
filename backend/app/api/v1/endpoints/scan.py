import uuid
from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db
from backend.app.schemas.scan import ScanCreateResponse, ScanStatusResponse
from backend.app.services.scan_service import scan_service

router = APIRouter()


@router.post(
    "",
    response_model=ScanCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Scan Session",
    description="Uploads a digital artifact to create a new scan session with strict security validation.",
)
async def create_scan(
    file: UploadFile = File(..., description="Digital artifact to scan (PNG, JPG, PDF, WEBP)"),
    db: AsyncSession = Depends(get_db),
) -> ScanCreateResponse:
    scan_session = await scan_service.create_scan_session(db=db, upload_file=file)
    return ScanCreateResponse(
        scan_id=scan_session.id,
        status=scan_session.status,
        file_id=scan_session.file_id,
        original_filename=scan_session.original_filename,
        file_size_bytes=scan_session.file_size_bytes,
        created_at=scan_session.created_at,
    )


@router.get(
    "/{scan_id}",
    response_model=ScanStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Scan Session Status",
    description="Retrieves the current status and metadata of a scan session by UUID.",
)
async def get_scan_status(
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ScanStatusResponse:
    scan_session = await scan_service.get_scan_session(db=db, scan_id=scan_id)
    return ScanStatusResponse(
        scan_id=scan_session.id,
        status=scan_session.status,
        original_filename=scan_session.original_filename,
        mime_type=scan_session.mime_type,
        file_size_bytes=scan_session.file_size_bytes,
        created_at=scan_session.created_at,
        updated_at=scan_session.updated_at,
    )
