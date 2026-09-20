"""Initial scan session model

Revision ID: 001_initial_scan_session
Revises: 
Create Date: 2026-09-19 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_scan_session"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use postgresql.UUID if on postgres, fallback to CHAR(36)
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    op.create_table(
        "scan_sessions",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("file_id", uuid_type, nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scan_sessions_id", "scan_sessions", ["id"])
    op.create_index("ix_scan_sessions_status", "scan_sessions", ["status"])
    op.create_index("ix_scan_sessions_file_id", "scan_sessions", ["file_id"])


def downgrade() -> None:
    op.drop_index("ix_scan_sessions_file_id", table_name="scan_sessions")
    op.drop_index("ix_scan_sessions_status", table_name="scan_sessions")
    op.drop_index("ix_scan_sessions_id", table_name="scan_sessions")
    op.drop_table("scan_sessions")
