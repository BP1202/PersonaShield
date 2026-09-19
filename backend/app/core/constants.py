"""Centralized security and operational constants for PersonaShield AI."""
import enum
from typing import Dict, List, Set

# File Upload Limits
DEFAULT_MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
UPLOAD_CHUNK_SIZE_BYTES: int = 64 * 1024  # 64 KB streaming buffer
DEFAULT_ARTIFACT_TTL_SECONDS: int = 3600  # 1 hour retention TTL

# Supported File Extensions & MIME Types Whitelist
ALLOWED_EXTENSIONS: Set[str] = {
    ".png",
    ".jpg",
    ".jpeg",
    ".pdf",
    ".webp",
}

ALLOWED_MIME_TYPES: Set[str] = {
    "image/png",
    "image/jpeg",
    "application/pdf",
    "image/webp",
}

# Dangerous / Executable Extensions Blacklist
DANGEROUS_EXTENSIONS: Set[str] = {
    ".exe", ".dll", ".so", ".bin", ".elf", ".sh", ".bat", ".cmd", ".ps1",
    ".py", ".pyc", ".pyw", ".js", ".mjs", ".ts", ".vbs", ".msi", ".jar",
    ".apk", ".app", ".dmg", ".pkg", ".deb", ".rpm", ".php", ".phtml",
    ".asp", ".aspx", ".jsp", ".cgi", ".pl", ".hta", ".scr", ".com",
}

# Magic bytes signatures for deterministic file verification
MAGIC_SIGNATURES: Dict[str, List[bytes]] = {
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".pdf": [b"%PDF-"],
    ".webp": [b"RIFF"],
}


class ScanSessionStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
