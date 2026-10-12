from typing import List, Dict, Any
from app.database.mongodb import get_database

SEED_QUESTIONS: List[Dict[str, Any]] = [
    # --- SQL PROBLEM 1 ---
    {
        "title": "Customers Without Orders",
        "track": "coding_sql",
        "topic": "SQL Joins & NULL Handling",
        "difficulty": "easy",
        "language": "sql",
        "problem_statement": """Write an SQL query to report all customers who never placed any orders.

### Schema Explanation
**Table: `Customers`**
- `id` (INT, Primary Key)
- `name` (VARCHAR)

**Table: `Orders`**
- `id` (INT, Primary Key)
- `customerId` (INT, Foreign Key to `Customers.id`)

Return the result table with a single column `Customers` representing customer names. The results can be returned in any order.

### Edge Case Reminder
Customers who placed zero orders will have no corresponding row in `Orders`. Consider how `LEFT JOIN` and `IS NULL` handle unmatched records.""",
        "starter_code": """-- Write your SQL query below
SELECT name AS Customers
FROM Customers
""",
        "sample_inputs_and_outputs": [
            {
                "input": "Customers: [(1, 'Joe'), (2, 'Henry'), (3, 'Sam'), (4, 'Max')], Orders: [(1, 3), (2, 1)]",
                "output": "Customers: ['Henry', 'Max']"
            }
        ],
        "schema_explanation": "Table Customers(id INT, name VARCHAR); Table Orders(id INT, customerId INT);",
        "context": {
            "schema_ddl": """
                CREATE TABLE Customers (id INT PRIMARY KEY, name VARCHAR(50));
                CREATE TABLE Orders (id INT PRIMARY KEY, customerId INT);
            """,
            "seed_data_sql": """
                INSERT INTO Customers (id, name) VALUES (1, 'Joe'), (2, 'Henry'), (3, 'Sam'), (4, 'Max');
                INSERT INTO Orders (id, customerId) VALUES (1, 3), (2, 1);
            """
        },
        "test_cases": [
            {
                "test_id": 1,
                "name": "Standard Unmatched Records",
                "expected_query": "SELECT c.name AS Customers FROM Customers c LEFT JOIN Orders o ON c.id = o.customerId WHERE o.customerId IS NULL",
                "order_sensitive": False,
                "is_hidden": False
            },
            {
                "test_id": 2,
                "name": "All Customers Placed Orders (Empty Result)",
                "expected_query": "SELECT c.name AS Customers FROM Customers c LEFT JOIN Orders o ON c.id = o.customerId WHERE o.customerId IS NULL",
                "extra_seed_sql": "INSERT INTO Orders (id, customerId) VALUES (3, 2), (4, 4);",
                "order_sensitive": False,
                "is_hidden": True
            },
            {
                "test_id": 3,
                "name": "No Orders Exist At All",
                "expected_query": "SELECT c.name AS Customers FROM Customers c LEFT JOIN Orders o ON c.id = o.customerId WHERE o.customerId IS NULL",
                "extra_seed_sql": "DELETE FROM Orders;",
                "order_sensitive": False,
                "is_hidden": True
            }
        ],
        "rubric": {
            "core_concepts": ["LEFT JOIN", "NULL check (IS NULL vs = NULL)", "Column Aliasing"],
            "common_misconceptions": [
                "Using INNER JOIN instead of LEFT JOIN (returns empty result)",
                "Using 'WHERE o.customerId = NULL' instead of 'IS NULL'"
            ]
        }
    },

    # --- SQL PROBLEM 2 ---
    {
        "title": "Second Highest Salary",
        "track": "coding_sql",
        "topic": "SQL Subqueries & Aggregations",
        "difficulty": "medium",
        "language": "sql",
        "problem_statement": """Write an SQL query to find the second highest distinct salary from the `Employee` table. If there is no second highest salary, the query should report `NULL`.

### Schema Explanation
**Table: `Employee`**
- `id` (INT, Primary Key)
- `salary` (INT)

Return the result table with column name `SecondHighestSalary`.""",
        "starter_code": """-- Write your SQL query below
SELECT MAX(salary) AS SecondHighestSalary
FROM Employee
""",
        "sample_inputs_and_outputs": [
            {
                "input": "Employee: [(1, 100), (2, 200), (3, 300)]",
                "output": "SecondHighestSalary: 200"
            }
        ],
        "schema_explanation": "Table Employee(id INT PRIMARY KEY, salary INT);",
        "context": {
            "schema_ddl": """CREATE TABLE Employee (id INT PRIMARY KEY, salary INT);""",
            "seed_data_sql": """INSERT INTO Employee (id, salary) VALUES (1, 100), (2, 200), (3, 300);"""
        },
        "test_cases": [
            {
                "test_id": 1,
                "name": "Distinct Salaries (Three Employees)",
                "expected_query": "SELECT MAX(salary) AS SecondHighestSalary FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee);",
                "order_sensitive": False,
                "is_hidden": False
            },
            {
                "test_id": 2,
                "name": "Only One Employee (Expect NULL)",
                "expected_query": "SELECT MAX(salary) AS SecondHighestSalary FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee);",
                "extra_seed_sql": "DELETE FROM Employee WHERE id IN (2, 3);",
                "order_sensitive": False,
                "is_hidden": True
            },
            {
                "test_id": 3,
                "name": "Duplicate Highest Salaries",
                "expected_query": "SELECT MAX(salary) AS SecondHighestSalary FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee);",
                "extra_seed_sql": "UPDATE Employee SET salary = 300 WHERE id = 2;",
                "order_sensitive": False,
                "is_hidden": True
            }
        ],
        "rubric": {
            "core_concepts": ["Subqueries", "MAX aggregation", "NULL handling for missing ranks"],
            "common_misconceptions": [
                "Using LIMIT 1 OFFSET 1 without handling the case when only 1 record exists (LIMIT doesn't produce NULL on empty offset without a wrapper subquery)",
                "Forgetting duplicate top salaries"
            ]
        }
    },

    # --- PYTHON PROBLEM 1 ---
    {
        "title": "Two Sum Target Indices",
        "track": "coding_sql",
        "topic": "Hash Maps & Array Traversal",
        "difficulty": "easy",
        "language": "python",
        "problem_statement": """Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.
You can return the answer in any order (sort indices ascending).

### Constraints
- $2 \\le \\text{len}(nums) \\le 10^4$
- Your algorithm should ideally run in $O(n)$ time using a hash map.""",
        "starter_code": """def two_sum(nums, target):
    # Implement your solution here
    pass
""",
        "sample_inputs_and_outputs": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0, 1]"},
            {"input": "nums = [3,2,4], target = 6", "output": "[1, 2]"}
        ],
        "test_cases": [
            {
                "test_id": 1,
                "name": "Standard Positive Numbers",
                "function_name": "two_sum",
                "args": [[2, 7, 11, 15], 9],
                "expected": [0, 1],
                "is_hidden": False
            },
            {
                "test_id": 2,
                "name": "Target with Duplicate Values",
                "function_name": "two_sum",
                "args": [[3, 3], 6],
                "expected": [0, 1],
                "is_hidden": False
            },
            {
                "test_id": 3,
                "name": "Negative and Zero Values",
                "function_name": "two_sum",
                "args": [[-1, -2, -3, -4, -5], -8],
                "expected": [2, 4],
                "is_hidden": True
            },
            {
                "test_id": 4,
                "name": "Target at Tail of Large Array",
                "function_name": "two_sum",
                "args": [list(range(100)) + [1000, 2000], 3000],
                "expected": [100, 101],
                "is_hidden": True
            }
        ],
        "rubric": {
            "core_concepts": ["Hash Map lookup O(1)", "Single pass traversal", "Complement check (target - num)"],
            "common_misconceptions": [
                "Using nested loops resulting in O(n^2) time complexity",
                "Reusing the same index twice when target is 2 * nums[i]"
            ]
        }
    },

    # --- TECHNICAL INTERVIEW THEORY QUESTION 1 ---
    {
        "title": "Explain Indexing & B-Trees in Relational Databases",
        "track": "technical_interview",
        "topic": "Database Internals & Indexing",
        "difficulty": "medium",
        "language": "theory",
        "problem_statement": "Can you explain how database indexes work under the hood? Specifically, why do most relational databases choose B+ Trees over standard Binary Search Trees or Hash Tables?",
        "starter_code": "",
        "sample_inputs_and_outputs": [],
        "rubric": {
            "core_concepts": [
                "B+ Tree multi-way branch factor reduces disk I/O operations",
                "Sequential leaf node linked list enables efficient range queries",
                "Hash indexes only support exact match (=) lookups, not range scans (<, >, BETWEEN)",
                "Binary Search Trees can become skewed and have high tree depth resulting in excessive disk reads"
            ],
            "common_misconceptions": [
                "Claiming hash indexes are always faster for all queries",
                "Thinking indexes don't incur overhead on write operations (INSERT/UPDATE/DELETE)"
            ]
        }
    },

    # --- TECHNICAL INTERVIEW THEORY QUESTION 2 ---
    {
        "title": "Process vs. Thread & Concurrency",
        "track": "technical_interview",
        "topic": "Operating Systems & Concurrency",
        "difficulty": "medium",
        "language": "theory",
        "problem_statement": "What is the key architectural difference between a Process and a Thread? How do they handle memory isolation, context switching overhead, and inter-process communication?",
        "starter_code": "",
        "sample_inputs_and_outputs": [],
        "rubric": {
            "core_concepts": [
                "Processes have independent memory address spaces; threads within the same process share heap, code, and data",
                "Context switching between processes is heavier due to cache invalidation and TLB flush",
                "Threads share memory but require synchronization primitives (mutexes, semaphores) to prevent race conditions",
                "Processes require explicit IPC (pipes, sockets, shared memory)"
            ],
            "common_misconceptions": [
                "Thinking threads have separate heaps",
                "Assuming multi-threading always speeds up CPU-bound tasks regardless of core count or language runtime locks"
            ]
        }
    }
]

async def seed_questions_database():
    db = get_database()
    count = await db["questions"].count_documents({})
    if count == 0:
        for q in SEED_QUESTIONS:
            await db["questions"].insert_one(q)
