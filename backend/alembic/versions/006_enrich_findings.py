"""Enrich scan_findings with attack_surface, exposure_vector, and confidence_reasons

Revision ID: 006_enrich_findings
Revises: 005_add_scan_reports_table
Create Date: 2026-09-19 19:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic (max 32 chars).
revision: str = "006_enrich_findings"
down_revision: Union[str, None] = "005_add_scan_reports_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    json_type = postgresql.JSONB if is_postgres else sa.JSON()

    # Add columns if not already existing
    op.add_column(
        "scan_findings",
        sa.Column("attack_surface", sa.String(50), nullable=False, server_default="Developer"),
    )
    op.add_column(
        "scan_findings",
        sa.Column("exposure_vector", sa.String(80), nullable=False, server_default="Credential Leakage"),
    )
    op.add_column(
        "scan_findings",
        sa.Column("confidence_reasons", json_type, nullable=False, server_default="[]"),
    )

    op.create_index(
        "ix_scan_findings_attack_surface",
        "scan_findings",
        ["attack_surface"],
        unique=False,
    )
    op.create_index(
        "ix_scan_findings_exposure_vector",
        "scan_findings",
        ["exposure_vector"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scan_findings_exposure_vector", table_name="scan_findings")
    op.drop_index("ix_scan_findings_attack_surface", table_name="scan_findings")
    op.drop_column("scan_findings", "confidence_reasons")
    op.drop_column("scan_findings", "exposure_vector")
    op.drop_column("scan_findings", "attack_surface")
