import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "PrepPilot AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "preppilot_db")
    
    # AI Engine (Ollama via Kaggle ngrok tunnel or local)
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "https://earmuff-litigator-definite.ngrok-free.dev")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3.5:27b")
    OLLAMA_TIMEOUT_SECONDS: float = 120.0
    
    # Security & Auth
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "preppilot_super_secret_jwt_key_2026_dev_secure")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    
    # Execution Sandboxes
    SQL_TIMEOUT_SECONDS: float = 1.5
    PYTHON_TIMEOUT_SECONDS: float = 3.0
    PYTHON_MAX_OUTPUT_BYTES: int = 10000

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
