import pytest
from app.database.mongodb import DatabaseManager, get_database
from app.services.prep_service import PrepService
from app.services.unified_mentor_service import UnifiedMentorService
from app.schemas.prep import PreparationSetupRequest, MilestoneItem, PlanUpdateRequest, MentorChatMessageRequest
from app.execution.sqlite_runner import SQLiteRunner

@pytest.mark.asyncio
async def test_plan_persistence_and_editing():
    await DatabaseManager.connect()
    db = get_database()
    test_user_id = "test-learner-101"

    # 1. Clean previous test artifacts
    await db["prep_plans"].delete_many({"user_id": test_user_id})

    # 2. Setup payload
    setup_req = PreparationSetupRequest(
        target_role="AI & Full Stack Engineer",
        target_company="Fidelity Investments",
        recruitment_type="campus",
        target_deadline="2026-11-20",
        skills=["Python", "FastAPI", "React", "SQL"],
        weak_topics=["SQL Joins on Unmatched Records"],
        learning_goals=["Defend project architecture"],
        github_repos=[],
        candidate_experiences=[]
    )

    plan = await PrepService.generate_preparation_plan(test_user_id, setup_req)
    assert plan is not None
    assert plan.target_role == "AI & Full Stack Engineer"
    assert len(plan.milestones) > 0

    # 3. Test milestone completion toggle and editing
    milestone_to_toggle = plan.milestones[0].milestone_id
    updated_milestones = [
        MilestoneItem(
            milestone_id=m.milestone_id,
            title="Custom Edited Milestone" if m.milestone_id == milestone_to_toggle else m.title,
            description=m.description,
            priority=m.priority,
            topics=m.topics,
            suggested_activities=m.suggested_activities,
            completed=True if m.milestone_id == milestone_to_toggle else m.completed
        )
        for m in plan.milestones
    ]

    # Add a custom milestone
    updated_milestones.append(
        MilestoneItem(
            milestone_id="custom-milestone-99",
            title="Custom System Design Defense",
            description="Defend distributed queue architecture",
            priority="high",
            topics=["Architecture"],
            suggested_activities=["Practice with mentor"],
            completed=False
        )
    )

    update_doc = {
        "milestones": [m.model_dump() if hasattr(m, "model_dump") else m.dict() for m in updated_milestones],
        "readiness_diagnostic": "Updated Diagnostic: Solid foundational grasp with targeted focus needed on SQL NULL filtering.",
        "knowledge_gaps": ["SQL Joins on Unmatched Records", "Query Optimization"]
    }
    await db["prep_plans"].update_one({"user_id": test_user_id}, {"$set": update_doc})

    # Verify retrieval
    retrieved_plan = await PrepService.get_current_plan(test_user_id)
    assert retrieved_plan is not None
    assert retrieved_plan.milestones[0].completed is True
    assert retrieved_plan.milestones[0].title == "Custom Edited Milestone"
    assert any(m.milestone_id == "custom-milestone-99" for m in retrieved_plan.milestones)
    assert "Query Optimization" in retrieved_plan.knowledge_gaps
    assert "Solid foundational grasp" in retrieved_plan.readiness_diagnostic


@pytest.mark.asyncio
async def test_unified_mentor_execution_feedback_loop():
    await DatabaseManager.connect()
    db = get_database()
    test_user_id = "test-learner-102"

    await db["mentor_sessions"].delete_many({"user_id": test_user_id})

    # 1. Retrieve initial session
    msgs = await UnifiedMentorService.get_or_create_conversation(test_user_id)
    assert len(msgs) >= 1
    assert msgs[0]["role"] == "mentor"

    # 2. Simulate user sending execution feedback
    execution_msg = MentorChatMessageRequest(
        message="I ran my code for 'Customers With No Orders'. Execution Result: 0/1 tests passed. Query returned 0 rows because of INNER JOIN.",
        mode="coding_review",
        context_topic="SQL Joins",
        code_snippet="SELECT c.name FROM Customers c INNER JOIN Orders o ON c.id = o.customerId WHERE o.customerId IS NULL;"
    )

    mentor_resp = await UnifiedMentorService.handle_user_message(test_user_id, execution_msg)
    assert mentor_resp is not None
    assert mentor_resp.role == "mentor"
    assert mentor_resp.content is not None
    assert len(mentor_resp.content) > 10

    # 3. Check persistent history
    history = await UnifiedMentorService.get_or_create_conversation(test_user_id)
    # initial greeting + user execution turn + mentor response
    assert len(history) >= 3

    # 4. Test session reset
    reset_msgs = await UnifiedMentorService.reset_conversation(test_user_id)
    assert len(reset_msgs) == 1
    assert reset_msgs[0]["role"] == "mentor"
    reloaded_history = await UnifiedMentorService.get_or_create_conversation(test_user_id)
    assert len(reloaded_history) == 1



@pytest.mark.asyncio
async def test_sqlite_execution_deterministic_pass_and_fail():
    runner = SQLiteRunner()
    context = {
        "schema_ddl": "CREATE TABLE employees (id INT, name TEXT, salary INT);",
        "seed_data_sql": "INSERT INTO employees VALUES (1, 'Alice', 90000), (2, 'Bob', 60000), (3, 'Charlie', 120000);"
    }
    test_cases = [
        {
            "test_id": 1,
            "name": "High Earners Test",
            "expected_query": "SELECT name, salary FROM employees WHERE salary > 100000;",
            "order_sensitive": False
        }
    ]

    # Correct query
    pass_res = await runner.run_tests(
        code="SELECT name, salary FROM employees WHERE salary > 100000;",
        test_cases=test_cases,
        context=context
    )
    assert pass_res.status == "passed"
    assert pass_res.passed_count == 1

    # Failing query
    fail_res = await runner.run_tests(
        code="SELECT name, salary FROM employees WHERE salary > 50000;",
        test_cases=test_cases,
        context=context
    )
    assert fail_res.status == "failed"
    assert fail_res.passed_count == 0
