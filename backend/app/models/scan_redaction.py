import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, CHAR, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, TypeDecorator

from backend.app.core.database import Base

if TYPE_CHECKING:
    from backend.app.models.scan_file import ScanFile
    from backend.app.models.scan_session import ScanSession


class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value


class SafeJSON(TypeDecorator):
    """Platform-independent JSON type (JSONB on PostgreSQL, JSON on SQLite)."""
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


class ScanRedaction(Base):
    """
    Persisted record of a SafeShare redaction artifact.
    Contains metadata of the generated privacy-preserving sanitized output,
    applied bounding box regions, and stripped EXIF status.
    """
    __tablename__ = "scan_redactions"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    scan_session_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("scan_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    original_file_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("scan_files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    output_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    redacted_regions: Mapped[List[Dict[str, Any]]] = mapped_column(
        SafeJSON,
        nullable=False,
        default=list,
    )

    metadata_removed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    output_sha256: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=False,
        comment="SHA-256 fingerprint of the sanitized SafeShare PNG artifact for tamper detection.",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    scan_session: Mapped["ScanSession"] = relationship(
        "ScanSession",
        back_populates="redactions",
    )

    original_file: Mapped["ScanFile"] = relationship(
        "ScanFile",
        lazy="selectin",
    )
