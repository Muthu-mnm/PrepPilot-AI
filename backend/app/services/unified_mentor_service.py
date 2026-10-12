import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from bson import ObjectId

from app.database.mongodb import get_database
from app.ai.client import ai_client
from app.schemas.prep import MentorChatMessageRequest, MentorChatMessageResponse

logger = logging.getLogger("preppilot.mentor_service")

class UnifiedMentorService:

    @staticmethod
    async def get_or_create_conversation(user_id: str) -> List[Dict[str, Any]]:
        db = get_database()
        session = await db["mentor_sessions"].find_one({"user_id": user_id})
        if not session:
            # Create greeting turn grounded in user profile
            plan = await db["prep_plans"].find_one({"user_id": user_id})
            role = plan.get("target_role", "Software Development Engineer") if plan else "Software Development Engineer"
            company = f" at {plan.get('target_company')}" if plan and plan.get("target_company") else ""
            
            initial_msg = {
                "id": str(ObjectId()),
                "role": "mentor",
                "content": f"Hello! I am your dedicated placement mentor for **{role}{company}**.\n\nI have reviewed your background, projects, and target role. How would you like to prepare right now?\n\n• **Defend your projects:** We can drill down into your actual GitHub repos and architectural decisions.\n• **Target role practice:** Practice interview questions tailored to your upcoming opportunity.\n• **Review misconceptions:** Reinforce topics where you previously needed hints or made mistakes.\n• **Solve a coding challenge:** Jump into the isolated coding workspace.",
                "mode": "mentor_chat",
                "suggested_actions": ["Defend my GitHub project", "Practice technical interview questions", "Review recent misconceptions", "Open SQL/Python challenge"],
                "created_at": datetime.utcnow().isoformat()
            }
            doc = {
                "user_id": user_id,
                "messages": [initial_msg],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            await db["mentor_sessions"].insert_one(doc)
            return [initial_msg]
        return session.get("messages", [])

    @staticmethod
    async def handle_user_message(user_id: str, payload: MentorChatMessageRequest) -> MentorChatMessageResponse:
        db = get_database()
        messages = await UnifiedMentorService.get_or_create_conversation(user_id)

        # Retrieve student context: active plan, recent misconceptions, recent coding submissions
        plan = await db["prep_plans"].find_one({"user_id": user_id})
        learning_events_cursor = db["learning_events"].find({"user_id": user_id}).sort("timestamp", -1).limit(5)
        recent_events = await learning_events_cursor.to_list()
        recent_misconceptions = [e.get("misconception_tag") for e in recent_events if e.get("misconception_tag")]

        sub_cursor = db["submissions"].find({"user_id": user_id}).sort("created_at", -1).limit(3)
        recent_submissions = await sub_cursor.to_list()

        context_data = {
            "target_role": plan.get("target_role") if plan else "Software Development Engineer",
            "target_company": plan.get("target_company") if plan else None,
            "target_deadline": plan.get("target_deadline") if plan else None,
            "knowledge_gaps": plan.get("knowledge_gaps", []) if plan else [],
            "project_defense_questions": plan.get("project_defense_questions", []) if plan else [],
            "recent_misconceptions": recent_misconceptions,
            "recent_submission_statuses": [f"{s.get('language')}: {s.get('status')}" for s in recent_submissions],
            "mode": payload.mode
        }

        # Build prompt
        system_prompt = """You are PrepPilot AI's Senior Technical Placement Mentor.
You are a warm, rigorous, and supportive senior engineer.
Principles:
1. Always ground your advice and questions in the student's actual profile, repositories, target role, and past misconceptions.
2. If the student made an error or asks for help:
   - Diagnose the specific misconception without condescension.
   - Acknowledge any correct reasoning or intent.
   - Explain the concept intuitively with a concrete real-world analogy.
   - Offer progressive hints rather than immediately dumping the entire code solution.
   - Provide an independent re-test check question.
3. If in 'project_defense' mode, ask challenging, realistic questions about their repository architecture, error handling, scaling, and database trade-offs.
4. Output your response as a valid JSON object with the following fields:
{
  "content": "detailed markdown response",
  "misconception_detected": "string or null",
  "affirmation": "what the student did right, or null",
  "action_type": "offer_code" | "schedule_revision" | "retest_question" | null,
  "suggested_actions": ["3 short suggested reply options for the student"]
}
"""

        user_turn_prompt = f"""
STUDENT PROFILE & PERSISTENT CONTEXT:
{json.dumps(context_data, indent=2)}

ACTIVE MODE: {payload.mode}
USER MESSAGE:
{payload.message}
"""
        if payload.code_snippet:
            user_turn_prompt += f"\nCODE SNIPPET PROVIDED:\n```\n{payload.code_snippet}\n```"

        raw_resp = await ai_client.generate(prompt=user_turn_prompt, system=system_prompt, format_json=True)
        try:
            resp_json = json.loads(raw_resp)
            if not isinstance(resp_json, dict) or "content" not in resp_json or not resp_json.get("content"):
                raise ValueError("Incomplete mentor response schema")
        except Exception:
            resp_json = {
                "content": f"I understand your focus on **{payload.mode.replace('_', ' ')}**. Let's break this down systematically. What specific aspect of your approach would you like to verify first?",
                "misconception_detected": None,
                "affirmation": "You are focusing on the right core concepts.",
                "action_type": None,
                "suggested_actions": ["Explain the underlying trade-off", "Give me a practice problem", "Check my understanding"]
            }

        # Save user message to history
        user_msg = {
            "id": str(ObjectId()),
            "role": "candidate",
            "content": payload.message,
            "mode": payload.mode,
            "created_at": datetime.utcnow().isoformat()
        }
        messages.append(user_msg)

        # Save mentor response
        mentor_msg = {
            "id": str(ObjectId()),
            "role": "mentor",
            "content": resp_json.get("content", ""),
            "mode": payload.mode,
            "misconception_detected": resp_json.get("misconception_detected"),
            "affirmation": resp_json.get("affirmation"),
            "action_type": resp_json.get("action_type"),
            "suggested_actions": resp_json.get("suggested_actions", []),
            "created_at": datetime.utcnow().isoformat()
        }
        messages.append(mentor_msg)

        # Persist to database
        await db["mentor_sessions"].update_one(
            {"user_id": user_id},
            {"$set": {"messages": messages, "updated_at": datetime.utcnow().isoformat()}}
        )

        # If misconception was detected, schedule a revision task
        if resp_json.get("misconception_detected"):
            await db["revision_tasks"].insert_one({
                "user_id": user_id,
                "topic": payload.context_topic or "Mentor Topic Review",
                "question_title": "Mentor Review Follow-up",
                "misconception_addressed": resp_json.get("misconception_detected"),
                "due_date": datetime.utcnow().isoformat(),
                "status": "pending"
            })

        return MentorChatMessageResponse(
            id=mentor_msg["id"],
            role="mentor",
            content=mentor_msg["content"],
            mode=mentor_msg["mode"],
            misconception_detected=mentor_msg["misconception_detected"],
            affirmation=mentor_msg["affirmation"],
            action_type=mentor_msg["action_type"],
            suggested_actions=mentor_msg["suggested_actions"],
            created_at=mentor_msg["created_at"]
        )
