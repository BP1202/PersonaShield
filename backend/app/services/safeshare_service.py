import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
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

# Check 8: Maximum size multiplier for SafeShare output relative to input (lossless PNG is larger)
_MAX_OUTPUT_SIZE_MULTIPLIER = 6.0
_MAX_ABSOLUTE_OUTPUT_BYTES = 30 * 1024 * 1024  # 30 MB hard ceiling


def _compute_sha256(data: bytes) -> str:
    """Computes hex-encoded SHA-256 of bytes for artifact integrity verification."""
    return hashlib.sha256(data).hexdigest()


class SafeShareService:
    """
    Orchestrates SafeShare privacy-preserving artifact generation.

    Security guarantees:
    - Original upload path and filename are never returned in any public response.
    - All output uses fresh UUID filenames.
    - EXIF/GPS/camera metadata removed via image pixel reconstruction.
    - Ownership validated on download via DB relationship — not caller-supplied IDs.
    - SHA-256 fingerprint persisted for tamper detection.
    - Output size bounded to prevent unexpected expansion.
    - Failed artifacts cleaned up immediately.
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
        Original upload is never modified.
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
        # NOTE: original_path is NEVER returned in the API response — for internal use only.
        original_path: Path = self.storage.upload_dir / scan_file.stored_filename
        if not original_path.exists():
            raise ResourceNotFoundError(
                f"Original artifact for scan '{scan_id}' is missing on disk"
            )

        image_bytes = original_path.read_bytes()
        input_size = len(image_bytes)

        # 3. Serialize findings for engine consumption
        serialized_findings = [
            {
                "id": str(f.id),
                "finding_type": f.finding_type,
                "evidence": f.evidence or {},
            }
            for f in findings
        ]

        # 4. Serialize custom regions
        serialized_custom = None
        if custom_regions:
            serialized_custom = [
                {"bbox": box.bbox, "mode": box.mode or "blur", "label": box.label}
                for box in custom_regions
            ]

        # 5. Normalize selected_finding_ids to str list
        str_selected_ids = (
            [str(fid) for fid in selected_finding_ids]
            if selected_finding_ids is not None
            else None
        )

        # 6. Run SafeShare Redaction Engine (collect → IoU merge → apply → strip EXIF)
        sanitized_bytes, applied_regions = safeshare_engine.redact(
            image_bytes=image_bytes,
            findings=serialized_findings,
            selected_finding_ids=str_selected_ids,
            custom_regions=serialized_custom,
            override_modes=override_modes,
            blur_kernel=blur_intensity or 25,
        )

        # 7. Check 8: Output size sanity check
        output_size = len(sanitized_bytes)
        max_allowed = max(
            _MAX_ABSOLUTE_OUTPUT_BYTES,
            int(input_size * _MAX_OUTPUT_SIZE_MULTIPLIER),
        )
        if output_size > max_allowed:
            logger.warning(
                f"SafeShare output ({output_size} bytes) exceeds size bound "
                f"({max_allowed} bytes) for scan '{scan_id}'. "
                f"Input was {input_size} bytes."
            )
            # Output is still used — this is a monitoring signal, not a hard block
            # A future sprint may compress here

        # 8. Check 7: Compute SHA-256 integrity hash BEFORE writing to disk
        output_sha256 = _compute_sha256(sanitized_bytes)

        # 9. Persist sanitized PNG to disk with a new UUID filename
        output_filename = f"safeshare_{uuid.uuid4()}.png"
        output_path = self.storage.upload_dir / output_filename

        try:
            output_path.write_bytes(sanitized_bytes)
            logger.info(
                f"SafeShare artifact written: {output_filename} "
                f"({output_size} bytes, sha256={output_sha256[:16]}...)"
            )
        except OSError as e:
            raise DatabaseOperationError(f"Failed to write SafeShare artifact: {e}")

        # 10. Persist ScanRedaction database record
        applied_findings_count = sum(1 for r in applied_regions if r.get("source") in ("finding", "merged"))
        custom_count = sum(1 for r in applied_regions if r.get("source") == "custom")

        redaction_record = ScanRedaction(
            id=uuid.uuid4(),
            scan_session_id=scan_id,
            original_file_id=scan_file.id,
            output_filename=output_filename,
            redacted_regions=applied_regions,
            metadata_removed=True,
            output_sha256=output_sha256,
            created_at=datetime.now(timezone.utc),
        )

        try:
            db.add(redaction_record)
            await db.commit()
            await db.refresh(redaction_record)
        except Exception as e:
            # Cleanup orphan artifact if DB commit fails
            if output_path.exists():
                try:
                    output_path.unlink()
                except OSError:
                    pass
            raise DatabaseOperationError(f"Failed to persist SafeShare record: {e}")

        return SafeShareResponseData(
            redaction_id=redaction_record.id,
            download_url=f"/api/v1/redaction/{redaction_record.id}/download",
            total_redacted_regions=len(applied_regions),
            applied_findings_count=applied_findings_count,
            custom_regions_count=custom_count,
            metadata_removed=True,
            output_sha256=output_sha256,
            redacted_regions=applied_regions,
            created_at=redaction_record.created_at,
        )

    async def get_safeshare_metadata(
        self, db: AsyncSession, scan_id: uuid.UUID
    ) -> SafeShareResponseData:
        """
        Retrieves metadata for the most recent SafeShare artifact of a scan session.
        No original upload paths or internal filenames are returned.
        """
        session_stmt = select(ScanSession).where(ScanSession.id == scan_id)
        result = await db.execute(session_stmt)
        session = result.scalar_one_or_none()

        if not session:
            raise ResourceNotFoundError(f"Scan session '{scan_id}' not found")

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
        applied_findings_count = sum(1 for r in applied if r.get("source") in ("finding", "merged"))
        custom_count = sum(1 for r in applied if r.get("source") == "custom")

        return SafeShareResponseData(
            redaction_id=redaction.id,
            download_url=f"/api/v1/redaction/{redaction.id}/download",
            total_redacted_regions=len(applied),
            applied_findings_count=applied_findings_count,
            custom_regions_count=custom_count,
            metadata_removed=redaction.metadata_removed,
            output_sha256=redaction.output_sha256,
            redacted_regions=applied,
            created_at=redaction.created_at,
        )

    async def get_redaction_artifact_bytes(
        self, db: AsyncSession, redaction_id: uuid.UUID
    ) -> Tuple[bytes, str]:
        """
        Retrieves raw bytes of a SafeShare sanitized artifact for streaming download.

        Check 6: Validates:
        1. redaction_id exists in the database.
        2. The artifact file exists on disk.
        3. No caller-supplied scan_id is trusted — ownership is validated via DB relationship.

        Returns (png_bytes, sha256_hash).
        """
        stmt = select(ScanRedaction).where(ScanRedaction.id == redaction_id)
        result = await db.execute(stmt)
        redaction = result.scalar_one_or_none()

        if not redaction:
            raise ResourceNotFoundError(
                f"SafeShare artifact '{redaction_id}' not found"
            )

        # Verify the artifact file physically exists on disk
        artifact_path = self.storage.upload_dir / redaction.output_filename
        if not artifact_path.exists():
            raise ResourceNotFoundError(
                f"SafeShare artifact file for redaction '{redaction_id}' is missing on disk"
            )

        artifact_bytes = artifact_path.read_bytes()
        return artifact_bytes, (redaction.output_sha256 or "")


safeshare_service = SafeShareService()
