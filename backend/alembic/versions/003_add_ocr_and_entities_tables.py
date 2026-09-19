"""Add scan_ocr_results and scan_entities tables

Revision ID: 003_add_ocr_and_entities_tables
Revises: 002_separate_scan_file_metadata
Create Date: 2026-09-19 16:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003_add_ocr_and_entities_tables"
down_revision: Union[str, None] = "002_separate_scan_file_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)
    json_type = postgresql.JSONB if is_postgres else sa.JSON()

    # 1. Create scan_ocr_results table
    op.create_table(
        "scan_ocr_results",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("scan_session_id", uuid_type, nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("normalized_text", sa.Text(), nullable=False),
        sa.Column("tokens", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["scan_session_id"],
            ["scan_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scan_session_id"),
    )
    op.create_index("ix_scan_ocr_results_id", "scan_ocr_results", ["id"])

    # 2. Create scan_entities table
    op.create_table(
        "scan_entities",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("scan_session_id", uuid_type, nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("text_snippet", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("bbox", json_type, nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["scan_session_id"],
            ["scan_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scan_entities_id", "scan_entities", ["id"])
    op.create_index("ix_scan_entities_scan_session_id", "scan_entities", ["scan_session_id"])
    op.create_index("ix_scan_entities_category", "scan_entities", ["category"])
    op.create_index("ix_scan_entities_entity_type", "scan_entities", ["entity_type"])


def downgrade() -> None:
    op.drop_index("ix_scan_entities_entity_type", table_name="scan_entities")
    op.drop_index("ix_scan_entities_category", table_name="scan_entities")
    op.drop_index("ix_scan_entities_scan_session_id", table_name="scan_entities")
    op.drop_index("ix_scan_entities_id", table_name="scan_entities")
    op.drop_table("scan_entities")

    op.drop_index("ix_scan_ocr_results_id", table_name="scan_ocr_results")
    op.drop_table("scan_ocr_results")
