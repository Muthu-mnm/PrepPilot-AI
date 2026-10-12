from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any

class RoleDefinition(BaseModel):
    role_id: str
    title: str
    tracks: List[str]  # e.g., ["online_assessment", "coding_sql", "technical_interview", "hr_behavioral"]
    description: Optional[str] = None
    common_topics: List[str] = []

class ReportedRound(BaseModel):
    round_number: int
    name: str  # e.g. "Online Assessment: Coding & Aptitude", "Technical Round 1: Data Structures"
    focus_areas: List[str]
    typical_duration_minutes: int
    evidence_source_id: Optional[str] = None

class SourceEvidence(BaseModel):
    id: str
    company_id: str
    source_url: str
    source_title: str
    publisher: str
    publication_date: Optional[str] = None
    retrieval_date: str
    role: str
    location: Optional[str] = "India"
    recruitment_type: str  # "campus" | "off_campus"
    recruitment_year: int
    reported_rounds: List[str]
    selection_status: str  # "candidate_reported_selected" | "independently_verified_selected" | "unknown"
    verification_method: str  # "self_reported_offer_letter" | "platform_verified_badge" | "public_interview_experience"
    supporting_claims: List[str]
    conflicts_and_limitations: List[str]
    is_official_source: bool = False

class CompanyResponse(BaseModel):
    id: str
    name: str
    slug: str
    logo_letter: str
    industry: str
    roles: List[RoleDefinition]
    reported_rounds: List[ReportedRound]
    source_count: int
    evidence_summary: Optional[str] = None

class CompanyDetailResponse(CompanyResponse):
    sources: List[SourceEvidence] = []
