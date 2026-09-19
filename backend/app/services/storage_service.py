import os
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, status, HTTPException

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import (
    FileValidationError,
    generate_secure_storage_filename,
    validate_file_content_signature,
    validate_filename_security,
    validate_mime_type,
    sanitize_display_filename,
)


class StorageService:
    """
    Manages secure upload directory infrastructure and disk persistence.
    Enforces chunked streaming, file signature checks, UUID naming, and safe cleanup.
    """

    def __init__(self, upload_dir: Path | None = None):
        self.upload_dir = upload_dir or settings.UPLOAD_DIR
        self._ensure_upload_directory()

    def _ensure_upload_directory(self) -> None:
        """Ensures the upload directory exists with restricted access."""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        # On POSIX, ensure directory permissions are restricted (e.g. 0o700)
        try:
            if os.name != "nt":
                os.chmod(self.upload_dir, 0o700)
        except OSError:
            pass

    async def save_upload_file(
        self, upload_file: UploadFile
    ) -> Tuple[str, str, str, int, str]:
        """
        Validates and saves an uploaded file stream to the secure storage directory.
        Returns: (file_id_str, stored_filename, original_filename_sanitized, file_size_bytes, mime_type)
        """
        original_raw_name = upload_file.filename or ""

        # 1. Validate filename (extension, hidden files, double extensions, executables, path traversal)
        safe_ext = validate_filename_security(original_raw_name)
        sanitized_display_name = sanitize_display_filename(original_raw_name)

        # 2. Validate MIME type
        validated_mime = validate_mime_type(upload_file.content_type)

        # 3. Generate UUID storage filename
        file_id, stored_filename = generate_secure_storage_filename(safe_ext)
        target_path = self.upload_dir / stored_filename

        # 4. Stream write in chunks with size limit enforcement & signature verification
        CHUNK_SIZE = 64 * 1024  # 64 KB chunks
        total_size = 0
        header_bytes = b""

        try:
            with open(target_path, "wb") as f:
                while chunk := await upload_file.read(CHUNK_SIZE):
                    total_size += len(chunk)

                    if total_size > settings.MAX_UPLOAD_SIZE_BYTES:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES} bytes",
                        )

                    if len(header_bytes) < 32:
                        needed = 32 - len(header_bytes)
                        header_bytes += chunk[:needed]

                    f.write(chunk)

            # 5. Validate file signature / magic bytes from header
            validate_file_content_signature(header_bytes, safe_ext)

        except Exception:
            # Clean up partial or rejected artifact immediately
            if target_path.exists():
                try:
                    target_path.unlink()
                except OSError:
                    pass
            raise

        logger.info(
            f"Saved secure upload artifact: {stored_filename} ({total_size} bytes)",
            extra={"status_code": 201},
        )

        return (
            str(file_id),
            stored_filename,
            sanitized_display_name,
            total_size,
            validated_mime,
        )

    def delete_artifact(self, stored_filename: str) -> bool:
        """Safely removes a stored artifact from the upload directory."""
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


storage_service = StorageService()
