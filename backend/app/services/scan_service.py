import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile

from backend.app.core.constants import ScanSessionStatus
from backend.app.core.exceptions import DatabaseOperationError, ResourceNotFoundError
from backend.app.core.logging import logger
from backend.app.models.scan_file import ScanFile
from backend.app.models.scan_session import ScanSession
from backend.app.services.storage_service import StorageService, storage_service


class ScanService:
    """
    Business service orchestrating scan session workflows.
    Separates scan session workflow state from file artifact metadata.
    """

    def __init__(self, storage: StorageService = storage_service):
        self.storage = storage

    async def create_scan_session(
        self,
        db: AsyncSession,
        upload_file: UploadFile,
    ) -> ScanSession:
        """
        Validates, fingerprints (SHA-256), persists file artifact,
        and atomically registers ScanSession + ScanFile in database.
        """
        (
            file_id_str,
            stored_filename,
            display_filename,
            file_size_bytes,
            mime_type,
            sha256_hash,
        ) = await self.storage.save_upload_file(upload_file)

        session_id = uuid.uuid4()
        scan_session = ScanSession(
            id=session_id,
            status=ScanSessionStatus.PENDING,
        )

        scan_file = ScanFile(
            id=uuid.UUID(file_id_str),
            scan_session_id=session_id,
            stored_filename=stored_filename,
            display_filename=display_filename,
            mime_type=mime_type,
            file_size_bytes=file_size_bytes,
            sha256_hash=sha256_hash,
        )

        scan_session.file = scan_file

        try:
            db.add(scan_session)
            await db.commit()
            await db.refresh(scan_session)
            return scan_session
        except Exception as e:
            await db.rollback()
            # Clean up artifact to prevent orphaned file retention on disk
            self.storage.delete_artifact(stored_filename)
            logger.error(f"Failed to create scan session in database: {type(e).__name__}")
            raise DatabaseOperationError("Failed to initialize scan session in database")

    async def get_scan_session(
        self,
        db: AsyncSession,
        scan_id: uuid.UUID,
    ) -> ScanSession:
        """
        Retrieves an existing scan session with file metadata by UUID.
        Raises ResourceNotFoundError if session does not exist.
        """
        from sqlalchemy.orm import selectinload
        query = (
            select(ScanSession)
            .where(ScanSession.id == scan_id)
            .options(selectinload(ScanSession.file))
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            raise ResourceNotFoundError(f"Scan session '{scan_id}' not found")

        return session


scan_service = ScanService()
