"""create patient_notes table

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patient_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("author", sa.String(200), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_patient_notes_patient_id", "patient_notes", ["patient_id"])
    op.create_index("ix_patient_notes_created_at", "patient_notes", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_patient_notes_created_at", table_name="patient_notes")
    op.drop_index("ix_patient_notes_patient_id", table_name="patient_notes")
    op.drop_table("patient_notes")
