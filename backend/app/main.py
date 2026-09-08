from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router, api_v1_router
from app.core.config import get_settings
from app.services.seed_service import seed_demo_users
from scripts.migrate_google_auth import migrate_and_seed

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database columns and demo accounts exist on startup
    try:
        migrate_and_seed()
    except Exception as e:
        print(f"Migration error: {e}")
    try:
        seed_demo_users()
    except Exception as e:
        print(f"Seed error: {e}")
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_v1_router)
app.include_router(api_router)
app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name, "environment": settings.environment}
