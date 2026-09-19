"""Add scan_findings table

Revision ID: 004_add_scan_findings_table
Revises: 003_add_ocr_and_entities_tables
Create Date: 2026-09-19 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_add_scan_findings_table"
down_revision: Union[str, None] = "003_add_ocr_and_entities_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)
    json_type = postgresql.JSONB if is_postgres else sa.JSON()

    # Create scan_findings table
    op.create_table(
        "scan_findings",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("scan_session_id", uuid_type, nullable=False),
        sa.Column("entity_id", uuid_type, nullable=True),
        sa.Column("finding_type", sa.String(80), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("evidence", json_type, nullable=False),
        sa.Column("recommendation", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["scan_session_id"],
            ["scan_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["entity_id"],
            ["scan_entities.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_scan_findings_id",
        "scan_findings",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_scan_findings_scan_session_id",
        "scan_findings",
        ["scan_session_id"],
        unique=False,
    )
    op.create_index(
        "ix_scan_findings_entity_id",
        "scan_findings",
        ["entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_scan_findings_finding_type",
        "scan_findings",
        ["finding_type"],
        unique=False,
    )
    op.create_index(
        "ix_scan_findings_severity",
        "scan_findings",
        ["severity"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scan_findings_severity", table_name="scan_findings")
    op.drop_index("ix_scan_findings_finding_type", table_name="scan_findings")
    op.drop_index("ix_scan_findings_entity_id", table_name="scan_findings")
    op.drop_index("ix_scan_findings_scan_session_id", table_name="scan_findings")
    op.drop_index("ix_scan_findings_id", table_name="scan_findings")
    op.drop_table("scan_findings")
