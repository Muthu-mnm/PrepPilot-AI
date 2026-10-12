import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.mongodb import DatabaseManager, get_database_mode
from app.services.company_research_service import CompanyResearchService
from app.database.seed_data import seed_questions_database

from app.api.auth import router as auth_router
from app.api.companies import router as companies_router
from app.api.sessions import router as sessions_router
from app.api.coding import router as coding_router
from app.api.progress import router as progress_router
from app.api.prep import router as prep_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("preppilot.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting PrepPilot AI API Service...")
    await DatabaseManager.connect()
    # Seed data
    await CompanyResearchService.seed_initial_data()
    await seed_questions_database()
    logger.info(f"Database initialized in mode: {get_database_mode()}")
    yield
    # Shutdown
    logger.info("Shutting down PrepPilot AI API Service...")
    await DatabaseManager.disconnect()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="PrepPilot AI Backend — Production Placement Preparation & Adaptive Interview System",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(companies_router, prefix=settings.API_V1_STR)
app.include_router(sessions_router, prefix=settings.API_V1_STR)
app.include_router(coding_router, prefix=settings.API_V1_STR)
app.include_router(progress_router, prefix=settings.API_V1_STR)
app.include_router(prep_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database_mode": get_database_mode(),
        "ai_engine": {
            "model": settings.OLLAMA_MODEL,
            "host": settings.OLLAMA_HOST,
            "status": "connected"
        },
        "execution_sandboxes": {
            "sql": "disposable_sqlite_in_memory",
            "python": "isolated_subprocess_sandbox"
        }
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to PrepPilot AI API. Navigate to /docs for the interactive OpenAPI documentation.",
        "version": settings.VERSION
    }
