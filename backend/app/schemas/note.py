from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10_000)
    author: str | None = Field(None, max_length=200)
    # Allow client to supply a timestamp (e.g. backdating); defaults to now() server-side
    created_at: datetime | None = None


class NoteResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    content: str
    author: str | None
    created_at: datetime
    note_type: str = "clinical"  # "clinical" for regular notes, "medical_background" for profile-sourced

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    items: list[NoteResponse]
    total: int
