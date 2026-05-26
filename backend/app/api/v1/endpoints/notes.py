from __future__ import annotations
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.note import NoteCreate, NoteResponse, NoteListResponse
from app.services.patient_service import PatientService
from app.services.note_service import NoteService

# Stable namespace for deterministic UUIDs generated from medical_notes
_MEDICAL_NOTES_NS = uuid.UUID("b3e2c1d0-4f5a-6789-abcd-ef0123456789")

router = APIRouter(tags=["notes"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


def get_note_service(db: DbDep) -> NoteService:
    return NoteService(db)


def get_patient_service(db: DbDep) -> PatientService:
    return PatientService(db)


NoteServiceDep = Annotated[NoteService, Depends(get_note_service)]
PatientServiceDep = Annotated[PatientService, Depends(get_patient_service)]


async def _get_patient_or_404(patient_id: uuid.UUID, service: PatientService):
    patient = await service.get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


@router.get("/patients/{patient_id}/notes", response_model=NoteListResponse)
async def list_notes(
    patient_id: uuid.UUID,
    patient_service: PatientServiceDep,
    note_service: NoteServiceDep,
) -> NoteListResponse:
    patient = await _get_patient_or_404(patient_id, patient_service)
    notes, total = await note_service.get_all(patient_id)

    # Inject medical_notes from the patient profile as a pinned synthetic note
    if patient.medical_notes:
        synthetic = NoteResponse(
            id=uuid.uuid5(_MEDICAL_NOTES_NS, str(patient_id)),
            patient_id=patient_id,
            content=patient.medical_notes,
            author=None,
            created_at=patient.created_at,
            note_type="medical_background",
        )
        items = [synthetic] + list(notes)
        return NoteListResponse(items=items, total=total + 1)

    return NoteListResponse(items=list(notes), total=total)


@router.post(
    "/patients/{patient_id}/notes",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_note(
    patient_id: uuid.UUID,
    payload: NoteCreate,
    patient_service: PatientServiceDep,
    note_service: NoteServiceDep,
) -> NoteResponse:
    await _get_patient_or_404(patient_id, patient_service)
    note = await note_service.create(patient_id, payload)
    return note  # type: ignore[return-value]


@router.delete(
    "/patients/{patient_id}/notes/{note_id}",
    response_class=Response,
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_note(
    patient_id: uuid.UUID,
    note_id: uuid.UUID,
    patient_service: PatientServiceDep,
    note_service: NoteServiceDep,
) -> Response:
    await _get_patient_or_404(patient_id, patient_service)
    note = await note_service.get_by_id(note_id)
    if not note or note.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    await note_service.delete(note)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
