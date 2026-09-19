import uuid
from typing import List, Optional
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.constants import ScanSessionStatus
from backend.app.core.exceptions import ResourceNotFoundError, SecurityValidationError
from backend.app.core.logging import logger
from backend.app.intelligence.exposure_engine import exposure_engine
from backend.app.intelligence.scoring import calculate_exposure_score
from backend.app.models.scan_finding import ScanFinding
from backend.app.models.scan_session import ScanSession
from backend.app.schemas.findings import (
    DetectionSummaryResponseData,
    ExposureScoreResponseData,
    FindingResponseData,
    ScoreCategoryItem,
)


class FindingsService:
    """
    Business service orchestrating exposure detection, score calculation, and findings persistence.
    """

    async def run_detection(
        self, scan_id: uuid.UUID, db: AsyncSession
    ) -> DetectionSummaryResponseData:
        """
        Executes cybersecurity exposure analysis across all extracted entities and OCR text.
        Persists evaluated findings into PostgreSQL scan_findings.
        """
        # 1. Fetch scan session with OCR result and extracted entities
        stmt = (
            select(ScanSession)
            .where(ScanSession.id == scan_id)
            .options(
                selectinload(ScanSession.ocr_result),
                selectinload(ScanSession.entities),
                selectinload(ScanSession.findings),
            )
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ResourceNotFoundError(f"Scan session {scan_id} not found")

        raw_text = session.ocr_result.raw_text if session.ocr_result else ""
        tokens = session.ocr_result.tokens if session.ocr_result else []
        entities = session.entities or []

        # 2. Evaluate exposures using ExposureEngine
        eval_result = exposure_engine.evaluate_scan(
            entities=entities,
            raw_text=raw_text,
            tokens=tokens,
        )

        # 3. Clear existing findings for this scan to allow clean idempotent re-evaluation
        await db.execute(
            delete(ScanFinding).where(ScanFinding.scan_session_id == scan_id)
        )

        # 4. Persist new findings
        persisted_findings: List[ScanFinding] = []
        for pf in eval_result.findings:
            new_finding = ScanFinding(
                id=uuid.uuid4(),
                scan_session_id=scan_id,
                entity_id=pf.entity_id,
                finding_type=pf.finding_type,
                category=pf.category,
                severity=pf.severity,
                confidence=pf.confidence,
                evidence=pf.evidence,
                recommendation=pf.recommendation,
            )
            db.add(new_finding)
            persisted_findings.append(new_finding)

        # Update session status
        session.status = ScanSessionStatus.COMPLETED
        await db.commit()

        logger.info(
            f"Exposure detection completed for scan {scan_id}: "
            f"{len(persisted_findings)} findings, score={eval_result.score_result.total_score} ({eval_result.score_result.risk_level})"
        )

        # 5. Build response
        finding_responses = [
            FindingResponseData.model_validate(f) for f in persisted_findings
        ]

        return DetectionSummaryResponseData(
            scan_id=scan_id,
            status=session.status.value,
            total_findings=len(persisted_findings),
            exposure_score=eval_result.score_result.total_score,
            risk_level=eval_result.score_result.risk_level,
            findings=finding_responses,
        )

    async def get_findings(
        self, scan_id: uuid.UUID, db: AsyncSession
    ) -> List[FindingResponseData]:
        """Retrieves all cybersecurity exposure findings for a scan session."""
        stmt = (
            select(ScanFinding)
            .where(ScanFinding.scan_session_id == scan_id)
            .order_by(ScanFinding.created_at.asc())
        )
        result = await db.execute(stmt)
        findings = result.scalars().all()

        if not findings:
            # Check if scan exists
            scan_stmt = select(ScanSession).where(ScanSession.id == scan_id)
            scan_result = await db.execute(scan_stmt)
            if not scan_result.scalar_one_or_none():
                raise ResourceNotFoundError(f"Scan session {scan_id} not found")

        return [FindingResponseData.model_validate(f) for f in findings]

    async def get_exposure_score(
        self, scan_id: uuid.UUID, db: AsyncSession
    ) -> ExposureScoreResponseData:
        """Calculates and returns the authoritative Exposure Score for a scan session."""
        # 1. Verify scan exists
        scan_stmt = select(ScanSession).where(ScanSession.id == scan_id)
        scan_result = await db.execute(scan_stmt)
        session = scan_result.scalar_one_or_none()
        if not session:
            raise ResourceNotFoundError(f"Scan session {scan_id} not found")

        # 2. Fetch findings
        stmt = select(ScanFinding).where(ScanFinding.scan_session_id == scan_id)
        result = await db.execute(stmt)
        findings = result.scalars().all()

        # 3. Calculate score
        score_res = calculate_exposure_score(findings)

        # 4. Format breakdown dictionary
        breakdown_dict = {}
        for cat, val in score_res.breakdown_by_category.items():
            breakdown_dict[cat] = ScoreCategoryItem(
                score_points=val["score_points"],
                findings_count=val["findings_count"],
            )

        return ExposureScoreResponseData(
            scan_id=scan_id,
            score=score_res.total_score,
            risk_level=score_res.risk_level,
            total_findings=len(findings),
            critical_count=score_res.severity_counts.get("CRITICAL", 0),
            high_count=score_res.severity_counts.get("HIGH", 0),
            medium_count=score_res.severity_counts.get("MEDIUM", 0),
            low_count=score_res.severity_counts.get("LOW", 0),
            breakdown=breakdown_dict,
        )


findings_service = FindingsService()
