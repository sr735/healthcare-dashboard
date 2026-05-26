from __future__ import annotations
import uuid
import math
from typing import Literal
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate, PatientReplace


SortField = Literal[
    "last_name", "first_name", "date_of_birth", "gender",
    "primary_physician", "last_visit_date", "status", "created_at", "updated_at"
]
SortDir = Literal["asc", "desc"]


class PatientService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        status: str | None = None,
        gender: str | None = None,
        physician: str | None = None,
        sort_by: SortField = "last_name",
        sort_dir: SortDir = "asc",
    ) -> tuple[list[Patient], int]:
        query = select(Patient)

        if search:
            term = f"%{search}%"
            query = query.where(
                or_(
                    Patient.first_name.ilike(term),
                    Patient.last_name.ilike(term),
                    Patient.email.ilike(term),
                    Patient.phone.ilike(term),
                )
            )
        if status:
            query = query.where(Patient.status == status)
        if gender:
            query = query.where(Patient.gender == gender)
        if physician:
            query = query.where(Patient.primary_physician.ilike(f"%{physician}%"))

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        sort_col = getattr(Patient, sort_by, Patient.last_name)
        sort_expr = sort_col.asc() if sort_dir == "asc" else sort_col.desc()
        query = query.order_by(sort_expr)

        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        patients = list(result.scalars().all())
        return patients, total

    async def get_by_id(self, patient_id: uuid.UUID) -> Patient | None:
        result = await self.db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        return result.scalar_one_or_none()

    async def create(self, payload: PatientCreate) -> Patient:
        patient = Patient(**payload.model_dump())
        self.db.add(patient)
        await self.db.flush()
        await self.db.refresh(patient)
        return patient

    async def update(self, patient: Patient, payload: PatientUpdate) -> Patient:
        # PATCH: apply only the fields that were explicitly provided
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(patient, field, value)
        await self.db.flush()
        await self.db.refresh(patient)
        return patient

    async def replace(self, patient: Patient, payload: PatientReplace) -> Patient:
        # PUT: replace all mutable fields; unset optionals reset to None
        replace_data = payload.model_dump()
        for field, value in replace_data.items():
            setattr(patient, field, value)
        await self.db.flush()
        await self.db.refresh(patient)
        return patient

    async def delete(self, patient: Patient) -> None:
        await self.db.delete(patient)
        await self.db.flush()

    @staticmethod
    def total_pages(total: int, page_size: int) -> int:
        return max(1, math.ceil(total / page_size))
