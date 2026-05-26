from __future__ import annotations
import enum
import uuid
from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, field_validator


BloodType = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
PatientStatus = Literal["active", "inactive", "critical", "discharged"]
Gender = Literal["male", "female", "other", "prefer_not_to_say"]


class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: date
    gender: Gender
    blood_type: BloodType | None = None
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=50)
    zip_code: str | None = Field(None, max_length=20)
    status: PatientStatus = "active"
    primary_physician: str | None = Field(None, max_length=200)
    insurance_provider: str | None = Field(None, max_length=200)
    insurance_id: str | None = Field(None, max_length=100)
    allergies: list[str] = Field(default_factory=list)
    medical_notes: str | None = None
    last_visit_date: date | None = None

    @field_validator("gender", "blood_type", "status", mode="before")
    @classmethod
    def coerce_enum_to_str(cls, v: object) -> object:
        """SQLAlchemy returns Python enum instances; coerce them to plain strings."""
        return v.value if isinstance(v, enum.Enum) else v

    @field_validator("date_of_birth")
    @classmethod
    def dob_not_in_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v


class PatientCreate(PatientBase):
    pass


class PatientReplace(PatientBase):
    pass


class PatientUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    date_of_birth: date | None = None
    gender: Gender | None = None
    blood_type: BloodType | None = None
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    address: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=50)
    zip_code: str | None = Field(None, max_length=20)
    status: PatientStatus | None = None
    primary_physician: str | None = Field(None, max_length=200)
    insurance_provider: str | None = Field(None, max_length=200)
    insurance_id: str | None = Field(None, max_length=100)
    allergies: list[str] | None = None
    medical_notes: str | None = None
    last_visit_date: date | None = None

    @field_validator("gender", "blood_type", "status", mode="before")
    @classmethod
    def coerce_enum_to_str(cls, v: object) -> object:
        return v.value if isinstance(v, enum.Enum) else v


class PatientResponse(PatientBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedPatients(BaseModel):
    items: list[PatientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
