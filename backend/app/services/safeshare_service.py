import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.exceptions import ResourceNotFoundError, DatabaseOperationError
from backend.app.core.logging import logger
from backend.app.models.scan_file import ScanFile
from backend.app.models.scan_finding import ScanFinding
from backend.app.models.scan_redaction import ScanRedaction
from backend.app.models.scan_session import ScanSession
from backend.app.redaction.engine import safeshare_engine
from backend.app.schemas.safeshare import (
    CustomRedactionBox,
    SafeShareResponseData,
)
from backend.app.services.storage_service import StorageService, storage_service


class SafeShareService:
    """
    Orchestrates SafeShare privacy-preserving artifact generation:
    1. Loads original image bytes from disk.
    2. Retrieves pre-computed bounding boxes from scan_findings.
    3. Runs the RedactionEngine (never re-runs OCR).
    4. Saves sanitized PNG with a new UUID filename.
    5. Persists ScanRedaction metadata to the database.
    6. Removes failed artifacts on error.
    """

    def __init__(self, storage: StorageService = storage_service):
        self.storage = storage

    async def generate_safeshare(
        self,
        db: AsyncSession,
        scan_id: uuid.UUID,
        selected_finding_ids: Optional[List[uuid.UUID]] = None,
        custom_regions: Optional[List[CustomRedactionBox]] = None,
        override_modes: Optional[Dict[str, str]] = None,
        blur_intensity: Optional[int] = 25,
    ) -> SafeShareResponseData:
        """
        Generates a sanitized SafeShare artifact for the given scan session.
        Each call creates a new output artifact with a fresh UUID filename.
        """
        # 1. Retrieve scan session with file and findings
        stmt = (
            select(ScanSession)
            .where(ScanSession.id == scan_id)
            .options(
                selectinload(ScanSession.file),
                selectinload(ScanSession.findings),
            )
        )
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()

        if not session or not session.file:
            raise ResourceNotFoundError(f"Scan session '{scan_id}' not found")

        scan_file: ScanFile = session.file
        findings: List[ScanFinding] = list(session.findings or [])

        # 2. Read original image bytes from disk
        original_path: Path = self.storage.upload_dir / scan_file.stored_filename
        if not original_path.exists():
            raise ResourceNotFoundError(
                f"Original artifact for scan '{scan_id}' is missing on disk"
            )

        image_bytes = original_path.read_bytes()

        # 3. Serialize findings for engine consumption
        serialized_findings = []
        for f in findings:
            serialized_findings.append({
                "id": str(f.id),
                "finding_type": f.finding_type,
                "evidence": f.evidence or {},
            })

        # 4. Serialize custom regions
        serialized_custom = None
        if custom_regions:
            serialized_custom = [
                {
                    "bbox": box.bbox,
                    "mode": box.mode or "blur",
                    "label": box.label,
                }
                for box in custom_regions
            ]

        # 5. Normalize selected_finding_ids to str set
        str_selected_ids = (
            [str(fid) for fid in selected_finding_ids]
            if selected_finding_ids is not None
            else None
        )

        # 6. Run SafeShare Redaction Engine
        sanitized_bytes, applied_regions = safeshare_engine.redact(
            image_bytes=image_bytes,
            findings=serialized_findings,
            selected_finding_ids=str_selected_ids,
            custom_regions=serialized_custom,
            override_modes=override_modes,
            blur_kernel=blur_intensity or 25,
        )

        # 7. Persist sanitized PNG to disk with a new UUID filename
        output_filename = f"safeshare_{uuid.uuid4()}.png"
        output_path = self.storage.upload_dir / output_filename

        try:
            output_path.write_bytes(sanitized_bytes)
            logger.info(
                f"SafeShare artifact written: {output_filename} ({len(sanitized_bytes)} bytes)"
            )
        except OSError as e:
            raise DatabaseOperationError(f"Failed to write SafeShare artifact: {e}")

        # 8. Persist ScanRedaction database record
        applied_findings_count = sum(1 for r in applied_regions if r.get("source") == "finding")
        custom_count = sum(1 for r in applied_regions if r.get("source") == "custom")

        redaction_record = ScanRedaction(
            id=uuid.uuid4(),
            scan_session_id=scan_id,
            original_file_id=scan_file.id,
            output_filename=output_filename,
            redacted_regions=applied_regions,
            metadata_removed=True,
            created_at=datetime.now(timezone.utc),
        )

        try:
            db.add(redaction_record)
            await db.commit()
            await db.refresh(redaction_record)
        except Exception as e:
            # Cleanup orphan artifact if commit fails
            if output_path.exists():
                try:
                    output_path.unlink()
                except OSError:
                    pass
            raise DatabaseOperationError(f"Failed to persist SafeShare record: {e}")

        return SafeShareResponseData(
            redaction_id=redaction_record.id,
            scan_id=scan_id,
            original_file_id=scan_file.id,
            output_filename=output_filename,
            download_url=f"/api/v1/redaction/{redaction_record.id}/download",
            total_redacted_regions=len(applied_regions),
            suggested_findings_count=len(findings),
            applied_findings_count=applied_findings_count,
            custom_regions_count=custom_count,
            redacted_regions=applied_regions,
            metadata_removed=True,
            created_at=redaction_record.created_at,
        )

    async def get_safeshare_metadata(
        self, db: AsyncSession, scan_id: uuid.UUID
    ) -> SafeShareResponseData:
        """
        Retrieves metadata for the most recent SafeShare artifact of a scan session.
        """
        # Verify scan session exists
        session_stmt = select(ScanSession).where(ScanSession.id == scan_id)
        result = await db.execute(session_stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ResourceNotFoundError(f"Scan session '{scan_id}' not found")

        # Load the most recently created redaction for this scan
        stmt = (
            select(ScanRedaction)
            .where(ScanRedaction.scan_session_id == scan_id)
            .order_by(ScanRedaction.created_at.desc())
        )
        result = await db.execute(stmt)
        redaction = result.scalars().first()

        if not redaction:
            raise ResourceNotFoundError(
                f"No SafeShare artifact found for scan '{scan_id}'. "
                f"Run POST /api/v1/scan/{scan_id}/safeshare to generate one."
            )

        applied = redaction.redacted_regions or []
        applied_findings_count = sum(1 for r in applied if r.get("source") == "finding")
        custom_count = sum(1 for r in applied if r.get("source") == "custom")
        total_findings = 0
        if session.file:
            findings_stmt = select(ScanFinding).where(ScanFinding.scan_session_id == scan_id)
            fr = await db.execute(findings_stmt)
            total_findings = len(list(fr.scalars().all()))

        return SafeShareResponseData(
            redaction_id=redaction.id,
            scan_id=scan_id,
            original_file_id=redaction.original_file_id,
            output_filename=redaction.output_filename,
            download_url=f"/api/v1/redaction/{redaction.id}/download",
            total_redacted_regions=len(applied),
            suggested_findings_count=total_findings,
            applied_findings_count=applied_findings_count,
            custom_regions_count=custom_count,
            redacted_regions=applied,
            metadata_removed=redaction.metadata_removed,
            created_at=redaction.created_at,
        )

    async def get_redaction_artifact_bytes(
        self, db: AsyncSession, redaction_id: uuid.UUID
    ) -> tuple[bytes, str]:
        """
        Retrieves raw bytes of a SafeShare sanitized artifact for streaming download.
        Returns (png_bytes, output_filename).
        """
        stmt = select(ScanRedaction).where(ScanRedaction.id == redaction_id)
        result = await db.execute(stmt)
        redaction = result.scalar_one_or_none()

        if not redaction:
            raise ResourceNotFoundError(f"SafeShare artifact '{redaction_id}' not found")

        artifact_path = self.storage.upload_dir / redaction.output_filename
        if not artifact_path.exists():
            raise ResourceNotFoundError(
                f"SafeShare artifact file for redaction '{redaction_id}' is missing on disk"
            )

        return artifact_path.read_bytes(), redaction.output_filename


safeshare_service = SafeShareService()
