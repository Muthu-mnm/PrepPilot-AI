from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SessionCreate(BaseModel):
    company_id: Optional[str] = None
    role: str
    track: str  # "online_assessment", "coding_sql", "technical_interview", "resume_defense", "hr_behavioral"
    target_topics: Optional[List[str]] = []
    initial_difficulty: Optional[str] = "medium"  # "easy" | "medium" | "hard"

class TurnEvaluation(BaseModel):
    correctness: str  # "correct" | "partially_correct" | "incorrect"
    concepts_demonstrated: List[str] = []
    missing_concepts: List[str] = []
    misconceptions: List[str] = []
    feedback: str
    assistance_level: str  # "independent" | "hint_assisted" | "solution_assisted"
    confidence_score: float = 0.8
    suggested_followup: Optional[str] = None

class TurnResponse(BaseModel):
    id: str
    turn_number: int
    role: str  # "interviewer" | "candidate" | "mentor"
    turn_type: str  # "question" | "answer" | "followup" | "hint" | "mentor_explanation"
    content: str
    evaluation: Optional[TurnEvaluation] = None
    created_at: str

class AnswerSubmit(BaseModel):
    answer: str

class HintRequest(BaseModel):
    hint_level: Optional[int] = 1  # 1: subtle guidance, 2: structured nudge, 3: architectural outline

class SwitchModeRequest(BaseModel):
    mode: str  # "interviewer" | "mentor"

class SessionResponse(BaseModel):
    id: str
    user_id: str
    company_name: Optional[str] = None
    role: str
    track: str
    status: str  # "active" | "paused" | "completed"
    current_mode: str  # "interviewer" | "mentor"
    current_difficulty: str
    current_question_index: int
    total_questions: int
    turns: List[TurnResponse] = []
    created_at: str
    updated_at: str
    summary_report: Optional[Dict[str, Any]] = None
