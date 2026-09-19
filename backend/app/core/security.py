import os
import re
import uuid
from pathlib import Path
from typing import Tuple

from fastapi import HTTPException, status
from backend.app.core.config import settings

# Disallowed executable extensions
DANGEROUS_EXTENSIONS = {
    ".exe", ".dll", ".so", ".bin", ".elf", ".sh", ".bat", ".cmd", ".ps1",
    ".py", ".pyc", ".pyw", ".js", ".mjs", ".ts", ".vbs", ".msi", ".jar",
    ".apk", ".app", ".dmg", ".pkg", ".deb", ".rpm", ".php", ".phtml",
    ".asp", ".aspx", ".jsp", ".cgi", ".pl", ".hta", ".scr", ".com",
}

# Magic bytes signatures for supported types
MAGIC_SIGNATURES = {
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".pdf": [b"%PDF-"],
    ".webp": [b"RIFF"],  # also checks WEBP at bytes 8-12
}


class FileValidationError(HTTPException):
    """Exception raised for file security validation failures."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


def validate_filename_security(filename: str) -> str:
    """
    Validates client filename against path traversal, hidden files,
    executable formats, and double extensions.
    Returns the sanitized safe extension.
    """
    if not filename or not filename.strip():
        raise FileValidationError("Filename cannot be empty")

    # Reject null bytes (poison null byte attack)
    if "\x00" in filename or "%00" in filename:
        raise FileValidationError("Invalid filename: contains null bytes")

    # Reject path traversal patterns (directory separators)
    if "/" in filename or "\\" in filename:
        raise FileValidationError("Invalid filename: path traversal detected")

    filename = filename.strip()

    # Reject hidden files (starts with dot)
    if filename.startswith("."):
        raise FileValidationError("Hidden files are not allowed")

    # Check for double extensions or multiple dots
    parts = filename.split(".")
    if len(parts) < 2:
        raise FileValidationError("File must have an extension")
    if len(parts) > 2:
        raise FileValidationError("Double extensions or multiple dots are not allowed")

    base_name, raw_ext = parts[0], parts[1]
    if not base_name.strip():
        raise FileValidationError("Filename base cannot be empty")

    ext = f".{raw_ext.lower()}"

    # Reject dangerous executable extensions
    if ext in DANGEROUS_EXTENSIONS:
        raise FileValidationError(f"Executable file types ({ext}) are forbidden")

    # Whitelist extension check
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise FileValidationError(
            f"File extension '{ext}' is not supported. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

    return ext


def validate_file_content_signature(header_bytes: bytes, ext: str) -> None:
    """
    Validates file magic bytes to verify content matches the claimed extension.
    Prevents MIME-spoofing and corrupted/empty uploads.
    """
    if not header_bytes or len(header_bytes) < 4:
        raise FileValidationError("File is empty or corrupted")

    ext = ext.lower()
    if ext == ".png":
        if not header_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            raise FileValidationError("File content does not match PNG signature")
    elif ext in (".jpg", ".jpeg"):
        if not header_bytes.startswith(b"\xff\xd8\xff"):
            raise FileValidationError("File content does not match JPEG signature")
    elif ext == ".pdf":
        if not header_bytes.startswith(b"%PDF-"):
            raise FileValidationError("File content does not match PDF signature")
    elif ext == ".webp":
        if not (header_bytes.startswith(b"RIFF") and len(header_bytes) >= 12 and header_bytes[8:12] == b"WEBP"):
            raise FileValidationError("File content does not match WEBP signature")
    else:
        raise FileValidationError(f"Unsupported file format: {ext}")


def validate_mime_type(content_type: str | None) -> str:
    """Validates declared MIME type against whitelist."""
    if not content_type:
        raise FileValidationError("Content-Type header is required")

    normalized_mime = content_type.lower().split(";")[0].strip()
    if normalized_mime not in settings.ALLOWED_MIME_TYPES:
        raise FileValidationError(
            f"MIME type '{normalized_mime}' is not supported. Allowed: {', '.join(settings.ALLOWED_MIME_TYPES)}"
        )
    return normalized_mime


def sanitize_display_filename(filename: str) -> str:
    """
    Sanitizes client filename for safe storage in database.
    Removes any non-whitelisted characters and trims length.
    """
    base = os.path.basename(filename)
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return sanitized[:128]


def generate_secure_storage_filename(ext: str) -> Tuple[uuid.UUID, str]:
    """Generates a UUID and unique storage filename for disk storage."""
    file_id = uuid.uuid4()
    storage_name = f"{file_id}{ext}"
    return file_id, storage_name
