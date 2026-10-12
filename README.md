# PrepPilot AI 🚀
### Production-Minded AI-Powered Placement Preparation Platform

PrepPilot AI is a comprehensive full-stack interview preparation platform designed to help students improve their technical interview performance through evidence-backed preparation, rigorous coding sandboxes, and personalized adaptive pedagogy.

---

## 🌟 Key Features

1. **Evidence-Backed Preparation Setup**:
   - Resume extraction (`.pdf` and `.docx`) identifying skills, projects, and coursework.
   - Public GitHub repository metadata & architecture analyzer.
   - Candidate interview report analyzer (`.pdf`, `.docx`, `.txt`, `.md`).
   - Prioritized preparation plan synthesis with explicit readiness diagnostics, knowledge gaps, and milestones.

2. **My Placement Mentor**:
   - Flagship conversational mentor with 5 interactive modes:
     - 🎯 **Target Role Practice**: Adaptive mock interview questions grounded in target role requirements.
     - 🛡️ **Defend My GitHub Project**: Realistic architectural challenges, scaling trade-offs, and database design drills.
     - 💡 **5-Step Concept Explanation**: Structured pedagogy (*Misconception Diagnosis → Affirmation → Real-World Analogy → Side-by-Side Contrast → Retest*).
     - 💻 **Coding Practice & Review**: Algorithmic problem solving and edge-case code walkthroughs.
     - 🔄 **Retest Misconceptions**: Spaced retention drills targeting previously diagnosed weak topics.

3. **Deterministic Coding Sandboxes**:
   - In-browser Monaco editor for Python & SQL.
   - Isolated execution environments with timeout enforcement.
   - Algorithmic failure diagnostics without leaking full solutions.

4. **Transparent Integrity Principle**:
   - PrepPilot AI records verifiable, deterministic problem-solving attempts.
   - Strictly distinguishes independent successes from hint-assisted and solution-assisted attempts.
   - **Does not predict selection probability or guarantee placements.**

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Monaco Editor, Lucide React
- **Backend**: FastAPI (Python 3.10+), Pydantic v2, Uvicorn, httpx
- **AI Inference**: Ollama (`qwen3.5:27b` via local instance or ngrok tunnel)
- **Database**: MongoDB (Atlas connection supported with built-in resilient local document store fallback in development)
- **Document Parsers**: PyPDF, python-docx

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Ollama (running locally or via remote host)

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend application runs on `http://localhost:5173` and proxies API requests to `http://127.0.0.1:8000`.

---

## 🔒 Security & Credentials Policy
- Sensitive secrets and private environment files (`.env`, `.env.*`) are strictly excluded via `.gitignore`.
- Always configure your own secret keys and database strings via `.env.example`.
