import uuid
from typing import Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.logging import logger
from backend.app.models.scan_session import ScanSession, ScanSessionStatus
from backend.app.services.storage_service import StorageService, storage_service


class ScanService:
    """
    Business service orchestrating scan session workflows.
    Maintains clean separation between API routes and database models.
    """

    def __init__(self, storage: StorageService = storage_service):
        self.storage = storage

    async def create_scan_session(
        self,
        db: AsyncSession,
        upload_file: UploadFile,
    ) -> ScanSession:
        """
        Validates, saves the uploaded artifact, and creates a database scan session record.
        If database persistence fails, the saved artifact is immediately removed to avoid orphaned files.
        """
        # Save file securely to storage
        (
            file_id_str,
            stored_filename,
            original_filename,
            file_size_bytes,
            mime_type,
        ) = await self.storage.save_upload_file(upload_file)

        session_id = uuid.uuid4()
        scan_session = ScanSession(
            id=session_id,
            status=ScanSessionStatus.PENDING,
            file_id=uuid.UUID(file_id_str),
            stored_filename=stored_filename,
            original_filename=original_filename,
            mime_type=mime_type,
            file_size_bytes=file_size_bytes,
        )

        try:
            db.add(scan_session)
            await db.commit()
            await db.refresh(scan_session)
            return scan_session
        except Exception as e:
            await db.rollback()
            # Clean up artifact to prevent orphan disk retention
            self.storage.delete_artifact(stored_filename)
            logger.error(f"Failed to create scan session in database: {type(e).__name__}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize scan session",
            )

    async def get_scan_session(
        self,
        db: AsyncSession,
        scan_id: uuid.UUID,
    ) -> ScanSession:
        """
        Retrieves an existing scan session by its UUID.
        Raises 404 if not found.
        """
        query = select(ScanSession).where(ScanSession.id == scan_id)
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scan session '{scan_id}' not found",
            )

        return session


scan_service = ScanService()
