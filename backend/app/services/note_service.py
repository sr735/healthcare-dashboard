from __future__ import annotations
import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.note import PatientNote
from app.schemas.note import NoteCreate


class NoteService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(self, patient_id: uuid.UUID) -> tuple[list[PatientNote], int]:
        query = (
            select(PatientNote)
            .where(PatientNote.patient_id == patient_id)
            .order_by(PatientNote.created_at.desc())
        )
        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        result = await self.db.execute(query)
        notes = list(result.scalars().all())
        return notes, total

    async def create(self, patient_id: uuid.UUID, payload: NoteCreate) -> PatientNote:
        data = payload.model_dump(exclude_none=True)
        note = PatientNote(id=uuid.uuid4(), patient_id=patient_id, **data)
        self.db.add(note)
        await self.db.flush()
        await self.db.refresh(note)
        return note

    async def get_by_id(self, note_id: uuid.UUID) -> PatientNote | None:
        result = await self.db.execute(
            select(PatientNote).where(PatientNote.id == note_id)
        )
        return result.scalar_one_or_none()

    async def delete(self, note: PatientNote) -> None:
        await self.db.delete(note)
        await self.db.flush()
