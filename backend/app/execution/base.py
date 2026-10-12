from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class TestCaseDefinition(BaseModel):
    test_id: int
    name: str
    is_hidden: bool = False
    # For Python:
    stdin_or_args: Optional[Any] = None
    expected_return: Optional[Any] = None
    # For SQL:
    expected_query: Optional[str] = None
    order_sensitive: bool = False

class ExecutionOutcome(BaseModel):
    test_id: int
    name: str
    passed: bool
    is_hidden: bool
    input_repr: str
    expected_output: str
    actual_output: str
    execution_time_ms: float
    error_message: Optional[str] = None

class OverallRunResult(BaseModel):
    status: str  # "passed" | "failed" | "error" | "timeout"
    passed_count: int
    total_count: int
    total_time_ms: float
    outcomes: List[ExecutionOutcome]
    system_error: Optional[str] = None

class BaseRunner(ABC):
    @abstractmethod
    async def run_tests(
        self,
        code: str,
        test_cases: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
        is_submission: bool = False
    ) -> OverallRunResult:
        pass
