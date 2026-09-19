import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.scan_session import ScanSession, ScanSessionStatus


@pytest.mark.asyncio
async def test_scan_session_model_crud(db_session: AsyncSession):
    session_id = uuid.uuid4()
    file_id = uuid.uuid4()

    new_session = ScanSession(
        id=session_id,
        status=ScanSessionStatus.PENDING,
        file_id=file_id,
        stored_filename=f"{file_id}.png",
        original_filename="sample.png",
        mime_type="image/png",
        file_size_bytes=1024,
    )

    db_session.add(new_session)
    await db_session.commit()

    # Query back
    stmt = select(ScanSession).where(ScanSession.id == session_id)
    result = await db_session.execute(stmt)
    fetched = result.scalar_one()

    assert fetched.id == session_id
    assert fetched.file_id == file_id
    assert fetched.status == ScanSessionStatus.PENDING
    assert fetched.original_filename == "sample.png"
    assert fetched.file_size_bytes == 1024
    assert fetched.created_at is not None
    assert fetched.updated_at is not None

    # Update status
    fetched.status = ScanSessionStatus.PROCESSING
    await db_session.commit()

    # Re-query
    stmt = select(ScanSession).where(ScanSession.id == session_id)
    result = await db_session.execute(stmt)
    updated = result.scalar_one()
    assert updated.status == ScanSessionStatus.PROCESSING
