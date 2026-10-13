import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from bson import ObjectId
from app.database.mongodb import get_database
from app.ai.client import ai_client
from app.ai.prompts import PromptTemplates

logger = logging.getLogger("preppilot.interview")

class InterviewService:

    @staticmethod
    async def create_session(
        user_id: str,
        role: str,
        track: str,
        company_id: Optional[str] = None,
        initial_difficulty: str = "medium"
    ) -> Dict[str, Any]:
        db = get_database()

        # Find questions matching track
        q_cursor = db["questions"].find({"track": track})
        questions = await q_cursor.to_list()
        if not questions:
            # Fallback to any questions
            q_cursor = db["questions"].find({})
            questions = await q_cursor.to_list()

        question_ids = [str(q["_id"]) for q in questions]

        company_name = None
        if company_id:
            comp = await db["companies"].find_one({"_id": company_id})
            if comp:
                company_name = comp.get("name")

        session_doc = {
            "user_id": user_id,
            "company_id": company_id,
            "company_name": company_name,
            "role": role,
            "track": track,
            "status": "active",
            "current_mode": "interviewer",
            "current_difficulty": initial_difficulty,
            "current_question_index": 0,
            "question_ids": question_ids,
            "total_questions": len(question_ids),
            "turns": [],
            "summary_report": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        res = await db["interview_sessions"].insert_one(session_doc)
        session_id = str(res.inserted_id)

        # Generate initial interviewer question turn
        first_q = questions[0] if questions else None
        first_turn_content = ""
        if first_q:
            first_turn_content = f"Welcome to your mock interview for the **{role}** position{f' at {company_name}' if company_name else ''}!\n\nLet's begin with our first question on **{first_q.get('topic', 'Core Concepts')}**:\n\n{first_q['problem_statement']}"
        else:
            first_turn_content = f"Welcome to your {role} interview! Let's discuss your approach to scalable software engineering."

        first_turn = {
            "id": str(ObjectId()),
            "turn_number": 1,
            "role": "interviewer",
            "turn_type": "question",
            "content": first_turn_content,
            "evaluation": None,
            "created_at": datetime.utcnow().isoformat()
        }

        await db["interview_sessions"].update_one(
            {"_id": session_id},
            {"$set": {"turns": [first_turn]}}
        )

        session_doc["id"] = session_id
        session_doc["turns"] = [first_turn]
        return session_doc

    @staticmethod
    async def get_session(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        db = get_database()
        session = await db["interview_sessions"].find_one({"_id": session_id, "user_id": user_id})
        if not session:
            return None
        session["id"] = str(session["_id"])
        return session

    @staticmethod
    async def submit_answer(session_id: str, user_id: str, answer_text: str) -> Dict[str, Any]:
        db = get_database()
        session = await db["interview_sessions"].find_one({"_id": session_id, "user_id": user_id})
        if not session:
            raise ValueError("Session not found")

        turns = session.get("turns", [])
        turn_number = len(turns) + 1

        # Current question details
        q_idx = session.get("current_question_index", 0)
        q_ids = session.get("question_ids", [])
        current_q_id = q_ids[q_idx] if q_idx < len(q_ids) else None
        
        current_question = None
        if current_q_id:
            current_question = await db["questions"].find_one({"_id": current_q_id})

        # Evaluate Answer using Ollama LLM
        eval_prompt = f"""
QUESTION:
{current_question.get('problem_statement') if current_question else 'General Technical Question'}

RUBRIC CORE CONCEPTS:
{json.dumps(current_question.get('rubric', {}).get('core_concepts', [])) if current_question else '[]'}

RUBRIC COMMON MISCONCEPTIONS:
{json.dumps(current_question.get('rubric', {}).get('common_misconceptions', [])) if current_question else '[]'}

CANDIDATE ANSWER:
{answer_text}

Evaluate the candidate's answer and produce strict JSON conforming to the evaluator specification.
"""
        eval_raw = await ai_client.generate(
            prompt=eval_prompt,
            system=PromptTemplates.EVALUATOR_SYSTEM,
            format_json=True
        )

        try:
            eval_data = json.loads(eval_raw)
        except Exception:
            eval_data = {
                "correctness": "partially_correct",
                "concepts_demonstrated": ["Attempted response"],
                "missing_concepts": ["Specific details"],
                "misconceptions": [],
                "feedback": "Thank you for sharing your thoughts. You have addressed the primary idea.",
                "assistance_level": "independent",
                "confidence_score": 0.8,
                "suggested_followup": "Could you elaborate on how you would optimize the time complexity?"
            }

        # 1. Candidate Turn
        candidate_turn = {
            "id": str(ObjectId()),
            "turn_number": turn_number,
            "role": "candidate",
            "turn_type": "answer",
            "content": answer_text,
            "evaluation": eval_data,
            "created_at": datetime.utcnow().isoformat()
        }
        turns.append(candidate_turn)

        # 2. Record learning event
        if current_question:
            event_doc = {
                "user_id": user_id,
                "topic": current_question.get("topic", "General"),
                "question_id": current_q_id,
                "attempt_type": eval_data.get("assistance_level", "independent"),
                "outcome": eval_data.get("correctness", "partially_correct"),
                "misconception_tag": eval_data.get("misconceptions", [None])[0] if eval_data.get("misconceptions") else None,
                "timestamp": datetime.utcnow().isoformat()
            }
            await db["learning_events"].insert_one(event_doc)

            # If misconception detected, schedule revision task
            if eval_data.get("misconceptions"):
                for m in eval_data["misconceptions"]:
                    rev_doc = {
                        "user_id": user_id,
                        "topic": current_question.get("topic", "General"),
                        "question_title": current_question.get("title", "Review Question"),
                        "misconception_addressed": m,
                        "due_date": datetime.utcnow().isoformat(),
                        "status": "pending",
                        "question_id": current_q_id
                    }
                    await db["revision_tasks"].insert_one(rev_doc)

        # 3. Determine next interviewer response
        next_turn_content = ""
        correctness = eval_data.get("correctness")

        if correctness == "partially_correct" and eval_data.get("suggested_followup"):
            next_turn_content = f"{eval_data.get('feedback')}\n\n**Follow-up Question:** {eval_data.get('suggested_followup')}"
            turn_type = "followup"
        else:
            # Advance to next question or complete session
            new_q_idx = q_idx + 1
            if new_q_idx < len(q_ids):
                next_q = await db["questions"].find_one({"_id": q_ids[new_q_idx]})
                next_turn_content = f"{eval_data.get('feedback')}\n\nExcellent effort! Let's proceed to Question #{new_q_idx + 1} on **{next_q.get('topic', 'Next Topic')}**:\n\n{next_q.get('problem_statement')}"
                turn_type = "question"
                await db["interview_sessions"].update_one(
                    {"_id": session_id},
                    {"$set": {"current_question_index": new_q_idx}}
                )
            else:
                next_turn_content = f"{eval_data.get('feedback')}\n\n**Interview Complete!** You have answered all target questions in this track. Review your session summary report below."
                turn_type = "question"
                await db["interview_sessions"].update_one(
                    {"_id": session_id},
                    {"$set": {"status": "completed"}}
                )

        interviewer_turn = {
            "id": str(ObjectId()),
            "turn_number": len(turns) + 1,
            "role": "interviewer",
            "turn_type": turn_type,
            "content": next_turn_content,
            "evaluation": None,
            "created_at": datetime.utcnow().isoformat()
        }
        turns.append(interviewer_turn)

        await db["interview_sessions"].update_one(
            {"_id": session_id},
            {"$set": {"turns": turns, "updated_at": datetime.utcnow().isoformat()}}
        )

        session["turns"] = turns
        session["id"] = str(session["_id"])
        return session

    @staticmethod
    async def request_hint(session_id: str, user_id: str, hint_level: int = 1) -> Dict[str, Any]:
        db = get_database()
        session = await db["interview_sessions"].find_one({"_id": session_id, "user_id": user_id})
        if not session:
            raise ValueError("Session not found")

        q_idx = session.get("current_question_index", 0)
        q_ids = session.get("question_ids", [])
        current_q = None
        if q_idx < len(q_ids):
            current_q = await db["questions"].find_one({"_id": q_ids[q_idx]})

        hint_prompt = f"""
QUESTION:
{current_q.get('problem_statement') if current_q else 'Technical Question'}

Provide a Level {hint_level} hint for the candidate:
- Level 1: A subtle conceptual nudge pointing to the relevant data structure or edge case without giving the answer.
- Level 2: An architectural hint explaining the relationship between inputs and outputs.
- Level 3: A structured pseudocode skeleton.
"""
        hint_text = await ai_client.generate(
            prompt=hint_prompt,
            system="You are an encouraging interview mentor giving a hint. Never give away the exact final code or answer."
        )

        hint_turn = {
            "id": str(ObjectId()),
            "turn_number": len(session.get("turns", [])) + 1,
            "role": "interviewer",
            "turn_type": "hint",
            "content": f"**Hint (Level {hint_level}):**\n{hint_text}",
            "evaluation": None,
            "created_at": datetime.utcnow().isoformat()
        }

        turns = session.get("turns", [])
        turns.append(hint_turn)

        await db["interview_sessions"].update_one(
            {"_id": session_id},
            {"$set": {"turns": turns, "updated_at": datetime.utcnow().isoformat()}}
        )

        session["turns"] = turns
        session["id"] = str(session["_id"])
        return session

    @staticmethod
    async def switch_mode(session_id: str, user_id: str, mode: str) -> Dict[str, Any]:
        db = get_database()
        session = await db["interview_sessions"].find_one({"_id": session_id, "user_id": user_id})
        if not session:
            raise ValueError("Session not found")

        q_idx = session.get("current_question_index", 0)
        q_ids = session.get("question_ids", [])
        current_q = None
        if q_idx < len(q_ids):
            current_q = await db["questions"].find_one({"_id": q_ids[q_idx]})

        message = ""
        if mode == "mentor":
            mentor_prompt = f"""
QUESTION:
{current_q.get('problem_statement') if current_q else 'Technical Question'}

RUBRIC CORE CONCEPTS:
{json.dumps(current_q.get('rubric', {}).get('core_concepts', [])) if current_q else '[]'}

Provide a structured Mistake-to-Mastery explanation following the 5-step pedagogy:
1. Diagnosis
2. Affirmation
3. Intuitive Analogy
4. Side-by-side comparison
5. Fresh understanding check question.
"""
            mentor_text = await ai_client.generate(
                prompt=mentor_prompt,
                system=PromptTemplates.MENTOR_SYSTEM
            )
            message = f"**Senior Mentor Mode Activated:**\n\n{mentor_text}"
        else:
            message = "**Switched back to Interviewer Mode.** Whenever you are ready, continue with your answer."

        turn = {
            "id": str(ObjectId()),
            "turn_number": len(session.get("turns", [])) + 1,
            "role": "mentor" if mode == "mentor" else "interviewer",
            "turn_type": "mentor_explanation" if mode == "mentor" else "question",
            "content": message,
            "evaluation": None,
            "created_at": datetime.utcnow().isoformat()
        }

        turns = session.get("turns", [])
        turns.append(turn)

        await db["interview_sessions"].update_one(
            {"_id": session_id},
            {"$set": {"current_mode": mode, "turns": turns, "updated_at": datetime.utcnow().isoformat()}}
        )

        session["current_mode"] = mode
        session["turns"] = turns
        session["id"] = str(session["_id"])
        return session
