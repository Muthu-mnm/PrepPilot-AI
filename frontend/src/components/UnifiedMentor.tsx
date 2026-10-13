import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Sparkles, 
  Send, 
  Code2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  BookOpen, 
  RotateCcw, 
  Lightbulb, 
  Terminal, 
  Target, 
  ArrowRight, 
  Play, 
  GraduationCap, 
  Copy, 
  Check, 
  X, 
  RefreshCw, 
  FolderGit2, 
  PanelRightClose,
  PanelRightOpen,
  Calendar,
  Paperclip,
  FileText,
  Building2,
  Upload,
  Globe
} from 'lucide-react';
import { 
  MentorChatMessage, 
  PreparationPlanResponse, 
  CodingQuestion, 
  CodeExecutionResponse,
  MentorMode,
  ChatAttachment,
  ResumeExtractedData,
  CompanyDocExtractedData,
  GitHubRepoAnalysis,
  CandidateExperienceInput
} from '../types';
import { api } from '../services/api';

interface UnifiedMentorProps {
  onNavigateToSetup?: () => void;
  onNavigateToRevisions?: () => void;
  onNavigate?: (tab: string, mode?: string) => void;
  initialMode?: string;
}

export const UnifiedMentor: React.FC<UnifiedMentorProps> = ({
  onNavigateToSetup,
  onNavigateToRevisions,
  onNavigate,
  initialMode = 'general_chat'
}) => {
  // Normalize initial mode
  const normalizeMode = (m?: string): MentorMode => {
    if (!m) return 'general_chat';
    if (m === 'mentor_chat') return 'general_chat';
    if (m === 'concept_explanation') return 'learn';
    if (m === 'coding_review') return 'coding';
    if (m === 'knowledge_check') return 'retest';
    if (['general_chat', 'interview', 'coding', 'learn', 'project_defense', 'retest'].includes(m)) {
      return m as MentorMode;
    }
    return 'general_chat';
  };

  // 1. Persistent Conversation State
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentMode, setCurrentMode] = useState<MentorMode>(normalizeMode(initialMode));

  // 2. Profile & Learning Context
  const [plan, setPlan] = useState<PreparationPlanResponse | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showHintMenu, setShowHintMenu] = useState(false);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  // 3. Embedded Monaco Editor & Sandbox State
  const [showEmbeddedEditor, setShowEmbeddedEditor] = useState(normalizeMode(initialMode) === 'coding');
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<'sql' | 'python'>('sql');
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // 4. Unified Attachment Experience State
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [activeAttachTab, setActiveAttachTab] = useState<'resume' | 'company' | 'github' | 'experience'>('resume');
  const [isProcessingAttach, setIsProcessingAttach] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachedItems, setAttachedItems] = useState<ChatAttachment[]>([]);
  const [pastedCompanyText, setPastedCompanyText] = useState('');
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [pastedExpText, setPastedExpText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 6 Compact Selectable Modes (ChatGPT-style pills)
  const modeDefinitions: {
    id: MentorMode;
    label: string;
    icon: any;
    tagline: string;
    placeholder: string;
    starterText: string;
  }[] = [
    {
      id: 'general_chat',
      label: 'General Chat',
      icon: Sparkles,
      tagline: 'Conversational Guidance, Onboarding & Preparation Strategy',
      placeholder: 'Ask questions, discuss your target role, or build your prep plan...',
      starterText: 'Hello Mentor, I would like to review my overall preparation plan and next priorities.'
    },
    {
      id: 'interview',
      label: 'Interview',
      icon: Target,
      tagline: 'One-Question-at-a-Time Technical & Behavioral Mock Rounds',
      placeholder: 'Answer the question, explain your reasoning, or ask for clarification...',
      starterText: 'Let\'s begin a mock technical interview for my target role. Please ask me the first challenging question.'
    },
    {
      id: 'coding',
      label: 'Coding',
      icon: Terminal,
      tagline: 'Interactive Monaco Sandbox with Python/SQLite Execution & Test Feedback',
      placeholder: 'Discuss your algorithm, test edge cases, or ask for a hint on code...',
      starterText: 'I would like to solve a live coding challenge in the sandbox. Guide me through the optimal approach.'
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: Lightbulb,
      tagline: '5-Step Intuitive Analogy, Mechanics & Misconception Calibration',
      placeholder: 'Ask to explain any concept, SQL join trap, caching pattern, or data structure...',
      starterText: 'Could you explain SQL Joins on Unmatched Records using a concrete analogy and 5-step breakdown?'
    },
    {
      id: 'project_defense',
      label: 'Project Defense',
      icon: BookOpen,
      tagline: 'Defend Architecture, Concurrency & Trade-offs of Your Actual GitHub Projects',
      placeholder: 'Explain your architecture, concurrency handling, database choice, or system trade-offs...',
      starterText: 'I want to defend the architecture of my GitHub project. Please question me on my design decisions and scaling trade-offs.'
    },
    {
      id: 'retest',
      label: 'Retest',
      icon: RotateCcw,
      tagline: 'Independent Retrieval Checks on Diagnosed Misconceptions & Weak Areas',
      placeholder: 'Answer the retention check question or request a review of your weak spots...',
      starterText: 'Please give me an independent retrieval check question targeting my diagnosed weak spots and misconceptions.'
    }
  ];

  const currentModeInfo = modeDefinitions.find((m) => m.id === currentMode) || modeDefinitions[0];

  // Load conversation, preparation plan, and coding question bank
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [msgs, planData, codingQuestions] = await Promise.all([
          api.getMentorMessages().catch(() => []),
          api.getCurrentPlan().catch(() => null),
          api.getCodingQuestions().catch(() => [])
        ]);

        setMessages(msgs || []);
        setPlan(planData);
        if (planData && planData.knowledge_gaps && planData.knowledge_gaps.length > 0) {
          setSelectedTopic(planData.knowledge_gaps[0]);
        }

        if (codingQuestions && codingQuestions.length > 0) {
          setQuestions(codingQuestions);
          const first = codingQuestions[0];
          setSelectedQuestion(first);
          setCode(first.starter_code);
          setLanguage(first.language);
        }
      } catch (err) {
        console.error('Error loading initial mentor data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // When mode changes to coding, auto-open editor
  useEffect(() => {
    if (currentMode === 'coding') {
      setShowEmbeddedEditor(true);
    }
  }, [currentMode]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string, snippetToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text || sending) return;

    if (textToSend === undefined) {
      setInputMessage('');
    }
    setSendError(null);

    const optimisticUserMsg: MentorChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'candidate',
      content: text + (snippetToSend ? `\n\n\`\`\`${language}\n${snippetToSend}\n\`\`\`` : ''),
      mode: currentMode,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setSending(true);

    try {
      const mentorResp = await api.sendMentorMessage({
        message: text,
        mode: currentMode,
        context_topic: selectedTopic || undefined,
        code_snippet: snippetToSend || undefined
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUserMsg.id),
        optimisticUserMsg,
        mentorResp
      ]);
    } catch (err: any) {
      console.error('Error sending message to mentor:', err);
      setSendError(err.message || 'Unable to communicate with placement mentor service.');
    } finally {
      setSending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Switch Mode smoothly without losing conversation
  const handleSwitchMode = (newMode: MentorMode) => {
    setCurrentMode(newMode);
    setShowEmbeddedEditor(newMode === 'coding');
  };

  // Progressive Hint Handler (Logs hint-assisted attempt)
  const handleRequestProgressiveHint = async (hintType: 'nudge' | 'structural' | 'solution') => {
    let hintPrompt = '';
    if (hintType === 'nudge') {
      hintPrompt = 'Could you give me a subtle directional hint (nudge) for this problem without revealing the solution?';
    } else if (hintType === 'structural') {
      hintPrompt = 'Can you outline the algorithmic or architectural structure needed to solve this?';
    } else {
      hintPrompt = 'Please walk me through the optimal solution step-by-step and explain the key trade-offs.';
    }

    // Deterministically track that this turn utilized hints
    api.recordLearningEvent({
      topic: selectedTopic || 'General Technical',
      attempt_type: hintType === 'solution' ? 'solution_assisted' : 'hint_assisted',
      outcome: 'partially_correct'
    }).catch(() => {});

    await handleSendMessage(hintPrompt);
  };

  // Reset Session
  const handleResetSession = async () => {
    if (!window.confirm('Reset this conversation? This will clear active turns and provide a fresh greeting grounded in your profile.')) {
      return;
    }
    setLoading(true);
    try {
      const freshMessages = await api.resetMentorSession();
      setMessages(freshMessages || []);
      setExecutionResult(null);
    } catch (err) {
      console.error('Error resetting mentor session:', err);
    } finally {
      setLoading(false);
    }
  };

  // Coding Sandbox: Select Problem
  const handleSelectQuestion = (q: CodingQuestion) => {
    setSelectedQuestion(q);
    setCode(q.starter_code);
    setLanguage(q.language);
    setExecutionResult(null);
  };

  // Coding Sandbox: Run Code
  const handleRunCode = async () => {
    if (!selectedQuestion) return;
    setIsRunningCode(true);
    setExecutionResult(null);
    try {
      const res = await api.runCode({
        question_id: selectedQuestion.id,
        language: language,
        code: code
      });
      setExecutionResult(res);
    } catch (err: any) {
      alert(`Sandbox Execution Error: ${err.message}`);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Coding Sandbox: Submit Code
  const handleSubmitCode = async () => {
    if (!selectedQuestion) return;
    setIsSubmittingCode(true);
    setExecutionResult(null);
    try {
      const res = await api.submitCode({
        question_id: selectedQuestion.id,
        language: language,
        code: code
      });
      setExecutionResult(res);
    } catch (err: any) {
      alert(`Submission Error: ${err.message}`);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Coding Sandbox: Reset Starter Code
  const handleResetCode = () => {
    if (selectedQuestion) {
      setCode(selectedQuestion.starter_code);
      setExecutionResult(null);
    }
  };

  // Connect Sandbox Error / Results Directly to Mentor Conversation
  const handleConnectExecutionToMentor = async () => {
    if (!selectedQuestion || !executionResult) return;

    const passedCount = executionResult.passed_count;
    const totalCount = executionResult.total_count;
    const status = executionResult.status;
    const errorDetails = executionResult.compilation_or_runtime_error || 
      executionResult.results.find((r) => !r.passed)?.error_message || '';

    const executionPrompt = `I just executed my code for "${selectedQuestion.title}" (${language.toUpperCase()}) in the sandbox.
Execution Status: ${status.toUpperCase()} (${passedCount}/${totalCount} tests passed in ${executionResult.execution_time_ms}ms).
${errorDetails ? `Diagnostic Output / Error:\n${errorDetails}\n` : 'All deterministic tests passed successfully!\n'}
Could you please:
1. Diagnose what caused this result and identify edge cases or algorithmic misconceptions.
2. Review my code's time/space complexity.
3. Give me a progressive hint on how to improve this solution?`;

    await handleSendMessage(executionPrompt, code);
  };

  // Copy code snippet helper
  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Attachment Processing Handlers
  const handleUploadResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAttach(true);
    setAttachError(null);
    try {
      const data: ResumeExtractedData = await api.uploadResume(file);
      const newAttach: ChatAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        category: 'resume',
        status: 'completed',
        summary: data.summary || `Extracted ${data.skills.length} skills and ${data.projects.length} projects.`,
        extractedData: data
      };
      setAttachedItems((prev) => [...prev, newAttach]);
      setShowAttachmentModal(false);

      // Conversational prompt informing mentor
      const notifyPrompt = `I have attached my resume ("${file.name}").
Key extracted skills: ${data.skills.slice(0, 6).join(', ')}.
Notable projects: ${data.projects.slice(0, 3).join(', ')}.
Please use this background when formulating questions, project defense drills, and target preparation.`;
      await handleSendMessage(notifyPrompt);
    } catch (err: any) {
      setAttachError(err.message || 'Failed to process resume file.');
    } finally {
      setIsProcessingAttach(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadCompanyDocFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAttach(true);
    setAttachError(null);
    try {
      const data: CompanyDocExtractedData = await api.uploadCompanyDoc(file);
      const newAttach: ChatAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        category: 'company_spec',
        status: 'completed',
        summary: data.summary || `Extracted ${data.required_skills.length} required skills.`,
        extractedData: data
      };
      setAttachedItems((prev) => [...prev, newAttach]);
      setShowAttachmentModal(false);

      const notifyPrompt = `I have attached official company skill specifications from "${file.name}" for the role "${data.role_title}".
Required skills: ${data.required_skills.join(', ')}.
Preferred skills: ${data.preferred_skills.join(', ')}.
Please prioritize these requirements in our practice.`;
      await handleSendMessage(notifyPrompt);
    } catch (err: any) {
      setAttachError(err.message || 'Failed to process company document.');
    } finally {
      setIsProcessingAttach(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParseCompanyText = async () => {
    if (!pastedCompanyText.trim()) return;
    setIsProcessingAttach(true);
    setAttachError(null);
    try {
      const data: CompanyDocExtractedData = await api.parseCompanyText(pastedCompanyText);
      const newAttach: ChatAttachment = {
        id: `att-${Date.now()}`,
        name: data.role_title || 'Pasted Job Spec',
        category: 'company_spec',
        status: 'completed',
        summary: data.summary || `Extracted ${data.required_skills.length} required skills.`,
        extractedData: data
      };
      setAttachedItems((prev) => [...prev, newAttach]);
      setPastedCompanyText('');
      setShowAttachmentModal(false);

      const notifyPrompt = `I have pasted a job specification for "${data.role_title}".
Required skills detected: ${data.required_skills.join(', ')}.
Please ground our interview and coding drills in these requirements.`;
      await handleSendMessage(notifyPrompt);
    } catch (err: any) {
      setAttachError(err.message || 'Failed to parse company text.');
    } finally {
      setIsProcessingAttach(false);
    }
  };

  const handleAnalyzeGithubRepo = async () => {
    if (!githubUrlInput.trim()) return;
    setIsProcessingAttach(true);
    setAttachError(null);
    try {
      const data: GitHubRepoAnalysis = await api.analyzeGitHub(githubUrlInput.trim());
      const newAttach: ChatAttachment = {
        id: `att-${Date.now()}`,
        name: data.repo_name,
        category: 'github_repo',
        status: 'completed',
        summary: `Language: ${data.primary_language || 'Unknown'}. Architecture: ${data.architecture_summary || 'Standard'}.`,
        extractedData: data
      };
      setAttachedItems((prev) => [...prev, newAttach]);
      setGithubUrlInput('');
      setShowAttachmentModal(false);

      const notifyPrompt = `I have attached my GitHub repository "${data.repo_name}" (${data.primary_language || 'codebase'}).
Technologies: ${data.dependencies.join(', ') || 'Standard stack'}.
Potential defense topics: ${data.potential_defense_topics.join(', ')}.
Let's drill into the architectural trade-offs of this project.`;
      setCurrentMode('project_defense');
      await handleSendMessage(notifyPrompt);
    } catch (err: any) {
      setAttachError(err.message || 'Failed to inspect GitHub repository.');
    } finally {
      setIsProcessingAttach(false);
    }
  };

  const handleUploadExperienceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAttach(true);
    setAttachError(null);
    try {
      const data: CandidateExperienceInput = await api.uploadExperienceFile(file);
      const newAttach: ChatAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        category: 'interview_experience',
        status: 'completed',
        summary: `Reported rounds: ${data.reported_rounds.join(', ')}. Topics: ${data.extracted_topics.join(', ')}.`,
        extractedData: data
      };
      setAttachedItems((prev) => [...prev, newAttach]);
      setShowAttachmentModal(false);

      const notifyPrompt = `I have uploaded a candidate interview report ("${file.name}").
Reported rounds: ${data.reported_rounds.join(', ')}.
High-frequency topics: ${data.extracted_topics.join(', ')}.
Please prepare me for questions similar to these recruitment rounds.`;
      await handleSendMessage(notifyPrompt);
    } catch (err: any) {
      setAttachError(err.message || 'Failed to parse candidate experience file.');
    } finally {
      setIsProcessingAttach(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParseExperienceText = async () => {
    if (!pastedExpText.trim()) return;
    setIsProcessingAttach(true);
    setAttachError(null);
    try {
      const data: CandidateExperienceInput = await api.extractExperience(undefined, pastedExpText);
      const newAttach: ChatAttachment = {
        id: `att-${Date.now()}`,
        name: 'Pasted Interview Report',
        category: 'interview_experience',
        status: 'completed',
        summary: `Reported rounds: ${data.reported_rounds.join(', ')}. Questions: ${data.extracted_questions.length}.`,
        extractedData: data
      };
      setAttachedItems((prev) => [...prev, newAttach]);
      setPastedExpText('');
      setShowAttachmentModal(false);

      const notifyPrompt = `I have pasted candidate interview feedback with rounds: ${data.reported_rounds.join(', ')}.
Questions noted: ${data.extracted_questions.join('; ')}.
Please tailor my interview simulation to reflect these expectations.`;
      await handleSendMessage(notifyPrompt);
    } catch (err: any) {
      setAttachError(err.message || 'Failed to extract interview experience.');
    } finally {
      setIsProcessingAttach(false);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Helper to render markdown formatting (headers, bold, lists, codeblocks)
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="mentor-markdown-body">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const lines = part.slice(3, -3).trim().split('\n');
            const lang = lines[0].trim();
            const codeBody = lang && !lang.includes(' ') && lines.length > 1
              ? lines.slice(1).join('\n')
              : lines.join('\n');
            const displayLang = (lang && !lang.includes(' ') ? lang : 'code').toUpperCase();

            return (
              <div key={index} className="mentor-markdown-codeblock">
                <div className="mentor-codeblock-header">
                  <span>{displayLang}</span>
                  <button
                    onClick={() => handleCopyCode(codeBody, index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem'
                    }}
                  >
                    {copiedCodeIdx === index ? <Check size={12} color="#34D399" /> : <Copy size={12} />}
                    <span>{copiedCodeIdx === index ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="mentor-codeblock-content">
                  <code>{codeBody}</code>
                </div>
              </div>
            );
          }

          // Format paragraphs, headers, and bullet points
          const paragraphs = part.split(/\n\n+/);
          return (
            <React.Fragment key={index}>
              {paragraphs.map((p, pIdx) => {
                const trimmed = p.trim();
                if (!trimmed) return null;

                // Headers
                if (trimmed.startsWith('### ')) {
                  return <h3 key={pIdx}>{formatInline(trimmed.slice(4))}</h3>;
                }
                if (trimmed.startsWith('## ')) {
                  return <h2 key={pIdx}>{formatInline(trimmed.slice(3))}</h2>;
                }
                if (trimmed.startsWith('# ')) {
                  return <h1 key={pIdx}>{formatInline(trimmed.slice(2))}</h1>;
                }

                // Bullet Lists
                if (trimmed.includes('\n• ') || trimmed.includes('\n- ') || trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
                  const listLines = trimmed.split('\n');
                  return (
                    <ul key={pIdx}>
                      {listLines.map((line, lIdx) => {
                        const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
                        return cleanLine ? <li key={lIdx}>{formatInline(cleanLine)}</li> : null;
                      })}
                    </ul>
                  );
                }

                // Standard Paragraph
                return (
                  <p key={pIdx} style={{ lineHeight: 1.6 }}>
                    {formatInline(trimmed)}
                  </p>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Helper for inline bold and code
  const formatInline = (text: string) => {
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return tokens.map((tok, i) => {
      if (tok.startsWith('`') && tok.endsWith('`')) {
        return <code key={i} className="mentor-inline-code">{tok.slice(1, -1)}</code>;
      }
      if (tok.startsWith('**') && tok.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{tok.slice(2, -2)}</strong>;
      }
      return tok;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '14px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-light)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Connecting to your placement mentor workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="mentor-workspace-container">
      
      {/* 1. Header: Placement Identity & Workspace Controls */}
      <div className="mentor-workspace-header">
        
        {/* Mentor Title & Active Target Role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)'
          }}>
            <Sparkles size={18} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                My Placement Mentor
              </h1>
              <span className="badge badge-verified" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                Active Guidance
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
              <span>Target: <strong>{plan?.target_role || 'Software Development Engineer'}</strong></span>
              {plan?.target_company && <span> at <strong>{plan.target_company}</strong></span>}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowEmbeddedEditor(!showEmbeddedEditor)}
            className={`btn btn-sm ${showEmbeddedEditor ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
            title="Toggle coding editor side-by-side"
          >
            <Code2 size={13} />
            <span>{showEmbeddedEditor ? 'Hide Code' : 'Code Sandbox'}</span>
          </button>

          <button
            onClick={() => setShowContextPanel(!showContextPanel)}
            className={`btn btn-sm ${showContextPanel ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Toggle active learning context drawer"
          >
            <Target size={13} />
            <span>Context</span>
          </button>

          <button
            onClick={handleResetSession}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.76rem', padding: '4px 8px' }}
            title="Reset conversation"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Split Layout: Dominant Chat + Contextual Code Sandbox */}
      <div 
        className="mentor-split-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: showEmbeddedEditor ? '1fr 1fr' : '1fr',
          gap: '16px',
          height: '100%',
          position: 'relative'
        }}
      >

        {/* Central Dominant Conversation Thread */}
        <div className="mentor-chat-column">
          {/* Messages Stream */}
          <div className="mentor-chat-messages">
            {messages.length === 0 ? (
              /* Clean ChatGPT-Style Welcome State */
              <div className="mentor-welcome-hero">
                <div className="mentor-welcome-avatar">
                  <Sparkles size={24} />
                </div>

                <h2 className="mentor-welcome-title">
                  {plan?.target_role ? `Welcome back to PrepPilot` : `Hi! I'm your PrepPilot mentor.`}
                </h2>

                <p className="mentor-welcome-desc">
                  {plan?.target_role ? (
                    <>
                      I am ready to help you prepare for <strong>{plan.target_role}</strong>
                      {plan.target_company && <> at <strong>{plan.target_company}</strong></>}.
                      <br /><br />
                      How would you like to make progress today?
                    </>
                  ) : (
                    <>
                      I'll help you prepare for placements based on your goals, skills, projects, and target roles.
                      <br /><br />
                      Let's start by understanding your preparation. You can upload your resume, share a company skill specification, add your GitHub projects, or simply tell me what role you're aiming for.
                    </>
                  )}
                </p>

                {/* Working Action Suggestion Chips */}
                <div className="mentor-suggestion-chips">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAttachTab('resume');
                      setShowAttachmentModal(true);
                    }}
                    className="mentor-chip"
                    title="Upload resume in PDF or DOCX"
                  >
                    <FileText size={14} color="var(--accent-primary)" />
                    <span>Upload resume</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAttachTab('company');
                      setShowAttachmentModal(true);
                    }}
                    className="mentor-chip"
                    title="Upload job specs or paste JD requirements"
                  >
                    <Building2 size={14} color="var(--accent-primary)" />
                    <span>Add company requirements</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAttachTab('github');
                      setShowAttachmentModal(true);
                    }}
                    className="mentor-chip"
                    title="Connect GitHub repository URL"
                  >
                    <FolderGit2 size={14} color="var(--accent-primary)" />
                    <span>Add GitHub projects</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMessage('My placement goal is: ');
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                    className="mentor-chip"
                    title="Set target role and placement timeline"
                  >
                    <Target size={14} color="var(--accent-primary)" />
                    <span>Set my placement goal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchMode('interview');
                      handleSendMessage("Let's start a mock interview round for my target role.");
                    }}
                    className="mentor-chip"
                    title="Start a 1-on-1 mock interview drill"
                  >
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>Start mock interview</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Ongoing Conversation Turns */
              messages.map((msg, idx) => {
                const isMentor = msg.role === 'mentor';
                return (
                  <div
                    key={msg.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMentor ? 'flex-start' : 'flex-end',
                      width: '100%',
                      maxWidth: '1040px',
                      margin: '0 auto'
                    }}
                  >
                    {/* Header Label */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)'
                    }}>
                      {isMentor ? (
                        <>
                          <Sparkles size={11} color="var(--accent-primary)" />
                          <strong style={{ color: 'var(--text-primary)' }}>Senior Placement Mentor</strong>
                          {msg.mode && (
                            <span style={{ color: 'var(--accent-primary)', textTransform: 'capitalize' }}>
                              • {msg.mode.replace('_', ' ')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span>Candidate Turn</span>
                      )}
                    </div>

                    {/* Chat Bubble */}
                    <div className={isMentor ? 'mentor-bubble-mentor' : 'mentor-bubble-candidate'}>
                      
                      {/* Diagnosed Misconception Callout Badge */}
                      {isMentor && msg.misconception_detected && (
                        <div style={{
                          padding: '8px 12px',
                          background: 'var(--error-bg)',
                          border: '1px solid var(--error-border)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '10px',
                          fontSize: '0.82rem',
                          color: 'var(--error)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '2px' }}>
                            <AlertCircle size={14} />
                            <span>Diagnosed Misconception:</span>
                          </div>
                          <div>{msg.misconception_detected}</div>
                        </div>
                      )}

                      {/* Acknowledged Intuition Callout Badge */}
                      {isMentor && msg.affirmation && (
                        <div style={{
                          padding: '8px 12px',
                          background: 'var(--success-bg)',
                          border: '1px solid var(--success-border)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '10px',
                          fontSize: '0.82rem',
                          color: 'var(--success)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '2px' }}>
                            <CheckCircle2 size={14} />
                            <span>Acknowledged Reasoning:</span>
                          </div>
                          <div>{msg.affirmation}</div>
                        </div>
                      )}

                      {/* Main Message Content */}
                      {isMentor ? (
                        renderMessageContent(msg.content)
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {msg.content}
                        </div>
                      )}

                      {/* Contextual Action Callout Buttons */}
                      {isMentor && msg.action_type === 'offer_code' && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                          <button
                            onClick={() => {
                              setCurrentMode('coding');
                              setShowEmbeddedEditor(true);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--bg-main)', fontSize: '0.78rem' }}
                          >
                            <Terminal size={13} color="var(--accent-primary)" />
                            <span>Open Code Sandbox & Practice</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

                      {isMentor && msg.action_type === 'schedule_revision' && onNavigate && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                          <button
                            onClick={() => onNavigate('progress')}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--bg-main)', fontSize: '0.78rem' }}
                          >
                            <RotateCcw size={13} color="var(--warning)" />
                            <span>Review in Retention Queue</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

                      {isMentor && msg.action_type === 'retest_question' && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                          <button
                            onClick={() => {
                              setCurrentMode('retest');
                              handleSendMessage('Give me an independent retest question on this concept.');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--bg-main)', fontSize: '0.78rem' }}
                          >
                            <RotateCcw size={13} color="var(--accent-primary)" />
                            <span>Test Independently Now</span>
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Suggested Response Chips (Displayed only on the latest turn) */}
                    {isMentor && idx === messages.length - 1 && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', maxWidth: '88%' }}>
                        {msg.suggested_actions.map((actionText, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(actionText)}
                            disabled={sending}
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--bg-surface)',
                              borderColor: 'var(--accent-border)',
                              color: 'var(--accent-primary)'
                            }}
                          >
                            <span>{actionText}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {sending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '6px 4px' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid var(--accent-light)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Placement Mentor is evaluating your turn and formulating guidance...</span>
              </div>
            )}

            {/* Error Banner with Retry */}
            {sendError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--error)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} />
                  <span>{sendError}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Compact ChatGPT-Style 6-Mode Selector Bar (Above composer) */}
          <div className="mentor-mode-pills-bar">
            <div style={{ maxWidth: '1040px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {modeDefinitions.map((mode) => {
                const Icon = mode.icon;
                const isActive = currentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleSwitchMode(mode.id)}
                    className={`mentor-mode-pill ${isActive ? 'active' : ''}`}
                    title={mode.tagline}
                  >
                    <Icon size={12} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Input & Attachment Bar */}
          <div className="mentor-composer-area">
            <div style={{ maxWidth: '1040px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Attached Items Badges Row */}
              {attachedItems.length > 0 && (
                <div className="mentor-attachment-chips-row">
                  {attachedItems.map((att) => (
                    <div key={att.id} className="mentor-attachment-chip">
                      <FileText size={12} color="var(--accent-primary)" />
                      <span>{att.name}</span>
                      <span 
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="chip-remove"
                        title="Remove attachment"
                      >
                        <X size={11} />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                
                {/* Attachment Button (Paperclip) */}
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(true)}
                  className="btn btn-secondary"
                  style={{
                    height: '44px',
                    width: '44px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-md)'
                  }}
                  title="Attach resume, company job spec, GitHub repo, or interview experiences"
                >
                  <Paperclip size={18} color="var(--text-secondary)" />
                </button>

                {/* Contextual Progressive Hints Popover */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowHintMenu(!showHintMenu)}
                    className="btn btn-secondary"
                    style={{
                      height: '44px',
                      padding: '0 11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}
                    title="Contextual progressive hints (Nudge, Structure, Walkthrough)"
                  >
                    <Lightbulb size={15} color="#D97706" />
                    <span>Hints</span>
                  </button>

                  {showHintMenu && (
                    <div className="mentor-hints-popover">
                      <div
                        className="hint-option"
                        onClick={() => {
                          setShowHintMenu(false);
                          handleRequestProgressiveHint('nudge');
                        }}
                      >
                        <Lightbulb size={14} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong>Subtle Nudge</strong>
                          <span>Directional clue without code</span>
                        </div>
                      </div>

                      <div
                        className="hint-option"
                        onClick={() => {
                          setShowHintMenu(false);
                          handleRequestProgressiveHint('structural');
                        }}
                      >
                        <HelpCircle size={14} color="var(--accent-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong>Structural Steps</strong>
                          <span>Algorithmic structure & steps</span>
                        </div>
                      </div>

                      <div
                        className="hint-option"
                        onClick={() => {
                          setShowHintMenu(false);
                          handleRequestProgressiveHint('solution');
                        }}
                      >
                        <GraduationCap size={14} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong>Full Walkthrough</strong>
                          <span>Step-by-step logic & trade-offs</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={currentModeInfo.placeholder}
                  className="form-control"
                  style={{
                    resize: 'none',
                    minHeight: '44px',
                    maxHeight: '120px',
                    flex: 1,
                    fontSize: '0.88rem',
                    lineHeight: 1.4,
                    padding: '10px 12px'
                  }}
                  disabled={sending}
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={sending || !inputMessage.trim()}
                  className="btn btn-primary"
                  style={{ height: '44px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Send message (Enter)"
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for a new line • Mode: <strong>{currentModeInfo.label}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Integrated Monaco Code Workspace (When Toggled) */}
        {showEmbeddedEditor && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
            height: '100%'
          }}>
            {/* Editor Header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-light)',
              background: 'var(--bg-main)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={15} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Isolated Coding Sandbox
                </span>
                <span className="badge badge-verified" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                  {language.toUpperCase()}
                </span>
              </div>

              {/* Language Toggle & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setLanguage('sql')}
                  className={`btn btn-sm ${language === 'sql' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  SQL (SQLite)
                </button>
                <button
                  onClick={() => setLanguage('python')}
                  className={`btn btn-sm ${language === 'python' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  Python 3.12
                </button>
                <button
                  onClick={handleResetCode}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                  title="Reset starter template"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            </div>

            {/* Problem Statement Drawer */}
            {selectedQuestion && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-light)',
                maxHeight: '130px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedQuestion.title}
                  </div>
                  <span className={`badge ${selectedQuestion.difficulty === 'easy' ? 'badge-verified' : 'badge-candidate'}`} style={{ fontSize: '0.68rem' }}>
                    {selectedQuestion.difficulty}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {selectedQuestion.problem_statement}
                </div>
              </div>
            )}

            {/* Monaco Editor Container */}
            <div style={{ flex: 1, minHeight: '260px', background: '#1E1E2E' }}>
              <Editor
                height="100%"
                language={language === 'sql' ? 'sql' : 'python'}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  fontSize: 13,
                  fontFamily: 'JetBrains Mono, Menlo, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on'
                }}
              />
            </div>

            {/* Sandbox Controls: Run, Submit & Execution Results */}
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--border-light)',
              background: 'var(--bg-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleRunCode}
                    disabled={isRunningCode || isSubmittingCode}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Play size={12} />
                    <span>{isRunningCode ? 'Running...' : 'Run Tests'}</span>
                  </button>

                  <button
                    onClick={handleSubmitCode}
                    disabled={isRunningCode || isSubmittingCode}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={12} />
                    <span>{isSubmittingCode ? 'Submitting...' : 'Submit Evaluation'}</span>
                  </button>
                </div>

                {/* Problem Selector Dropdown */}
                {questions.length > 1 && (
                  <select
                    value={selectedQuestion?.id || ''}
                    onChange={(e) => {
                      const q = questions.find((item) => item.id === e.target.value);
                      if (q) handleSelectQuestion(q);
                    }}
                    className="form-control"
                    style={{ fontSize: '0.74rem', padding: '2px 8px', width: 'auto', maxWidth: '180px' }}
                  >
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.language})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Execution Feedback Panel */}
              {executionResult && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: executionResult.status === 'passed' ? 'var(--success-bg)' : 'var(--error-bg)',
                  border: `1px solid ${executionResult.status === 'passed' ? 'var(--success-border)' : 'var(--error-border)'}`,
                  fontSize: '0.78rem',
                  color: executionResult.status === 'passed' ? 'var(--success)' : 'var(--error)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                    <span>
                      Outcome: {executionResult.status.toUpperCase()} ({executionResult.passed_count}/{executionResult.total_count} tests passed in {executionResult.execution_time_ms}ms)
                    </span>
                    <button
                      onClick={handleConnectExecutionToMentor}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#FFFFFF' }}
                      title="Send this execution output to mentor for feedback"
                    >
                      <Sparkles size={11} color="var(--accent-primary)" />
                      <span>Explain in Mentor</span>
                    </button>
                  </div>

                  {executionResult.compilation_or_runtime_error && (
                    <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', whiteSpace: 'pre-wrap', color: 'var(--error)' }}>
                      {executionResult.compilation_or_runtime_error}
                    </div>
                  )}

                  {executionResult.results.some((r) => !r.passed) && (
                    <div style={{ marginTop: '6px', fontSize: '0.72rem' }}>
                      Failed: {executionResult.results.find((r) => !r.passed)?.name}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* 4. Slide-Over Context Drawer (Learning Focus & Ingested Projects) */}
      {showContextPanel && (
        <div className="mentor-context-drawer-backdrop" onClick={() => setShowContextPanel(false)}>
          <div className="mentor-context-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mentor-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Active Context & Memory
                </span>
              </div>
              <button 
                onClick={() => setShowContextPanel(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mentor-drawer-body">
              {/* Target Placement */}
              <div className="mentor-drawer-section">
                <div className="mentor-drawer-section-title">
                  Target Placement
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {plan?.target_role || 'Not yet configured'}
                </div>
                {plan?.target_company && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    🏢 {plan.target_company}
                  </div>
                )}
                {plan?.target_deadline && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📅 Deadline: {plan.target_deadline}
                  </div>
                )}
              </div>

              {/* Diagnosed Knowledge Gaps */}
              {plan?.knowledge_gaps && plan.knowledge_gaps.length > 0 && (
                <div className="mentor-drawer-section">
                  <div className="mentor-drawer-section-title">
                    Identified Weak Areas
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {plan.knowledge_gaps.map((gap, i) => (
                      <span
                        key={i}
                        onClick={() => {
                          setSelectedTopic(gap);
                          setCurrentMode('learn');
                          setShowContextPanel(false);
                          handleSendMessage(`Can you help me master this weak area: "${gap}"?`);
                        }}
                        className="badge badge-candidate"
                        style={{ cursor: 'pointer', fontSize: '0.74rem' }}
                        title="Click to start concept drill on this topic"
                      >
                        🎯 {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingested GitHub Repositories */}
              {plan?.setup_data?.github_repos && plan.setup_data.github_repos.length > 0 && (
                <div className="mentor-drawer-section">
                  <div className="mentor-drawer-section-title">
                    Ingested Repositories
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {plan.setup_data.github_repos.map((repo: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => {
                          setCurrentMode('project_defense');
                          setShowContextPanel(false);
                          handleSendMessage(`I want to defend the architecture and trade-offs of my repository: "${repo.repo_name}".`);
                        }}
                        style={{
                          padding: '8px 10px',
                          background: 'var(--bg-main)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          border: '1px solid var(--border-light)'
                        }}
                        title="Click to drill into this project's architecture"
                      >
                        <FolderGit2 size={13} color="var(--accent-primary)" />
                        <span style={{ fontWeight: 600 }}>{repo.repo_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached Session Materials */}
              {attachedItems.length > 0 && (
                <div className="mentor-drawer-section">
                  <div className="mentor-drawer-section-title">
                    Attached Materials
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {attachedItems.map((att) => (
                      <div
                        key={att.id}
                        style={{
                          padding: '6px 8px',
                          background: 'var(--bg-main)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.74rem',
                          border: '1px solid var(--border-light)'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{att.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{att.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Guide */}
              <div className="mentor-drawer-section">
                <div className="mentor-drawer-section-title">
                  {currentModeInfo.label} Guide
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {currentMode === 'general_chat' && 'Conversational advisor. Ask anything about placement strategy, timeline, or plan.'}
                  {currentMode === 'interview' && 'One question at a time. Evaluated against rubric depth and adaptive follow-ups.'}
                  {currentMode === 'coding' && 'Monaco sandbox with Python/SQLite execution and error explanation loop.'}
                  {currentMode === 'learn' && '5-step breakdown: diagnosis, analogy, comparison, concrete code, and practice retest.'}
                  {currentMode === 'project_defense' && 'Drill into error boundaries, throughput bottlenecks, and concurrency trade-offs.'}
                  {currentMode === 'retest' && 'Spaced retrieval recall on past misconceptions to verify permanent retention.'}
                </div>
              </div>

              {/* Quick Profile Link */}
              {onNavigate && (
                <button
                  onClick={() => {
                    setShowContextPanel(false);
                    onNavigate('profile');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '0.76rem', marginTop: 'auto' }}
                >
                  <span>Edit Full Preparation Profile</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Unified Attachment Experience Modal */}
      {showAttachmentModal && (
        <div className="mentor-attachment-modal-overlay">
          <div className="mentor-attachment-modal-card">
            
            {/* Modal Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Attach Preparation Materials
                </h3>
              </div>
              <button
                onClick={() => setShowAttachmentModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="mentor-attachment-tabs">
              <button
                onClick={() => setActiveAttachTab('resume')}
                className={`mentor-attachment-tab-btn ${activeAttachTab === 'resume' ? 'active' : ''}`}
              >
                1. Resume (PDF/DOCX)
              </button>
              <button
                onClick={() => setActiveAttachTab('company')}
                className={`mentor-attachment-tab-btn ${activeAttachTab === 'company' ? 'active' : ''}`}
              >
                2. Company Job Spec
              </button>
              <button
                onClick={() => setActiveAttachTab('github')}
                className={`mentor-attachment-tab-btn ${activeAttachTab === 'github' ? 'active' : ''}`}
              >
                3. GitHub Project
              </button>
              <button
                onClick={() => setActiveAttachTab('experience')}
                className={`mentor-attachment-tab-btn ${activeAttachTab === 'experience' ? 'active' : ''}`}
              >
                4. Interview Report
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {attachError && (
                <div style={{
                  padding: '8px 12px',
                  background: 'var(--error-bg)',
                  border: '1px solid var(--error-border)',
                  color: 'var(--error)',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {attachError}
                </div>
              )}

              {/* Tab 1: Resume */}
              {activeAttachTab === 'resume' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Upload your resume in PDF or DOCX format to extract education, technical skills, and projects for personalized questioning.
                  </p>
                  <label style={{
                    border: '2px dashed var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Upload size={24} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isProcessingAttach ? 'Extracting Resume Data...' : 'Choose or Drop Resume (PDF, DOCX)'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Max 10MB • Safe local extraction
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={handleUploadResumeFile}
                      style={{ display: 'none' }}
                      disabled={isProcessingAttach}
                    />
                  </label>
                </div>
              )}

              {/* Tab 2: Company Job Spec */}
              {activeAttachTab === 'company' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Upload official company-issued role requirements, job descriptions, or paste text to extract required vs preferred skills.
                  </p>
                  
                  {/* File upload option */}
                  <label style={{
                    border: '1px dashed var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-main)',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    display: 'block'
                  }}>
                    <span>📎 Upload Job Description File (PDF, DOCX, TXT)</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleUploadCompanyDocFile}
                      style={{ display: 'none' }}
                      disabled={isProcessingAttach}
                    />
                  </label>

                  <div style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    — or paste the job description text below —
                  </div>

                  <textarea
                    value={pastedCompanyText}
                    onChange={(e) => setPastedCompanyText(e.target.value)}
                    placeholder="Paste technical requirements, eligibility criteria, and responsibilities..."
                    className="form-control"
                    rows={4}
                    style={{ fontSize: '0.82rem' }}
                  />

                  <button
                    onClick={handleParseCompanyText}
                    disabled={isProcessingAttach || !pastedCompanyText.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-end' }}
                  >
                    {isProcessingAttach ? 'Parsing Requirements...' : 'Extract & Attach Company Spec'}
                  </button>
                </div>
              )}

              {/* Tab 3: GitHub Project */}
              {activeAttachTab === 'github' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Provide a public GitHub repository URL to inspect tech stack, architecture, and formulate project-defense questions.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      value={githubUrlInput}
                      onChange={(e) => setGithubUrlInput(e.target.value)}
                      placeholder="https://github.com/username/repository"
                      className="form-control"
                      style={{ fontSize: '0.84rem' }}
                    />
                    <button
                      onClick={handleAnalyzeGithubRepo}
                      disabled={isProcessingAttach || !githubUrlInput.trim()}
                      className="btn btn-primary btn-sm"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isProcessingAttach ? 'Inspecting...' : 'Analyze Repo'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Interview Experience */}
              {activeAttachTab === 'experience' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Upload or paste interview experiences from previous campus/off-campus candidate reports to extract rounds and high-frequency questions.
                  </p>

                  <label style={{
                    border: '1px dashed var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-main)',
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    display: 'block'
                  }}>
                    <span>📎 Upload Experience File (PDF, DOCX, TXT)</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleUploadExperienceFile}
                      style={{ display: 'none' }}
                      disabled={isProcessingAttach}
                    />
                  </label>

                  <div style={{ textAlign: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    — or paste candidate experience text —
                  </div>

                  <textarea
                    value={pastedExpText}
                    onChange={(e) => setPastedExpText(e.target.value)}
                    placeholder="Paste interview experience details (rounds, questions asked, difficulty)..."
                    className="form-control"
                    rows={4}
                    style={{ fontSize: '0.82rem' }}
                  />

                  <button
                    onClick={handleParseExperienceText}
                    disabled={isProcessingAttach || !pastedExpText.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-end' }}
                  >
                    {isProcessingAttach ? 'Extracting Questions...' : 'Extract & Attach Experience'}
                  </button>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid var(--border-light)',
              background: 'var(--bg-main)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowAttachmentModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default UnifiedMentor;
