from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.schemas.coding import (
    CodingQuestionResponse, CodeRunRequest, CodeSubmitRequest, CodeExecutionResponse, TestCaseResult
)
from app.execution.sqlite_runner import SQLiteRunner
from app.execution.python_runner import PythonRunner
from app.database.mongodb import get_database
from app.security.auth import get_current_user, get_optional_current_user
from app.ai.client import ai_client
from app.ai.prompts import PromptTemplates

router = APIRouter(prefix="/coding", tags=["Coding Workspace"])

sqlite_runner = SQLiteRunner()
python_runner = PythonRunner()

@router.get("/questions", response_model=List[CodingQuestionResponse])
async def list_coding_questions():
    db = get_database()
    cursor = db["questions"].find({"track": "coding_sql"})
    questions = await cursor.to_list()
    res = []
    for q in questions:
        res.append({
            "id": str(q["_id"]),
            "title": q["title"],
            "topic": q["topic"],
            "difficulty": q["difficulty"],
            "language": q.get("language", "python"),
            "problem_statement": q["problem_statement"],
            "starter_code": q.get("starter_code", ""),
            "sample_inputs_and_outputs": q.get("sample_inputs_and_outputs", []),
            "schema_explanation": q.get("schema_explanation")
        })
    return res

@router.get("/questions/{question_id}", response_model=CodingQuestionResponse)
async def get_coding_question(question_id: str):
    db = get_database()
    q = await db["questions"].find_one({"_id": question_id})
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return {
        "id": str(q["_id"]),
        "title": q["title"],
        "topic": q["topic"],
        "difficulty": q["difficulty"],
        "language": q.get("language", "python"),
        "problem_statement": q["problem_statement"],
        "starter_code": q.get("starter_code", ""),
        "sample_inputs_and_outputs": q.get("sample_inputs_and_outputs", []),
        "schema_explanation": q.get("schema_explanation")
    }

@router.post("/run", response_model=CodeExecutionResponse)
async def run_code(payload: CodeRunRequest):
    db = get_database()
    q = await db["questions"].find_one({"_id": payload.question_id})
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    test_cases = q.get("test_cases", [])
    context = q.get("context", {})

    runner = sqlite_runner if payload.language == "sql" else python_runner
    outcome = await runner.run_tests(
        code=payload.code,
        test_cases=test_cases,
        context=context,
        is_submission=False
    )

    tc_results = [
        TestCaseResult(
            test_id=o.test_id,
            name=o.name,
            passed=o.passed,
            input_repr=o.input_repr,
            expected_output=o.expected_output,
            actual_output=o.actual_output,
            execution_time_ms=o.execution_time_ms,
            error_message=o.error_message,
            is_hidden=o.is_hidden
        )
        for o in outcome.outcomes
    ]

    return CodeExecutionResponse(
        submission_id=str(ObjectId()),
        status=outcome.status,
        language=payload.language,
        passed_count=outcome.passed_count,
        total_count=outcome.total_count,
        execution_time_ms=outcome.total_time_ms,
        results=tc_results,
        compilation_or_runtime_error=outcome.system_error,
        ai_failure_explanation=None
    )

@router.post("/submit", response_model=CodeExecutionResponse)
async def submit_code(payload: CodeSubmitRequest, current_user: Optional[dict] = Depends(get_optional_current_user)):
    db = get_database()
    q = await db["questions"].find_one({"_id": payload.question_id})
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    test_cases = q.get("test_cases", [])
    context = q.get("context", {})

    runner = sqlite_runner if payload.language == "sql" else python_runner
    outcome = await runner.run_tests(
        code=payload.code,
        test_cases=test_cases,
        context=context,
        is_submission=True
    )

    tc_results = [
        TestCaseResult(
            test_id=o.test_id,
            name=o.name,
            passed=o.passed,
            input_repr=o.input_repr,
            expected_output=o.expected_output,
            actual_output=o.actual_output,
            execution_time_ms=o.execution_time_ms,
            error_message=o.error_message,
            is_hidden=o.is_hidden
        )
        for o in outcome.outcomes
    ]

    # Generate AI failure explanation if tests failed
    ai_explanation = None
    if outcome.status in ["failed", "error", "timeout"]:
        first_failure = next((o for o in outcome.outcomes if not o.passed), None)
        failure_context = ""
        if first_failure:
            failure_context = f"Failed Test: {first_failure.name}\nInput: {first_failure.input_repr}\nExpected: {first_failure.expected_output}\nActual: {first_failure.actual_output}\nError: {first_failure.error_message}"
        elif outcome.system_error:
            failure_context = outcome.system_error

        prompt = f"""
PROBLEM:
{q.get('problem_statement')}

STUDENT CODE ({payload.language.upper()}):
{payload.code}

TEST RUN OUTCOME:
{failure_context}

Explain why this failure occurred intuitively and give a targeted nudge to help the student fix it.
"""
        ai_explanation = await ai_client.generate(
            prompt=prompt,
            system=PromptTemplates.CODING_EXPLANATION_SYSTEM
        )

    user_id = str(current_user["_id"]) if current_user else "anonymous_guest"
    sub_doc = {
        "user_id": user_id,
        "question_id": payload.question_id,
        "language": payload.language,
        "code": payload.code,
        "status": outcome.status,
        "passed_count": outcome.passed_count,
        "total_count": outcome.total_count,
        "execution_time_ms": outcome.total_time_ms,
        "system_error": outcome.system_error,
        "ai_explanation": ai_explanation,
        "created_at": datetime.utcnow().isoformat()
    }
    sub_res = await db["submissions"].insert_one(sub_doc)
    submission_id = str(sub_res.inserted_id)

    # Log learning event
    await db["learning_events"].insert_one({
        "user_id": user_id,
        "topic": q.get("topic", "Coding"),
        "question_id": payload.question_id,
        "attempt_type": "independent",
        "outcome": "correct" if outcome.status == "passed" else "failed",
        "timestamp": datetime.utcnow().isoformat()
    })

    return CodeExecutionResponse(
        submission_id=submission_id,
        status=outcome.status,
        language=payload.language,
        passed_count=outcome.passed_count,
        total_count=outcome.total_count,
        execution_time_ms=outcome.total_time_ms,
        results=tc_results,
        compilation_or_runtime_error=outcome.system_error,
        ai_failure_explanation=ai_explanation
    )
