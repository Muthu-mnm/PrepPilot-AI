from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class TopicMastery(BaseModel):
    topic: str
    category: str  # "Data Structures", "Algorithms", "Database & SQL", "System Design", "Core CS"
    attempts_count: int
    independent_success_count: int
    assisted_count: int
    failure_count: int
    mastery_percentage: float  # explicitly measured: (independent_success / attempts_count) * 100
    common_misconceptions: List[str] = []

class RevisionTaskItem(BaseModel):
    id: str
    topic: str
    question_title: str
    misconception_addressed: str
    due_date: str
    days_overdue: int = 0
    status: str  # "pending" | "completed"
    question_id: str

class LearningActivityItem(BaseModel):
    id: str
    date: str
    topic: str
    activity_type: str  # "interview_turn", "coding_submission", "mentor_retest"
    outcome: str
    assistance_level: str

class ProgressOverviewResponse(BaseModel):
    total_questions_attempted: int
    independent_successes: int
    hint_assisted_attempts: int
    solution_assisted_attempts: int
    coding_tests_passed: int
    coding_tests_total: int
    coding_pass_rate_percentage: float
    topics_breakdown: List[TopicMastery]
    pending_revisions_count: int
    recent_activity: List[LearningActivityItem]
    notice: str = "Metrics represent verifiable attempt counts and rubric results. PrepPilot AI does not predict selection probability or guarantee placements."
