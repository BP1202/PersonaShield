import uuid
from datetime import datetime
from typing import Dict, List
from pydantic import BaseModel, ConfigDict, Field
from backend.app.core.constants import ScanSessionStatus


class TokenData(BaseModel):
    """Extracted OCR token with location coordinates."""
    text: str = Field(description="Recognized token text")
    confidence: float = Field(description="OCR confidence between 0.0 and 1.0")
    bbox: List[int] = Field(description="Bounding box [x1, y1, x2, y2]")
    page_number: int = Field(default=1, description="Page index (1-based)")


class EntityResponseData(BaseModel):
    """Detected sensitive entity with classification and evidence bounding box."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(description="Unique entity detection identifier")
    category: str = Field(description="Cybersecurity risk category (IDENTITY, CREDENTIAL, etc.)")
    entity_type: str = Field(description="Specific entity type (AADHAAR, API_KEY, etc.)")
    text_snippet: str = Field(description="Extracted entity string")
    confidence: float = Field(description="Detection confidence score")
    bbox: List[int] = Field(description="Enclosing bounding box [x1, y1, x2, y2]")
    page_number: int = Field(default=1, description="Document page number")
    created_at: datetime = Field(description="Detection timestamp in UTC")


class ExtractionSummaryResponseData(BaseModel):
    """Summary of complete extraction pipeline."""
    model_config = ConfigDict(from_attributes=True)

    scan_id: uuid.UUID = Field(description="Scan session identifier")
    status: ScanSessionStatus = Field(description="Current status of the scan session")
    total_characters: int = Field(description="Total characters in normalized OCR text")
    total_tokens: int = Field(description="Total OCR tokens extracted")
    total_entities: int = Field(description="Total sensitive entities detected")
    entities_by_category: Dict[str, int] = Field(
        default_factory=dict,
        description="Count breakdown by cybersecurity risk category",
    )
