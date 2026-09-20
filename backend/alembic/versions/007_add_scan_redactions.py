"""Add scan_redactions table for SafeShare engine

Revision ID: 007_add_scan_redactions
Revises: 006_enrich_findings
Create Date: 2026-09-19 22:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = "007_add_scan_redactions"
down_revision: Union[str, None] = "006_enrich_findings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)
    json_type = postgresql.JSONB if is_postgres else sa.JSON()

    # Create scan_redactions table
    op.create_table(
        "scan_redactions",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("scan_session_id", uuid_type, nullable=False),
        sa.Column("original_file_id", uuid_type, nullable=False),
        sa.Column("output_filename", sa.String(255), nullable=False),
        sa.Column("redacted_regions", json_type, nullable=False),
        sa.Column("metadata_removed", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["scan_session_id"],
            ["scan_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["original_file_id"],
            ["scan_files.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_scan_redactions_id",
        "scan_redactions",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_scan_redactions_scan_session_id",
        "scan_redactions",
        ["scan_session_id"],
        unique=False,
    )
    op.create_index(
        "ix_scan_redactions_original_file_id",
        "scan_redactions",
        ["original_file_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scan_redactions_original_file_id", table_name="scan_redactions")
    op.drop_index("ix_scan_redactions_scan_session_id", table_name="scan_redactions")
    op.drop_index("ix_scan_redactions_id", table_name="scan_redactions")
    op.drop_table("scan_redactions")
