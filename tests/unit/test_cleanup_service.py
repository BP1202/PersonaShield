"""
Tests for CleanupService (Priority 3: File Retention Policy).
Verifies 24-hour TTL enforcement across uploads, SafeShare artifacts, and OCR files.
Ensures database records/metadata remain completely untouched.
"""
import os
import time
from pathlib import Path
import pytest

from backend.app.services.cleanup_service import CleanupService


@pytest.fixture
def temp_storage_env(tmp_path: Path):
    """Creates a temporary isolated directory tree mimicking uploads, safeshare, and ocr."""
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    safeshare_dir = uploads_dir / "safeshare"
    safeshare_dir.mkdir(parents=True, exist_ok=True)
    ocr_dir = uploads_dir / "ocr"
    ocr_dir.mkdir(parents=True, exist_ok=True)

    service = CleanupService(upload_dir=uploads_dir)
    return service, uploads_dir, safeshare_dir, ocr_dir


def test_purge_expired_uploads(temp_storage_env):
    service, uploads_dir, _, _ = temp_storage_env

    # Create one expired file (30 hours old) and one recent file (1 hour old)
    expired_file = uploads_dir / "expired_upload.png"
    expired_file.write_bytes(b"expired content")
    past_time = time.time() - (30 * 3600)
    os.utime(expired_file, (past_time, past_time))

    recent_file = uploads_dir / "recent_upload.png"
    recent_file.write_bytes(b"recent content")

    purged_count, freed_bytes = service.purge_expired_uploads(max_age_hours=24)

    assert purged_count == 1
    assert freed_bytes == len(b"expired content")
    assert not expired_file.exists()
    assert recent_file.exists()


def test_purge_expired_safeshare(temp_storage_env):
    service, _, safeshare_dir, _ = temp_storage_env

    expired_safeshare = safeshare_dir / "expired_safeshare.png"
    expired_safeshare.write_bytes(b"expired sanitized png")
    past_time = time.time() - (25 * 3600)
    os.utime(expired_safeshare, (past_time, past_time))

    recent_safeshare = safeshare_dir / "recent_safeshare.png"
    recent_safeshare.write_bytes(b"recent sanitized png")

    purged_count, freed_bytes = service.purge_expired_safeshare(max_age_hours=24)

    assert purged_count == 1
    assert freed_bytes == len(b"expired sanitized png")
    assert not expired_safeshare.exists()
    assert recent_safeshare.exists()


def test_purge_expired_ocr(temp_storage_env):
    service, _, _, ocr_dir = temp_storage_env

    expired_ocr = ocr_dir / "temp_page_1.png"
    expired_ocr.write_bytes(b"ocr bytes")
    past_time = time.time() - (48 * 3600)
    os.utime(expired_ocr, (past_time, past_time))

    recent_ocr = ocr_dir / "temp_page_2.png"
    recent_ocr.write_bytes(b"ocr bytes active")

    purged_count, freed_bytes = service.purge_expired_ocr(max_age_hours=24)

    assert purged_count == 1
    assert not expired_ocr.exists()
    assert recent_ocr.exists()


def test_run_retention_cleanup_summary(temp_storage_env):
    service, uploads_dir, safeshare_dir, ocr_dir = temp_storage_env

    past_time = time.time() - (26 * 3600)

    f1 = uploads_dir / "old_upload.png"
    f1.write_bytes(b"old upload")
    os.utime(f1, (past_time, past_time))

    f2 = safeshare_dir / "old_safeshare.png"
    f2.write_bytes(b"old safeshare")
    os.utime(f2, (past_time, past_time))

    f3 = ocr_dir / "old_ocr.png"
    f3.write_bytes(b"old ocr")
    os.utime(f3, (past_time, past_time))

    summary = service.run_retention_cleanup()

    assert summary["status"] == "completed"
    assert summary["purged_uploads"] == 1
    assert summary["purged_safeshare"] == 1
    assert summary["purged_ocr"] == 1
    assert summary["total_purged"] == 3
    assert summary["freed_bytes"] > 0
    assert not f1.exists()
    assert not f2.exists()
    assert not f3.exists()


def test_safe_purge_guards_against_directory_traversal(temp_storage_env):
    service, uploads_dir, _, _ = temp_storage_env

    # File outside uploads directory
    external_file = uploads_dir.parent / "sensitive_system_file.txt"
    external_file.write_bytes(b"do not delete")

    freed = service._safe_purge_file(external_file, uploads_dir)

    assert freed == 0
    assert external_file.exists()
    external_file.unlink()
