from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId
from app.schemas.auth import UserRegister, UserLogin, UserResponse, TokenResponse, UserProfileUpdate
from app.security.auth import get_password_hash, verify_password, create_access_token, get_current_user
from app.database.mongodb import get_database

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register_user(payload: UserRegister):
    db = get_database()
    existing = await db["users"].find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user_doc = {
        "email": payload.email.lower(),
        "hashed_password": get_password_hash(payload.password),
        "full_name": payload.full_name,
        "target_role": payload.target_role,
        "recruitment_type": payload.recruitment_type,
        "target_company_id": None,
        "target_deadline": None,
        "created_at": datetime.utcnow().isoformat()
    }
    res = await db["users"].insert_one(user_doc)
    user_id = str(res.inserted_id)

    token = create_access_token(data={"sub": user_id, "email": user_doc["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_doc["email"],
            "full_name": user_doc["full_name"],
            "target_role": user_doc["target_role"],
            "recruitment_type": user_doc["recruitment_type"],
            "created_at": user_doc["created_at"]
        }
    }

@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLogin):
    db = get_database()
    user = await db["users"].find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    user_id = str(user["_id"])
    token = create_access_token(data={"sub": user_id, "email": user["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "target_company_id": user.get("target_company_id"),
            "target_role": user.get("target_role"),
            "recruitment_type": user.get("recruitment_type"),
            "created_at": user.get("created_at")
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "full_name": current_user.get("full_name", ""),
        "target_company_id": current_user.get("target_company_id"),
        "target_role": current_user.get("target_role"),
        "recruitment_type": current_user.get("recruitment_type"),
        "target_deadline": current_user.get("target_deadline"),
        "created_at": current_user.get("created_at")
    }

@router.put("/profile", response_model=UserResponse)
async def update_profile(payload: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if update_data:
        await db["users"].update_one({"_id": user_id}, {"$set": update_data})
        current_user.update(update_data)
    return {
        "id": user_id,
        "email": current_user["email"],
        "full_name": current_user.get("full_name", ""),
        "target_company_id": current_user.get("target_company_id"),
        "target_role": current_user.get("target_role"),
        "recruitment_type": current_user.get("recruitment_type"),
        "target_deadline": current_user.get("target_deadline"),
        "created_at": current_user.get("created_at")
    }
