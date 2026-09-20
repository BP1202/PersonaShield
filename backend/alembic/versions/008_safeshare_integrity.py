"""Add output_sha256 to scan_redactions for SafeShare integrity verification

Revision ID: 008_safeshare_integrity
Revises: 007_add_scan_redactions
Create Date: 2026-09-20 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic (must be <= 32 chars).
revision: str = "008_safeshare_integrity"
down_revision: Union[str, None] = "007_add_scan_redactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add output_sha256 for tamper detection of SafeShare artifacts
    op.add_column(
        "scan_redactions",
        sa.Column(
            "output_sha256",
            sa.String(64),
            nullable=True,
            comment="SHA-256 fingerprint of the sanitized SafeShare PNG artifact for tamper detection.",
        ),
    )


def downgrade() -> None:
    op.drop_column("scan_redactions", "output_sha256")
