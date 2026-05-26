"""add last_visit_date to patients

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "patients",
        sa.Column("last_visit_date", sa.Date(), nullable=True),
    )
    op.create_index("ix_patients_last_visit_date", "patients", ["last_visit_date"])


def downgrade() -> None:
    op.drop_index("ix_patients_last_visit_date", table_name="patients")
    op.drop_column("patients", "last_visit_date")
