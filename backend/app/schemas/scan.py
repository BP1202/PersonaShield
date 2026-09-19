import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.scan_session import ScanSessionStatus


class ScanCreateResponse(BaseModel):
    """Response returned upon successful creation of a scan session."""
    model_config = ConfigDict(from_attributes=True)

    scan_id: uuid.UUID = Field(description="Unique identifier for the scan session")
    status: ScanSessionStatus = Field(description="Initial status of the scan session")
    file_id: uuid.UUID = Field(description="Unique identifier of the uploaded file artifact")
    original_filename: str = Field(description="Sanitized name of the uploaded file")
    file_size_bytes: int = Field(description="Size of the uploaded file in bytes")
    created_at: datetime = Field(description="Creation timestamp in UTC")


class ScanStatusResponse(BaseModel):
    """Response returned when querying scan session status."""
    model_config = ConfigDict(from_attributes=True)

    scan_id: uuid.UUID = Field(description="Unique identifier for the scan session")
    status: ScanSessionStatus = Field(description="Current status of the scan session")
    original_filename: str = Field(description="Sanitized name of the uploaded file")
    mime_type: str = Field(description="Validated MIME type")
    file_size_bytes: int = Field(description="Size of the uploaded file in bytes")
    created_at: datetime = Field(description="Creation timestamp in UTC")
    updated_at: datetime = Field(description="Last status update timestamp in UTC")
