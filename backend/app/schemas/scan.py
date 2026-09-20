import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from backend.app.core.constants import ScanSessionStatus


class ScanFileData(BaseModel):
    """File metadata associated with a scan session."""
    model_config = ConfigDict(from_attributes=True)

    file_id: uuid.UUID = Field(description="Unique identifier of the stored file artifact")
    stored_filename: str = Field(description="UUID-based filename on disk")
    display_filename: str = Field(description="Sanitized non-PII display filename")
    mime_type: str = Field(description="Validated MIME type")
    file_size_bytes: int = Field(description="Size in bytes")
    sha256_hash: str = Field(description="SHA-256 cryptographic integrity digest")
    created_at: datetime = Field(description="Upload timestamp in UTC")


class ScanCreateResponseData(BaseModel):
    """Data returned upon successful scan creation."""
    model_config = ConfigDict(from_attributes=True)

    scan_id: uuid.UUID = Field(description="Unique scan session ID")
    status: ScanSessionStatus = Field(description="Current status of the scan")
    file_id: uuid.UUID = Field(description="Associated file artifact ID")
    display_filename: str = Field(description="Sanitized display filename")
    file_size_bytes: int = Field(description="Size in bytes")
    sha256_hash: str = Field(description="SHA-256 cryptographic fingerprint")
    created_at: datetime = Field(description="Creation timestamp in UTC")


class ScanStatusResponseData(BaseModel):
    """Data returned when querying scan status."""
    model_config = ConfigDict(from_attributes=True)

    scan_id: uuid.UUID = Field(description="Unique scan session ID")
    status: ScanSessionStatus = Field(description="Current status of the scan session")
    created_at: datetime = Field(description="Creation timestamp in UTC")
    updated_at: datetime = Field(description="Last status update timestamp in UTC")
    file: ScanFileData = Field(description="Associated file metadata")
