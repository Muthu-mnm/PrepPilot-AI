from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any
from app.schemas.session import SessionCreate, SessionResponse, AnswerSubmit, HintRequest, SwitchModeRequest
from app.services.interview_service import InterviewService
from app.security.auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["Interview Sessions"])

@router.post("", response_model=SessionResponse)
async def create_session(payload: SessionCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    session = await InterviewService.create_session(
        user_id=user_id,
        role=payload.role,
        track=payload.track,
        company_id=payload.company_id,
        initial_difficulty=payload.initial_difficulty or "medium"
    )
    return session

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    session = await InterviewService.get_session(session_id, user_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found or you do not have permission to view it."
        )
    return session

@router.post("/{session_id}/answers", response_model=SessionResponse)
async def submit_answer(session_id: str, payload: AnswerSubmit, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        session = await InterviewService.submit_answer(
            session_id=session_id,
            user_id=user_id,
            answer_text=payload.answer
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{session_id}/hint", response_model=SessionResponse)
async def request_hint(session_id: str, payload: HintRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        session = await InterviewService.request_hint(
            session_id=session_id,
            user_id=user_id,
            hint_level=payload.hint_level or 1
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post("/{session_id}/switch-mode", response_model=SessionResponse)
async def switch_mode(session_id: str, payload: SwitchModeRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    try:
        session = await InterviewService.switch_mode(
            session_id=session_id,
            user_id=user_id,
            mode=payload.mode
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
