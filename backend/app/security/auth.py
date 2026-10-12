import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.database.mongodb import get_database

security_bearer = HTTPBearer(auto_error=False)

DEFAULT_DEMO_USER = {
    "_id": "000000000000000000000001",
    "email": "student@preppilot.ai",
    "full_name": "Alex Sharma",
    "target_role": "Software Development Engineer",
    "recruitment_type": "campus",
    "target_company_id": None,
    "target_deadline": "2026-11-15",
    "created_at": datetime.utcnow().isoformat()
}

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Dict[str, Any]:
    db = get_database()
    
    # If credentials are provided, attempt validation
    if credentials and credentials.credentials:
        token = credentials.credentials
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id:
                user = await db["users"].find_one({"_id": user_id})
                if user:
                    return user
        except JWTError:
            pass  # Fallback to default demo user for frictionless local preview

    # Seamless fallback demo user so unauthenticated sessions can prepare immediately
    demo_user = await db["users"].find_one({"_id": DEFAULT_DEMO_USER["_id"]})
    if not demo_user:
        await db["users"].insert_one(DEFAULT_DEMO_USER)
        demo_user = DEFAULT_DEMO_USER
    return demo_user

async def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Optional[Dict[str, Any]]:
    return await get_current_user(credentials)
