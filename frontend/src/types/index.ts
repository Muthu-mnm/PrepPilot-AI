export interface User {
  id: string;
  email: string;
  full_name: string;
  target_company_id?: string;
  target_role?: string;
  recruitment_type?: string;
  target_deadline?: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RoleDefinition {
  role_id: string;
  title: string;
  tracks: string[];
  description?: string;
  common_topics: string[];
}

export interface ReportedRound {
  round_number: number;
  name: string;
  focus_areas: string[];
  typical_duration_minutes: number;
}

export interface SourceEvidence {
  id: string;
  company_id: string;
  source_url: string;
  source_title: string;
  publisher: string;
  publication_date?: string;
  retrieval_date: string;
  role: string;
  location?: string;
  recruitment_type: string;
  recruitment_year: number;
  reported_rounds: string[];
  selection_status: 'candidate_reported_selected' | 'independently_verified_selected' | 'unknown';
  verification_method: string;
  supporting_claims: string[];
  conflicts_and_limitations: string[];
  is_official_source: boolean;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_letter: string;
  industry: string;
  roles: RoleDefinition[];
  reported_rounds: ReportedRound[];
  source_count: number;
  evidence_summary?: string;
  sources?: SourceEvidence[];
}

export interface TurnEvaluation {
  correctness: 'correct' | 'partially_correct' | 'incorrect';
  concepts_demonstrated: string[];
  missing_concepts: string[];
  misconceptions: string[];
  feedback: string;
  assistance_level: 'independent' | 'hint_assisted' | 'solution_assisted';
  confidence_score: number;
  suggested_followup?: string;
}

export interface Turn {
  id: string;
  turn_number: number;
  role: 'interviewer' | 'candidate' | 'mentor';
  turn_type: 'question' | 'answer' | 'followup' | 'hint' | 'mentor_explanation';
  content: string;
  evaluation?: TurnEvaluation;
  created_at: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  company_name?: string;
  role: string;
  track: string;
  status: 'active' | 'paused' | 'completed';
  current_mode: 'interviewer' | 'mentor';
  current_difficulty: string;
  current_question_index: number;
  total_questions: number;
  turns: Turn[];
  created_at: string;
  updated_at: string;
}

export interface CodingQuestion {
  id: string;
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'sql' | 'python';
  problem_statement: string;
  starter_code: string;
  sample_inputs_and_outputs: Array<{ input: string; output: string }>;
  schema_explanation?: string;
}

export interface TestCaseResult {
  test_id: number;
  name: string;
  passed: boolean;
  input_repr?: string;
  expected_output?: string;
  actual_output?: string;
  execution_time_ms: number;
  error_message?: string;
  is_hidden: boolean;
}

export interface CodeExecutionResponse {
  submission_id: string;
  status: 'passed' | 'failed' | 'error' | 'timeout';
  language: string;
  passed_count: number;
  total_count: number;
  execution_time_ms: number;
  results: TestCaseResult[];
  compilation_or_runtime_error?: string;
  ai_failure_explanation?: string;
}

export interface TopicMastery {
  topic: string;
  category: string;
  attempts_count: number;
  independent_success_count: number;
  assisted_count: number;
  failure_count: number;
  mastery_percentage: number;
  common_misconceptions: string[];
}

export interface RevisionTaskItem {
  id: string;
  topic: string;
  question_title: string;
  misconception_addressed: string;
  due_date: string;
  days_overdue: number;
  status: 'pending' | 'completed';
  question_id: string;
}

export interface ProgressOverview {
  total_questions_attempted: number;
  independent_successes: number;
  hint_assisted_attempts: number;
  solution_assisted_attempts: number;
  coding_tests_passed: number;
  coding_tests_total: number;
  coding_pass_rate_percentage: number;
  topics_breakdown: TopicMastery[];
  pending_revisions_count: number;
  recent_activity: Array<{
    id: string;
    date: string;
    topic: string;
    activity_type: string;
    outcome: string;
    assistance_level: string;
  }>;
  notice: string;
}

/* --- Preparation Setup & Personalized Plan Types --- */

export interface ResumeExtractedData {
  filename?: string;
  education: string[];
  skills: string[];
  projects: string[];
  experience: string[];
  certifications: string[];
  summary?: string;
  raw_text_length: number;
}

export interface GitHubRepoAnalysis {
  repo_url: string;
  owner: string;
  repo_name: string;
  description?: string;
  primary_language?: string;
  languages: string[];
  dependencies: string[];
  architecture_summary?: string;
  potential_defense_topics: string[];
}

export interface CandidateExperienceInput {
  id?: string;
  source_url?: string;
  raw_text?: string;
  company: string;
  role: string;
  recruitment_type: string;
  year: number;
  selection_status: 'self_reported_selected' | 'verified_selected';
  reported_rounds: string[];
  extracted_topics: string[];
  extracted_questions: string[];
  preparation_patterns: string[];
}

export interface PreparationSetupRequest {
  target_company?: string;
  target_role: string;
  recruitment_type: string;
  target_deadline?: string;
  skills: string[];
  weak_topics: string[];
  learning_goals: string[];
  resume_data?: ResumeExtractedData;
  github_repos: GitHubRepoAnalysis[];
  candidate_experiences: CandidateExperienceInput[];
}

export interface MilestoneItem {
  milestone_id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'standard';
  topics: string[];
  suggested_activities: string[];
  completed: boolean;
}

export interface PreparationPlanResponse {
  id: string;
  user_id: string;
  target_role: string;
  target_company?: string;
  target_deadline?: string;
  readiness_diagnostic: string;
  strengths_summary: string[];
  knowledge_gaps: string[];
  project_defense_questions: string[];
  milestones: MilestoneItem[];
  evidence_notes: string;
  setup_data?: PreparationSetupRequest;
  created_at: string;
  updated_at: string;
}

export interface MentorChatMessage {
  id: string;
  role: 'mentor' | 'candidate';
  content: string;
  mode: 'mentor_chat' | 'project_defense' | 'concept_explanation' | 'coding_review' | 'knowledge_check';
  misconception_detected?: string;
  affirmation?: string;
  action_type?: 'offer_code' | 'schedule_revision' | 'retest_question';
  suggested_actions?: string[];
  created_at: string;
}
