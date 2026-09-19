import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from backend.app.core.database import Base
from backend.app.models.scan_session import GUID

if TYPE_CHECKING:
    from backend.app.models.scan_session import ScanSession


class ScanEntity(Base):
    """
    Stores detected sensitive entities, their cybersecurity category, confidence score,
    and associated OCR bounding box.
    """

    __tablename__ = "scan_entities"

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

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    entity_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    text_snippet: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    bbox: Mapped[List[int]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    page_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    scan_session: Mapped["ScanSession"] = relationship(
        "ScanSession",
        back_populates="entities",
    )
