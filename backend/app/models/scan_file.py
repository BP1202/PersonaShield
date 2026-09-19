import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base
from backend.app.models.scan_session import GUID

if TYPE_CHECKING:
    from backend.app.models.scan_session import ScanSession


class ScanFile(Base):
    """
    Metadata record for files uploaded to a scan session.
    Stores UUID storage filename, sanitized display filename, and SHA-256 fingerprint.
    """

    __tablename__ = "scan_files"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        nullable=False,
    )

    scan_session_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("scan_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    stored_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    display_filename: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )

    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    file_size_bytes: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    sha256_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    scan_session: Mapped["ScanSession"] = relationship(
        "ScanSession",
        back_populates="file",
    )
