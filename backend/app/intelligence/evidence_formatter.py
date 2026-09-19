import re
from typing import Any, Dict, List


def mask_secret(value: str, prefix_len: int = 7, suffix_len: int = 4) -> str:
    """Masks high-entropy secrets preserving recognizable prefix and suffix."""
    if not value or len(value) <= (prefix_len + suffix_len):
        return "****"
    prefix = value[:prefix_len]
    suffix = value[-suffix_len:]
    masked_middle = "*" * max(4, len(value) - (prefix_len + suffix_len))
    return f"{prefix}{masked_middle}{suffix}"


def mask_aadhaar(value: str) -> str:
    """Masks 12-digit Aadhaar following UIDAI masked standard (XXXX-XXXX-1234)."""
    digits = re.sub(r"\D", "", value)
    if len(digits) == 12:
        return f"XXXX-XXXX-{digits[-4:]}"
    return "****" + value[-4:] if len(value) >= 4 else "****"


def mask_pan(value: str) -> str:
    """Masks 10-char PAN card number (e.g. ABCDE****F)."""
    cleaned = value.strip().upper()
    if len(cleaned) == 10:
        return f"{cleaned[:5]}****{cleaned[-1]}"
    return "****" + cleaned[-2:] if len(cleaned) >= 2 else "****"


def mask_phone(value: str) -> str:
    """Masks phone numbers preserving country code and last 4 digits."""
    digits = re.sub(r"\D", "", value)
    if len(digits) >= 10:
        return f"+91 ***** *{digits[-4:]}"
    return "****" + value[-3:] if len(value) >= 3 else "****"


def mask_email(value: str) -> str:
    """Masks email addresses (e.g. j***e@company.com)."""
    if "@" not in value:
        return "****"
    user, domain = value.split("@", 1)
    if len(user) <= 2:
        masked_user = user[0] + "***"
    else:
        masked_user = user[0] + "***" + user[-1]
    return f"{masked_user}@{domain}"


def mask_database_url(value: str) -> str:
    """Masks embedded credentials in database connection strings."""
    # Matches proto://user:password@host:port/db
    return re.sub(
        r"(://[^:]+:)([^@]+)(@)",
        r"\1********\3",
        value,
    )


def format_evidence(
    bbox: List[int],
    raw_snippet: str,
    page_number: int,
    entity_type: str,
) -> Dict[str, Any]:
    """
    Constructs an evidence dictionary with safely sanitized snippet values.
    """
    raw_snippet = raw_snippet.strip()

    if "AADHAAR" in entity_type:
        masked = mask_aadhaar(raw_snippet)
    elif "PAN" in entity_type:
        masked = mask_pan(raw_snippet)
    elif "PHONE" in entity_type:
        masked = mask_phone(raw_snippet)
    elif "EMAIL" in entity_type:
        masked = mask_email(raw_snippet)
    elif "DATABASE" in entity_type or "CONNECTION" in entity_type:
        masked = mask_database_url(raw_snippet)
    elif any(k in entity_type for k in ("KEY", "TOKEN", "JWT", "SECRET")):
        masked = mask_secret(raw_snippet)
    else:
        # Default mask
        if len(raw_snippet) > 8:
            masked = raw_snippet[:3] + "****" + raw_snippet[-2:]
        else:
            masked = "****"

    return {
        "bbox": bbox,
        "masked_value": masked,
        "page_number": page_number,
        "raw_type": entity_type,
    }
