import {
  AuthResponse,
  User,
  Company,
  InterviewSession,
  CodingQuestion,
  CodeExecutionResponse,
  ProgressOverview,
  RevisionTaskItem,
  ResumeExtractedData,
  GitHubRepoAnalysis,
  CandidateExperienceInput,
  PreparationSetupRequest,
  PreparationPlanResponse,
  MilestoneItem,
  MentorChatMessage
} from '../types';

const API_BASE = '/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('preppilot_token');
  }

  public setToken(token: string) {
    localStorage.setItem('preppilot_token', token);
  }

  public removeToken() {
    localStorage.removeItem('preppilot_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth Endpoints
  async register(data: { email: string; password: string; full_name: string; target_role?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Company Endpoints
  async getCompanies(): Promise<Company[]> {
    return this.request<Company[]>('/companies');
  }

  async getCompanyDetail(companyId: string): Promise<Company> {
    return this.request<Company>(`/companies/${companyId}`);
  }

  // Interview Sessions
  async createSession(data: { role: string; track: string; company_id?: string; initial_difficulty?: string }): Promise<InterviewSession> {
    return this.request<InterviewSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSession(sessionId: string): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/sessions/${sessionId}`);
  }

  async submitAnswer(sessionId: string, answer: string): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answer }),
    });
  }

  async requestHint(sessionId: string, hint_level: number = 1): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/sessions/${sessionId}/hint`, {
      method: 'POST',
      body: JSON.stringify({ hint_level }),
    });
  }

  async switchMode(sessionId: string, mode: 'interviewer' | 'mentor'): Promise<InterviewSession> {
    return this.request<InterviewSession>(`/sessions/${sessionId}/switch-mode`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  // Coding Workspace
  async getCodingQuestions(): Promise<CodingQuestion[]> {
    return this.request<CodingQuestion[]>('/coding/questions');
  }

  async getCodingQuestion(id: string): Promise<CodingQuestion> {
    return this.request<CodingQuestion>(`/coding/questions/${id}`);
  }

  async runCode(data: { question_id: string; language: string; code: string }): Promise<CodeExecutionResponse> {
    return this.request<CodeExecutionResponse>('/coding/run', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitCode(data: { question_id: string; language: string; code: string }): Promise<CodeExecutionResponse> {
    return this.request<CodeExecutionResponse>('/coding/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Learning Progress & Revision Queue
  async getProgressOverview(): Promise<ProgressOverview> {
    return this.request<ProgressOverview>('/progress/overview');
  }

  async getRevisionQueue(): Promise<RevisionTaskItem[]> {
    return this.request<RevisionTaskItem[]>('/progress/revision-queue');
  }

  async completeRevisionTask(taskId: string): Promise<{ status: string }> {
    return this.request<{ status: string }>(`/progress/revision-queue/${taskId}/complete`, {
      method: 'POST',
    });
  }

  // Preparation Setup & Plan Endpoints
  async uploadResume(file: File): Promise<ResumeExtractedData> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/prep/upload-resume`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload and parse resume.');
    }
    return response.json();
  }

  async analyzeGitHub(repoUrl: string): Promise<GitHubRepoAnalysis> {
    return this.request<GitHubRepoAnalysis>('/prep/analyze-github', {
      method: 'POST',
      body: JSON.stringify({ repo_url: repoUrl }),
    });
  }

  async extractExperience(sourceUrl?: string, rawText?: string): Promise<CandidateExperienceInput> {
    return this.request<CandidateExperienceInput>('/prep/extract-experience', {
      method: 'POST',
      body: JSON.stringify({ source_url: sourceUrl, raw_text: rawText }),
    });
  }

  async uploadExperienceFile(file: File): Promise<CandidateExperienceInput> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/prep/upload-experience-file`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload and parse candidate experience file.');
    }
    return response.json();
  }

  async generatePlan(setup: PreparationSetupRequest): Promise<PreparationPlanResponse> {
    return this.request<PreparationPlanResponse>('/prep/generate-plan', {
      method: 'POST',
      body: JSON.stringify(setup),
    });
  }

  async getCurrentPlan(): Promise<PreparationPlanResponse | null> {
    return this.request<PreparationPlanResponse | null>('/prep/current-plan');
  }

  async updatePlan(data: { milestones: MilestoneItem[]; knowledge_gaps?: string[]; readiness_diagnostic?: string }): Promise<PreparationPlanResponse> {
    return this.request<PreparationPlanResponse>('/prep/update-plan', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getMentorMessages(): Promise<MentorChatMessage[]> {
    return this.request<MentorChatMessage[]>('/prep/mentor-messages');
  }

  async sendMentorMessage(data: {
    message: string;
    mode: string;
    context_topic?: string;
    code_snippet?: string;
  }): Promise<MentorChatMessage> {
    return this.request<MentorChatMessage>('/prep/mentor-message', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetMentorSession(): Promise<MentorChatMessage[]> {
    return this.request<MentorChatMessage[]>('/prep/mentor-session/reset', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
