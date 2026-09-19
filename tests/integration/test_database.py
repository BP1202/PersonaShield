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
