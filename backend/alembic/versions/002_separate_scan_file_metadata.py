"""Separate scan file metadata from scan session

Revision ID: 002_separate_scan_file_metadata
Revises: 001_initial_scan_session
Create Date: 2026-09-19 16:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002_separate_scan_file_metadata"
down_revision: Union[str, None] = "001_initial_scan_session"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    # 1. Create scan_files table
    op.create_table(
        "scan_files",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("scan_session_id", uuid_type, nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("display_filename", sa.String(length=128), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["scan_session_id"],
            ["scan_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scan_files_id", "scan_files", ["id"])
    op.create_index("ix_scan_files_scan_session_id", "scan_files", ["scan_session_id"])
    op.create_index("ix_scan_files_sha256_hash", "scan_files", ["sha256_hash"])

    # 2. Drop legacy metadata columns from scan_sessions table
    with op.batch_alter_table("scan_sessions") as batch_op:
        batch_op.drop_index("ix_scan_sessions_file_id")
        batch_op.drop_column("file_id")
        batch_op.drop_column("stored_filename")
        batch_op.drop_column("original_filename")
        batch_op.drop_column("mime_type")
        batch_op.drop_column("file_size_bytes")


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)

    with op.batch_alter_table("scan_sessions") as batch_op:
        batch_op.add_column(sa.Column("file_size_bytes", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("mime_type", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("original_filename", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("stored_filename", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("file_id", uuid_type, nullable=True))
        batch_op.create_index("ix_scan_sessions_file_id", ["file_id"])

    op.drop_index("ix_scan_files_sha256_hash", table_name="scan_files")
    op.drop_index("ix_scan_files_scan_session_id", table_name="scan_files")
    op.drop_index("ix_scan_files_id", table_name="scan_files")
    op.drop_table("scan_files")
