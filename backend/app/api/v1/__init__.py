from fastapi import APIRouter
from app.api.v1.endpoints.patients import router as patients_router
from app.api.v1.endpoints.notes import router as notes_router
from app.api.v1.endpoints.summary import router as summary_router

api_router = APIRouter()
api_router.include_router(patients_router)
api_router.include_router(notes_router)
api_router.include_router(summary_router)
