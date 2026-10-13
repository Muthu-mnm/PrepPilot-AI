from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime
from app.schemas.progress import ProgressOverviewResponse, RevisionTaskItem, LearningEventCreate
from app.services.learning_service import LearningService
from app.security.auth import get_current_user
from app.database.mongodb import get_database

router = APIRouter(prefix="/progress", tags=["Learning Progress & Analytics"])

@router.get("/overview", response_model=ProgressOverviewResponse)
async def get_progress_overview(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await LearningService.get_overview(user_id)

@router.get("/revision-queue", response_model=List[RevisionTaskItem])
async def get_revision_queue(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await LearningService.get_revision_queue(user_id)

@router.post("/revision-queue/{task_id}/complete")
async def complete_revision_task(task_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    db = get_database()
    res = await db["revision_tasks"].update_one(
        {"_id": task_id, "user_id": user_id},
        {"$set": {"status": "completed"}}
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Revision task not found")
    return {"status": "completed", "task_id": task_id}

@router.post("/record-event")
async def record_learning_event(payload: LearningEventCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    db = get_database()
    now_iso = datetime.utcnow().isoformat()
    doc = {
        "user_id": user_id,
        "topic": payload.topic,
        "attempt_type": payload.attempt_type,
        "outcome": payload.outcome,
        "misconception_tag": payload.misconception_tag,
        "question_title": payload.question_title,
        "timestamp": now_iso
    }
    res = await db["learning_events"].insert_one(doc)
    return {"status": "recorded", "id": str(res.inserted_id)}
