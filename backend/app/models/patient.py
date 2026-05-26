import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Date, DateTime, Text, ARRAY, Enum as SAEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

if TYPE_CHECKING:
    from app.models.note import PatientNote


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(
        SAEnum("male", "female", "other", "prefer_not_to_say", name="gender_enum"),
        nullable=False,
    )
    blood_type: Mapped[str | None] = mapped_column(
        SAEnum("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", name="blood_type_enum"),
        nullable=True,
    )

    # Contact
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(50), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Clinical
    status: Mapped[str] = mapped_column(
        SAEnum("active", "inactive", "critical", "discharged", name="patient_status_enum"),
        nullable=False,
        default="active",
        index=True,
    )
    primary_physician: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    insurance_provider: Mapped[str | None] = mapped_column(String(200), nullable=True)
    insurance_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    allergies: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    medical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_visit_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    # Relationships
    notes: Mapped[list["PatientNote"]] = relationship(
        "PatientNote", back_populates="patient", cascade="all, delete-orphan"
    )

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
