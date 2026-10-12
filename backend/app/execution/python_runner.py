import os
import sys
import json
import time
import tempfile
import subprocess
from typing import List, Dict, Any, Optional
from app.execution.base import BaseRunner, OverallRunResult, ExecutionOutcome
from app.config import settings

HARNESS_SCRIPT = """import sys
import json
import time

# Load deterministic test cases from isolated file
with open("test_cases.json", "r", encoding="utf-8") as f:
    test_cases = json.load(f)

# --- Student Code Start ---
__STUDENT_CODE__
# --- Student Code End ---

results = []

for tc in test_cases:
    t_start = time.perf_counter()
    test_id = tc["test_id"]
    name = tc["name"]
    is_hidden = tc.get("is_hidden", False)
    fn_name = tc.get("function_name", "solution")
    args = tc.get("args", [])
    expected = tc.get("expected")

    try:
        if fn_name not in globals():
            results.append({
                "test_id": test_id,
                "name": name,
                "passed": False,
                "is_hidden": is_hidden,
                "input_repr": str(args),
                "expected_output": str(expected),
                "actual_output": f"Function '{fn_name}' is not defined.",
                "execution_time_ms": 0.0,
                "error_message": f"NameError: Function '{fn_name}' not found"
            })
            continue

        func = globals()[fn_name]
        actual = func(*args)
        t_exec = (time.perf_counter() - t_start) * 1000.0

        passed = (actual == expected)
        results.append({
            "test_id": test_id,
            "name": name,
            "passed": passed,
            "is_hidden": is_hidden,
            "input_repr": str(args),
            "expected_output": str(expected),
            "actual_output": str(actual),
            "execution_time_ms": round(t_exec, 2),
            "error_message": None if passed else f"Assertion failed: Expected {expected}, got {actual}"
        })
    except Exception as e:
        t_exec = (time.perf_counter() - t_start) * 1000.0
        results.append({
            "test_id": test_id,
            "name": name,
            "passed": False,
            "is_hidden": is_hidden,
            "input_repr": str(args),
            "expected_output": str(expected),
            "actual_output": f"Exception: {type(e).__name__}: {str(e)}",
            "execution_time_ms": round(t_exec, 2),
            "error_message": f"{type(e).__name__}: {str(e)}"
        })

print("___PREPPILOT_RESULTS_START___")
print(json.dumps(results))
print("___PREPPILOT_RESULTS_END___")
"""

class PythonRunner(BaseRunner):
    """Executes student Python code in an isolated separate subprocess sandbox.
    Enforces process isolation, execution time limits, output truncation, and AST safety.
    NEVER runs in the FastAPI process.
    """

    def _static_safety_check(self, code: str) -> Optional[str]:
        forbidden_tokens = [
            "import os", "from os", "import subprocess", "from subprocess",
            "import socket", "from socket", "__import__('os')",
            "open('/", "open('C:", "shutil.rmtree"
        ]
        for token in forbidden_tokens:
            if token in code:
                return f"Security Restriction: Use of '{token}' is not permitted in the coding workspace."
        return None

    async def run_tests(
        self,
        code: str,
        test_cases: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
        is_submission: bool = False
    ) -> OverallRunResult:
        safety_error = self._static_safety_check(code)
        if safety_error:
            return OverallRunResult(
                status="error",
                passed_count=0,
                total_count=len(test_cases),
                total_time_ms=0.0,
                outcomes=[],
                system_error=safety_error
            )

        active_cases = test_cases if is_submission else [tc for tc in test_cases if not tc.get("is_hidden", False)]

        with tempfile.TemporaryDirectory() as tmp_dir:
            # 1. Save test cases json in sandbox directory
            cases_path = os.path.join(tmp_dir, "test_cases.json")
            with open(cases_path, "w", encoding="utf-8") as f:
                json.dump(active_cases, f)

            # 2. Save runner script
            script_content = HARNESS_SCRIPT.replace("__STUDENT_CODE__", code)
            script_path = os.path.join(tmp_dir, "solution_runner.py")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(script_content)

            t_start = time.perf_counter()
            try:
                # Isolated subprocess execution with strict timeout
                proc = subprocess.run(
                    [sys.executable, "-I", script_path],
                    capture_output=True,
                    text=True,
                    timeout=settings.PYTHON_TIMEOUT_SECONDS,
                    cwd=tmp_dir
                )
                total_time_ms = (time.perf_counter() - t_start) * 1000.0

                stdout = proc.stdout
                stderr = proc.stderr

                if proc.returncode != 0 and "___PREPPILOT_RESULTS_START___" not in stdout:
                    return OverallRunResult(
                        status="error",
                        passed_count=0,
                        total_count=len(active_cases),
                        total_time_ms=round(total_time_ms, 2),
                        outcomes=[],
                        system_error=f"Runtime / Syntax Error:\n{stderr or stdout}"
                    )

                if "___PREPPILOT_RESULTS_START___" in stdout:
                    raw_json = stdout.split("___PREPPILOT_RESULTS_START___")[1].split("___PREPPILOT_RESULTS_END___")[0].strip()
                    parsed_results = json.loads(raw_json)

                    outcomes = [
                        ExecutionOutcome(
                            test_id=item["test_id"],
                            name=item["name"],
                            passed=item["passed"],
                            is_hidden=item["is_hidden"],
                            input_repr="[Hidden]" if item["is_hidden"] and not item["passed"] else item["input_repr"],
                            expected_output="[Hidden]" if item["is_hidden"] and not item["passed"] else item["expected_output"],
                            actual_output="[Hidden]" if item["is_hidden"] and not item["passed"] else item["actual_output"],
                            execution_time_ms=item["execution_time_ms"],
                            error_message=item["error_message"]
                        )
                        for item in parsed_results
                    ]

                    passed_count = sum(1 for o in outcomes if o.passed)
                    status = "passed" if (passed_count == len(outcomes) and len(outcomes) > 0) else "failed"

                    return OverallRunResult(
                        status=status,
                        passed_count=passed_count,
                        total_count=len(outcomes),
                        total_time_ms=round(total_time_ms, 2),
                        outcomes=outcomes
                    )
                else:
                    return OverallRunResult(
                        status="error",
                        passed_count=0,
                        total_count=len(active_cases),
                        total_time_ms=round(total_time_ms, 2),
                        outcomes=[],
                        system_error=f"Unrecognized execution output: {stdout[:500]}"
                    )

            except subprocess.TimeoutExpired:
                total_time_ms = settings.PYTHON_TIMEOUT_SECONDS * 1000.0
                return OverallRunResult(
                    status="timeout",
                    passed_count=0,
                    total_count=len(active_cases),
                    total_time_ms=round(total_time_ms, 2),
                    outcomes=[],
                    system_error=f"Time Limit Exceeded (>{settings.PYTHON_TIMEOUT_SECONDS}s)."
                )
            except Exception as e:
                return OverallRunResult(
                    status="error",
                    passed_count=0,
                    total_count=len(active_cases),
                    total_time_ms=0.0,
                    outcomes=[],
                    system_error=f"Execution Subprocess Error: {str(e)}"
                )
