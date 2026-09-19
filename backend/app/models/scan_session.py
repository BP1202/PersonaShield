import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import CHAR, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from backend.app.core.constants import ScanSessionStatus
from backend.app.core.database import Base

if TYPE_CHECKING:
    from backend.app.models.scan_file import ScanFile
    from backend.app.models.scan_ocr_result import ScanOcrResult
    from backend.app.models.scan_entity import ScanEntity
    from backend.app.models.scan_finding import ScanFinding


# Universal UUID Type that works seamlessly on PostgreSQL (native UUID) and SQLite/other backends
class GUID(TypeDecorator):
    """Platform-independent GUID/UUID type."""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == "postgresql":
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class ScanSession(Base):
    """
    ScanSession database model representing workflow and lifecycle state.
    File artifact metadata is stored separately in ScanFile.
    """

    __tablename__ = "scan_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    status: Mapped[ScanSessionStatus] = mapped_column(
        Enum(
            ScanSessionStatus,
            name="scan_session_status_enum",
            values_callable=lambda obj: [e.value for e in obj],
            native_enum=False,
        ),
        default=ScanSessionStatus.PENDING,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    file: Mapped[Optional["ScanFile"]] = relationship(
        "ScanFile",
        back_populates="scan_session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    ocr_result: Mapped[Optional["ScanOcrResult"]] = relationship(
        "ScanOcrResult",
        back_populates="scan_session",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    entities: Mapped[List["ScanEntity"]] = relationship(
        "ScanEntity",
        back_populates="scan_session",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    findings: Mapped[List["ScanFinding"]] = relationship(
        "ScanFinding",
        back_populates="scan_session",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

