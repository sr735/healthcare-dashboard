from __future__ import annotations
import uuid
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.patient import (
    PatientCreate,
    PatientReplace,
    PatientUpdate,
    PatientResponse,
    PaginatedPatients,
)
from app.services.patient_service import PatientService

router = APIRouter(prefix="/patients", tags=["patients"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


def get_service(db: DbDep) -> PatientService:
    return PatientService(db)


ServiceDep = Annotated[PatientService, Depends(get_service)]


@router.get("", response_model=PaginatedPatients)
async def list_patients(
    service: ServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    physician: str | None = Query(default=None),
    sort_by: Literal[
        "last_name", "first_name", "date_of_birth", "gender",
        "primary_physician", "last_visit_date", "status", "created_at", "updated_at"
    ] = Query(default="last_name"),
    sort_dir: Literal["asc", "desc"] = Query(default="asc"),
) -> PaginatedPatients:
    patients, total = await service.get_all(
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        gender=gender,
        physician=physician,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    return PaginatedPatients(
        items=patients,  # type: ignore[arg-type]
        total=total,
        page=page,
        page_size=page_size,
        total_pages=PatientService.total_pages(total, page_size),
    )


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: uuid.UUID, service: ServiceDep) -> PatientResponse:
    patient = await service.get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient  # type: ignore[return-value]


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(payload: PatientCreate, service: ServiceDep) -> PatientResponse:
    patient = await service.create(payload)
    return patient  # type: ignore[return-value]


@router.put("/{patient_id}", response_model=PatientResponse)
async def replace_patient(
    patient_id: uuid.UUID, payload: PatientReplace, service: ServiceDep
) -> PatientResponse:
    patient = await service.get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    replaced = await service.replace(patient, payload)
    return replaced  # type: ignore[return-value]


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: uuid.UUID, payload: PatientUpdate, service: ServiceDep
) -> PatientResponse:
    patient = await service.get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    updated = await service.update(patient, payload)
    return updated  # type: ignore[return-value]


@router.delete("/{patient_id}", response_class=Response)
async def delete_patient(patient_id: uuid.UUID, service: ServiceDep) -> Response:
    patient = await service.get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    await service.delete(patient)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
