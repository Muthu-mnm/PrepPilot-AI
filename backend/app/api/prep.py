from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional, Dict, Any
from app.schemas.prep import (
    ResumeExtractedData,
    GitHubRepoAnalysis,
    CandidateExperienceInput,
    PreparationSetupRequest,
    PreparationPlanResponse,
    PlanUpdateRequest,
    MentorChatMessageRequest,
    MentorChatMessageResponse
)
from app.services.prep_service import PrepService
from app.services.unified_mentor_service import UnifiedMentorService
from app.security.auth import get_current_user
from app.database.mongodb import get_database

router = APIRouter(prefix="/prep", tags=["Preparation Setup & Personalized Mentor"])

@router.post("/upload-resume", response_model=ResumeExtractedData)
async def upload_resume(file: UploadFile = File(...)):
    # Read file content safely
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB cap
        raise HTTPException(status_code=400, detail="Resume file exceeds 10MB limit.")
    
    return PrepService.parse_resume(file.filename or "resume.pdf", contents)

@router.post("/analyze-github", response_model=GitHubRepoAnalysis)
async def analyze_github(payload: Dict[str, str]):
    repo_url = payload.get("repo_url", "")
    if not repo_url:
        raise HTTPException(status_code=400, detail="Missing 'repo_url' parameter.")
    return await PrepService.analyze_github_repo(repo_url)

@router.post("/extract-experience", response_model=CandidateExperienceInput)
async def extract_experience(payload: Dict[str, Optional[str]]):
    source_url = payload.get("source_url")
    raw_text = payload.get("raw_text")
    if not source_url and not raw_text:
        raise HTTPException(status_code=400, detail="Please provide either a source URL or report text.")
    return await PrepService.extract_candidate_experience(source_url, raw_text)

@router.post("/upload-experience-file", response_model=CandidateExperienceInput)
async def upload_experience_file(file: UploadFile = File(...)):
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit.")
    text = PrepService.extract_text_from_file(file.filename or "experience.txt", contents)
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract readable text from file.")
    return await PrepService.extract_candidate_experience(source_url=f"Uploaded: {file.filename}", raw_text=text)

@router.post("/generate-plan", response_model=PreparationPlanResponse)
async def generate_plan(payload: PreparationSetupRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await PrepService.generate_preparation_plan(user_id, payload)

@router.get("/current-plan", response_model=Optional[PreparationPlanResponse])
async def get_current_plan(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await PrepService.get_current_plan(user_id)

@router.put("/update-plan", response_model=PreparationPlanResponse)
async def update_plan(payload: PlanUpdateRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    db = get_database()
    plan = await db["prep_plans"].find_one({"user_id": user_id})
    if not plan:
        raise HTTPException(status_code=404, detail="No active preparation plan found.")
    
    update_data = {
        "milestones": [m.model_dump() if hasattr(m, "model_dump") else m.dict() for m in payload.milestones]
    }
    if payload.knowledge_gaps is not None:
        update_data["knowledge_gaps"] = payload.knowledge_gaps
    if payload.readiness_diagnostic is not None:
        update_data["readiness_diagnostic"] = payload.readiness_diagnostic

    await db["prep_plans"].update_one({"_id": str(plan["_id"])}, {"$set": update_data})
    return await PrepService.get_current_plan(user_id)

@router.get("/mentor-messages")
async def get_mentor_messages(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await UnifiedMentorService.get_or_create_conversation(user_id)

@router.post("/mentor-message", response_model=MentorChatMessageResponse)
async def send_mentor_message(payload: MentorChatMessageRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await UnifiedMentorService.handle_user_message(user_id, payload)

@router.post("/mentor-session/reset")
async def reset_mentor_session(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return await UnifiedMentorService.reset_conversation(user_id)

