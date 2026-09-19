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
        description="Optional list of finding UUIDs to redact. If omitted or null, all detected findings with bounding coordinates are automatically redacted.",
    )
    custom_regions: Optional[List[CustomRedactionBox]] = Field(
        default=None,
        description="Interactive user-drawn custom crop/selection boxes.",
    )
    override_modes: Optional[Dict[str, str]] = Field(
        default=None,
        description="Optional map of finding_type or finding_id to custom redaction style (blur, pixelate, blackout).",
    )
    blur_intensity: Optional[int] = Field(
        default=25,
        ge=3,
        le=99,
        description="Blur kernel intensity (must be odd integer >= 3).",
    )


class SafeShareRegionItem(BaseModel):
    """Record of an applied redaction region on the canvas."""
    source: str = Field(description="Region source: finding or custom")
    finding_id: Optional[uuid.UUID] = Field(default=None, description="Linked finding UUID if source=finding")
    finding_type: str = Field(description="Finding type identifier or USER_CUSTOM_SELECTION")
    bbox: List[int] = Field(description="Bounding box [x1, y1, x2, y2]")
    mode: str = Field(description="Redaction mode applied: blur, pixelate, blackout, partial_blur")
    masked_value: Optional[str] = Field(default=None, description="Safely masked finding snippet")
    label: Optional[str] = Field(default=None, description="Custom region label if applicable")


class SafeShareResponseData(BaseModel):
    """Authoritative response metadata for a SafeShare sanitized artifact."""
    model_config = ConfigDict(from_attributes=True)

    redaction_id: uuid.UUID = Field(description="Unique SafeShare redaction identifier")
    scan_id: uuid.UUID = Field(description="Parent scan session identifier")
    original_file_id: uuid.UUID = Field(description="Original source file identifier")
    output_filename: str = Field(description="UUID storage filename of the sanitized PNG")
    download_url: str = Field(description="REST download endpoint URL for the sanitized PNG")
    total_redacted_regions: int = Field(description="Total count of regions redacted on the artifact")
    suggested_findings_count: int = Field(description="Total detected findings in the scan session")
    applied_findings_count: int = Field(description="Number of detected findings redacted")
    custom_regions_count: int = Field(description="Number of user-drawn custom regions redacted")
    redacted_regions: List[Dict[str, Any]] = Field(description="List of all applied redaction boxes")
    metadata_removed: bool = Field(default=True, description="Whether EXIF and camera metadata were stripped")
    created_at: datetime = Field(description="Sanitized artifact generation timestamp in UTC")
