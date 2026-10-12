import pytest
from app.execution.python_runner import PythonRunner

@pytest.mark.asyncio
async def test_python_runner_correct_solution():
    runner = PythonRunner()
    test_cases = [
        {
            "test_id": 1,
            "name": "Basic Addition",
            "function_name": "add",
            "args": [2, 3],
            "expected": 5
        },
        {
            "test_id": 2,
            "name": "Negative Addition",
            "function_name": "add",
            "args": [-1, 1],
            "expected": 0
        }
    ]
    student_code = """
def add(a, b):
    return a + b
"""
    result = await runner.run_tests(code=student_code, test_cases=test_cases)
    assert result.status == "passed"
    assert result.passed_count == 2

@pytest.mark.asyncio
async def test_python_runner_failed_solution():
    runner = PythonRunner()
    test_cases = [
        {
            "test_id": 1,
            "name": "Multiply Test",
            "function_name": "multiply",
            "args": [3, 4],
            "expected": 12
        }
    ]
    student_code = """
def multiply(a, b):
    return a + b  # Bug
"""
    result = await runner.run_tests(code=student_code, test_cases=test_cases)
    assert result.status == "failed"
    assert result.passed_count == 0

@pytest.mark.asyncio
async def test_python_runner_safety_sandbox():
    runner = PythonRunner()
    test_cases = [{"test_id": 1, "name": "Security Check", "function_name": "hack", "args": [], "expected": None}]
    student_code = "import os\ndef hack(): pass"
    result = await runner.run_tests(code=student_code, test_cases=test_cases)
    assert result.status == "error"
    assert "Security Restriction" in (result.system_error or "")
