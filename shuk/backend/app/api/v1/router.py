from fastapi import APIRouter

from app.api.v1.endpoints.companies import router as companies_router
from app.api.v1.endpoints.screener import router as screener_router

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(companies_router)
v1_router.include_router(screener_router)
