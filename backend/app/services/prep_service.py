import io
import re
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from bson import ObjectId
import httpx
from pypdf import PdfReader
from docx import Document

from app.database.mongodb import get_database
from app.ai.client import ai_client
from app.schemas.prep import (
    ResumeExtractedData,
    GitHubRepoAnalysis,
    CandidateExperienceInput,
    PreparationSetupRequest,
    PreparationPlanResponse,
    MilestoneItem
)

logger = logging.getLogger("preppilot.prep_service")

class PrepService:

    @staticmethod
    def extract_text_from_file(filename: str, file_bytes: bytes) -> str:
        """Extracts text from PDF, DOCX, or text files."""
        text = ""
        filename_lower = filename.lower()
        try:
            if filename_lower.endswith(".pdf"):
                reader = PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
            elif filename_lower.endswith(".docx") or filename_lower.endswith(".doc"):
                doc = Document(io.BytesIO(file_bytes))
                for para in doc.paragraphs:
                    text += para.text + "\n"
            else:
                text = file_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            logger.error(f"Error reading file {filename}: {e}")
            text = file_bytes.decode("utf-8", errors="ignore")
        return text

    @staticmethod
    def parse_resume(filename: str, file_bytes: bytes) -> ResumeExtractedData:
        """Extracts text from PDF or DOCX and extracts structured sections."""
        text = PrepService.extract_text_from_file(filename, file_bytes)

        # Heuristic section extraction
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        skills_found = set()
        common_tech = [
            "Python", "Java", "C++", "C#", "JavaScript", "TypeScript", "React", "Node.js",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes",
            "Git", "FastAPI", "Django", "Flask", "Spring Boot", "AWS", "Azure", "GCP",
            "HTML", "CSS", "REST", "GraphQL", "Data Structures", "Algorithms", "Machine Learning"
        ]
        for tech in common_tech:
            pattern = r'\b' + re.escape(tech) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                skills_found.add(tech)

        # Extract projects & experiences by scanning headings
        education = []
        projects = []
        experience = []
        certifications = []

        for line in lines:
            line_lower = line.lower()
            if any(k in line_lower for k in ["b.tech", "b.e.", "bachelor", "master", "university", "institute", "college", "gpa", "cgpa"]):
                if len(line) < 120 and line not in education:
                    education.append(line)
            elif any(k in line_lower for k in ["intern", "engineer", "developer", "trainee", "associate", "work experience"]):
                if len(line) < 140 and line not in experience:
                    experience.append(line)
            elif any(k in line_lower for k in ["project", "developed", "built", "implemented", "system", "application"]):
                if 20 < len(line) < 160 and line not in projects:
                    projects.append(line)
            elif any(k in line_lower for k in ["certified", "certification", "aws certified", "coursera", "udemy"]):
                if len(line) < 140 and line not in certifications:
                    certifications.append(line)

        return ResumeExtractedData(
            filename=filename,
            education=education[:4],
            skills=sorted(list(skills_found)),
            projects=projects[:5],
            experience=experience[:4],
            certifications=certifications[:3],
            summary=f"Parsed {len(lines)} lines from {filename}. Detected {len(skills_found)} technical skills and {len(projects)} key projects.",
            raw_text_length=len(text)
        )

    @staticmethod
    async def analyze_github_repo(repo_url: str) -> GitHubRepoAnalysis:
        """Inspects accessible public repository information and README via GitHub REST API.
        Never executes any repository code.
        """
        match = re.search(r'github\.com/([^/]+)/([^/]+)', repo_url.strip())
        if not match:
            return GitHubRepoAnalysis(
                repo_url=repo_url,
                owner="unknown",
                repo_name="invalid-url",
                description="Invalid GitHub repository URL format. Please use https://github.com/owner/repository",
                primary_language=None,
                languages=[],
                dependencies=[],
                architecture_summary="Could not parse GitHub repository owner/name from URL.",
                potential_defense_topics=[]
            )

        owner, repo = match.group(1), match.group(2).replace(".git", "")

        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        headers = {"User-Agent": "PrepPilot-AI-Analyzer", "Accept": "application/vnd.github.v3+json"}
        
        description = None
        primary_lang = None
        readme_content = ""
        languages_list = []

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(api_url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    description = data.get("description")
                    primary_lang = data.get("language")

                # Fetch README
                readme_res = await client.get(f"{api_url}/readme", headers={"Accept": "application/vnd.github.v3.raw"})
                if readme_res.status_code == 200:
                    readme_content = readme_res.text[:4000]

                # Fetch languages
                lang_res = await client.get(f"{api_url}/languages", headers=headers)
                if lang_res.status_code == 200:
                    languages_list = list(lang_res.json().keys())
        except Exception as e:
            logger.warning(f"Error fetching GitHub repo {owner}/{repo}: {e}")

        # Extract dependency heuristics from README
        deps = []
        for dep in ["React", "FastAPI", "Express", "Docker", "PostgreSQL", "MongoDB", "Redux", "Tailwind", "Next.js", "PyTorch", "TensorFlow"]:
            if dep.lower() in readme_content.lower():
                deps.append(dep)

        defense_topics = [
            f"Architecture and module boundaries of {repo}",
            f"How error handling and database transactions are structured in {primary_lang or 'the project'}",
            f"Scalability bottlenecks and trade-offs made in {repo}"
        ]

        return GitHubRepoAnalysis(
            repo_url=repo_url,
            owner=owner,
            repo_name=repo,
            description=description or f"Public GitHub repository by {owner}",
            primary_language=primary_lang or (languages_list[0] if languages_list else "Unknown"),
            languages=languages_list,
            dependencies=deps,
            architecture_summary=f"Project {repo} utilizes {primary_lang or 'various technologies'}. README overview indicates active modules: {', '.join(deps) if deps else 'standard structure'}.",
            potential_defense_topics=defense_topics
        )

    @staticmethod
    async def extract_candidate_experience(source_url: Optional[str], raw_text: Optional[str]) -> CandidateExperienceInput:
        """Parses candidate interview experience from URL or raw text."""
        content = (raw_text or "").strip()
        url = source_url or ""
        
        # Heuristic topic detection
        topics_detected = []
        for topic in ["SQL Joins", "Binary Trees", "Graphs (BFS/DFS)", "Dynamic Programming", "OOP Design", "System Design", "DBMS Normalization", "Leadership Principles"]:
            if topic.lower() in content.lower():
                topics_detected.append(topic)

        # Detect questions
        questions_detected = []
        for line in content.split("\n"):
            line_str = line.strip()
            if "?" in line_str or any(kw in line_str.lower() for kw in ["asked to", "question was", "coding problem:", "design a"]):
                if 15 < len(line_str) < 160 and line_str not in questions_detected:
                    questions_detected.append(line_str)

        # Detect rounds
        rounds_detected = []
        for r_name in ["Online Assessment", "Technical Round 1", "Technical Round 2", "Managerial Round", "HR Round"]:
            if r_name.lower() in content.lower():
                rounds_detected.append(r_name)
        if not rounds_detected:
            rounds_detected = ["Technical Coding Round", "Interview Panel"]

        # Selection status check
        selection_status = "self_reported_selected"
        if any(term in content.lower() for term in ["got offer", "selected", "accepted offer", "joined as", "offer letter"]):
            selection_status = "self_reported_selected"

        return CandidateExperienceInput(
            id=str(ObjectId()),
            source_url=url,
            raw_text=content[:2000],
            company="Target Opportunity",
            role="Software Engineer",
            recruitment_type="campus",
            year=2024,
            selection_status=selection_status,
            reported_rounds=rounds_detected,
            extracted_topics=topics_detected or ["Core Data Structures", "Problem Solving"],
            extracted_questions=questions_detected[:4],
            preparation_patterns=["Emphasize edge cases", "Explain Big-O complexity clearly"]
        )

    @staticmethod
    async def generate_preparation_plan(user_id: str, setup: PreparationSetupRequest) -> PreparationPlanResponse:
        """Analyzes all student inputs and produces a prioritized, transparent preparation plan."""
        db = get_database()

        # Build prompt for LLM
        analysis_context = {
            "target_role": setup.target_role,
            "target_company": setup.target_company or "General Tech Company",
            "target_deadline": setup.target_deadline or "4 Weeks",
            "student_skills": setup.skills,
            "self_reported_weak_topics": setup.weak_topics,
            "learning_goals": setup.learning_goals,
            "resume_projects": setup.resume_data.projects if setup.resume_data else [],
            "resume_skills": setup.resume_data.skills if setup.resume_data else [],
            "github_repos": [r.repo_name for r in setup.github_repos],
            "github_tech": [r.primary_language for r in setup.github_repos if r.primary_language],
            "candidate_experience_topics": [t for exp in setup.candidate_experiences for t in exp.extracted_topics]
        }

        prompt = f"""
You are an expert technical placement architect for PrepPilot AI.
Analyze the following student context and construct a structured personalized preparation plan:

{json.dumps(analysis_context, indent=2)}

Principles:
1. Do NOT invent achievements or assume repository authorship beyond what was provided.
2. Formulate 3-4 concrete project-defense questions directly addressing their listed resume projects and GitHub repositories.
3. Prioritize preparation topics based on the student's stated weak topics and target role requirements.
4. Organize into 3 sequential preparation milestones with high/medium/standard priority.
5. Provide a realistic, constructive readiness diagnostic (do NOT predict percentage probability or guarantee placement).

Respond ONLY with valid JSON matching this schema:
{{
  "readiness_diagnostic": "objective evaluation of their current profile against the target role",
  "strengths_summary": ["3-4 clear strengths identified from their actual skills and projects"],
  "knowledge_gaps": ["3-4 specific knowledge gaps to address"],
  "project_defense_questions": ["3-4 targeted questions challenging their actual project architecture"],
  "milestones": [
    {{
      "milestone_id": "m1",
      "title": "Milestone Title",
      "description": "What to master in this phase",
      "priority": "high",
      "topics": ["topic 1", "topic 2"],
      "suggested_activities": ["activity 1", "activity 2"],
      "completed": false
    }}
  ],
  "evidence_notes": "explanation of how this plan links back to their resume, repos, and supplied interview reports"
}}
"""

        raw_resp = await ai_client.generate(prompt=prompt, system="You are an educational placement planner. Output strict JSON only.", format_json=True)
        try:
            plan_json = json.loads(raw_resp)
            if not isinstance(plan_json, dict) or "milestones" not in plan_json or not plan_json.get("milestones"):
                raise ValueError("Incomplete plan schema returned by AI client")
        except Exception:
            plan_json = {
                "readiness_diagnostic": f"Strong baseline in {', '.join(setup.skills[:3]) if setup.skills else 'software engineering'}. Need structured reinforcement in self-identified weak topics ({', '.join(setup.weak_topics[:2]) if setup.weak_topics else 'core algorithms'}).",
                "strengths_summary": [
                    f"Practical project experience demonstrated across {len(setup.github_repos)} repositories",
                    f"Proficiency in core technologies: {', '.join(setup.skills[:4])}"
                ],
                "knowledge_gaps": setup.weak_topics or ["SQL Query Optimization", "Tree & Graph Traversals", "System Architecture Defense"],
                "project_defense_questions": [
                    "How do your repositories handle concurrent data mutations and race conditions?",
                    "What architectural trade-offs did you evaluate when selecting your database and API framework?"
                ],
                "milestones": [
                    {
                        "milestone_id": "m1",
                        "title": "Milestone 1: Core Fundamentals & Weak Topics Reinforcement",
                        "description": "Solidify data structures, SQL joins, and self-identified growth areas.",
                        "priority": "high",
                        "topics": setup.weak_topics[:3] if setup.weak_topics else ["SQL Joins & Aggregations", "Hash Maps & Arrays"],
                        "suggested_activities": ["Solve 5 targeted SQL problems in the Coding Sandbox", "Review mistake-to-mastery analogies with your mentor"],
                        "completed": False
                    },
                    {
                        "milestone_id": "m2",
                        "title": "Milestone 2: Project Architecture & Defense Readiness",
                        "description": "Prepare rigorous technical defense for your resume projects and GitHub repositories.",
                        "priority": "medium",
                        "topics": ["Component Boundaries", "Database Schema Modeling", "API Error Handling"],
                        "suggested_activities": ["Participate in a Project Defense session with My Mentor", "Formulate edge-case failure modes for your projects"],
                        "completed": False
                    },
                    {
                        "milestone_id": "m3",
                        "title": "Milestone 3: Role-Specific Mock Interviews & Behavioral Polish",
                        "description": "Full-length adaptive mock interviews matching reported recruitment rounds.",
                        "priority": "standard",
                        "topics": ["Comprehensive Technical Interview", "Structured Problem Solving"],
                        "suggested_activities": ["Complete 2 adaptive mock interview sessions in the Interview Room"],
                        "completed": False
                    }
                ],
                "evidence_notes": f"Personalized plan synthesized from {len(setup.skills)} skills, {len(setup.github_repos)} GitHub repositories, and candidate experience patterns."
            }

        milestones = [
            MilestoneItem(
                milestone_id=m.get("milestone_id", f"m{i+1}"),
                title=m.get("title", f"Milestone #{i+1}"),
                description=m.get("description", ""),
                priority=m.get("priority", "high"),
                topics=m.get("topics", []),
                suggested_activities=m.get("suggested_activities", []),
                completed=m.get("completed", False)
            )
            for i, m in enumerate(plan_json.get("milestones", []))
        ]

        now_iso = datetime.utcnow().isoformat()
        plan_doc = {
            "user_id": user_id,
            "target_role": setup.target_role,
            "target_company": setup.target_company,
            "target_deadline": setup.target_deadline,
            "readiness_diagnostic": plan_json.get("readiness_diagnostic", ""),
            "strengths_summary": plan_json.get("strengths_summary", []),
            "knowledge_gaps": plan_json.get("knowledge_gaps", []),
            "project_defense_questions": plan_json.get("project_defense_questions", []),
            "milestones": [m.dict() for m in milestones],
            "evidence_notes": plan_json.get("evidence_notes", ""),
            "setup_data": setup.dict(),
            "created_at": now_iso,
            "updated_at": now_iso
        }

        # Store or replace active plan for user
        existing_plan = await db["prep_plans"].find_one({"user_id": user_id})
        if existing_plan:
            plan_id = str(existing_plan["_id"])
            await db["prep_plans"].update_one({"_id": plan_id}, {"$set": plan_doc})
        else:
            res = await db["prep_plans"].insert_one(plan_doc)
            plan_id = str(res.inserted_id)

        # Update user's profile target role & company
        await db["users"].update_one(
            {"_id": user_id},
            {"$set": {
                "target_role": setup.target_role,
                "target_deadline": setup.target_deadline,
                "recruitment_type": setup.recruitment_type
            }}
        )

        return PreparationPlanResponse(
            id=plan_id,
            user_id=user_id,
            target_role=setup.target_role,
            target_company=setup.target_company,
            target_deadline=setup.target_deadline,
            readiness_diagnostic=plan_doc["readiness_diagnostic"],
            strengths_summary=plan_doc["strengths_summary"],
            knowledge_gaps=plan_doc["knowledge_gaps"],
            project_defense_questions=plan_doc["project_defense_questions"],
            milestones=milestones,
            evidence_notes=plan_doc["evidence_notes"],
            created_at=now_iso,
            updated_at=now_iso
        )

    @staticmethod
    async def get_current_plan(user_id: str) -> Optional[PreparationPlanResponse]:
        db = get_database()
        plan = await db["prep_plans"].find_one({"user_id": user_id})
        if not plan:
            return None
        return PreparationPlanResponse(
            id=str(plan["_id"]),
            user_id=user_id,
            target_role=plan.get("target_role", "Software Development Engineer"),
            target_company=plan.get("target_company"),
            target_deadline=plan.get("target_deadline"),
            readiness_diagnostic=plan.get("readiness_diagnostic", ""),
            strengths_summary=plan.get("strengths_summary", []),
            knowledge_gaps=plan.get("knowledge_gaps", []),
            project_defense_questions=plan.get("project_defense_questions", []),
            milestones=[MilestoneItem(**m) for m in plan.get("milestones", [])],
            evidence_notes=plan.get("evidence_notes", ""),
            created_at=plan.get("created_at", datetime.utcnow().isoformat()),
            updated_at=plan.get("updated_at", datetime.utcnow().isoformat())
        )
