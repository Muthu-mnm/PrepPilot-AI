from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any

class ResumeExtractedData(BaseModel):
    filename: Optional[str] = None
    education: List[str] = []
    skills: List[str] = []
    projects: List[str] = []
    experience: List[str] = []
    certifications: List[str] = []
    summary: Optional[str] = None
    raw_text_length: int = 0

class GitHubRepoAnalysis(BaseModel):
    repo_url: str
    owner: str
    repo_name: str
    description: Optional[str] = None
    primary_language: Optional[str] = None
    languages: List[str] = []
    dependencies: List[str] = []
    architecture_summary: Optional[str] = None
    potential_defense_topics: List[str] = []

class CandidateExperienceInput(BaseModel):
    id: Optional[str] = None
    source_url: Optional[str] = None
    raw_text: Optional[str] = None
    company: str
    role: str
    recruitment_type: str = "campus"  # "campus" | "off_campus"
    year: int = 2024
    selection_status: str = "self_reported_selected"  # "self_reported_selected" | "verified_selected"
    reported_rounds: List[str] = []
    extracted_topics: List[str] = []
    extracted_questions: List[str] = []
    preparation_patterns: List[str] = []

class PreparationSetupRequest(BaseModel):
    target_company: Optional[str] = None
    target_role: str = "Software Development Engineer"
    recruitment_type: str = "campus"
    target_deadline: Optional[str] = None
    skills: List[str] = []
    weak_topics: List[str] = []
    learning_goals: List[str] = []
    resume_data: Optional[ResumeExtractedData] = None
    github_repos: List[GitHubRepoAnalysis] = []
    candidate_experiences: List[CandidateExperienceInput] = []

class MilestoneItem(BaseModel):
    milestone_id: str
    title: str
    description: str
    priority: str  # "high" | "medium" | "standard"
    topics: List[str]
    suggested_activities: List[str]
    completed: bool = False

class PreparationPlanResponse(BaseModel):
    id: str
    user_id: str
    target_role: str
    target_company: Optional[str] = None
    target_deadline: Optional[str] = None
    readiness_diagnostic: str
    strengths_summary: List[str]
    knowledge_gaps: List[str]
    project_defense_questions: List[str]
    milestones: List[MilestoneItem]
    evidence_notes: str
    created_at: str
    updated_at: str

class PlanUpdateRequest(BaseModel):
    milestones: List[MilestoneItem]
    knowledge_gaps: Optional[List[str]] = None

class MentorChatMessageRequest(BaseModel):
    message: str
    mode: str = "mentor_chat"  # "mentor_chat" | "project_defense" | "concept_explanation" | "coding_review" | "knowledge_check"
    context_topic: Optional[str] = None
    code_snippet: Optional[str] = None

class MentorChatMessageResponse(BaseModel):
    id: str
    role: str = "mentor"
    content: str
    mode: str
    misconception_detected: Optional[str] = None
    affirmation: Optional[str] = None
    action_type: Optional[str] = None  # "offer_code", "schedule_revision", "retest_question"
    suggested_actions: List[str] = []
    created_at: str
