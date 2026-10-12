from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class TestCaseResult(BaseModel):
    test_id: int
    name: str
    passed: bool
    input_repr: Optional[str] = None
    expected_output: Optional[str] = None
    actual_output: Optional[str] = None
    execution_time_ms: float = 0.0
    error_message: Optional[str] = None
    is_hidden: bool = False

class CodeRunRequest(BaseModel):
    question_id: str
    language: str  # "sql" | "python"
    code: str

class CodeSubmitRequest(BaseModel):
    question_id: str
    language: str  # "sql" | "python"
    code: str

class CodeExecutionResponse(BaseModel):
    submission_id: str
    status: str  # "passed" | "failed" | "error" | "timeout"
    language: str
    passed_count: int
    total_count: int
    execution_time_ms: float
    results: List[TestCaseResult] = []
    compilation_or_runtime_error: Optional[str] = None
    ai_failure_explanation: Optional[str] = None

class CodingQuestionResponse(BaseModel):
    id: str
    title: str
    topic: str
    difficulty: str
    language: str  # "sql" | "python"
    problem_statement: str
    starter_code: str
    sample_inputs_and_outputs: List[Dict[str, Any]]
    schema_explanation: Optional[str] = None  # For SQL tables
