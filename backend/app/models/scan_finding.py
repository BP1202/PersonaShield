import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import CHAR, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, TypeDecorator

from backend.app.core.database import Base

if TYPE_CHECKING:
    from backend.app.models.scan_session import ScanSession
    from backend.app.models.scan_entity import ScanEntity


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


class ScanFinding(Base):
    """
    Persisted cybersecurity risk finding.
    Represents an evidence-backed security exposure evaluated by the Exposure Detection Engine.
    """
    __tablename__ = "scan_findings"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    scan_session_id: Mapped[uuid.UUID] = mapped_column(
        GUID,
        ForeignKey("scan_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID,
        ForeignKey("scan_entities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    finding_type: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    attack_surface: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Developer",
        index=True,
    )

    exposure_vector: Mapped[str] = mapped_column(
        String(80),
        nullable=False,
        default="Credential Leakage",
        index=True,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=1.0,
    )

    confidence_reasons: Mapped[List[str]] = mapped_column(
        SafeJSON,
        nullable=False,
        default=list,
    )

    evidence: Mapped[Dict[str, Any]] = mapped_column(
        SafeJSON,
        nullable=False,
        default=dict,
    )

    recommendation: Mapped[Dict[str, Any]] = mapped_column(
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
        back_populates="findings",
    )

    entity: Mapped[Optional["ScanEntity"]] = relationship(
        "ScanEntity",
        lazy="selectin",
    )
