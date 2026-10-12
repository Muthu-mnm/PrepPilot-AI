from datetime import datetime
from typing import Dict, Any, List
from app.database.mongodb import get_database

class LearningService:

    @staticmethod
    async def get_overview(user_id: str) -> Dict[str, Any]:
        db = get_database()

        # Fetch learning events
        events_cursor = db["learning_events"].find({"user_id": user_id})
        events = await events_cursor.to_list()

        # Fetch submissions
        sub_cursor = db["submissions"].find({"user_id": user_id})
        submissions = await sub_cursor.to_list()

        # Fetch revision tasks
        rev_cursor = db["revision_tasks"].find({"user_id": user_id, "status": "pending"})
        pending_revisions = await rev_cursor.to_list()

        total_questions_attempted = len(events)
        independent_successes = sum(
            1 for e in events if e.get("attempt_type") == "independent" and e.get("outcome") == "correct"
        )
        hint_assisted = sum(
            1 for e in events if e.get("attempt_type") == "hint_assisted"
        )
        solution_assisted = sum(
            1 for e in events if e.get("attempt_type") == "solution_assisted"
        )

        coding_tests_total = len(submissions)
        coding_tests_passed = sum(1 for s in submissions if s.get("status") == "passed")
        coding_pass_rate = (
            round((coding_tests_passed / coding_tests_total) * 100, 1) if coding_tests_total > 0 else 0.0
        )

        # Topic aggregation
        topic_map: Dict[str, Dict[str, Any]] = {}
        for e in events:
            top = e.get("topic", "General")
            if top not in topic_map:
                topic_map[top] = {
                    "topic": top,
                    "category": "Database & SQL" if "SQL" in top else "Algorithms & Data Structures",
                    "attempts_count": 0,
                    "independent_success_count": 0,
                    "assisted_count": 0,
                    "failure_count": 0,
                    "misconceptions": set()
                }
            topic_map[top]["attempts_count"] += 1
            if e.get("attempt_type") == "independent" and e.get("outcome") == "correct":
                topic_map[top]["independent_success_count"] += 1
            elif e.get("attempt_type") in ["hint_assisted", "solution_assisted"]:
                topic_map[top]["assisted_count"] += 1
            elif e.get("outcome") in ["incorrect", "failed"]:
                topic_map[top]["failure_count"] += 1

            if e.get("misconception_tag"):
                topic_map[top]["misconceptions"].add(e["misconception_tag"])

        topics_breakdown = []
        for top, data in topic_map.items():
            attempts = data["attempts_count"]
            indep = data["independent_success_count"]
            pct = round((indep / attempts) * 100, 1) if attempts > 0 else 0.0
            topics_breakdown.append({
                "topic": top,
                "category": data["category"],
                "attempts_count": attempts,
                "independent_success_count": indep,
                "assisted_count": data["assisted_count"],
                "failure_count": data["failure_count"],
                "mastery_percentage": pct,
                "common_misconceptions": list(data["misconceptions"])
            })

        # Recent activities
        recent_activity = []
        for e in sorted(events, key=lambda x: x.get("timestamp", ""), reverse=True)[:10]:
            recent_activity.append({
                "id": str(e.get("_id", "")),
                "date": e.get("timestamp", datetime.utcnow().isoformat())[:10],
                "topic": e.get("topic", "General"),
                "activity_type": "interview_turn",
                "outcome": e.get("outcome", "attempted"),
                "assistance_level": e.get("attempt_type", "independent")
            })

        return {
            "total_questions_attempted": total_questions_attempted,
            "independent_successes": independent_successes,
            "hint_assisted_attempts": hint_assisted,
            "solution_assisted_attempts": solution_assisted,
            "coding_tests_passed": coding_tests_passed,
            "coding_tests_total": coding_tests_total,
            "coding_pass_rate_percentage": coding_pass_rate,
            "topics_breakdown": topics_breakdown,
            "pending_revisions_count": len(pending_revisions),
            "recent_activity": recent_activity,
            "notice": "Metrics represent verifiable attempt counts and rubric results. PrepPilot AI does not predict selection probability or guarantee placements."
        }

    @staticmethod
    async def get_revision_queue(user_id: str) -> List[Dict[str, Any]]:
        db = get_database()
        cursor = db["revision_tasks"].find({"user_id": user_id, "status": "pending"})
        tasks = await cursor.to_list()
        res = []
        now = datetime.utcnow()
        for t in tasks:
            due_str = t.get("due_date", now.isoformat())
            try:
                due_dt = datetime.fromisoformat(due_str)
                diff_days = max(0, (now - due_dt).days)
            except Exception:
                diff_days = 0

            res.append({
                "id": str(t["_id"]),
                "topic": t.get("topic", "General"),
                "question_title": t.get("question_title", "Concept Revision"),
                "misconception_addressed": t.get("misconception_addressed", "Clarify fundamental edge case"),
                "due_date": due_str[:10],
                "days_overdue": diff_days,
                "status": t.get("status", "pending"),
                "question_id": str(t.get("question_id", ""))
            })
        return res
