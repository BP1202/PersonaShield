import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.exceptions import ResourceNotFoundError
from backend.app.core.logging import logger
from backend.app.intelligence.exposure_chain import build_exposure_chain
from backend.app.intelligence.scoring import calculate_exposure_score
from backend.app.models.scan_finding import ScanFinding
from backend.app.models.scan_report import ScanReport
from backend.app.models.scan_session import ScanSession
from backend.app.schemas.report import (
    CyberSafetyReceiptData,
    EvidenceCardData,
    ExposureChainData,
    ExposureChainStep,
    ReportResponseData,
)
from backend.app.services.findings_service import findings_service


class ReportService:
    """
    Business service compiling authoritative Cybersecurity Intelligence Reports
    and lightweight Cyber Safety Receipts.
    """

    async def generate_or_get_report(
        self, scan_id: uuid.UUID, db: AsyncSession, force_regenerate: bool = False
    ) -> ReportResponseData:
        # 1. Fetch scan session with findings and existing report
        stmt = (
            select(ScanSession)
            .where(ScanSession.id == scan_id)
            .options(
                selectinload(ScanSession.findings),
                selectinload(ScanSession.report),
                selectinload(ScanSession.file),
            )
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ResourceNotFoundError(f"Scan session {scan_id} not found")

        # If findings haven't been generated, run detection automatically
        findings: List[ScanFinding] = list(session.findings or [])
        if not findings:
            logger.info(f"No findings found for scan {scan_id}, running detection orchestrator...")
            await findings_service.run_detection(scan_id, db)
            # Re-fetch findings
            findings_stmt = (
                select(ScanFinding)
                .where(ScanFinding.scan_session_id == scan_id)
                .order_by(ScanFinding.created_at.asc())
            )
            findings_res = await db.execute(findings_stmt)
            findings = list(findings_res.scalars().all())

        # If cached report exists and not forcing regeneration, load from snapshot
        if session.report and not force_regenerate:
            try:
                cached_data = session.report.report_data
                if cached_data:
                    return ReportResponseData.model_validate(cached_data)
            except Exception as e:
                logger.warning(f"Failed to load cached report data for {scan_id}: {e}")

        # 2. Compute Exposure Score & Severity Counts
        score_res = calculate_exposure_score(findings)

        # 3. Categorize Threat Attack Surfaces
        threat_categories: Dict[str, int] = {}
        critical_count = 0
        high_count = 0
        medium_count = 0
        low_count = 0
        safeshare_ready = False

        for f in findings:
            surf = getattr(f, "attack_surface", "Privacy")
            threat_categories[surf] = threat_categories.get(surf, 0) + 1

            sev = getattr(f, "severity", "LOW")
            if sev == "CRITICAL":
                critical_count += 1
            elif sev == "HIGH":
                high_count += 1
            elif sev == "MEDIUM":
                medium_count += 1
            elif sev == "LOW":
                low_count += 1

            # Check if finding has spatial bounding box
            evidence = getattr(f, "evidence", {}) or {}
            bbox = evidence.get("bbox", [0, 0, 0, 0])
            if bbox and bbox != [0, 0, 0, 0]:
                safeshare_ready = True

        now_utc = datetime.now(timezone.utc)

        # 4. Construct Cyber Safety Receipt
        receipt = CyberSafetyReceiptData(
            scan_id=scan_id,
            exposure_score=score_res.total_score,
            risk_level=score_res.risk_level,
            total_findings=len(findings),
            files_scanned=1,
            critical_findings=critical_count,
            high_findings=high_count,
            medium_findings=medium_count,
            low_findings=low_count,
            safeshare_ready=safeshare_ready,
            threat_categories=threat_categories,
            generated_at=now_utc,
        )

        # 5. Build Evidence Cards
        evidence_cards: List[EvidenceCardData] = []
        for f in findings:
            ev = f.evidence or {}
            evidence_cards.append(
                EvidenceCardData(
                    id=f.id,
                    finding_type=f.finding_type,
                    category=f.category,
                    attack_surface=getattr(f, "attack_surface", "Privacy"),
                    exposure_vector=getattr(f, "exposure_vector", "Privacy Exposure"),
                    severity=f.severity,
                    confidence=f.confidence,
                    confidence_reasons=getattr(f, "confidence_reasons", []) or [],
                    masked_value=ev.get("masked_value", "****"),
                    bbox=ev.get("bbox", [0, 0, 0, 0]),
                    page_number=ev.get("page_number", 1),
                    recommendation=f.recommendation or {},
                )
            )

        # 6. Build Exposure Chains ("What Happens If You Share This?")
        unique_finding_types = list(dict.fromkeys(f.finding_type for f in findings))
        exposure_chains: List[ExposureChainData] = []
        for ft in unique_finding_types:
            chain = build_exposure_chain(ft)
            exposure_chains.append(
                ExposureChainData(
                    finding_type=chain.finding_type,
                    title=chain.title,
                    steps=[
                        ExposureChainStep(
                            step_number=s.step_number,
                            stage=s.stage,
                            description=s.description,
                        )
                        for s in chain.steps
                    ],
                )
            )

        report_id = uuid.uuid4()
        report_response = ReportResponseData(
            report_id=report_id,
            scan_id=scan_id,
            receipt=receipt,
            evidence_cards=evidence_cards,
            exposure_chains=exposure_chains,
            safeshare_available=safeshare_ready,
            safeshare_preview_cta="Generate a secure, redacted copy with SafeShare before sharing this artifact.",
        )

        # 7. Persist Report Snapshot to Database
        report_dict = report_response.model_dump(mode="json")
        if session.report:
            # Update existing report record
            session.report.exposure_score = score_res.total_score
            session.report.risk_level = score_res.risk_level
            session.report.total_findings = len(findings)
            session.report.severity_distribution = {
                "CRITICAL": critical_count,
                "HIGH": high_count,
                "MEDIUM": medium_count,
                "LOW": low_count,
            }
            session.report.threat_categories = threat_categories
            session.report.safeshare_available = safeshare_ready
            session.report.report_data = report_dict
            session.report.created_at = now_utc
        else:
            # Insert new report record
            new_report = ScanReport(
                id=report_id,
                scan_session_id=scan_id,
                exposure_score=score_res.total_score,
                risk_level=score_res.risk_level,
                total_findings=len(findings),
                severity_distribution={
                    "CRITICAL": critical_count,
                    "HIGH": high_count,
                    "MEDIUM": medium_count,
                    "LOW": low_count,
                },
                threat_categories=threat_categories,
                safeshare_available=safeshare_ready,
                report_data=report_dict,
                created_at=now_utc,
            )
            db.add(new_report)

        await db.commit()
        logger.info(f"Cybersecurity Intelligence Report compiled for scan {scan_id} (Score: {score_res.total_score})")

        return report_response

    async def get_report(
        self, scan_id: uuid.UUID, db: AsyncSession
    ) -> ReportResponseData:
        """Retrieves the full report, compiling if not already generated."""
        return await self.generate_or_get_report(scan_id, db, force_regenerate=False)

    async def get_summary_receipt(
        self, scan_id: uuid.UUID, db: AsyncSession
    ) -> CyberSafetyReceiptData:
        """Retrieves only the lightweight Cyber Safety Receipt."""
        report = await self.generate_or_get_report(scan_id, db, force_regenerate=False)
        return report.receipt


report_service = ReportService()
