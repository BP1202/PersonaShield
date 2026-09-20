import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List
from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from backend.app.core.database import Base
from backend.app.models.scan_session import GUID

if TYPE_CHECKING:
    from backend.app.models.scan_session import ScanSession


class ScanOcrResult(Base):
    """
    Stores OCR extraction results, raw and normalized text, and token bounding boxes.
    """

    __tablename__ = "scan_ocr_results"

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
        unique=True,
    )

    raw_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    normalized_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    tokens: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    scan_session: Mapped["ScanSession"] = relationship(
        "ScanSession",
        back_populates="ocr_result",
    )
