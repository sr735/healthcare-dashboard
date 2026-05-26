# HealthDash — Patient Management Dashboard

A full-stack patient management dashboard built with **React (TypeScript)**, **FastAPI**, and **PostgreSQL**.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript (Vite) | Fast builds, excellent DX, strict typing |
| UI Library | Material UI v6 | Comprehensive enterprise component set, great accessibility |
| Data Grid | MUI X DataGrid | Virtualised rendering, built-in sort/pagination, column visibility |
| Charts | Recharts | Lightweight, composable, responsive charting |
| Server State | TanStack Query v5 | Declarative data fetching, caching, background sync |
| Client State | Zustand | Minimal boilerplate, devtools-friendly |
| Routing | React Router v6 | Industry standard; lazy-loaded pages for code splitting |
| Backend | FastAPI 0.115 | Async-native Python framework; automatic OpenAPI docs |
| ORM | SQLAlchemy 2 (async) | Type-safe, async-first, production-proven |
| Migrations | Alembic | Schema versioning with auto-generate support |
| Database | PostgreSQL 16 | ACID-compliant, supports ARRAY type for allergies field |
| Containerisation | Docker + Compose | Reproducible dev and production environments |
| CI/CD | GitHub Actions | Lint → test → build → E2E on every push |

---

## Quick Start (Docker — recommended)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
git clone <repo-url>
cd healthcare-dashboard
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend (nginx) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |
| ReDoc | http://localhost:8000/api/redoc |
| Health check | http://localhost:8000/health |

The database is seeded automatically with 20 realistic sample patients on first startup.

---

## Development with Docker (hot reload)

For a faster edit-refresh loop while still running the full stack inside Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (Vite HMR) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/api/docs |

What changes vs. the default compose file:

- **Frontend** switches from the nginx production build to the Vite dev server. Edits to `frontend/src/` appear in the browser instantly via Hot Module Replacement.
- **Backend** is unchanged — `uvicorn --reload` and the `./backend:/app` volume mount were already in the base file. Python changes restart the server automatically.

---

## Local Development (without Docker)

**Prerequisites:** Node.js 20+, Python 3.12+, PostgreSQL 14+ running locally.

### Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env            # edit DB credentials if needed

alembic upgrade head            # apply migrations

uvicorn app.main:app --reload --port 8000
```

> In `development` mode the app also calls `Base.metadata.create_all` and seeds sample data on startup, so `alembic upgrade head` is optional for a fresh dev database.

### Frontend

```bash
cd frontend

npm install

cp .env.example .env.local      # VITE_API_URL defaults to http://localhost:8000/api/v1

npm run dev                     # Vite proxies /api → localhost:8000 automatically
```

---

## Database Schema

```
patients
├── id                  UUID PK
├── first_name          VARCHAR(100)
├── last_name           VARCHAR(100)
├── date_of_birth       DATE
├── gender              ENUM(male, female, other, prefer_not_to_say)
├── blood_type          ENUM(A+, A-, B+, B-, AB+, AB-, O+, O-)  nullable
├── email               VARCHAR(255)  nullable
├── phone               VARCHAR(30)   nullable
├── address             VARCHAR(255)  nullable
├── city                VARCHAR(100)  nullable
├── state               VARCHAR(50)   nullable
├── zip_code            VARCHAR(20)   nullable
├── status              ENUM(active, inactive, critical, discharged)
├── primary_physician   VARCHAR(200)  nullable
├── insurance_provider  VARCHAR(200)  nullable
├── insurance_id        VARCHAR(100)  nullable
├── allergies           TEXT[]  (PostgreSQL native array)
├── medical_notes       TEXT  nullable
├── last_visit_date     DATE  nullable
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ

patient_notes
├── id          UUID PK
├── patient_id  UUID FK → patients.id (CASCADE DELETE)
├── content     TEXT
├── author      VARCHAR(200)  nullable
├── note_type   VARCHAR(50)   default "clinical"
└── created_at  TIMESTAMPTZ
```

### Migrations

```bash
cd backend
alembic revision --autogenerate -m "describe change"  # generate
alembic upgrade head                                   # apply
alembic downgrade -1                                   # roll back one
```

---

## API Reference

Full interactive docs at **http://localhost:8000/api/docs**.

### Patients

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/patients` | List patients — paginated, filterable, sortable |
| `POST` | `/api/v1/patients` | Create a patient |
| `GET` | `/api/v1/patients/{id}` | Get patient by ID |
| `PUT` | `/api/v1/patients/{id}` | Replace patient (full update) |
| `PATCH` | `/api/v1/patients/{id}` | Update patient (partial — only supplied fields change) |
| `DELETE` | `/api/v1/patients/{id}` | Delete patient |

**Query parameters for `GET /api/v1/patients`:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `page_size` | int | 20 | Items per page (max 100) |
| `search` | string | — | Full-text search across name, email, phone |
| `status` | string | — | Filter by status |
| `gender` | string | — | Filter by gender |
| `physician` | string | — | Filter by physician name (partial match) |
| `sort_by` | string | `last_name` | Field to sort by |
| `sort_dir` | `asc`\|`desc` | `asc` | Sort direction |

### Notes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/patients/{id}/notes` | List notes for a patient |
| `POST` | `/api/v1/patients/{id}/notes` | Add a clinical note |
| `DELETE` | `/api/v1/patients/{id}/notes/{note_id}` | Delete a note |

> `GET /notes` also injects any free-text `medical_notes` from the patient profile as a pinned synthetic note of type `medical_background`.

### Summary

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/patients/{id}/summary` | AI-generated clinical summary (rule-based) |

### System

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe — returns `{"status": "ok"}` |

All responses include `X-Request-ID` and `X-Process-Time` headers stamped by the logging middleware.

---

## Testing

### Backend unit tests

Tests use `pytest-asyncio` with `httpx.AsyncClient` + `ASGITransport`. The production app's lifespan (PostgreSQL startup, seeding) is bypassed by a minimal `test_app` fixture; all service methods are mocked with `patch.object`.

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt
pytest -v
```

### Frontend unit tests (vitest)

Component tests run in `jsdom` via vitest + Testing Library. Mutation hooks and the Zustand store are mocked so tests run without a backend.

```bash
cd frontend
npm install
npm test               # run once
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

### E2E tests (Playwright)

Tests run against the full stack (all three Docker services must be up). The `patients.spec.ts` suite covers a complete CRUD flow — create, detail view, edit pre-fill, delete — using a timestamped last name to avoid colliding with seed data.

```bash
# 1. Start the stack
docker compose up -d

# 2. Install browsers (first time only)
cd frontend && npx playwright install --with-deps chromium

# 3. Run
npm run test:e2e

# Optional: interactive Playwright UI
npm run test:e2e:ui
```

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and pull request to `main`, `master`, and `develop`:

| Job | Triggers | Steps |
|---|---|---|
| **backend** | push + PR | ruff lint → mypy type-check → pytest |
| **frontend** | push + PR | ESLint → TypeScript → vitest → production build |
| **docker-build** | after tests pass | Build both production Docker images (GHA layer cache) |
| **e2e** | push to main only | Boot Compose stack → Playwright → upload HTML report |

Playwright reports are retained as workflow artifacts for 14 days.

---

## Architecture Decisions

**Service layer between routes and ORM.** `PatientService` and `NoteService` own all SQLAlchemy queries. Routes handle only HTTP concerns (parsing, status codes, error mapping). This makes unit-testing straightforward — mock the service method, not the ORM session.

**Alembic + auto-create.** In `development` mode, `Base.metadata.create_all` runs at startup so the app works immediately without running migrations. In production, only Alembic runs — the auto-create path is gated on `is_production`.

**Pydantic enum coercion.** SQLAlchemy returns Python `enum.Enum` instances; a shared `@field_validator` on the schema coerces them to plain strings before Pydantic validates them. This avoids `"male" is not a valid Gender` errors on read.

**TanStack Query caching strategy.** `staleTime: 30s` prevents redundant refetches when navigating between pages. `initialData` seeding lets the patient detail page render immediately with list-cache data while a background refetch updates the record.

**`patch.object` unit test strategy.** Backend tests mock at the service method level (not the SQLAlchemy session). This tests the full route logic — request parsing, response serialisation, HTTP status codes, error handling — without needing a database.

**Form state as plain strings.** `PatientFormDialog` stores all fields as strings internally and converts to the API payload type only at submit time. This avoids the React controlled-input warning caused by toggling between `null` and a string value.

---

## Project Structure

```
healthcare-dashboard/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
├── docker-compose.yml          # Production stack (nginx + uvicorn + postgres)
├── docker-compose.dev.yml      # Dev overlay: Vite HMR instead of nginx
│
├── frontend/
│   ├── e2e/                    # Playwright E2E specs
│   │   ├── dashboard.spec.ts
│   │   └── patients.spec.ts
│   ├── src/
│   │   ├── api/                # Axios API functions (one file per resource)
│   │   ├── components/         # Shared UI components + __tests__/
│   │   ├── hooks/              # TanStack Query hooks (per resource)
│   │   ├── lib/                # axios instance, typed error classes, utils
│   │   ├── pages/              # Route-level page components
│   │   ├── store/              # Zustand UI store (filters, pagination, theme, snackbar)
│   │   ├── test/               # vitest setup (jest-dom matchers)
│   │   ├── theme/              # MUI theme factory (light/dark)
│   │   └── types/              # Shared TypeScript interfaces
│   ├── Dockerfile              # Multi-stage: development (Vite) + production (nginx)
│   ├── nginx.conf              # SPA routing + /api proxy + static asset caching
│   ├── playwright.config.ts
│   ├── vite.config.ts          # Includes vitest test block
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── api/v1/endpoints/   # FastAPI routers (patients, notes, summary)
    │   ├── core/               # Settings via pydantic-settings
    │   ├── db/                 # Async engine, session, seed data
    │   ├── middleware/         # Request logging middleware
    │   ├── models/             # SQLAlchemy ORM models
    │   ├── schemas/            # Pydantic request/response schemas
    │   └── services/           # Business logic (PatientService, NoteService)
    ├── alembic/                # Migration scripts (3 versions)
    ├── tests/                  # pytest unit tests (no DB needed)
    │   ├── conftest.py         # Fixtures: test_app, mock_db, client, sample data
    │   ├── test_health.py
    │   ├── test_patients.py
    │   └── test_notes.py
    ├── Dockerfile
    ├── pytest.ini
    ├── requirements.txt
    └── requirements-test.txt
```

> **Note:** If you see a `backend/app/{api` directory in your file explorer, it is an empty artefact from a shell brace-expansion error and can be safely deleted.
