import logging
import logging.config
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.session import engine, AsyncSessionLocal, Base
from app.db.seed import seed_patients
from app.api.v1 import api_router
from app.middleware import LoggingMiddleware

# Import all models so Alembic / Base.metadata can see them.
# Aliased to avoid shadowing the `app` variable (FastAPI instance) defined below.
from app import models as _models  # noqa: F401

settings = get_settings()


# ---- Logging configuration --------------------------------------------------

def configure_logging() -> None:
    """
    Set up structured logging for the application.

    Log format:  YYYY-MM-DD HH:MM:SS LEVEL  logger_name  message
    The healthdash.access logger (used by LoggingMiddleware) emits one line
    per HTTP request.  Uvicorn access log is silenced to avoid duplicates.
    """
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "stream": "ext://sys.stdout",
                },
            },
            "loggers": {
                # Application loggers
                "healthdash": {
                    "handlers": ["console"],
                    "level": settings.log_level.upper(),
                    "propagate": False,
                },
                # Silence uvicorn per-request access log -- our middleware
                # already logs every request with richer context.
                "uvicorn.access": {
                    "handlers": [],
                    "level": "WARNING",
                    "propagate": False,
                },
                # Keep uvicorn startup/error messages
                "uvicorn.error": {
                    "handlers": ["console"],
                    "level": "INFO",
                    "propagate": False,
                },
            },
            # Root logger catches anything not matched above
            "root": {
                "handlers": ["console"],
                "level": "WARNING",
            },
        }
    )


configure_logging()
logger = logging.getLogger("healthdash.app")


# ---- Lifespan ---------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[misc]
    # Startup
    logger.info("Starting HealthDash API (env=%s)", settings.app_env)

    # In production, rely solely on Alembic. In dev/test, create tables
    # automatically so the app works without running migrations first.
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await seed_patients(db)

    logger.info("Startup complete -- ready to serve requests")
    yield

    # Shutdown
    logger.info("Shutting down -- disposing database engine")
    await engine.dispose()


# ---- App factory ------------------------------------------------------------

app = FastAPI(
    title="HealthDash API",
    description="Patient management REST API for the HealthDash healthcare dashboard.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Middleware is applied in reverse registration order (last-added = outermost).
# LoggingMiddleware must wrap everything to capture true end-to-end duration,
# including time spent in CORS and routing.
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Routes -----------------------------------------------------------------

@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_v1_prefix)
