import os
import re
import uuid
from typing import Tuple

from backend.app.core.constants import (
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    DANGEROUS_EXTENSIONS,
)
from backend.app.core.exceptions import (
    CorruptedFileSignatureError,
    DangerousFilenameError,
    SecurityValidationError,
    UnsupportedMimeError,
)

# Backwards compatibility alias
FileValidationError = SecurityValidationError


def validate_filename_security(filename: str) -> str:
    """
    Validates client filename against path traversal, hidden files,
    executable formats, and double extensions.
    Returns the sanitized safe extension.
    """
    if not filename or not filename.strip():
        raise DangerousFilenameError("Filename cannot be empty")

    # Reject null bytes (poison null byte attack)
    if "\x00" in filename or "%00" in filename:
        raise DangerousFilenameError("Invalid filename: contains null bytes")

    # Reject path traversal patterns (directory separators)
    if "/" in filename or "\\" in filename:
        raise DangerousFilenameError("Invalid filename: path traversal detected")

    filename = filename.strip()

    # Reject hidden files (starts with dot)
    if filename.startswith("."):
        raise DangerousFilenameError("Hidden files are not allowed")

    # Check for double extensions or multiple dots
    parts = filename.split(".")
    if len(parts) < 2:
        raise DangerousFilenameError("File must have an extension")
    if len(parts) > 2:
        raise DangerousFilenameError("Double extensions or multiple dots are not allowed")

    base_name, raw_ext = parts[0], parts[1]
    if not base_name.strip():
        raise DangerousFilenameError("Filename base cannot be empty")

    ext = f".{raw_ext.lower()}"

    # Reject dangerous executable extensions
    if ext in DANGEROUS_EXTENSIONS:
        raise DangerousFilenameError(f"Executable file types ({ext}) are forbidden")

    # Whitelist extension check
    if ext not in ALLOWED_EXTENSIONS:
        raise DangerousFilenameError(
            f"File extension '{ext}' is not supported. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    return ext


def validate_file_content_signature(header_bytes: bytes, ext: str) -> None:
    """
    Validates file magic bytes to verify content matches the claimed extension.
    Prevents MIME-spoofing and corrupted/empty uploads.
    """
    if not header_bytes or len(header_bytes) < 4:
        raise CorruptedFileSignatureError("File is empty or corrupted")

    ext = ext.lower()
    if ext == ".png":
        if not header_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            raise CorruptedFileSignatureError("File content does not match PNG signature")
    elif ext in (".jpg", ".jpeg"):
        if not header_bytes.startswith(b"\xff\xd8\xff"):
            raise CorruptedFileSignatureError("File content does not match JPEG signature")
    elif ext == ".pdf":
        if not header_bytes.startswith(b"%PDF-"):
            raise CorruptedFileSignatureError("File content does not match PDF signature")
    elif ext == ".webp":
        if not (header_bytes.startswith(b"RIFF") and len(header_bytes) >= 12 and header_bytes[8:12] == b"WEBP"):
            raise CorruptedFileSignatureError("File content does not match WEBP signature")
    else:
        raise CorruptedFileSignatureError(f"Unsupported file format: {ext}")


def validate_mime_type(content_type: str | None) -> str:
    """Validates declared MIME type against whitelist."""
    if not content_type:
        raise UnsupportedMimeError("Content-Type header is required")

    normalized_mime = content_type.lower().split(";")[0].strip()
    if normalized_mime not in ALLOWED_MIME_TYPES:
        raise UnsupportedMimeError(
            f"MIME type '{normalized_mime}' is not supported. Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
        )
    return normalized_mime


def sanitize_display_filename(filename: str) -> str:
    """
    Sanitizes client filename for display:
    - Strips directory components
    - Removes dangerous characters (control chars, non-alphanumeric except ._-)
    - Truncates length to 128 characters
    """
    base = os.path.basename(filename)
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return sanitized[:128]


def generate_secure_storage_filename(ext: str) -> Tuple[uuid.UUID, str]:
    """Generates a UUID and unique storage filename for disk persistence."""
    file_id = uuid.uuid4()
    storage_name = f"{file_id}{ext}"
    return file_id, storage_name
