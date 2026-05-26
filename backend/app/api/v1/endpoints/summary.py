from __future__ import annotations
import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.patient import Patient
from app.services.patient_service import PatientService
from app.services.note_service import NoteService

router = APIRouter(tags=["summary"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


class PatientSummaryResponse(BaseModel):
    patient_id: uuid.UUID
    full_name: str
    summary: str


def _calc_age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _build_summary(patient: Patient, notes: list) -> str:
    age = _calc_age(patient.date_of_birth)
    full_name = f"{patient.first_name} {patient.last_name}"

    gender_display = {
        "male": "Male", "female": "Female",
        "other": "Other", "prefer_not_to_say": "Not disclosed",
    }.get(patient.gender, patient.gender.capitalize())

    status_display = patient.status.capitalize()

    lines: list[str] = []

    # ── Header ──────────────────────────────────────────────────────────────
    lines.append(f"PATIENT SUMMARY — {full_name.upper()}")
    lines.append("=" * 60)

    # ── Demographics ─────────────────────────────────────────────────────────
    lines.append("\nDEMOGRAPHICS")
    lines.append(f"  Name:          {full_name}")
    lines.append(f"  Age:           {age} years old (DOB: {patient.date_of_birth.strftime('%B %d, %Y')})")
    lines.append(f"  Gender:        {gender_display}")
    lines.append(f"  Blood Type:    {patient.blood_type or 'Unknown'}")
    lines.append(f"  Status:        {status_display}")

    contact_parts = [p for p in [patient.city, patient.state] if p]
    if contact_parts:
        lines.append(f"  Location:      {', '.join(contact_parts)}")

    # ── Clinical ─────────────────────────────────────────────────────────────
    lines.append("\nCLINICAL INFORMATION")
    lines.append(f"  Physician:     {patient.primary_physician or 'Not assigned'}")
    lines.append(
        f"  Last Visit:    "
        f"{patient.last_visit_date.strftime('%B %d, %Y') if patient.last_visit_date else 'No visits recorded'}"
    )

    if patient.insurance_provider:
        ins = patient.insurance_provider
        if patient.insurance_id:
            ins += f" (ID: {patient.insurance_id})"
        lines.append(f"  Insurance:     {ins}")

    lines.append(
        f"  Allergies:     {', '.join(patient.allergies) if patient.allergies else 'None documented'}"
    )

    if patient.medical_notes:
        lines.append("\nMEDICAL BACKGROUND")
        lines.append(f"  {patient.medical_notes}")

    # ── Clinical notes narrative ──────────────────────────────────────────────
    if notes:
        lines.append(f"\nCLINICAL NOTES ({len(notes)} {'entry' if len(notes) == 1 else 'entries'})")
        for note in sorted(notes, key=lambda n: n.created_at):
            ts = note.created_at.strftime("%b %d, %Y %H:%M")
            author_str = f" — {note.author}" if note.author else ""
            lines.append(f"\n  [{ts}{author_str}]")
            for content_line in note.content.strip().splitlines():
                lines.append(f"  {content_line}")
    else:
        lines.append("\nCLINICAL NOTES")
        lines.append("  No clinical notes on record.")

    lines.append("\n" + "=" * 60)
    return "\n".join(lines)


@router.get("/patients/{patient_id}/summary", response_model=PatientSummaryResponse)
async def get_patient_summary(
    patient_id: uuid.UUID,
    db: DbDep,
) -> PatientSummaryResponse:
    patient_service = PatientService(db)
    note_service = NoteService(db)

    patient = await patient_service.get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    notes, _ = await note_service.get_all(patient_id)
    summary_text = _build_summary(patient, notes)

    return PatientSummaryResponse(
        patient_id=patient_id,
        full_name=f"{patient.first_name} {patient.last_name}",
        summary=summary_text,
    )
