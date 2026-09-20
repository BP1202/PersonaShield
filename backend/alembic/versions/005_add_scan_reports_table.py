"""Add scan_reports table

Revision ID: 005_add_scan_reports_table
Revises: 004_add_scan_findings_table
Create Date: 2026-09-19 18:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "005_add_scan_reports_table"
down_revision: Union[str, None] = "004_add_scan_findings_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.CHAR(36)
    json_type = postgresql.JSONB if is_postgres else sa.JSON()

    # Create scan_reports table
    op.create_table(
        "scan_reports",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("scan_session_id", uuid_type, nullable=False),
        sa.Column("exposure_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="SAFE"),
        sa.Column("total_findings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("severity_distribution", json_type, nullable=False),
        sa.Column("threat_categories", json_type, nullable=False),
        sa.Column("safeshare_available", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("report_data", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["scan_session_id"],
            ["scan_sessions.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scan_session_id", name="uq_scan_reports_scan_session_id"),
    )

    op.create_index(
        "ix_scan_reports_id",
        "scan_reports",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_scan_reports_scan_session_id",
        "scan_reports",
        ["scan_session_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_scan_reports_scan_session_id", table_name="scan_reports")
    op.drop_index("ix_scan_reports_id", table_name="scan_reports")
    op.drop_table("scan_reports")


