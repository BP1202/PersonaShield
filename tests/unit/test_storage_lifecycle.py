import hashlib
import io
import os
import time
from pathlib import Path
import pytest
from fastapi import UploadFile

from backend.app.services.storage_service import StorageService


@pytest.mark.asyncio
async def test_sha256_hash_streaming_calculation(tmp_path: Path):
    storage = StorageService(upload_dir=tmp_path)
    sample_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"A" * 1024
    expected_hash = hashlib.sha256(sample_content).hexdigest()

    upload = UploadFile(
        file=io.BytesIO(sample_content),
        filename="test_image.png",
        headers={"content-type": "image/png"},
    )

    (
        file_id,
        stored_filename,
        display_filename,
        file_size,
        mime_type,
        sha256_hash,
    ) = await storage.save_upload_file(upload)

    assert sha256_hash == expected_hash
    assert len(sha256_hash) == 64
    assert file_size == len(sample_content)
    assert display_filename == "test_image.png"
    assert stored_filename.startswith(file_id)


def test_cleanup_expired_artifacts(tmp_path: Path):
    storage = StorageService(upload_dir=tmp_path)

    # Create one old file (modified 2 hours ago)
    old_file = tmp_path / "old_artifact.png"
    old_file.write_bytes(b"old")
    two_hours_ago = time.time() - 7200
    os.utime(old_file, (two_hours_ago, two_hours_ago))

    # Create one fresh file (modified just now)
    fresh_file = tmp_path / "fresh_artifact.png"
    fresh_file.write_bytes(b"fresh")

    # Run cleanup with TTL = 3600 seconds (1 hour)
    purged = storage.cleanup_expired_artifacts(max_age_seconds=3600)

    assert purged == 1
    assert not old_file.exists()
    assert fresh_file.exists()
