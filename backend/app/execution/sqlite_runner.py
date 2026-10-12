import sqlite3
import time
import math
from typing import List, Dict, Any, Optional, Tuple
from app.execution.base import BaseRunner, OverallRunResult, ExecutionOutcome
from app.config import settings

class SQLiteRunner(BaseRunner):
    """Executes SQL in fresh, disposable in-memory SQLite instances with deterministic edge-case comparison.
    Completely isolated from application storage.
    """

    def _execute_query(self, conn: sqlite3.Connection, query: str) -> Tuple[List[str], List[Tuple]]:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        cursor.close()
        return columns, rows

    def _canonicalize_value(self, val: Any) -> Any:
        if val is None:
            return None
        if isinstance(val, float):
            # Round floats to 4 decimal places for comparison tolerance
            return round(val, 4)
        if isinstance(val, (int, str, bool)):
            return val
        return str(val)

    def _canonicalize_row(self, row: Tuple) -> Tuple:
        return tuple(self._canonicalize_value(v) for v in row)

    def _compare_results(
        self,
        expected_cols: List[str],
        expected_rows: List[Tuple],
        actual_cols: List[str],
        actual_rows: List[Tuple],
        order_sensitive: bool = False
    ) -> Tuple[bool, Optional[str]]:
        # 1. Compare column count
        if len(expected_cols) != len(actual_cols):
            return False, f"Expected {len(expected_cols)} column(s) ({', '.join(expected_cols)}), but query returned {len(actual_cols)} column(s) ({', '.join(actual_cols)})."

        # 2. Compare row count
        if len(expected_rows) != len(actual_rows):
            return False, f"Row count mismatch: Expected {len(expected_rows)} rows, but got {len(actual_rows)} rows."

        # Canonicalize rows
        c_expected = [self._canonicalize_row(r) for r in expected_rows]
        c_actual = [self._canonicalize_row(r) for r in actual_rows]

        if order_sensitive:
            for i, (exp, act) in enumerate(zip(c_expected, c_actual)):
                if exp != act:
                    return False, f"Row {i + 1} mismatch: Expected {exp}, got {act}."
        else:
            # Sort canonically by converting tuples to string representations for sorting
            sorted_exp = sorted(c_expected, key=lambda r: str(r))
            sorted_act = sorted(c_actual, key=lambda r: str(r))
            if sorted_exp != sorted_act:
                return False, f"Result set mismatch. Missing expected rows or incorrect data values."

        return True, None

    async def run_tests(
        self,
        code: str,
        test_cases: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None,
        is_submission: bool = False
    ) -> OverallRunResult:
        schema_ddl = context.get("schema_ddl", "") if context else ""
        seed_data_sql = context.get("seed_data_sql", "") if context else ""
        
        outcomes: List[ExecutionOutcome] = []
        overall_start = time.perf_counter()

        # Sanitize query: forbid multiple destructive DDL/DROP statements from student query
        forbidden = ["ATTACH", "DETACH", "PRAGMA database_list"]
        for word in forbidden:
            if word in code.upper():
                return OverallRunResult(
                    status="error",
                    passed_count=0,
                    total_count=len(test_cases),
                    total_time_ms=0.0,
                    outcomes=[],
                    system_error=f"Forbidden keyword '{word}' detected."
                )

        for tc in test_cases:
            if not is_submission and tc.get("is_hidden", False):
                # Skip hidden tests on Run action
                continue

            test_id = tc.get("test_id", 1)
            name = tc.get("name", f"Test Case #{test_id}")
            is_hidden = tc.get("is_hidden", False)
            expected_query = tc.get("expected_query", "")
            order_sensitive = tc.get("order_sensitive", False)
            extra_seed = tc.get("extra_seed_sql", "")

            # Create disposable in-memory database
            conn = sqlite3.connect(":memory:")
            conn.row_factory = None
            t_start = time.perf_counter()
            passed = False
            error_msg = None
            actual_str = ""
            expected_str = ""

            try:
                # 1. Setup schema & deterministic seed
                cur = conn.cursor()
                if schema_ddl:
                    cur.executescript(schema_ddl)
                if seed_data_sql:
                    cur.executescript(seed_data_sql)
                if extra_seed:
                    cur.executescript(extra_seed)
                conn.commit()

                # 2. Execute Expected Query first to get ground truth
                exp_cols, exp_rows = self._execute_query(conn, expected_query)
                expected_str = f"Columns: {exp_cols}\nRows: {exp_rows}"

                # 3. Execute Candidate Query
                act_cols, act_rows = self._execute_query(conn, code)
                actual_str = f"Columns: {act_cols}\nRows: {act_rows}"

                # 4. Compare
                passed, error_msg = self._compare_results(
                    exp_cols, exp_rows, act_cols, act_rows, order_sensitive=order_sensitive
                )
            except sqlite3.OperationalError as e:
                error_msg = f"SQL Syntax or Runtime Error: {str(e)}"
                actual_str = error_msg
            except Exception as e:
                error_msg = f"Execution Error: {str(e)}"
                actual_str = error_msg
            finally:
                conn.close()

            exec_time = (time.perf_counter() - t_start) * 1000.0

            outcomes.append(ExecutionOutcome(
                test_id=test_id,
                name=name,
                passed=passed,
                is_hidden=is_hidden,
                input_repr="Disposable In-Memory Database Fixture",
                expected_output="[Hidden during evaluation]" if is_hidden and not passed else expected_str,
                actual_output="[Hidden during evaluation]" if is_hidden and not passed else actual_str,
                execution_time_ms=round(exec_time, 2),
                error_message=error_msg
            ))

        total_time = (time.perf_counter() - overall_start) * 1000.0
        passed_count = sum(1 for o in outcomes if o.passed)
        total_count = len(outcomes)

        status = "passed" if (passed_count == total_count and total_count > 0) else "failed"
        if any("SQL Syntax" in (o.error_message or "") for o in outcomes):
            status = "error"

        return OverallRunResult(
            status=status,
            passed_count=passed_count,
            total_count=total_count,
            total_time_ms=round(total_time, 2),
            outcomes=outcomes
        )
