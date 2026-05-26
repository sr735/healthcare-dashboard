"""
Unit tests for /api/v1/patients endpoints.

Strategy: patch.object(PatientService, "method") so tests exercise the real
route logic (request parsing, response serialisation, HTTP status codes, error
handling) without touching PostgreSQL.
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.services.patient_service import PatientService


PREFIX = "/api/v1/patients"


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_patients_empty(client: AsyncClient) -> None:
    with patch.object(PatientService, "get_all", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = ([], 0)

        response = await client.get(PREFIX)

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1
    assert data["total_pages"] == 1


@pytest.mark.asyncio
async def test_list_patients_returns_items(
    client: AsyncClient, sample_patient: SimpleNamespace
) -> None:
    with patch.object(PatientService, "get_all", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = ([sample_patient], 1)

        response = await client.get(PREFIX)

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["first_name"] == "Jane"
    assert data["items"][0]["last_name"] == "Smith"


@pytest.mark.asyncio
async def test_list_patients_pagination_params(
    client: AsyncClient, sample_patient: SimpleNamespace
) -> None:
    with patch.object(PatientService, "get_all", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = ([sample_patient], 42)

        response = await client.get(PREFIX, params={"page": 3, "page_size": 10})

    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 3
    assert data["page_size"] == 10
    assert data["total"] == 42
    assert data["total_pages"] == 5
    mock_get.assert_awaited_once()
    call_kwargs = mock_get.call_args.kwargs
    assert call_kwargs["page"] == 3
    assert call_kwargs["page_size"] == 10


@pytest.mark.asyncio
async def test_list_patients_invalid_page_size(client: AsyncClient) -> None:
    """page_size > 100 should be rejected by FastAPI query validation."""
    with patch.object(PatientService, "get_all", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = ([], 0)
        response = await client.get(PREFIX, params={"page_size": 9999})

    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET by ID
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_patient_found(
    client: AsyncClient, sample_patient: SimpleNamespace, patient_id: uuid.UUID
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = sample_patient

        response = await client.get(f"{PREFIX}/{patient_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(patient_id)
    assert data["email"] == "jane.smith@example.com"
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_get_patient_not_found(
    client: AsyncClient, patient_id: uuid.UUID
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None

        response = await client.get(f"{PREFIX}/{patient_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@pytest.mark.asyncio
async def test_get_patient_invalid_uuid(client: AsyncClient) -> None:
    """A non-UUID path parameter should produce a 422 from FastAPI."""
    response = await client.get(f"{PREFIX}/not-a-valid-uuid")
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_patient_success(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    valid_patient_payload: dict,
) -> None:
    with patch.object(PatientService, "create", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = sample_patient

        response = await client.post(PREFIX, json=valid_patient_payload)

    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == sample_patient.first_name
    mock_create.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_patient_missing_required_field(client: AsyncClient) -> None:
    """Omitting first_name should produce a 422 validation error."""
    payload = {
        "last_name": "Doe",
        "date_of_birth": "1990-05-20",
        "gender": "male",
        "status": "active",
    }
    response = await client.post(PREFIX, json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_patient_invalid_gender(client: AsyncClient) -> None:
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "date_of_birth": "1990-01-01",
        "gender": "INVALID_GENDER",
        "status": "active",
    }
    response = await client.post(PREFIX, json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_patient_invalid_status(client: AsyncClient) -> None:
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "status": "NOT_A_STATUS",
    }
    response = await client.post(PREFIX, json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# PATCH (partial update)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_update_patient_success(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    patient_id: uuid.UUID,
) -> None:
    updated = SimpleNamespace(**sample_patient.__dict__)
    updated.status = "inactive"

    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get,
        patch.object(PatientService, "update", new_callable=AsyncMock) as mock_update,
    ):
        mock_get.return_value = sample_patient
        mock_update.return_value = updated

        response = await client.patch(
            f"{PREFIX}/{patient_id}", json={"status": "inactive"}
        )

    assert response.status_code == 200
    assert response.json()["status"] == "inactive"


@pytest.mark.asyncio
async def test_update_patient_not_found(
    client: AsyncClient, patient_id: uuid.UUID
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        response = await client.patch(
            f"{PREFIX}/{patient_id}", json={"status": "inactive"}
        )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# PUT (full replace)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_replace_patient_success(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    patient_id: uuid.UUID,
    valid_patient_payload: dict,
) -> None:
    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get,
        patch.object(PatientService, "replace", new_callable=AsyncMock) as mock_replace,
    ):
        mock_get.return_value = sample_patient
        mock_replace.return_value = sample_patient

        response = await client.put(f"{PREFIX}/{patient_id}", json=valid_patient_payload)

    assert response.status_code == 200
    mock_replace.assert_awaited_once()


@pytest.mark.asyncio
async def test_replace_patient_not_found(
    client: AsyncClient, patient_id: uuid.UUID, valid_patient_payload: dict
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        response = await client.put(f"{PREFIX}/{patient_id}", json=valid_patient_payload)

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delete_patient_success(
    client: AsyncClient,
    sample_patient: SimpleNamespace,
    patient_id: uuid.UUID,
) -> None:
    with (
        patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get,
        patch.object(PatientService, "delete", new_callable=AsyncMock) as mock_delete,
    ):
        mock_get.return_value = sample_patient
        mock_delete.return_value = None

        response = await client.delete(f"{PREFIX}/{patient_id}")

    assert response.status_code == 204
    assert response.content == b""
    mock_delete.assert_awaited_once_with(sample_patient)


@pytest.mark.asyncio
async def test_delete_patient_not_found(
    client: AsyncClient, patient_id: uuid.UUID
) -> None:
    with patch.object(PatientService, "get_by_id", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        response = await client.delete(f"{PREFIX}/{patient_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"
