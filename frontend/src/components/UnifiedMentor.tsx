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
  Calendar
} from 'lucide-react';
import { 
  MentorChatMessage, 
  PreparationPlanResponse, 
  CodingQuestion, 
  CodeExecutionResponse 
} from '../types';
import { api } from '../services/api';

interface UnifiedMentorProps {
  onNavigateToSetup?: () => void;
  onNavigateToRevisions?: () => void;
  onNavigate?: (tab: string) => void;
  initialMode?: 'mentor_chat' | 'project_defense' | 'concept_explanation' | 'coding_review' | 'knowledge_check';
}

export const UnifiedMentor: React.FC<UnifiedMentorProps> = ({
  onNavigateToSetup,
  onNavigateToRevisions,
  onNavigate,
  initialMode = 'mentor_chat'
}) => {
  // 1. Persistent Conversation State
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentMode, setCurrentMode] = useState<
    'mentor_chat' | 'project_defense' | 'concept_explanation' | 'coding_review' | 'knowledge_check'
  >(initialMode);

  // 2. Profile & Learning Context
  const [plan, setPlan] = useState<PreparationPlanResponse | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  // 3. Embedded Monaco Editor & Sandbox State
  const [showEmbeddedEditor, setShowEmbeddedEditor] = useState(initialMode === 'coding_review');
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<'sql' | 'python'>('sql');
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 5 Clearly Differentiated Contextual Modes
  const modeDefinitions = [
    {
      id: 'mentor_chat' as const,
      label: 'Interview Practice',
      icon: Target,
      tagline: 'Role-Specific Technical & Behavioral Interview',
      placeholder: 'Answer the question, ask for clarification, or start a mock technical round...',
      starterText: 'Let\'s begin a mock technical interview for my target role. Please ask me the first challenging question.'
    },
    {
      id: 'project_defense' as const,
      label: 'Defend My Project',
      icon: BookOpen,
      tagline: 'GitHub Repository Architecture & Trade-Off Defense',
      placeholder: 'Explain your architecture, concurrency handling, database choice, or system trade-offs...',
      starterText: 'I want to defend the architecture of my GitHub project. Please question me on my design decisions and scaling trade-offs.'
    },
    {
      id: 'concept_explanation' as const,
      label: 'Learn a Concept',
      icon: Lightbulb,
      tagline: '5-Step Intuitive Analogy & Misconception Calibration',
      placeholder: 'Ask to explain any concept, SQL join trap, caching pattern, or data structure...',
      starterText: 'Could you explain SQL Joins on Unmatched Records using a concrete analogy and 5-step breakdown?'
    },
    {
      id: 'coding_review' as const,
      label: 'Coding Practice',
      icon: Terminal,
      tagline: 'Monaco Editor Sandbox with Python/SQLite Execution & Mentoring',
      placeholder: 'Discuss your algorithm, ask about edge cases, or request a progressive hint...',
      starterText: 'I would like to solve a live coding challenge in the sandbox. Guide me through the optimal approach.'
    },
    {
      id: 'knowledge_check' as const,
      label: 'Retest Weak Areas',
      icon: RotateCcw,
      tagline: 'Targeted Retrieval Checks on Diagnosed Misconceptions',
      placeholder: 'Answer the retention check question or request a review of your weak spots...',
      starterText: 'Please give me a retrieval check question targeting my diagnosed weak spots and misconceptions.'
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

  // When mode changes to coding_review, auto-open editor
  useEffect(() => {
    if (currentMode === 'coding_review') {
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
  const handleSwitchMode = (newMode: typeof currentMode) => {
    setCurrentMode(newMode);
    if (newMode === 'coding_review') {
      setShowEmbeddedEditor(true);
    }
  };

  // Progressive Hint Handler
  const handleRequestProgressiveHint = async (hintType: 'nudge' | 'structural' | 'solution') => {
    let hintPrompt = '';
    if (hintType === 'nudge') {
      hintPrompt = 'Could you give me a subtle directional hint (nudge) for this problem without revealing the solution?';
    } else if (hintType === 'structural') {
      hintPrompt = 'Can you outline the algorithmic or architectural structure needed to solve this?';
    } else {
      hintPrompt = 'Please walk me through the optimal solution step-by-step and explain the key trade-offs.';
    }
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
      
      {/* 1. Clear Workspace Header (Light Theme, Restrained Indigo, Mode Switcher) */}
      <div className="mentor-workspace-header">
        
        {/* Mentor Title & Active Focus */}
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

        {/* 5 Contextual Mode Buttons */}
        <div className="mentor-modes-nav">
          {modeDefinitions.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleSwitchMode(mode.id)}
                className={`mentor-mode-btn ${isActive ? 'active' : ''}`}
                title={mode.tagline}
              >
                <Icon size={13} />
                <span>{mode.label}</span>
              </button>
            );
          })}
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
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.76rem', padding: '4px 8px' }}
            title="Toggle learning context panel"
          >
            {showContextPanel ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
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

      {/* 2. Main Workspace Split Layout: Chat + Optional Code Editor + Optional Context Panel */}
      <div 
        className="mentor-split-layout"
        style={{
          gridTemplateColumns: showEmbeddedEditor && showContextPanel
            ? '1.1fr 1fr 280px'
            : showEmbeddedEditor
              ? '1fr 1.05fr'
              : showContextPanel
                ? '1fr 280px'
                : '1fr'
        }}
      >

        {/* Central Active Conversation Thread */}
        <div className="mentor-chat-column">
          
          {/* Subheader: Current Mode Tagline & Progressive Hint Quick Toolbar */}
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg-main)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                {currentModeInfo.label}:
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {currentModeInfo.tagline}
              </span>
            </div>

            {/* Progressive Hint Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hints:</span>
              <button
                onClick={() => handleRequestProgressiveHint('nudge')}
                disabled={sending}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: 'var(--radius-full)' }}
                title="Subtle directional hint without revealing answer"
              >
                <Lightbulb size={11} color="var(--warning)" />
                <span>Nudge</span>
              </button>

              <button
                onClick={() => handleRequestProgressiveHint('structural')}
                disabled={sending}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: 'var(--radius-full)' }}
                title="Algorithmic or architectural structure hint"
              >
                <HelpCircle size={11} color="var(--accent-primary)" />
                <span>Structure</span>
              </button>

              <button
                onClick={() => handleRequestProgressiveHint('solution')}
                disabled={sending}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem', borderRadius: 'var(--radius-full)' }}
                title="In-depth step-by-step walkthrough"
              >
                <GraduationCap size={11} color="var(--success)" />
                <span>Walkthrough</span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="mentor-chat-messages">
            {messages.length === 0 ? (
              /* Useful Welcome State When No Conversation Exists */
              <div style={{
                margin: 'auto',
                maxWidth: '560px',
                background: 'var(--bg-main)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-xl)',
                padding: '28px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent-light)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto'
                }}>
                  <Sparkles size={22} />
                </div>

                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Welcome to Your Placement Mentor
                </h2>

                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '18px' }}>
                  {plan ? (
                    <>
                      I am your dedicated mentor for <strong>{plan.target_role}</strong>
                      {plan.target_company && <> at <strong>{plan.target_company}</strong></>}.
                      I evaluate your reasoning against technical rubrics, explain trade-offs intuitively, and help you defend your projects.
                    </>
                  ) : (
                    <>
                      I am your senior technical mentor. You haven't configured a target role yet, but you can start general technical practice right now or set up your profile for tailored questions.
                    </>
                  )}
                </p>

                {/* 5 Quick Starting Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '20px' }}>
                  {modeDefinitions.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <div
                        key={mode.id}
                        onClick={() => {
                          handleSwitchMode(mode.id);
                          handleSendMessage(mode.starterText);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                        className="quick-launch-row"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Icon size={16} color="var(--accent-primary)" />
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {mode.label}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {mode.tagline}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} color="var(--text-muted)" />
                      </div>
                    );
                  })}
                </div>

                {!plan && onNavigate && (
                  <button
                    onClick={() => onNavigate('profile')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <span>Configure Target Role & Resume in Preparation Profile</span>
                    <ArrowRight size={13} />
                  </button>
                )}
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
                      width: '100%'
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
                              setCurrentMode('coding_review');
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

          {/* User Input Bar */}
          <div style={{
            padding: '12px 18px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
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
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for a new line
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
            
            {/* Editor Top Bar: Problem Selector & Run Controls */}
            <div style={{
              padding: '10px 14px',
              background: 'var(--bg-main)',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  className="form-control"
                  style={{ width: '200px', fontSize: '0.76rem', height: '30px', padding: '2px 8px' }}
                  value={selectedQuestion?.id || ''}
                  onChange={(e) => {
                    const q = questions.find((x) => x.id === e.target.value);
                    if (q) handleSelectQuestion(q);
                  }}
                >
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      [{q.language.toUpperCase()}] {q.title}
                    </option>
                  ))}
                </select>

                <span className={`badge ${selectedQuestion?.difficulty === 'easy' ? 'badge-verified' : 'badge-candidate'}`} style={{ fontSize: '0.68rem' }}>
                  {selectedQuestion?.difficulty.toUpperCase()}
                </span>
                <span className="badge badge-official" style={{ fontSize: '0.68rem' }}>
                  {language === 'sql' ? 'SQLite Engine' : 'Python 3.12'}
                </span>
              </div>

              {/* Execution Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handleResetCode}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                  title="Reset starter code"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={handleRunCode}
                  disabled={isRunningCode || isSubmittingCode}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                >
                  <Play size={12} />
                  <span>{isRunningCode ? 'Running...' : 'Run'}</span>
                </button>
                <button
                  onClick={handleSubmitCode}
                  disabled={isRunningCode || isSubmittingCode}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                >
                  <Send size={12} />
                  <span>{isSubmittingCode ? 'Evaluating...' : 'Submit'}</span>
                </button>
                <button
                  onClick={() => setShowEmbeddedEditor(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px' }}
                  title="Close Code Editor"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Problem Statement Header */}
            {selectedQuestion && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-light)',
                fontSize: '0.78rem'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {selectedQuestion.title}
                </div>
                <div style={{ color: 'var(--text-secondary)', maxHeight: '60px', overflowY: 'auto', lineHeight: 1.4 }}>
                  {selectedQuestion.problem_statement}
                </div>
              </div>
            )}

            {/* Monaco Editor Instance */}
            <div style={{ flex: 1, minHeight: '260px' }}>
              <Editor
                height="100%"
                language={language === 'sql' ? 'sql' : 'python'}
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on'
                }}
              />
            </div>

            {/* Execution Results Drawer with Mentor Explanation Button */}
            {executionResult && (
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '12px 14px',
                background: '#1E1E2E',
                color: '#E2E8F0',
                borderTop: '1px solid var(--border-light)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.76rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontWeight: 700,
                      color: executionResult.status === 'passed' ? '#4ADE80' : '#F87171'
                    }}>
                      {executionResult.status === 'passed' ? '✓ ALL TESTS PASSED' : '❌ EXECUTION FAILED'}
                    </span>
                    <span style={{ color: '#94A3B8' }}>
                      ({executionResult.passed_count}/{executionResult.total_count} tests in {executionResult.execution_time_ms}ms)
                    </span>
                  </div>

                  {/* Connect Execution to Mentor Button */}
                  <button
                    onClick={handleConnectExecutionToMentor}
                    disabled={sending}
                    className="btn btn-sm"
                    style={{
                      background: 'var(--accent-primary)',
                      color: 'white',
                      fontSize: '0.72rem',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    <Sparkles size={11} />
                    <span>Explain in Mentor</span>
                  </button>
                </div>

                {/* Compilation / Runtime Error */}
                {executionResult.compilation_or_runtime_error && (
                  <pre style={{ color: '#F87171', whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                    {executionResult.compilation_or_runtime_error}
                  </pre>
                )}

                {/* Test Breakdown */}
                {executionResult.results.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: t.passed ? '#4ADE80' : '#F87171', margin: '2px 0' }}>
                    <span>{t.name}</span>
                    <span>{t.passed ? 'PASSED' : t.error_message || 'FAILED'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Compact Contextual Sidebar Panel (Collapsible) */}
        {showContextPanel && (
          <div className="mentor-context-sidebar">
            
            {/* Target Role & Opportunity */}
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                Target Placement
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {plan?.target_role || 'Software Development Engineer'}
              </div>
              {plan?.target_company && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  at <strong>{plan.target_company}</strong>
                </div>
              )}
              {plan?.target_deadline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <Calendar size={12} color="var(--accent-primary)" />
                  <span>Interview Date: {plan.target_deadline}</span>
                </div>
              )}
            </div>

            {/* Diagnosed Knowledge Gaps (Clickable) */}
            {plan?.knowledge_gaps && plan.knowledge_gaps.length > 0 && (
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Identified Weak Areas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {plan.knowledge_gaps.map((gap, i) => (
                    <span
                      key={i}
                      onClick={() => {
                        setSelectedTopic(gap);
                        setCurrentMode('concept_explanation');
                        handleSendMessage(`Can you help me master this weak area: "${gap}"?`);
                      }}
                      className="badge badge-candidate"
                      style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                      title="Click to start concept drill on this topic"
                    >
                      🎯 {gap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingested GitHub Repositories (For Project Defense) */}
            {plan?.setup_data?.github_repos && plan.setup_data.github_repos.length > 0 && (
              <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Ingested Repositories
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {plan.setup_data.github_repos.map((repo: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => {
                        setCurrentMode('project_defense');
                        handleSendMessage(`I want to defend the architecture and trade-offs of my repository: "${repo.repo_name}".`);
                      }}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
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

            {/* Mode Guide */}
            <div style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.76rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '3px' }}>
                {currentModeInfo.label} Guide
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {currentMode === 'project_defense' && 'Drill into error boundaries, throughput bottlenecks, and concurrency trade-offs.'}
                {currentMode === 'concept_explanation' && 'Learn with a 5-step breakdown: diagnosis, analogy, comparison, example, and practice check.'}
                {currentMode === 'coding_review' && 'Solve live coding challenges with in-memory execution and mentor error feedback.'}
                {currentMode === 'knowledge_check' && 'Spaced retrieval recall on past misconceptions to build permanent retention.'}
                {currentMode === 'mentor_chat' && 'Realistic interview simulation. Practice structured answers using STAR and technical depth.'}
              </div>
            </div>

            {/* Quick Profile Link */}
            {onNavigate && (
              <button
                onClick={() => onNavigate('profile')}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', fontSize: '0.74rem', marginTop: 'auto' }}
              >
                <span>Edit Preparation Profile</span>
                <ArrowRight size={12} />
              </button>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default UnifiedMentor;
