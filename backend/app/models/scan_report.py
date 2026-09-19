import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import Boolean, CHAR, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, TypeDecorator

from backend.app.core.database import Base

if TYPE_CHECKING:
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


class ScanReport(Base):
    """
    Persisted cybersecurity intelligence report snapshot.
    Immutable snapshot presented to users as the authoritative Cyber Safety Receipt.
    """
    __tablename__ = "scan_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    scan_session_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("scan_sessions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    exposure_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="SAFE",
    )

    total_findings: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    severity_distribution: Mapped[Dict[str, Any]] = mapped_column(
        SafeJSON,
        nullable=False,
        default=dict,
    )

    threat_categories: Mapped[Dict[str, Any]] = mapped_column(
        SafeJSON,
        nullable=False,
        default=dict,
    )

    safeshare_available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    report_data: Mapped[Dict[str, Any]] = mapped_column(
        SafeJSON,
        nullable=False,
        default=dict,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    scan_session: Mapped["ScanSession"] = relationship(
        "ScanSession",
        back_populates="report",
    )
