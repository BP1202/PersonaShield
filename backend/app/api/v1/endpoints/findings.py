import uuid
from typing import List
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db
from backend.app.schemas.findings import (
    DetectionSummaryResponseData,
    ExposureScoreResponseData,
    FindingResponseData,
)
from backend.app.schemas.response import APIResponse
from backend.app.services.findings_service import findings_service

router = APIRouter()


@router.post(
    "/{scan_id}/detect",
    response_model=APIResponse[DetectionSummaryResponseData],
    summary="Run exposure detection engine on a scan",
    description="Analyzes extracted OCR entities and text to identify cybersecurity risks, calculate Exposure Score, and formulate remediation plans.",
)
async def detect_exposures(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[DetectionSummaryResponseData]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    summary = await findings_service.run_detection(scan_id, db)
    return APIResponse(
        success=True,
        request_id=request_id,
        data=summary,
        error=None,
    )


@router.get(
    "/{scan_id}/findings",
    response_model=APIResponse[List[FindingResponseData]],
    summary="Get cybersecurity exposure findings",
    description="Retrieves all evaluated cybersecurity findings with bounding boxes, masked values, and remediation playbooks.",
)
async def get_scan_findings(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[List[FindingResponseData]]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    findings = await findings_service.get_findings(scan_id, db)
    return APIResponse(
        success=True,
        request_id=request_id,
        data=findings,
        error=None,
    )


@router.get(
    "/{scan_id}/score",
    response_model=APIResponse[ExposureScoreResponseData],
    summary="Get Exposure Score summary",
    description="Retrieves the overall 0-100 Exposure Score, risk level tier, severity counts, and category breakdown.",
)
async def get_scan_exposure_score(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ExposureScoreResponseData]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    score_data = await findings_service.get_exposure_score(scan_id, db)
    return APIResponse(
        success=True,
        request_id=request_id,
        data=score_data,
        error=None,
    )
