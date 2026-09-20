import os
import time
from pathlib import Path
from typing import Any, Dict

from backend.app.core.config import settings
from backend.app.core.logging import logger


class CleanupService:
    """
    Priority 3: File Retention Policy Service.
    Enforces privacy-first artifact lifecycle management:
    - Original uploads: purged after UPLOAD_RETENTION_HOURS (24 hours)
    - SafeShare sanitized PNGs: purged after SAFESHARE_RETENTION_HOURS (24 hours)
    - OCR artifacts: purged after OCR_RETENTION_HOURS (24 hours)
    - Database metadata & Reports: retained intact for audit and verifiable proof.
    """

    def __init__(self, upload_dir: Path | None = None):
        self.upload_dir = (upload_dir or settings.UPLOAD_DIR).resolve()
        self.safeshare_dir = (self.upload_dir / "safeshare").resolve()
        self.ocr_dir = (self.upload_dir / "ocr").resolve()

    def _safe_purge_file(self, file_path: Path, base_dir: Path) -> int:
        """
        Safely deletes a single file ensuring it resides strictly within base_dir.
        Returns the number of bytes freed, or 0 if failed.
        """
        try:
            resolved_file = file_path.resolve()
            # Directory traversal guard
            if not str(resolved_file).startswith(str(base_dir)):
                logger.warning(f"Prevented unsafe file deletion attempt: {file_path}")
                return 0

            if resolved_file.is_file():
                size = resolved_file.stat().st_size
                resolved_file.unlink()
                logger.info(f"Purged expired privacy artifact: {file_path.name} ({size} bytes)")
                return size
        except OSError as e:
            logger.error(f"Error purging file {file_path}: {e}")
        return 0

    def purge_expired_uploads(self, max_age_hours: int | None = None) -> tuple[int, int]:
        """
        Purges original uploads older than max_age_hours (default: settings.UPLOAD_RETENTION_HOURS).
        Ignores subdirectories.
        Returns: (purged_count, freed_bytes)
        """
        hours = max_age_hours if max_age_hours is not None else settings.UPLOAD_RETENTION_HOURS
        cutoff = time.time() - (hours * 3600)
        purged_count = 0
        freed_bytes = 0

        if not self.upload_dir.exists():
            return 0, 0

        for item in self.upload_dir.iterdir():
            # Only process top-level files in upload_dir (not subdirectories)
            if item.is_file():
                try:
                    if item.stat().st_mtime < cutoff:
                        freed = self._safe_purge_file(item, self.upload_dir)
                        if freed >= 0:
                            purged_count += 1
                            freed_bytes += freed
                except OSError as e:
                    logger.error(f"Error checking upload file {item}: {e}")

        return purged_count, freed_bytes

    def purge_expired_safeshare(self, max_age_hours: int | None = None) -> tuple[int, int]:
        """
        Purges generated SafeShare PNGs older than max_age_hours (default: settings.SAFESHARE_RETENTION_HOURS).
        Returns: (purged_count, freed_bytes)
        """
        hours = max_age_hours if max_age_hours is not None else settings.SAFESHARE_RETENTION_HOURS
        cutoff = time.time() - (hours * 3600)
        purged_count = 0
        freed_bytes = 0

        if not self.safeshare_dir.exists():
            return 0, 0

        for item in self.safeshare_dir.iterdir():
            if item.is_file():
                try:
                    if item.stat().st_mtime < cutoff:
                        freed = self._safe_purge_file(item, self.safeshare_dir)
                        if freed >= 0:
                            purged_count += 1
                            freed_bytes += freed
                except OSError as e:
                    logger.error(f"Error checking SafeShare file {item}: {e}")

        return purged_count, freed_bytes

    def purge_expired_ocr(self, max_age_hours: int | None = None) -> tuple[int, int]:
        """
        Purges temporary OCR preprocessed files older than max_age_hours.
        Returns: (purged_count, freed_bytes)
        """
        hours = max_age_hours if max_age_hours is not None else settings.OCR_RETENTION_HOURS
        cutoff = time.time() - (hours * 3600)
        purged_count = 0
        freed_bytes = 0

        if not self.ocr_dir.exists():
            return 0, 0

        for item in self.ocr_dir.iterdir():
            if item.is_file():
                try:
                    if item.stat().st_mtime < cutoff:
                        freed = self._safe_purge_file(item, self.ocr_dir)
                        if freed >= 0:
                            purged_count += 1
                            freed_bytes += freed
                except OSError as e:
                    logger.error(f"Error checking OCR artifact {item}: {e}")

        return purged_count, freed_bytes

    def run_retention_cleanup(self) -> Dict[str, Any]:
        """
        Executes full retention policy cleanup across uploads, SafeShare, and OCR artifacts.
        Preserves database metadata.
        Returns execution summary.
        """
        logger.info("Executing artifact retention policy cleanup...")
        uploads_count, uploads_bytes = self.purge_expired_uploads()
        safeshare_count, safeshare_bytes = self.purge_expired_safeshare()
        ocr_count, ocr_bytes = self.purge_expired_ocr()

        total_purged = uploads_count + safeshare_count + ocr_count
        total_freed = uploads_bytes + safeshare_bytes + ocr_bytes

        logger.info(
            f"Retention cleanup complete: {total_purged} artifacts purged, {total_freed} bytes freed."
        )

        return {
            "status": "completed",
            "purged_uploads": uploads_count,
            "purged_safeshare": safeshare_count,
            "purged_ocr": ocr_count,
            "total_purged": total_purged,
            "freed_bytes": total_freed,
        }


cleanup_service = CleanupService()
