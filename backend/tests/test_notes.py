"""
Unit tests for /api/v1/patients/{id}/notes endpoints.

All database access is bypassed via patch.object on NoteService and
PatientService.  The test app and async HTTP client come from conftest.py.
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.services.note_service import NoteService
from app.services.patient_service import PatientService


def notes_url(patient_id: uuid.UUID) -> str:
    return f"/api/v1/patients/{patient_id}/notes"


def note_url(patient_id: uuid.UUID, note_id: uuid.UUID) -> str:
    return f"/api/v1/patients/{patient_id}/notes/{note_id}"


# ---------------------------------------------------------------------------
# LIST NOTES
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_notes_returns_empty_when_none_exist(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    patient_id: uuid.UUID,
) -> None:
    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p,
        patch.object(NoteService, "get_all", new_callable=AsyncMock) as mock_n,
    ):
        mock_p.return_value = sample_patient
        mock_n.return_value = ([], 0)

        response = await client.get(notes_url(patient_id))

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_notes_returns_items(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    sample_note: SimpleNamespace,
    patient_id: uuid.UUID,
) -> None:
    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p,
        patch.object(NoteService, "get_all", new_callable=AsyncMock) as mock_n,
    ):
        mock_p.return_value = sample_patient
        mock_n.return_value = ([sample_note], 1)

        response = await client.get(notes_url(patient_id))

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["content"] == "Patient presented with mild fever."
    assert data["items"][0]["author"] == "Dr. Taylor"
    assert data["items"][0]["note_type"] == "clinical"


@pytest.mark.asyncio
async def test_list_notes_includes_synthetic_medical_background(
    client: AsyncClient,
    patient_id: uuid.UUID,
) -> None:
    """When patient.medical_notes is set, a synthetic note is prepended."""
    patient_with_notes = SimpleNamespace(
        id=patient_id,
        first_name="Jane",
        last_name="Smith",
        date_of_birth=None,
        gender="female",
        blood_type=None,
        email=None,
        phone=None,
        address=None,
        city=None,
        state=None,
        zip_code=None,
        status="active",
        primary_physician=None,
        insurance_provider=None,
        insurance_id=None,
        allergies=[],
        medical_notes="Has history of hypertension.",
        last_visit_date=None,
        created_at=__import__("datetime").datetime(2024, 1, 1),
        updated_at=__import__("datetime").datetime(2024, 1, 1),
    )

    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p,
        patch.object(NoteService, "get_all", new_callable=AsyncMock) as mock_n,
    ):
        mock_p.return_value = patient_with_notes
        mock_n.return_value = ([], 0)

        response = await client.get(notes_url(patient_id))

    assert response.status_code == 200
    data = response.json()
    # total should be bumped by 1 (the synthetic note)
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["note_type"] == "medical_background"
    assert "hypertension" in data["items"][0]["content"]


@pytest.mark.asyncio
async def test_list_notes_patient_not_found(
    client: AsyncClient, patient_id: uuid.UUID
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p:
        mock_p.return_value = None
        response = await client.get(notes_url(patient_id))

    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


# ---------------------------------------------------------------------------
# CREATE NOTE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_note_success(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    sample_note: SimpleNamespace,
    patient_id: uuid.UUID,
) -> None:
    payload = {"content": "Patient presented with mild fever.", "note_type": "clinical", "author": "Dr. Taylor"}

    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p,
        patch.object(NoteService, "create", new_callable=AsyncMock) as mock_create,
    ):
        mock_p.return_value = sample_patient
        mock_create.return_value = sample_note

        response = await client.post(notes_url(patient_id), json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["content"] == sample_note.content
    assert data["patient_id"] == str(patient_id)
    mock_create.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_note_missing_content(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    patient_id: uuid.UUID,
) -> None:
    """content is required; omitting it should produce a 422."""
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p:
        mock_p.return_value = sample_patient
        response = await client.post(notes_url(patient_id), json={"author": "Dr. X"})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_note_patient_not_found(
    client: AsyncClient, patient_id: uuid.UUID
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p:
        mock_p.return_value = None
        response = await client.post(
            notes_url(patient_id),
            json={"content": "Some note."},
        )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE NOTE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_note_success(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    sample_note: SimpleNamespace,
    patient_id: uuid.UUID,
    note_id: uuid.UUID,
) -> None:
    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p,
        patch.object(NoteService, "get_by_id", new_callable=AsyncMock) as mock_n,
        patch.object(NoteService, "delete", new_callable=AsyncMock) as mock_del,
    ):
        mock_p.return_value = sample_patient
        mock_n.return_value = sample_note
        mock_del.return_value = None

        response = await client.delete(note_url(patient_id, note_id))

    assert response.status_code == 204
    assert response.content == b""
    mock_del.assert_awaited_once_with(sample_note)


@pytest.mark.asyncio
async def test_delete_note_not_found(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    patient_id: uuid.UUID,
    note_id: uuid.UUID,
) -> None:
    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p,
        patch.object(NoteService, "get_by_id", new_callable=AsyncMock) as mock_n,
    ):
        mock_p.return_value = sample_patient
        mock_n.return_value = None

        response = await client.delete(note_url(patient_id, note_id))

    assert response.status_code == 404
    assert response.json()["detail"] == "Note not found"


@pytest.mark.asyncio
async def test_delete_note_wrong_patient(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    patient_id: uuid.UUID,
    note_id: uuid.UUID,
) -> None:
    """Note exists but belongs to a different patient → 404."""
    other_patient_id = uuid.uuid4()
    wrong_note = SimpleNamespace(
        id=note_id,
        patient_id=other_patient_id,  # mismatched
        content="Some note.",
        author=None,
        note_type="clinical",
        created_at=__import__("datetime").datetime(2024, 1, 1),
    )

    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p,
        patch.object(NoteService, "get_by_id", new_callable=AsyncMock) as mock_n,
    ):
        mock_p.return_value = sample_patient
        mock_n.return_value = wrong_note

        response = await client.delete(note_url(patient_id, note_id))

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_note_patient_not_found(
    client: AsyncClient, patient_id: uuid.UUID, note_id: uuid.UUID
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_p:
        mock_p.return_value = None
        response = await client.delete(note_url(patient_id, note_id))

    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"
