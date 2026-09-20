import hashlib
import os
import time
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile

from backend.app.core.config import settings
from backend.app.core.constants import (
    DEFAULT_ARTIFACT_TTL_SECONDS,
    UPLOAD_CHUNK_SIZE_BYTES,
)
from backend.app.core.exceptions import UploadTooLargeError
from backend.app.core.logging import logger
from backend.app.core.security import (
    generate_secure_storage_filename,
    sanitize_display_filename,
    validate_file_content_signature,
    validate_filename_security,
    validate_mime_type,
)


class StorageService:
    """
    Manages secure upload directory infrastructure, streaming writes,
    SHA-256 fingerprinting, and artifact lifecycle cleanup.
    """

    def __init__(self, upload_dir: Path | None = None):
        self.upload_dir = upload_dir or settings.UPLOAD_DIR
        self._ensure_upload_directory()

    def _ensure_upload_directory(self) -> None:
        """Ensures the upload directory exists with restricted access."""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        if os.name != "nt":
            try:
                os.chmod(self.upload_dir, 0o700)
            except OSError:
                pass

    async def save_upload_file(
        self, upload_file: UploadFile
    ) -> Tuple[str, str, str, int, str, str]:
        """
        Validates, streams, computes SHA-256 fingerprint, and saves artifact.
        Returns:
            (file_id_str, stored_filename, display_filename, file_size_bytes, mime_type, sha256_hash)
        """
        original_raw_name = upload_file.filename or ""

        # 1. Validate filename security (extension whitelist, hidden, double ext, executables)
        safe_ext = validate_filename_security(original_raw_name)
        display_filename = sanitize_display_filename(original_raw_name)

        # 2. Validate MIME type against whitelist
        validated_mime = validate_mime_type(upload_file.content_type)

        # 3. Generate UUID storage filename
        file_id, stored_filename = generate_secure_storage_filename(safe_ext)
        target_path = self.upload_dir / stored_filename

        # 4. Stream write in chunks, compute SHA-256 fingerprint, enforce size limit
        total_size = 0
        header_bytes = b""
        hasher = hashlib.sha256()

        try:
            with open(target_path, "wb") as f:
                while chunk := await upload_file.read(UPLOAD_CHUNK_SIZE_BYTES):
                    total_size += len(chunk)

                    if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                        raise UploadTooLargeError(
                            f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES} bytes"
                        )

                    if len(header_bytes) < 32:
                        needed = 32 - len(header_bytes)
                        header_bytes += chunk[:needed]

                    hasher.update(chunk)
                    f.write(chunk)

            # 5. Validate file signature / magic bytes from header
            validate_file_content_signature(header_bytes, safe_ext)

        except Exception:
            # Immediate cleanup of partial or rejected artifact
            if target_path.exists():
                try:
                    target_path.unlink()
                except OSError:
                    pass
            raise

        sha256_hash = hasher.hexdigest()

        logger.info(
            f"Stored upload artifact {stored_filename} ({total_size} bytes, sha256={sha256_hash[:12]}...)",
            extra={"status_code": 201},
        )

        return (
            str(file_id),
            stored_filename,
            display_filename,
            total_size,
            validated_mime,
            sha256_hash,
        )

    def delete_artifact(self, stored_filename: str) -> bool:
        """Safely removes a stored artifact from disk."""
        target_path = (self.upload_dir / stored_filename).resolve()

        # Prevent directory traversal on deletion
        if not str(target_path).startswith(str(self.upload_dir.resolve())):
            logger.warning(f"Prevented unsafe file deletion attempt: {stored_filename}")
            return False

        if target_path.exists() and target_path.is_file():
            try:
                target_path.unlink()
                return True
            except OSError as e:
                logger.error(f"Failed to delete artifact {stored_filename}: {e}")
                return False
        return False

    def cleanup_expired_artifacts(
        self, max_age_seconds: int = DEFAULT_ARTIFACT_TTL_SECONDS
    ) -> int:
        """
        Scans upload directory and purges expired artifacts older than TTL.
        Returns the count of purged files.
        """
        now = time.time()
        purged_count = 0

        if not self.upload_dir.exists():
            return 0

        for item in self.upload_dir.iterdir():
            if item.is_file():
                try:
                    mtime = item.stat().st_mtime
                    if (now - mtime) > max_age_seconds:
                        item.unlink()
                        purged_count += 1
                        logger.info(f"Purged expired artifact: {item.name}")
                except OSError as e:
                    logger.error(f"Error purging expired artifact {item.name}: {e}")

        return purged_count


storage_service = StorageService()
