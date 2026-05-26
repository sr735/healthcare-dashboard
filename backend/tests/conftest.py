"""
Shared pytest fixtures for HealthDash API tests.

Architecture choice: rather than booting the production app (which has a
lifespan that connects to PostgreSQL), we create a minimal test FastAPI
application that includes the same API router but has no lifespan.  The
database dependency (get_db) is overridden with a lightweight mock so tests
run without any real database.  Individual tests then use patch.object() on
the service classes to control return values.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.session import get_db

# ---------------------------------------------------------------------------
# Minimal test application
# ---------------------------------------------------------------------------

_settings = get_settings()

# Build once at module load; individual tests reset dependency_overrides
# via the client fixture to keep tests independent.
test_app = FastAPI(title="HealthDash Test API")
test_app.include_router(api_router, prefix=_settings.api_v1_prefix)


@test_app.get("/health")
async def _health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db() -> MagicMock:
    """
    A MagicMock that satisfies the AsyncSession type hint.  Individual tests
    should use patch.object(ServiceClass, "method") rather than configuring
    this mock directly -- that approach is cleaner and tests more of the real
    code path.
    """
    return MagicMock(name="async_db_session")


@pytest.fixture
async def client(mock_db: MagicMock) -> AsyncClient:
    """HTTPX async client bound to the test app with the DB dependency stubbed."""

    async def _override_get_db():
        yield mock_db

    test_app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as ac:
        yield ac

    test_app.dependency_overrides.clear()


@pytest.fixture
def patient_id() -> uuid.UUID:
    return uuid.UUID("aaaabbbb-cccc-dddd-eeee-ffff00001111")


@pytest.fixture
def note_id() -> uuid.UUID:
    return uuid.UUID("11112222-3333-4444-5555-666677778888")


@pytest.fixture
def sample_patient(patient_id: uuid.UUID) -> SimpleNamespace:
    """
    Patient-like object accepted by PatientResponse (model_config from_attributes=True).
    Uses SimpleNamespace so getattr() works the same way as on SQLAlchemy models.
    """
    return SimpleNamespace(
        id=patient_id,
        first_name="Jane",
        last_name="Smith",
        date_of_birth=date(1985, 3, 15),
        gender="female",
        blood_type="A+",
        email="jane.smith@example.com",
        phone="+1-555-000-0001",
        address="123 Main St",
        city="Boston",
        state="MA",
        zip_code="02101",
        status="active",
        primary_physician="Dr. Taylor",
        insurance_provider="BlueCross",
        insurance_id="BC-123456",
        allergies=["Penicillin"],
        medical_notes=None,
        last_visit_date=date(2024, 6, 1),
        created_at=datetime(2024, 1, 1, 12, 0, 0),
        updated_at=datetime(2024, 1, 1, 12, 0, 0),
    )


@pytest.fixture
def sample_note(note_id: uuid.UUID, patient_id: uuid.UUID) -> SimpleNamespace:
    """Note-like object accepted by NoteResponse (from_attributes=True)."""
    return SimpleNamespace(
        id=note_id,
        patient_id=patient_id,
        content="Patient presented with mild fever.",
        author="Dr. Taylor",
        note_type="clinical",
        created_at=datetime(2024, 6, 1, 9, 0, 0),
    )


@pytest.fixture
def valid_patient_payload() -> dict:
    return {
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1990-05-20",
        "gender": "male",
        "status": "active",
        "allergies": [],
    }
