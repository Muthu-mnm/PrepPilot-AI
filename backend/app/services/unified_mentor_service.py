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

            if not plan and not last_event:
                # FIRST-TIME STUDENT: Clean welcome state (no fabricated target company or role)
                greeting_text = (
                    "Hi! I'm your PrepPilot mentor. I'll help you prepare for placements based on your goals, skills, projects, and target roles.\n\n"
                    "Let's start by understanding your preparation. You can upload your resume, share a company skill specification, add your GitHub projects, or simply tell me what role you're aiming for."
                )
                suggested_actions = [
                    "Upload resume",
                    "Add company requirements",
                    "Add GitHub projects",
                    "Set my placement goal"
                ]
            elif last_event and last_event.get("topic"):
                role = plan.get("target_role", "Target Role") if plan else "Target Role"
                company = f" at {plan.get('target_company')}" if plan and plan.get("target_company") else ""
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
                role = plan.get("target_role", "Target Role")
                company = f" at {plan.get('target_company')}" if plan.get("target_company") else ""
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
                role = plan.get("target_role", "Target Role") if plan else "Target Role"
                company = f" at {plan.get('target_company')}" if plan and plan.get("target_company") else ""
                greeting_text = (
                    f"Hello! I am your personal placement mentor for **{role}{company}**.\n\n"
                    "How would you like to prepare today?"
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
    def _build_system_prompt(active_mode: str, context_data: Dict[str, Any]) -> str:
        role = context_data.get("target_role") or "Software Development Engineer"
        company = f" at {context_data.get('target_company')}" if context_data.get('target_company') else ""
        knowledge_gaps = context_data.get("knowledge_gaps", [])
        gaps_str = f" Known areas for reinforcement: {', '.join(knowledge_gaps)}." if knowledge_gaps else ""

        base_rules = f"""You are PrepPilot AI's Senior Technical Placement Mentor.
You are an experienced, patient, and technically rigorous software engineer coaching candidates for technical roles ({role}{company}).{gaps_str}

CORE PRINCIPLES:
1. Tone: Conversational, thoughtful, and technically precise. Speak naturally as a senior engineering mentor.
2. NO RIGID LABELS: Never use boilerplate section headings or template labels. Specifically, DO NOT use:
   - "Acknowledged Reasoning"
   - "Directional Nudge"
   - "Key Insight"
   - "Mentoring Strategy"
   - "AI Analysis"
   - "Thinking Pipeline"
   - "5-Step Concept Explanation"
3. NO EMPTY PRAISE: Avoid reflexive, generic praise like "Amazing!", "Brilliant!", or "Excellent thinking!". Acknowledge correct technical intuition naturally within the explanation.
4. ADAPTIVE DEPTH: Keep simple answers direct and concise; provide deeper explanations, tradeoffs, and code only when the topic demands depth.
5. NO INTERNAL REASONING DUMP: Never output internal thoughts, chain-of-thought scratchpads, or system meta-commentary. Give the candidate clear, high-signal technical explanations and actionable guidance.
6. CONTINUITY: Always read and ground your response in the ongoing conversation history. Never restart the conversation or ask generic questions when the student asked about a specific topic."""

        if active_mode == "general_chat":
            return base_rules + """

MODE GUIDANCE - GENERAL CHAT:
- Answer the student's question directly, accurately, and naturally.
- Use previous turns to maintain context and build upon earlier answers.
- Ask a follow-up only when it clarifies something important or genuinely advances the discussion.
- Do not force ordinary conversational questions into formal interview evaluations."""

        elif active_mode == "interview":
            return base_rules + f"""

MODE GUIDANCE - TECHNICAL INTERVIEW:
- Conduct a realistic technical interview for a {role}{company}.
- Ask exactly ONE interview question or probing follow-up at a time.
- Let the candidate complete their answer. Evaluate their actual reasoning, depth, edge cases, and assumptions.
- If their answer is incomplete or vague, ask a targeted follow-up to test deeper understanding rather than immediately displaying the ideal model answer.
- If their answer is solid, acknowledge the strong points and probe a related edge case, system tradeoff, or advance to the next question.
- Do not dump the question, rubric, and solution together in one turn."""

        elif active_mode == "coding":
            return base_rules + """

MODE GUIDANCE - CODING MENTOR:
- Focus on independent problem solving. Deeply understand the problem and the candidate's current approach.
- If the candidate asks for a hint, provide ONE problem-specific progressive clue or invariant. DO NOT reveal the complete solution or full code right away.
- When reviewing candidate code or logic, pinpoint the exact failing edge case, off-by-one bug, or Big-O complexity tradeoff.
- Distinguish conceptual bugs from syntax/runtime errors.
- Provide full code only when explicitly requested or after multiple guided iterations."""

        elif active_mode == "learn":
            return base_rules + """

MODE GUIDANCE - CONCEPT LEARNING:
- Teach concepts deeply enough for the student to explain and apply them in interview settings.
- Use clear intuition, practical software engineering analogies, and side-by-side right vs wrong comparisons.
- Ask a single focused comprehension check when helpful.
- If the candidate reveals a misconception, diagnose the exact flaw gently and re-explain using a different analogy or worked example."""

        elif active_mode == "project_defense":
            return base_rules + """

MODE GUIDANCE - PROJECT DEFENSE:
- Challenge the candidate to defend their actual projects, architectures, and engineering decisions.
- Probe trade-offs: why this tech stack, database schemas, concurrency/locking, scaling bottlenecks, fault tolerance, and candidate's specific contributions.
- Ask ONE meaningful, probing question at a time.
- Never invent files, repositories, or metrics that the candidate did not mention. If details are missing, ask them to describe the implementation."""

        elif active_mode == "retest":
            return base_rules + """

MODE GUIDANCE - KNOWLEDGE RETEST:
- Verify retention of previously weak or practiced concepts.
- Present a fresh, realistic problem testing the same underlying concept without repeating the past question word-for-word.
- Wait for the candidate's independent answer before providing hints.
- Objectively evaluate whether they solved it independently."""

        return base_rules

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
            "target_role": plan.get("target_role") if plan else None,
            "target_company": plan.get("target_company") if plan else None,
            "target_deadline": plan.get("target_deadline") if plan else None,
            "knowledge_gaps": plan.get("knowledge_gaps", []) if plan else [],
            "recent_misconceptions": recent_misconceptions,
            "recent_submission_statuses": [f"{s.get('language')}: {s.get('status')}" for s in recent_submissions],
            "mode": active_mode
        }

        # Build system prompt tailored to active mode and persistent context
        system_prompt = UnifiedMentorService._build_system_prompt(active_mode, context_data)

        # Assemble multi-turn conversation messages for Ollama /api/chat
        chat_messages: List[Dict[str, str]] = [
            {"role": "system", "content": system_prompt}
        ]

        # Append previous conversation turns (up to last 10 turns for context continuity)
        for msg in messages[-10:]:
            role_type = msg.get("role", "")
            content_str = msg.get("content", "").strip()
            if not content_str:
                continue
            if role_type in ["candidate", "user"]:
                chat_messages.append({"role": "user", "content": content_str})
            elif role_type == "mentor":
                chat_messages.append({"role": "assistant", "content": content_str})

        # Append the new user turn
        current_turn_text = payload.message.strip()
        if payload.code_snippet:
            current_turn_text += f"\n\n```\n{payload.code_snippet}\n```"
        if payload.context_topic and not any(payload.context_topic.lower() in current_turn_text.lower() for _ in [1]):
            current_turn_text = f"[{payload.context_topic}] {current_turn_text}"

        chat_messages.append({"role": "user", "content": current_turn_text})

        # Generate response using Ollama chat endpoint
        try:
            mentor_content = await ai_client.chat(messages=chat_messages, format_json=False)
            if not mentor_content or len(mentor_content) < 10:
                raise ValueError("Empty response received from AI model")
        except Exception as e:
            logger.warning(f"Ollama chat error ({e}), utilizing contextual mentor fallback.")
            mentor_content = UnifiedMentorService._build_contextual_fallback(payload, context_data, active_mode)

        # Determine context-aware suggested actions ONLY when genuinely useful
        suggested_actions = UnifiedMentorService._determine_suggested_actions(active_mode, payload.message, mentor_content)

        # Save user message to history
        user_msg = {
            "id": str(ObjectId()),
            "role": "candidate",
            "content": payload.message,
            "mode": active_mode,
            "created_at": datetime.utcnow().isoformat()
        }
        messages.append(user_msg)

        # Save mentor response to history
        mentor_msg = {
            "id": str(ObjectId()),
            "role": "mentor",
            "content": mentor_content,
            "mode": active_mode,
            "action_type": "offer_code" if active_mode == "coding" and "```" in mentor_content else None,
            "suggested_actions": suggested_actions,
            "created_at": datetime.utcnow().isoformat()
        }
        messages.append(mentor_msg)

        # Persist session to MongoDB
        await db["mentor_sessions"].update_one(
            {"user_id": user_id},
            {"$set": {"messages": messages, "updated_at": datetime.utcnow().isoformat()}}
        )

        return MentorChatMessageResponse(
            id=mentor_msg["id"],
            role="mentor",
            content=mentor_msg["content"],
            mode=active_mode,
            misconception_detected=None,
            affirmation=None,
            action_type=mentor_msg.get("action_type"),
            suggested_actions=mentor_msg.get("suggested_actions", []),
            created_at=mentor_msg["created_at"]
        )

    @staticmethod
    def _determine_suggested_actions(active_mode: str, user_msg: str, mentor_reply: str) -> List[str]:
        """Provides a small, context-aware list of follow-up options only when genuinely useful."""
        msg_lower = user_msg.lower()

        if active_mode == "coding":
            if "hint" in msg_lower or "nudge" in msg_lower:
                return ["Give me a smaller hint", "I'll try writing the code", "Check edge cases"]
            return ["Give me a hint", "Analyze time & space complexity"]

        if active_mode == "interview":
            return ["Ask a harder follow-up", "How would a senior engineer answer?"]

        if active_mode == "learn":
            return ["Can you give an example?", "Test my understanding with a problem"]

        if active_mode == "project_defense":
            return ["Probe scalability tradeoffs", "Ask about failure handling"]

        if active_mode == "retest":
            return ["I want to try answering", "Give me a slight hint"]

        # In general_chat, do not clutter conversation with generic buttons
        return []

    @staticmethod
    def _build_contextual_fallback(payload: MentorChatMessageRequest, context: Dict[str, Any], active_mode: str) -> str:
        """High-signal, natural fallback when external LLM tunnel encounters network latency or disconnect.
        Strictly adheres to conversational, mentor-driven principles without rigid template labels.
        """
        role = context.get("target_role") or "Software Development Engineer"
        msg = payload.message.lower()

        # Specific questions handling
        if "process" in msg and "thread" in msg:
            return (
                "A process is an independent execution unit with its own dedicated memory address space, while a thread is a lightweight path of execution within a process that shares memory and resources with other threads in that same process.\n\n"
                "To see this in a real application: consider a modern web browser like Google Chrome.\n"
                "- Each browser tab is typically launched as a separate **process**. If one tab crashes due to an out-of-memory error or infinite loop, the other tabs remain unaffected because of process memory isolation.\n"
                "- Within a single tab process, there are multiple **threads**: a main UI thread handling user clicks, a rendering thread drawing HTML/CSS to the screen, and background worker threads handling network requests and asset loading concurrently.\n\n"
                "Would you like to explore how operating system context switches differ in CPU overhead between processes and threads?"
            )

        if "two sum" in msg or ("sum" in msg and "target" in msg) or (("hint" in msg or "nudge" in msg) and active_mode == "coding"):
            return (
                "Before jumping into nested loops ($O(N^2)$), think about what information you need from the numbers you have already visited.\n\n"
                "If the current number you are inspecting is `x`, what exact value `target - x` would complete the required sum? Could you check whether you've already seen that complement in $O(1)$ time rather than scanning the rest of the array each time?\n\n"
                "What data structure would let you look up previously visited numbers and their indices in constant time?"
            )

        if "backpropagation" in msg:
            return (
                "Think of backpropagation as applying the chain rule of calculus in reverse through a computational graph.\n\n"
                "In the forward pass, input features pass through each layer to produce a prediction, which is compared to the ground truth to calculate a scalar loss (error).\n\n"
                "In the backward pass, backpropagation computes the gradient of this loss with respect to every weight in the network by stepping backward through the layers. It answers the question: *'If I nudge this specific weight slightly up, does the total error increase or decrease, and by how much?'*\n\n"
                "Once these gradients are known, optimization algorithms like gradient descent update the weights in the direction that minimizes the loss.\n\n"
                "Does thinking of it as repeated chain-rule derivatives make intuitive sense, or would you like to trace a single neuron with an activation function together?"
            )

        if active_mode == "interview":
            return (
                f"Let's practice a realistic scenario often asked in {role} technical rounds:\n\n"
                "Suppose you need to design a rate limiter for an API that handles up to 50,000 requests per second across multiple distributed server instances.\n\n"
                "How would you approach this problem, and what data store or algorithm (like token bucket, leaky bucket, or sliding window) would you choose?"
            )

        if active_mode == "coding":
            return (
                "Let's break down your current approach. What is the fundamental invariant you are maintaining during iteration, and how does your logic handle edge cases like an empty input or duplicate elements?"
            )

        if active_mode == "learn":
            return (
                f"To understand this concept deeply, let's connect it to a practical engineering problem. Where in production systems have you seen or expected this pattern to apply, and what trade-offs come with it?"
            )

        if active_mode == "project_defense":
            return (
                f"Let's examine the architectural decisions in your project for a {role} role:\n\n"
                "When your system experiences concurrent writes to the same record or resource, how do you ensure data consistency without introducing deadlock risks or severe database contention?"
            )

        if active_mode == "retest":
            return (
                "Here is an independent retention question to test your understanding:\n\n"
                "When designing an index on a database table with high write volume, why might adding an index degrade INSERT/UPDATE throughput, and how do database engines manage that tradeoff?"
            )

        # General chat default
        return (
            "I'm here to help you prepare effectively. We can discuss core computer science concepts, conduct mock interview rounds, optimize coding solutions, or drill into your project architecture. What would you like to focus on?"
        )

