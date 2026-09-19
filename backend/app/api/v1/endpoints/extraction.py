import uuid
from typing import List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db
from backend.app.schemas.extraction import (
    EntityResponseData,
    ExtractionSummaryResponseData,
)
from backend.app.schemas.response import APIResponse, success_response
from backend.app.services.extraction_service import extraction_service

router = APIRouter()


@router.post(
    "/{scan_id}/extract",
    response_model=APIResponse[ExtractionSummaryResponseData],
    status_code=status.HTTP_200_OK,
    summary="Execute OCR and Entity Extraction",
    description="Triggers the OpenCV preprocessing, EasyOCR extraction, Presidio, and deterministic regex entity detection pipeline.",
)
async def extract_scan_content(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ExtractionSummaryResponseData]:
    request_id = getattr(request.state, "request_id", "unknown")
    summary = await extraction_service.run_extraction(db=db, scan_id=scan_id)
    return success_response(data=summary, request_id=request_id)


@router.get(
    "/{scan_id}/entities",
    response_model=APIResponse[List[EntityResponseData]],
    status_code=status.HTTP_200_OK,
    summary="Get Extracted Sensitive Entities",
    description="Retrieves all detected sensitive entities for a scan session with confidence and bounding boxes.",
)
async def get_scan_entities(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[List[EntityResponseData]]:
    request_id = getattr(request.state, "request_id", "unknown")
    entities = await extraction_service.get_session_entities(db=db, scan_id=scan_id)
    return success_response(data=entities, request_id=request_id)
