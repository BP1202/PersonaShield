import hashlib
import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.constants import ScanSessionStatus
from backend.app.models.scan_file import ScanFile
from backend.app.models.scan_session import ScanSession


@pytest.mark.asyncio
async def test_scan_session_and_file_model_crud(db_session: AsyncSession):
    session_id = uuid.uuid4()
    file_id = uuid.uuid4()
    dummy_hash = hashlib.sha256(b"integration_test").hexdigest()

    new_session = ScanSession(
        id=session_id,
        status=ScanSessionStatus.PENDING,
    )

    new_file = ScanFile(
        id=file_id,
        scan_session_id=session_id,
        stored_filename=f"{file_id}.png",
        display_filename="sample.png",
        mime_type="image/png",
        file_size_bytes=1024,
        sha256_hash=dummy_hash,
    )

    new_session.file = new_file
    db_session.add(new_session)
    await db_session.commit()

    # Query session with file relationship
    stmt = select(ScanSession).where(ScanSession.id == session_id)
    result = await db_session.execute(stmt)
    fetched = result.scalar_one()

    assert fetched.id == session_id
    assert fetched.status == ScanSessionStatus.PENDING
    assert fetched.file is not None
    assert fetched.file.id == file_id
    assert fetched.file.display_filename == "sample.png"
    assert fetched.file.sha256_hash == dummy_hash
    assert fetched.file.file_size_bytes == 1024
    assert fetched.created_at is not None
    assert fetched.updated_at is not None

    # Update session status
    fetched.status = ScanSessionStatus.PROCESSING
    await db_session.commit()

    # Re-query
    stmt = select(ScanSession).where(ScanSession.id == session_id)
    result = await db_session.execute(stmt)
    updated = result.scalar_one()
    assert updated.status == ScanSessionStatus.PROCESSING
    assert updated.file.display_filename == "sample.png"


@pytest.mark.asyncio
async def test_ocr_and_entities_model_crud(db_session: AsyncSession):
    from backend.app.models.scan_ocr_result import ScanOcrResult
    from backend.app.models.scan_entity import ScanEntity

    session_id = uuid.uuid4()
    new_session = ScanSession(
        id=session_id,
        status=ScanSessionStatus.PROCESSING,
    )
    db_session.add(new_session)
    await db_session.flush()

    # Add OCR Result
    ocr_result = ScanOcrResult(
        scan_session_id=session_id,
        raw_text="Secret: AKIAIOSFODNN7EXAMPLE",
        normalized_text="Secret: AKIAIOSFODNN7EXAMPLE",
        tokens=[{"text": "AKIAIOSFODNN7EXAMPLE", "confidence": 0.99, "bbox": [10, 10, 100, 30], "page_number": 1}],
    )
    db_session.add(ocr_result)

    # Add Scan Entity
    entity = ScanEntity(
        scan_session_id=session_id,
        category="CREDENTIAL",
        entity_type="AWS_ACCESS_KEY",
        text_snippet="AKIAIOSFODNN7EXAMPLE",
        confidence=0.99,
        bbox=[10, 10, 100, 30],
        page_number=1,
    )
    db_session.add(entity)
    await db_session.commit()

    # Query with relationships
    stmt = select(ScanSession).where(ScanSession.id == session_id)
    result = await db_session.execute(stmt)
    session = result.scalar_one()

    assert session.ocr_result is not None
    assert session.ocr_result.raw_text == "Secret: AKIAIOSFODNN7EXAMPLE"
    assert len(session.ocr_result.tokens) == 1
    assert len(session.entities) == 1
    assert session.entities[0].category == "CREDENTIAL"
    assert session.entities[0].entity_type == "AWS_ACCESS_KEY"
    assert session.entities[0].bbox == [10, 10, 100, 30]

