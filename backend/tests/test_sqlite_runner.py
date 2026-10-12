import pytest
from app.execution.sqlite_runner import SQLiteRunner

@pytest.mark.asyncio
async def test_sqlite_runner_correct_query():
    runner = SQLiteRunner()
    context = {
        "schema_ddl": "CREATE TABLE Employees (id INT, salary INT);",
        "seed_data_sql": "INSERT INTO Employees VALUES (1, 100), (2, 200), (3, 300);"
    }
    test_cases = [
        {
            "test_id": 1,
            "name": "Check Max Salary",
            "expected_query": "SELECT MAX(salary) as max_sal FROM Employees;",
            "order_sensitive": False
        }
    ]
    student_query = "SELECT MAX(salary) as max_sal FROM Employees;"
    result = await runner.run_tests(code=student_query, test_cases=test_cases, context=context)

    assert result.status == "passed"
    assert result.passed_count == 1
    assert result.outcomes[0].passed is True

@pytest.mark.asyncio
async def test_sqlite_runner_incorrect_query():
    runner = SQLiteRunner()
    context = {
        "schema_ddl": "CREATE TABLE Customers (id INT, name VARCHAR);",
        "seed_data_sql": "INSERT INTO Customers VALUES (1, 'Alice'), (2, 'Bob');"
    }
    test_cases = [
        {
            "test_id": 1,
            "name": "Check Customer Name",
            "expected_query": "SELECT name FROM Customers WHERE id = 1;",
            "order_sensitive": False
        }
    ]
    # Wrong student query
    student_query = "SELECT name FROM Customers WHERE id = 2;"
    result = await runner.run_tests(code=student_query, test_cases=test_cases, context=context)

    assert result.status == "failed"
    assert result.passed_count == 0
    assert result.outcomes[0].passed is False

@pytest.mark.asyncio
async def test_sqlite_runner_syntax_error():
    runner = SQLiteRunner()
    context = {"schema_ddl": "CREATE TABLE T (x INT);", "seed_data_sql": "INSERT INTO T VALUES (1);"}
    test_cases = [{"test_id": 1, "name": "Syntax", "expected_query": "SELECT * FROM T;", "order_sensitive": False}]
    result = await runner.run_tests(code="SELEC FROM WHERE T", test_cases=test_cases, context=context)

    assert result.status == "error"
    assert "SQL Syntax" in (result.outcomes[0].error_message or "")
