from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    target_role: Optional[str] = "Software Development Engineer"
    recruitment_type: Optional[str] = "campus"  # "campus" | "off_campus"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    target_company_id: Optional[str] = None
    target_role: Optional[str] = None
    recruitment_type: Optional[str] = None
    target_deadline: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    target_company_id: Optional[str] = None
    target_role: Optional[str] = None
    recruitment_type: Optional[str] = None
    target_deadline: Optional[str] = None
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
