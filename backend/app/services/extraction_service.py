import uuid
from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.constants import ScanSessionStatus
from backend.app.core.exceptions import (
    CorruptedFileSignatureError,
    DatabaseOperationError,
    ResourceNotFoundError,
)
from backend.app.core.logging import logger
from backend.app.detection.entity_extractor import entity_extractor_engine
from backend.app.models.scan_entity import ScanEntity
from backend.app.models.scan_ocr_result import ScanOcrResult
from backend.app.models.scan_session import ScanSession
from backend.app.ocr.engine import ocr_engine
from backend.app.ocr.preprocessor import image_preprocessor
from backend.app.schemas.extraction import (
    EntityResponseData,
    ExtractionSummaryResponseData,
)
from backend.app.services.storage_service import StorageService, storage_service


class ExtractionService:
    """
    Orchestration service coordinating OCR extraction and sensitive entity detection.
    """

    def __init__(self, storage: StorageService = storage_service):
        self.storage = storage

    async def run_extraction(
        self,
        db: AsyncSession,
        scan_id: uuid.UUID,
    ) -> ExtractionSummaryResponseData:
        """
        Executes end-to-end OCR and entity extraction for a scan session.
        Persists ScanOcrResult and ScanEntity records to the database.
        """
        # 1. Retrieve ScanSession with associated file
        query = select(ScanSession).where(ScanSession.id == scan_id)
        result = await db.execute(query)
        session = result.scalar_one_or_none()

        if not session or not session.file:
            raise ResourceNotFoundError(f"Scan session '{scan_id}' not found")

        file_path = self.storage.upload_dir / session.file.stored_filename
        if not file_path.exists():
            raise CorruptedFileSignatureError(f"Artifact for scan '{scan_id}' missing on disk")

        # 2. Update status to PROCESSING
        session.status = ScanSessionStatus.PROCESSING
        await db.commit()

        try:
            # 3. Preprocess images / document pages
            pages = image_preprocessor.load_and_preprocess(file_path)

            # 4. Run EasyOCR extraction
            ocr_res = ocr_engine.extract_from_pages(pages)

            # 5. Run sensitive entity extraction & bounding box mapping
            entities = entity_extractor_engine.extract_entities(
                text=ocr_res.normalized_text,
                tokens=ocr_res.tokens,
            )

            # 6. Prepare and persist ScanOcrResult
            tokens_json = [
                {
                    "text": t.text,
                    "confidence": t.confidence,
                    "bbox": t.bbox,
                    "page_number": t.page_number,
                }
                for t in ocr_res.tokens
            ]

            ocr_record = ScanOcrResult(
                id=uuid.uuid4(),
                scan_session_id=session.id,
                raw_text=ocr_res.raw_text,
                normalized_text=ocr_res.normalized_text,
                tokens=tokens_json,
            )
            db.add(ocr_record)

            # 7. Prepare and persist ScanEntity records
            entity_records = []
            category_counts: Dict[str, int] = {}

            for ent in entities:
                category_counts[ent.category] = category_counts.get(ent.category, 0) + 1
                entity_rec = ScanEntity(
                    id=uuid.uuid4(),
                    scan_session_id=session.id,
                    category=ent.category,
                    entity_type=ent.entity_type,
                    text_snippet=ent.text_snippet,
                    confidence=ent.confidence,
                    bbox=ent.bbox,
                    page_number=ent.page_number,
                )
                entity_records.append(entity_rec)

            db.add_all(entity_records)

            # 8. Mark session COMPLETED
            session.status = ScanSessionStatus.COMPLETED
            await db.commit()

            logger.info(
                f"Completed extraction for scan {scan_id}: "
                f"{len(ocr_res.tokens)} tokens, {len(entities)} entities detected"
            )

            return ExtractionSummaryResponseData(
                scan_id=session.id,
                status=session.status,
                total_characters=len(ocr_res.normalized_text),
                total_tokens=len(ocr_res.tokens),
                total_entities=len(entities),
                entities_by_category=category_counts,
            )

        except Exception as e:
            await db.rollback()
            session.status = ScanSessionStatus.FAILED
            await db.commit()
            logger.error(f"Extraction failed for scan {scan_id}: {type(e).__name__}: {e}")
            raise DatabaseOperationError(f"Extraction failed: {str(e)}")

    async def get_session_entities(
        self,
        db: AsyncSession,
        scan_id: uuid.UUID,
    ) -> List[EntityResponseData]:
        """
        Retrieves all extracted sensitive entities for a scan session.
        """
        # Verify scan session exists
        query_session = select(ScanSession).where(ScanSession.id == scan_id)
        result_session = await db.execute(query_session)
        if not result_session.scalar_one_or_none():
            raise ResourceNotFoundError(f"Scan session '{scan_id}' not found")

        # Fetch entities
        query_entities = select(ScanEntity).where(ScanEntity.scan_session_id == scan_id)
        result_entities = await db.execute(query_entities)
        entities = result_entities.scalars().all()

        return [
            EntityResponseData(
                id=e.id,
                category=e.category,
                entity_type=e.entity_type,
                text_snippet=e.text_snippet,
                confidence=e.confidence,
                bbox=e.bbox,
                page_number=e.page_number,
                created_at=e.created_at,
            )
            for e in entities
        ]


extraction_service = ExtractionService()
