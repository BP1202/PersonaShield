import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CustomRedactionBox(BaseModel):
    """User-defined rectangular crop/selection region for interactive blurring or blackout."""
    bbox: List[int] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="Bounding coordinates [x1, y1, x2, y2]",
    )
    mode: Optional[str] = Field(
        default="blur",
        description="Redaction style: blur, pixelate, blackout",
    )
    label: Optional[str] = Field(
        default=None,
        description="Optional human-readable label for custom selection",
    )


class SafeShareGenerateRequest(BaseModel):
    """Payload for generating SafeShare privacy-preserving sanitized artifact."""
    selected_finding_ids: Optional[List[uuid.UUID]] = Field(
        default=None,
        description=(
            "Optional list of finding UUIDs to redact. "
            "If omitted or null, all detected findings with bounding coordinates are automatically redacted."
        ),
    )
    custom_regions: Optional[List[CustomRedactionBox]] = Field(
        default=None,
        description="Interactive user-drawn custom crop/selection boxes.",
    )
    override_modes: Optional[Dict[str, str]] = Field(
        default=None,
        description=(
            "Optional map of finding_type or finding_id to custom redaction style "
            "(blur, pixelate, blackout)."
        ),
    )
    blur_intensity: Optional[int] = Field(
        default=25,
        ge=3,
        le=99,
        description="Blur kernel intensity (must be odd integer >= 3).",
    )


class SafeShareRegionItem(BaseModel):
    """Record of an applied redaction region on the canvas."""
    source: str = Field(description="Region source: finding, custom, or merged")
    finding_id: Optional[str] = Field(default=None, description="Linked finding UUID if source=finding")
    finding_type: str = Field(description="Finding type identifier or USER_CUSTOM_SELECTION")
    bbox: List[int] = Field(description="Bounding box [x1, y1, x2, y2]")
    mode: str = Field(description="Redaction mode applied: blur, pixelate, blackout, partial_blur")
    masked_value: Optional[str] = Field(default=None, description="Safely masked finding snippet")
    label: Optional[str] = Field(default=None, description="Custom region label if applicable")


class SafeShareResponseData(BaseModel):
    """
    Public API response for a SafeShare sanitized artifact.

    Privacy policy:
    - No original upload path, filename, or internal file ID is returned.
    - No scan_session_id is returned.
    - Only the redaction_id (opaque artifact reference) and download_url are exposed.
    """
    model_config = ConfigDict(from_attributes=True)

    redaction_id: uuid.UUID = Field(
        description="Opaque SafeShare artifact identifier. Use to download the sanitized PNG."
    )
    download_url: str = Field(
        description="REST endpoint to stream the sanitized PNG. Never exposes the original upload."
    )
    total_redacted_regions: int = Field(
        description="Total count of regions redacted on the artifact after IoU merge."
    )
    applied_findings_count: int = Field(
        description="Number of detected findings that contributed redaction regions."
    )
    custom_regions_count: int = Field(
        description="Number of user-drawn custom regions applied."
    )
    metadata_removed: bool = Field(
        description="True if all EXIF/GPS/camera metadata was stripped from the sanitized output."
    )
    output_sha256: Optional[str] = Field(
        default=None,
        description="SHA-256 fingerprint of the sanitized PNG artifact for tamper detection.",
    )
    redacted_regions: Optional[List[SafeShareRegionItem]] = Field(
        default=None,
        description="Detail of each applied redaction region.",
    )
    created_at: Optional[datetime] = Field(
        default=None,
        description="UTC timestamp of artifact creation.",
    )
