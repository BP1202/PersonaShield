import uuid
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db
from backend.app.schemas.report import (
    CyberSafetyReceiptData,
    ReportResponseData,
)
from backend.app.schemas.response import APIResponse
from backend.app.services.report_service import report_service

router = APIRouter()


@router.post(
    "/{scan_id}/report",
    response_model=APIResponse[ReportResponseData],
    summary="Generate full Cybersecurity Intelligence Report",
    description="Compiles findings, Exposure Score, defensive exposure chains ('What Happens If You Share This?'), and evidence cards into an immutable report snapshot.",
)
async def generate_scan_report(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ReportResponseData]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    report_data = await report_service.generate_or_get_report(
        scan_id=scan_id, db=db, force_regenerate=True
    )
    return APIResponse(
        success=True,
        request_id=request_id,
        data=report_data,
        error=None,
    )


@router.get(
    "/{scan_id}/report",
    response_model=APIResponse[ReportResponseData],
    summary="Get Cybersecurity Intelligence Report",
    description="Retrieves the full Cybersecurity Intelligence Report including executive receipt, evidence cards, exposure chains, and SafeShare preview.",
)
async def get_scan_report(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[ReportResponseData]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    report_data = await report_service.get_report(scan_id=scan_id, db=db)
    return APIResponse(
        success=True,
        request_id=request_id,
        data=report_data,
        error=None,
    )


@router.get(
    "/{scan_id}/summary",
    response_model=APIResponse[CyberSafetyReceiptData],
    summary="Get Cyber Safety Receipt summary",
    description="Retrieves a concise Cyber Safety Receipt containing Exposure Score, threat category counts, and SafeShare redaction readiness.",
)
async def get_scan_summary_receipt(
    request: Request,
    scan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> APIResponse[CyberSafetyReceiptData]:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    receipt_data = await report_service.get_summary_receipt(scan_id=scan_id, db=db)
    return APIResponse(
        success=True,
        request_id=request_id,
        data=receipt_data,
        error=None,
    )
