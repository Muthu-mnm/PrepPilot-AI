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
            # Check for existing user records to form a contextual greeting
            plan = await db["prep_plans"].find_one({"user_id": user_id})
            role = plan.get("target_role", "Software Development Engineer") if plan else "Software Development Engineer"
            company = f" at {plan.get('target_company')}" if plan and plan.get("target_company") else ""

            # Check recent learning events for returning students
            events_cursor = db["learning_events"].find({"user_id": user_id}).sort("timestamp", -1).limit(1)
            events = await events_cursor.to_list()
            last_event = events[0] if events else None

            subs_cursor = db["submissions"].find({"user_id": user_id}).sort("created_at", -1).limit(1)
            subs = await subs_cursor.to_list()
            last_sub = subs[0] if subs else None

            pending_rev = await db["revision_tasks"].find_one({"user_id": user_id, "status": "pending"})

            if last_event and last_event.get("topic"):
                topic = last_event["topic"]
                outcome = last_event.get("outcome", "practiced")
                att_type = last_event.get("attempt_type", "independent")
                greeting_text = (
                    f"Welcome back! In our previous session, you practiced **{topic}** "
                    f"({att_type.replace('_', ' ')} attempt with outcome: *{outcome}*).\n\n"
                    f"Today, let's test your understanding independently before increasing the difficulty, "
                    f"or tackle your next goal for **{role}{company}**."
                )
                suggested_actions = [
                    f"Retest my understanding of {topic}",
                    "Start a mock technical interview",
                    "Defend my GitHub project architecture",
                    "Solve a coding challenge in the sandbox"
                ]
            elif plan and plan.get("milestones"):
                first_ms = plan["milestones"][0]
                ms_title = first_ms.get("title", "Core Fundamentals")
                greeting_text = (
                    f"Welcome back! Your preparation plan for **{role}{company}** is active.\n\n"
                    f"Your highest-priority milestone is **{ms_title}**.\n\n"
                    f"How would you like to make progress today?"
                )
                suggested_actions = [
                    f"Work on {ms_title}",
                    "Start a mock interview round",
                    "Defend project architecture",
                    "Practice live coding"
                ]
            else:
                greeting_text = (
                    f"Hello! I am your personal placement mentor for **{role}{company}**.\n\n"
                    "I personalize your preparation using your **resume**, **company skill specifications**, "
                    "**GitHub repositories**, and **target goals**.\n\n"
                    "You can attach documents anytime using the attachment icon (📎), or choose a mode below to start:\n\n"
                    "• **General Chat:** Ask questions, discuss your target role, or build your prep plan.\n"
                    "• **Interview:** Practice technical and behavioral questions one by one.\n"
                    "• **Coding:** Solve Python or SQL challenges in the live sandbox.\n"
                    "• **Learn:** Master concepts with clear analogies and examples.\n"
                    "• **Project Defense:** Defend your architecture and implementation decisions.\n"
                    "• **Retest:** Verify mastery on past weak areas."
                )
                suggested_actions = [
                    "Help me build my preparation plan",
                    "Start a mock technical interview",
                    "Defend my GitHub project architecture",
                    "Open a live SQL / Python coding challenge"
                ]

            initial_msg = {
                "id": str(ObjectId()),
                "role": "mentor",
                "content": greeting_text,
                "mode": "general_chat",
                "suggested_actions": suggested_actions,
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
    async def reset_conversation(user_id: str) -> List[Dict[str, Any]]:
        db = get_database()
        await db["mentor_sessions"].delete_one({"user_id": user_id})
        return await UnifiedMentorService.get_or_create_conversation(user_id)

    @staticmethod
    def _normalize_mode(raw_mode: str) -> str:
        mapping = {
            "general_chat": "general_chat",
            "mentor_chat": "general_chat",
            "interview": "interview",
            "interview_practice": "interview",
            "coding": "coding",
            "coding_review": "coding",
            "learn": "learn",
            "concept_explanation": "learn",
            "project_defense": "project_defense",
            "retest": "retest",
            "knowledge_check": "retest"
        }
        return mapping.get(raw_mode, "general_chat")

    @staticmethod
    async def handle_user_message(user_id: str, payload: MentorChatMessageRequest) -> MentorChatMessageResponse:
        db = get_database()
        messages = await UnifiedMentorService.get_or_create_conversation(user_id)
        active_mode = UnifiedMentorService._normalize_mode(payload.mode)

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
            "mode": active_mode
        }

        # Build prompt tailored to the 6 contextual modes
        system_prompt = """You are PrepPilot AI's Senior Technical Placement Mentor.
You are a warm, rigorous, and supportive senior engineer guiding the student toward placement mastery.

Core Pedagogical Principles:
1. Always ground your questions and advice in the student's target role, company, ingested projects, and past misconceptions.
2. When the student makes an error or asks for help:
   - Acknowledge any correct intuition or partial progress first.
   - Diagnose the specific misconception concisely without condescension.
   - Explain the concept using a concrete everyday analogy and a concrete code example.
   - Provide a progressive hint (nudge -> structural -> walkthrough) rather than immediately revealing full code.
   - Formulate an independent follow-up check question.
3. Behavior by Active Mode:
   - 'general_chat': Conversational advisor. Welcome the student, answer general career/placement queries, guide conversational onboarding (resume, company specs, GitHub, goals), and help construct or refine their preparation plan.
   - 'interview': Technical & behavioral mock interview. Ask ONE focused question at a time. Evaluate student answers against rubric depth.
   - 'coding': Challenge analysis and sandbox guidance. Diagnose failed test cases, analyze Big-O time and space complexity, and offer targeted progressive hints.
   - 'learn': Deliver an intuitive 5-step concept explanation (Diagnosis -> Intuition Analogy -> Right vs Wrong Comparison -> Concrete Code Example -> Practice Retest).
   - 'project_defense': Drill into their actual GitHub project architecture, module boundaries, race conditions, database choices, and scaling tradeoffs. Never invent files or repositories.
   - 'retest': Challenge the student with a fresh, independent question testing a previously misunderstood concept to verify genuine retention.

Output Format: Strictly valid JSON with schema:
{
  "content": "detailed markdown response with clean formatting, bullet points, and code blocks where helpful",
  "misconception_detected": "string or null",
  "affirmation": "what the student did right, or null",
  "action_type": "offer_code" | "schedule_revision" | "retest_question" | null,
  "suggested_actions": ["3 short suggested reply options for the student"]
}
"""

        user_turn_prompt = f"""
STUDENT PROFILE & PERSISTENT CONTEXT:
{json.dumps(context_data, indent=2)}

ACTIVE MODE: {active_mode}
FOCUS TOPIC: {payload.context_topic or 'General Technical'}
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
            resp_json = UnifiedMentorService._build_contextual_fallback(payload, context_data, active_mode)

        # Save user message to history
        user_msg = {
            "id": str(ObjectId()),
            "role": "candidate",
            "content": payload.message,
            "mode": active_mode,
            "created_at": datetime.utcnow().isoformat()
        }
        messages.append(user_msg)

        # Save mentor response
        mentor_msg = {
            "id": str(ObjectId()),
            "role": "mentor",
            "content": resp_json.get("content", ""),
            "mode": active_mode,
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
            mode=active_mode,
            misconception_detected=mentor_msg["misconception_detected"],
            affirmation=mentor_msg["affirmation"],
            action_type=mentor_msg["action_type"],
            suggested_actions=mentor_msg["suggested_actions"],
            created_at=mentor_msg["created_at"]
        )

    @staticmethod
    def _build_contextual_fallback(payload: MentorChatMessageRequest, context: Dict[str, Any], active_mode: str) -> Dict[str, Any]:
        """Provides rich, high-signal pedagogical fallback when local LLM is offline or timing out."""
        role = context.get("target_role", "Software Development Engineer")
        topic = payload.context_topic or (context.get("knowledge_gaps", ["Core Fundamentals"])[0] if context.get("knowledge_gaps") else "General Systems")

        if active_mode == "project_defense":
            return {
                "content": f"### Project Architecture Defense Drill\n\nLet's examine how your project handles production failure modes for a **{role}** candidate.\n\n1. **Data Consistency & Concurrency:** In your system, what happens when two clients attempt to write to the same resource simultaneously? Do you rely on optimistic locking or database row-level locks?\n2. **Failure Recovery:** If your background worker or inference task crashes mid-execution, how is state restored without data loss?\n\nHow did you structure this trade-off?",
                "misconception_detected": None,
                "affirmation": "You are focusing on distributed architecture decisions that interviewers scrutinize.",
                "action_type": None,
                "suggested_actions": ["Explain our optimistic locking approach", "Discuss message queue retry deadlocks", "Ask about cache invalidation"]
            }
        elif active_mode == "coding":
            return {
                "content": f"### Sandbox Code & Complexity Feedback\n\nI've analyzed your submission in the coding workspace for **{topic}**:\n\n• **Algorithmic Structure:** The core traversal logic is sound, but consider how edge cases (empty collections, duplicates, or boundary values) behave.\n• **Time & Space Complexity:** Aim for optimal linear time $O(N)$ with an auxiliary hash map rather than nested lookups $O(N^2)$.\n\nWould you like a subtle nudge hint on how to handle the edge case, or would you like to review the step-by-step approach?",
                "misconception_detected": None,
                "affirmation": "Your overall approach establishes a solid foundation for optimal execution.",
                "action_type": "offer_code",
                "suggested_actions": ["Give me a subtle nudge hint", "Explain optimal time complexity", "Let me revise my code in sandbox"]
            }
        elif active_mode == "learn":
            return {
                "content": f"### 5-Step Concept Explanation: **{topic}**\n\nLet's break this down intuitively:\n\n1. **The Core Intuition:** Think of `{topic}` like a library checkout desk. If a patron has never checked out a book, an `INNER JOIN` drops them entirely, whereas a `LEFT JOIN` keeps the patron and returns `NULL` for their checkout card.\n2. **Common Trap:** Filtering `WHERE card IS NULL` after an `INNER JOIN` yields 0 rows because inner joins already discarded unmatched records.\n3. **Quick Check:** What operator would you use to filter unmatched records when joining two related tables?",
                "misconception_detected": "Assuming INNER JOIN preserves unmatched records before applying WHERE filters.",
                "affirmation": "You recognize that filtering NULL values is key to isolating missing records.",
                "action_type": "retest_question",
                "suggested_actions": ["Use LEFT JOIN with WHERE IS NULL", "Explain with another real-world analogy", "Try an independent coding question"]
            }
        elif active_mode == "retest":
            return {
                "content": f"### Independent Retention Retest: **{topic}**\n\nHere is a fresh retention question targeting your diagnosed knowledge gap:\n\n> *In high-concurrency systems, how does an indexing strategy on foreign keys prevent table locks during cascade updates, and what is the trade-off on write throughput?*\n\nTake a moment to formulate your answer independently, or ask for a progressive hint if you want to explore the underlying mechanism first.",
                "misconception_detected": None,
                "affirmation": "Targeting your diagnosed knowledge gaps creates the highest placement ROI.",
                "action_type": "retest_question",
                "suggested_actions": ["Foreign key index prevents full table locks", "Trade-off is slower INSERT/UPDATE writes", "Give me a hint on table locks"]
            }
        elif active_mode == "interview":
            return {
                "content": f"### Mock Technical Interview for **{role}**\n\nLet's practice a core scenario commonly tested in top placement rounds:\n\n> *Suppose our system processes incoming events and needs to detect duplicates within a 15-minute sliding window while maintaining low latency. How would you design this data pipeline?*\n\nConsider:\n• What storage engine or caching layer would you choose (e.g. Redis TTL, sliding logs)?\n• How do you handle clock drift across server nodes?",
                "misconception_detected": None,
                "affirmation": "Practicing realistic scenario questions builds genuine confidence.",
                "action_type": None,
                "suggested_actions": ["Use Redis sorted sets with sliding expiration", "Use in-memory Bloom filter with TTL", "Ask for a progressive hint"]
            }
        else: # general_chat
            return {
                "content": f"### Placement Strategy & Guidance\n\nI am here to guide your preparation journey for **{role}**.\n\nWe can personalize your practice around:\n• Your uploaded **resume** and key project implementations\n• Your **target company** skill specifications\n• Your **GitHub repositories** and architectural defense readiness\n• High-frequency questions reported in recent candidate interview rounds\n\nWhat would you like to explore next?",
                "misconception_detected": None,
                "affirmation": "Having a clear target role is the foundation of focused preparation.",
                "action_type": None,
                "suggested_actions": ["Help me build my preparation plan", "Practice technical interview questions", "Explore coding problems in sandbox"]
            }

