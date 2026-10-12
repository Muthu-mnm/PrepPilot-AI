import os
from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.database.mongodb import get_database

SEED_COMPANIES = [
    {
        "name": "Amazon",
        "slug": "amazon",
        "logo_letter": "A",
        "industry": "Cloud Computing & E-Commerce",
        "roles": [
            {
                "role_id": "amazon_sde_1",
                "title": "Software Development Engineer - I (SDE-1)",
                "tracks": ["online_assessment", "coding_sql", "technical_interview", "hr_behavioral"],
                "description": "Entry-level engineering role focusing on high-scale distributed systems, data structures, and Amazon Leadership Principles.",
                "common_topics": ["Binary Trees", "Graphs (BFS/DFS)", "Dynamic Programming", "SQL Joins & Aggregations", "System Design Basics", "Leadership Principles"]
            },
            {
                "role_id": "amazon_intern",
                "title": "Software Development Engineer Intern",
                "tracks": ["online_assessment", "coding_sql", "technical_interview"],
                "description": "Internship track emphasizing fundamental problem solving, arrays, strings, and OOP design.",
                "common_topics": ["Two Pointers", "Hashing", "Recursion", "SQL Window Functions"]
            }
        ],
        "reported_rounds": [
            {
                "round_number": 1,
                "name": "Online Assessment (OA): 2 Coding Problems + Work Simulation",
                "focus_areas": ["Data Structures & Algorithms", "Debugging", "Amazon Work Style Survey"],
                "typical_duration_minutes": 90
            },
            {
                "round_number": 2,
                "name": "Technical Round 1: Coding & Data Structures",
                "focus_areas": ["Trees & Graphs", "Complexity Analysis", "LP: Customer Obsession"],
                "typical_duration_minutes": 60
            },
            {
                "round_number": 3,
                "name": "Technical Round 2: Design & Problem Solving",
                "focus_areas": ["Object-Oriented Design", "SQL/Data Modeling", "LP: Deliver Results"],
                "typical_duration_minutes": 60
            },
            {
                "round_number": 4,
                "name": "Bar Raiser / Hiring Manager Round",
                "focus_areas": ["Deep Behavioral Questions", "Architecture Trade-offs", "LP: Ownership"],
                "typical_duration_minutes": 60
            }
        ],
        "evidence_summary": "Extensive candidate reports corroborate a 3-to-4 round structure consisting of an online assessment followed by 3 virtual interviews with equal weight on coding and Leadership Principles."
    },
    {
        "name": "Google",
        "slug": "google",
        "logo_letter": "G",
        "industry": "Internet & Software Services",
        "roles": [
            {
                "role_id": "google_swe",
                "title": "Software Engineer (University Graduate)",
                "tracks": ["online_assessment", "coding_sql", "technical_interview"],
                "description": "Entry-level SWE role emphasizing mathematical reasoning, algorithmic elegance, and clean maintainable code.",
                "common_topics": ["Graphs & Dijkstra", "Dynamic Programming", "Tries", "Sliding Window", "Concurrency Fundamentals"]
            }
        ],
        "reported_rounds": [
            {
                "round_number": 1,
                "name": "Online Coding Challenge",
                "focus_areas": ["2 Algorithmic Questions", "Time & Space Optimization"],
                "typical_duration_minutes": 60
            },
            {
                "round_number": 2,
                "name": "Technical Interview 1: Data Structures",
                "focus_areas": ["Algorithmic Problem Solving", "Edge Case Handling", "Googleyness"],
                "typical_duration_minutes": 45
            },
            {
                "round_number": 3,
                "name": "Technical Interview 2: Complex Algorithms",
                "focus_areas": ["Graph Theory", "Optimization", "Testing Strategy"],
                "typical_duration_minutes": 45
            }
        ],
        "evidence_summary": "Rigorous emphasis on optimal time complexity and bug-free coding in a collaborative Google Docs / CoderPad environment."
    },
    {
        "name": "TCS (Tata Consultancy Services)",
        "slug": "tcs",
        "logo_letter": "T",
        "industry": "IT Services & Consulting",
        "roles": [
            {
                "role_id": "tcs_prime_digital",
                "title": "TCS Digital / Prime Graduate Engineer",
                "tracks": ["online_assessment", "coding_sql", "technical_interview", "hr_behavioral"],
                "description": "Advanced technical recruitment tier for fresh engineering graduates, emphasizing coding, DBMS, and cloud concepts.",
                "common_topics": ["SQL Joins & Group By", "Array Manipulation", "OOP in Java/Python", "DBMS Normalization"]
            }
        ],
        "reported_rounds": [
            {
                "round_number": 1,
                "name": "National Qualifier Test (NQT) - Cognitive & Advanced Coding",
                "focus_areas": ["Numerical Ability", "Verbal", "Advanced Coding (2 Problems)"],
                "typical_duration_minutes": 120
            },
            {
                "round_number": 2,
                "name": "Technical + Managerial + HR Combined Interview",
                "focus_areas": ["Core CS (DBMS, OS, OOP)", "Project Defense", "Willingness to Relocate"],
                "typical_duration_minutes": 40
            }
        ],
        "evidence_summary": "TCS NQT serves as the benchmark test; candidate experiences indicate strong focus on project architecture and database query writing in the interview."
    }
]

SEED_SOURCES = [
    {
        "company_slug": "amazon",
        "source_url": "https://www.geeksforgeeks.org/amazon-interview-experience-for-sde-1-on-campus/",
        "source_title": "Amazon Interview Experience for SDE-1 (On-Campus Selected)",
        "publisher": "GeeksforGeeks Student Placement Archive",
        "publication_date": "2024-03-15",
        "retrieval_date": "2026-10-12",
        "role": "Software Development Engineer - I",
        "location": "Bengaluru, India",
        "recruitment_type": "campus",
        "recruitment_year": 2024,
        "reported_rounds": ["Online Assessment", "Technical Round 1", "Technical Round 2", "Bar Raiser"],
        "selection_status": "candidate_reported_selected",
        "verification_method": "self_reported_offer_letter",
        "supporting_claims": [
            "OA had 2 coding problems: one medium sliding window and one graph BFS problem.",
            "Interviewer asked for both recursive and iterative solutions to binary tree serialization.",
            "Every round dedicated 15-20 minutes to Amazon Leadership Principle behavioral questions."
        ],
        "conflicts_and_limitations": [
            "Round duration varied between 45 and 65 minutes based on candidate answers.",
            "Off-campus interviews may feature an additional preliminary recruiter phone screen."
        ],
        "is_official_source": False
    },
    {
        "company_slug": "amazon",
        "source_url": "https://www.amazon.jobs/en/landing_pages/in-person-interview",
        "source_title": "Amazon Official Candidate Interview Guide",
        "publisher": "Amazon Global Talent Acquisition",
        "publication_date": "2025-01-10",
        "retrieval_date": "2026-10-12",
        "role": "Software Development Engineer",
        "location": "Global",
        "recruitment_type": "campus",
        "recruitment_year": 2025,
        "reported_rounds": ["Assessment", "Technical Interview Series"],
        "selection_status": "independently_verified_selected",
        "verification_method": "platform_verified_badge",
        "supporting_claims": [
            "Interviews strictly evaluate candidates against the 16 Amazon Leadership Principles.",
            "Candidates are expected to explain time and space complexity using Big-O notation.",
            "Bar Raisers are independent interviewers outside the hiring team."
        ],
        "conflicts_and_limitations": [
            "Official documentation does not disclose specific problem topics or questions."
        ],
        "is_official_source": True
    },
    {
        "company_slug": "tcs",
        "source_url": "https://www.geeksforgeeks.org/tcs-digital-interview-experience-on-campus/",
        "source_title": "TCS Digital Candidate Selected Experience",
        "publisher": "GeeksforGeeks Engineering Hub",
        "publication_date": "2024-08-20",
        "retrieval_date": "2026-10-12",
        "role": "TCS Digital / Prime Graduate Engineer",
        "location": "Chennai, India",
        "recruitment_type": "campus",
        "recruitment_year": 2024,
        "reported_rounds": ["NQT Online Test", "TR+MR+HR Panel"],
        "selection_status": "candidate_reported_selected",
        "verification_method": "self_reported_offer_letter",
        "supporting_claims": [
            "Live SQL query requested during the interview: finding the second highest salary using subqueries and window functions.",
            "In-depth questions on normalization (1NF to 3NF) and ACID properties in DBMS."
        ],
        "conflicts_and_limitations": [
            "Panel members frequently switch focus depending on candidate's listed resume projects."
        ],
        "is_official_source": False
    }
]

class CompanyResearchService:
    @staticmethod
    async def seed_initial_data():
        db = get_database()
        # Seed companies if empty
        count = await db["companies"].count_documents({})
        if count == 0:
            for comp in SEED_COMPANIES:
                res = await db["companies"].insert_one(comp)
                comp_id = res.inserted_id
                # Seed related sources
                slug = comp["slug"]
                for src in SEED_SOURCES:
                    if src.get("company_slug") == slug:
                        src_doc = dict(src)
                        src_doc["company_id"] = str(comp_id)
                        del src_doc["company_slug"]
                        await db["sources"].insert_one(src_doc)

    @staticmethod
    async def get_all_companies() -> List[Dict[str, Any]]:
        db = get_database()
        cursor = db["companies"].find({})
        companies = await cursor.to_list()
        res = []
        for c in companies:
            c_id = str(c["_id"])
            src_count = await db["sources"].count_documents({"company_id": c_id})
            res.append({
                "id": c_id,
                "name": c["name"],
                "slug": c["slug"],
                "logo_letter": c.get("logo_letter", c["name"][0]),
                "industry": c.get("industry", "Technology"),
                "roles": c.get("roles", []),
                "reported_rounds": c.get("reported_rounds", []),
                "source_count": src_count,
                "evidence_summary": c.get("evidence_summary")
            })
        return res

    @staticmethod
    async def get_company_detail(company_id: str) -> Optional[Dict[str, Any]]:
        db = get_database()
        comp = await db["companies"].find_one({"_id": company_id})
        if not comp:
            return None
        c_id = str(comp["_id"])
        src_cursor = db["sources"].find({"company_id": c_id})
        sources = await src_cursor.to_list()
        src_list = []
        for s in sources:
            src_list.append({
                "id": str(s["_id"]),
                "company_id": c_id,
                "source_url": s.get("source_url", ""),
                "source_title": s.get("source_title", ""),
                "publisher": s.get("publisher", ""),
                "publication_date": s.get("publication_date"),
                "retrieval_date": s.get("retrieval_date", "2026-10-12"),
                "role": s.get("role", ""),
                "location": s.get("location", "India"),
                "recruitment_type": s.get("recruitment_type", "campus"),
                "recruitment_year": s.get("recruitment_year", 2024),
                "reported_rounds": s.get("reported_rounds", []),
                "selection_status": s.get("selection_status", "candidate_reported_selected"),
                "verification_method": s.get("verification_method", "self_reported_offer_letter"),
                "supporting_claims": s.get("supporting_claims", []),
                "conflicts_and_limitations": s.get("conflicts_and_limitations", []),
                "is_official_source": s.get("is_official_source", False)
            })

        return {
            "id": c_id,
            "name": comp["name"],
            "slug": comp["slug"],
            "logo_letter": comp.get("logo_letter", comp["name"][0]),
            "industry": comp.get("industry", "Technology"),
            "roles": comp.get("roles", []),
            "reported_rounds": comp.get("reported_rounds", []),
            "source_count": len(src_list),
            "evidence_summary": comp.get("evidence_summary"),
            "sources": src_list
        }
