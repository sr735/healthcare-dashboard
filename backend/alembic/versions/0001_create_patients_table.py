"""create patients table

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums first
    gender_enum = postgresql.ENUM(
        "male", "female", "other", "prefer_not_to_say",
        name="gender_enum", create_type=True
    )
    blood_type_enum = postgresql.ENUM(
        "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
        name="blood_type_enum", create_type=True
    )
    patient_status_enum = postgresql.ENUM(
        "active", "inactive", "critical", "discharged",
        name="patient_status_enum", create_type=True
    )
    gender_enum.create(op.get_bind(), checkfirst=True)
    blood_type_enum.create(op.get_bind(), checkfirst=True)
    patient_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "patients",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", sa.Enum("male", "female", "other", "prefer_not_to_say", name="gender_enum"), nullable=False),
        sa.Column("blood_type", sa.Enum("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", name="blood_type_enum"), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("address", sa.String(255), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("state", sa.String(50), nullable=True),
        sa.Column("zip_code", sa.String(20), nullable=True),
        sa.Column("status", sa.Enum("active", "inactive", "critical", "discharged", name="patient_status_enum"), nullable=False, server_default="active"),
        sa.Column("primary_physician", sa.String(200), nullable=True),
        sa.Column("insurance_provider", sa.String(200), nullable=True),
        sa.Column("insurance_id", sa.String(100), nullable=True),
        sa.Column("allergies", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("medical_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Indexes for common query patterns
    op.create_index("ix_patients_email", "patients", ["email"])
    op.create_index("ix_patients_status", "patients", ["status"])
    op.create_index("ix_patients_primary_physician", "patients", ["primary_physician"])
    op.create_index("ix_patients_last_name", "patients", ["last_name"])


def downgrade() -> None:
    op.drop_index("ix_patients_last_name", table_name="patients")
    op.drop_index("ix_patients_primary_physician", table_name="patients")
    op.drop_index("ix_patients_status", table_name="patients")
    op.drop_index("ix_patients_email", table_name="patients")
    op.drop_table("patients")

    op.execute("DROP TYPE IF EXISTS patient_status_enum")
    op.execute("DROP TYPE IF EXISTS blood_type_enum")
    op.execute("DROP TYPE IF EXISTS gender_enum")
