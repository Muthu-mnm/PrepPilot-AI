import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Sparkles, 
  Send, 
  Code2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  BookOpen, 
  RotateCcw, 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Lightbulb, 
  Terminal, 
  ExternalLink, 
  Target, 
  ArrowRight,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  FileCode,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  X
} from 'lucide-react';
import { 
  MentorChatMessage, 
  PreparationPlanResponse, 
  MilestoneItem,
  CodingQuestion,
  CodeExecutionResponse
} from '../types';
import { api } from '../services/api';

interface UnifiedMentorProps {
  onNavigateToCoding?: () => void;
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
  // Persistent Conversation State
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentMode, setCurrentMode] = useState<
    'mentor_chat' | 'project_defense' | 'concept_explanation' | 'coding_review' | 'knowledge_check'
  >(initialMode);

  // Plan context
  const [plan, setPlan] = useState<PreparationPlanResponse | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);

  // Embedded Monaco Editor & Sandbox State
  const [showEmbeddedEditor, setShowEmbeddedEditor] = useState(initialMode === 'coding_review');
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion | null>(null);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<'sql' | 'python'>('sql');
  const [executionResult, setExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modeOptions = [
    {
      id: 'mentor_chat' as const,
      label: 'Target Role Interview',
      description: 'Role-specific mock interview questions, progressive hints, and rubrics',
      icon: Target
    },
    {
      id: 'project_defense' as const,
      label: 'Defend My GitHub Project',
      description: 'Architectural trade-offs, scalability, and code defense drills',
      icon: BookOpen
    },
    {
      id: 'coding_review' as const,
      label: 'Coding Sandbox & Review',
      description: 'Monaco Editor with Python & SQL execution and mentor feedback loop',
      icon: Terminal
    },
    {
      id: 'concept_explanation' as const,
      label: '5-Step Concept Explanation',
      description: 'Misconception → Analogy → Contrast → Retest pedagogical drill',
      icon: Lightbulb
    },
    {
      id: 'knowledge_check' as const,
      label: 'Retest Misconceptions',
      description: 'Spaced recall checks on previous weak spots and diagnostic gaps',
      icon: RotateCcw
    }
  ];

  // Load initial conversation, plan, and coding questions
  useEffect(() => {
    const initData = async () => {
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
        console.error('Error loading mentor initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // When mode changes to coding_review, auto-open embedded editor
  useEffect(() => {
    if (currentMode === 'coding_review') {
      setShowEmbeddedEditor(true);
    }
  }, [currentMode]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string, snippetToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    if (!textToSend) {
      setInputMessage('');
    }

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

      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticUserMsg.id), optimisticUserMsg, mentorResp]);
    } catch (err: any) {
      console.error('Error sending message to mentor:', err);
      alert(`Could not deliver message to mentor: ${err.message || 'Network error'}`);
    } finally {
      setSending(false);
    }
  };

  // Progressive Hint Handler
  const handleRequestProgressiveHint = async (hintType: 'nudge' | 'structural' | 'solution') => {
    let hintPrompt = '';
    if (hintType === 'nudge') {
      hintPrompt = 'Can you give me a subtle directional hint (nudge) for this problem without giving away the solution?';
    } else if (hintType === 'structural') {
      hintPrompt = 'Can you provide a structural hint outlining the algorithmic or architectural approach?';
    } else {
      hintPrompt = 'Please explain the optimal solution and walk me through the key trade-offs step-by-step.';
    }
    await handleSendMessage(hintPrompt);
  };

  // Select Coding Question
  const handleSelectQuestion = (q: CodingQuestion) => {
    setSelectedQuestion(q);
    setCode(q.starter_code);
    setLanguage(q.language);
    setExecutionResult(null);
  };

  // Run Code in Sandbox
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

  // Submit Code Solution
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

  // Reset Starter Code
  const handleResetCode = () => {
    if (selectedQuestion) {
      setCode(selectedQuestion.starter_code);
      setExecutionResult(null);
    }
  };

  // Connect Deterministic Test Results to Mentor Explanation & Next Exercise
  const handleConnectExecutionToMentor = async () => {
    if (!selectedQuestion || !executionResult) return;

    const passedCount = executionResult.passed_count;
    const totalCount = executionResult.total_count;
    const status = executionResult.status;
    const errorDetails = executionResult.compilation_or_runtime_error || 
      executionResult.results.find(r => !r.passed)?.error_message || '';

    const executionPrompt = `I just ran my code for "${selectedQuestion.title}" (${language.toUpperCase()}).
Execution Status: ${status.toUpperCase()} (${passedCount}/${totalCount} tests passed in ${executionResult.execution_time_ms}ms).
${errorDetails ? `Diagnostic Output / Error:\n${errorDetails}\n` : 'All deterministic tests passed successfully!\n'}
Could you please:
1. Explain what caused this execution result and diagnose any edge cases or misconceptions.
2. Provide feedback on time/space complexity.
3. Recommend the next exercise or follow-up question I should attempt to reinforce this concept?`;

    await handleSendMessage(executionPrompt, code);
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!plan) return;
    const updatedMilestones: MilestoneItem[] = plan.milestones.map((m) =>
      m.milestone_id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    try {
      const updatedPlan = await api.updatePlan({ milestones: updatedMilestones });
      setPlan(updatedPlan);
    } catch (err) {
      console.error('Failed to update milestone:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-light)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Connecting to your personalized placement mentor...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '14px' }}>
      
      {/* Mentor Header & Mode Switcher */}
      <div style={{ 
        background: 'var(--bg-surface)', 
        border: '1px solid var(--border-light)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '14px 18px', 
        boxShadow: 'var(--shadow-sm)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  My Placement Mentor
                </h2>
                <span className="badge badge-verified">
                  Adaptive Pedagogy
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Target: <strong>{plan?.target_role || 'AI & Full Stack Engineer'}</strong>
                {plan?.target_company && <span> at <strong>{plan.target_company}</strong></span>}
                {plan?.target_deadline && <span> • Target Date: {plan.target_deadline}</span>}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Embedded Monaco Editor Toggle Button */}
            <button 
              onClick={() => setShowEmbeddedEditor(!showEmbeddedEditor)}
              className={`btn btn-sm ${showEmbeddedEditor ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem' }}
              title="Toggle embedded Monaco code editor"
            >
              <Code2 size={14} />
              <span>{showEmbeddedEditor ? 'Hide Code Editor' : 'Open Code Editor'}</span>
            </button>

            {plan && (
              <button 
                onClick={() => setPlanExpanded(!planExpanded)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
              >
                <Layers size={14} />
                <span>{planExpanded ? 'Hide Plan' : 'View Plan'}</span>
                {planExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}

            <button 
              onClick={() => onNavigate ? onNavigate('profile') : (onNavigateToSetup && onNavigateToSetup())}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem' }}
              title="Edit skills, upload resume or GitHub repository in Preparation Profile"
            >
              <span>Profile Setup</span>
            </button>
          </div>
        </div>

        {/* Collapsible Plan Drawer */}
        {plan && planExpanded && (
          <div style={{ 
            marginTop: '14px', 
            paddingTop: '14px', 
            borderTop: '1px solid var(--border-light)', 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '14px' 
          }}>
            <div style={{ background: 'var(--bg-main)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--accent-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} />
                <span>Readiness Diagnostic & Knowledge Gaps</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '8px' }}>
                {plan.readiness_diagnostic}
              </p>
              {plan.knowledge_gaps && plan.knowledge_gaps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {plan.knowledge_gaps.map((gap, i) => (
                    <span 
                      key={i} 
                      onClick={() => { setSelectedTopic(gap); setCurrentMode('concept_explanation'); }}
                      className="badge badge-candidate" 
                      style={{ cursor: 'pointer', fontSize: '0.74rem' }}
                      title="Click to focus mentor on this topic"
                    >
                      🎯 {gap}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', maxHeight: '160px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="var(--success)" />
                <span>Preparation Plan Milestones</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {plan.milestones.map((m) => (
                  <div 
                    key={m.milestone_id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '8px', 
                      padding: '5px 8px', 
                      background: 'var(--bg-surface)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem' 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={m.completed} 
                      onChange={() => handleToggleMilestone(m.milestone_id)}
                      style={{ marginTop: '2px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      <strong>{m.title}</strong>: {m.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5 Mode Selector Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginTop: '12px', 
          overflowX: 'auto', 
          paddingBottom: '2px' 
        }}>
          {modeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = currentMode === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setCurrentMode(opt.id)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{ 
                  borderRadius: 'var(--radius-full)', 
                  fontSize: '0.76rem', 
                  padding: '5px 12px',
                  whiteSpace: 'nowrap'
                }}
                title={opt.description}
              >
                <Icon size={13} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Grid: Left Conversation Thread, Right Embedded Monaco Editor (when toggled) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: showEmbeddedEditor ? '1.1fr 1.1fr' : '1fr', 
        gap: '14px', 
        flex: 1, 
        minHeight: 0 
      }}>

        {/* Left Column: Persistent Conversation Thread */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-lg)', 
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          
          {/* Quick Context & Hint Toolbar */}
          <div style={{ 
            padding: '8px 16px', 
            background: 'var(--bg-main)', 
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Focus Topic:</span>
              <input
                type="text"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                placeholder="Topic context (optional)..."
                style={{ 
                  padding: '2px 8px', 
                  fontSize: '0.75rem', 
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  width: '160px'
                }}
              />
            </div>

            {/* Progressive Hint Quick Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => handleRequestProgressiveHint('nudge')} 
                disabled={sending}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                title="Ask for a subtle directional hint"
              >
                <Lightbulb size={12} color="var(--warning)" />
                <span>Nudge Hint</span>
              </button>

              <button 
                onClick={() => handleRequestProgressiveHint('structural')} 
                disabled={sending}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                title="Ask for an architectural approach hint"
              >
                <HelpCircle size={12} color="var(--accent-primary)" />
                <span>Structural Hint</span>
              </button>

              <button 
                onClick={() => handleRequestProgressiveHint('solution')} 
                disabled={sending}
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                title="Request full step-by-step solution walkthrough"
              >
                <GraduationCap size={12} color="var(--success)" />
                <span>Explain Solution</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Scrollable Area */}
          <div style={{ 
            flex: 1, 
            padding: '20px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                <Sparkles size={32} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Your Placement Mentor is Ready
                </h3>
                <p style={{ fontSize: '0.85rem' }}>
                  Practice target role interview questions, defend your GitHub projects, or ask for concept explanations.
                </p>
              </div>
            ) : (
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
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      marginBottom: '4px',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)'
                    }}>
                      {isMentor ? (
                        <>
                          <Sparkles size={12} color="var(--accent-primary)" />
                          <strong style={{ color: 'var(--text-primary)' }}>Senior Placement Mentor</strong>
                          {msg.mode && (
                            <span style={{ textTransform: 'capitalize', color: 'var(--accent-primary)' }}>
                              • {msg.mode.replace('_', ' ')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span>You</span>
                      )}
                    </div>

                    <div
                      style={{
                        maxWidth: '90%',
                        padding: '14px 18px',
                        borderRadius: isMentor ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                        background: isMentor ? 'var(--bg-main)' : 'var(--accent-primary)',
                        color: isMentor ? 'var(--text-primary)' : 'var(--text-inverse)',
                        border: isMentor ? '1px solid var(--border-light)' : 'none',
                        boxShadow: 'var(--shadow-sm)',
                        lineHeight: 1.6,
                        fontSize: '0.9rem'
                      }}
                    >
                      {/* Step 1 / Misconception Alert if Present */}
                      {isMentor && msg.misconception_detected && (
                        <div style={{
                          padding: '8px 12px',
                          background: 'var(--error-bg)',
                          border: '1px solid var(--error-border)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '12px',
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

                      {/* Step 2 / Affirmation if Present */}
                      {isMentor && msg.affirmation && (
                        <div style={{
                          padding: '8px 12px',
                          background: 'var(--success-bg)',
                          border: '1px solid var(--success-border)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '12px',
                          fontSize: '0.82rem',
                          color: 'var(--success)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '2px' }}>
                            <CheckCircle2 size={14} />
                            <span>Acknowledged Correct Intuition:</span>
                          </div>
                          <div>{msg.affirmation}</div>
                        </div>
                      )}

                      {/* Message Content */}
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </div>

                      {/* Action Callouts */}
                      {isMentor && msg.action_type === 'offer_code' && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                          <button 
                            onClick={() => setShowEmbeddedEditor(true)}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--bg-surface)', fontSize: '0.78rem' }}
                          >
                            <Code2 size={14} color="var(--accent-primary)" />
                            <span>Open Embedded Code Editor</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}

                      {isMentor && msg.action_type === 'schedule_revision' && onNavigate && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                          <button 
                            onClick={() => onNavigate('progress')}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--bg-surface)', fontSize: '0.78rem' }}
                          >
                            <Clock size={14} color="var(--warning)" />
                            <span>View in Retention Queue</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Suggested Action Chips (only on the last mentor turn) */}
                    {isMentor && idx === messages.length - 1 && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', maxWidth: '90%' }}>
                        {msg.suggested_actions.map((actionText, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleSendMessage(actionText)}
                            disabled={sending}
                            className="btn btn-secondary btn-sm"
                            style={{ 
                              fontSize: '0.76rem', 
                              padding: '4px 10px', 
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

            {sending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '6px 0' }}>
                <div style={{ width: '14px', height: '14px', border: '2px solid var(--accent-light)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Senior Mentor is formulating personalized feedback...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* User Input Bar */}
          <div style={{ 
            padding: '12px 16px', 
            background: 'var(--bg-surface)', 
            borderTop: '1px solid var(--border-light)' 
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask your mentor, answer the interview question, or explain your approach (Enter to send)..."
                className="form-control"
                style={{ 
                  resize: 'none', 
                  minHeight: '44px', 
                  maxHeight: '120px', 
                  flex: 1, 
                  fontSize: '0.88rem' 
                }}
                disabled={sending}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={sending || !inputMessage.trim()}
                className="btn btn-primary"
                style={{ height: '44px', padding: '0 18px' }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Embedded Monaco Editor & Sandbox (Toggled / Integrated) */}
        {showEmbeddedEditor && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--bg-surface)', 
            border: '1px solid var(--border-light)', 
            borderRadius: 'var(--radius-lg)', 
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            
            {/* Editor Top Control Bar */}
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
                  style={{ width: '220px', fontSize: '0.78rem', height: '32px' }}
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

                <span className={`badge ${selectedQuestion?.difficulty === 'easy' ? 'badge-verified' : 'badge-candidate'}`} style={{ fontSize: '0.7rem' }}>
                  {selectedQuestion?.difficulty.toUpperCase()}
                </span>
                <span className="badge badge-official" style={{ fontSize: '0.7rem' }}>
                  {language === 'sql' ? 'SQLite Engine' : 'Python 3.12'}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={handleResetCode} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.74rem' }} title="Reset starter code">
                  <RotateCcw size={13} />
                </button>
                <button onClick={handleRunCode} disabled={isRunningCode || isSubmittingCode} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                  <Play size={13} />
                  <span>{isRunningCode ? 'Running...' : 'Run'}</span>
                </button>
                <button onClick={handleSubmitCode} disabled={isRunningCode || isSubmittingCode} className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                  <Send size={13} />
                  <span>{isSubmittingCode ? 'Evaluating...' : 'Submit'}</span>
                </button>
                <button 
                  onClick={() => setShowEmbeddedEditor(false)} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  title="Close Code Editor"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Problem Description Drawer / Header */}
            {selectedQuestion && (
              <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {selectedQuestion.title}
                </div>
                <div style={{ color: 'var(--text-secondary)', maxHeight: '60px', overflowY: 'auto', lineHeight: 1.4 }}>
                  {selectedQuestion.problem_statement}
                </div>
              </div>
            )}

            {/* Embedded Monaco Editor */}
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

            {/* Execution Results & Mentor Integration Panel */}
            {executionResult && (
              <div style={{ 
                maxHeight: '190px', 
                overflowY: 'auto', 
                padding: '12px 14px', 
                background: '#1E1E1E', 
                color: '#E2E8F0',
                borderTop: '1px solid var(--border-light)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.78rem'
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

                  {/* Connect Execution to Mentor */}
                  <button 
                    onClick={handleConnectExecutionToMentor}
                    disabled={sending}
                    className="btn btn-sm"
                    style={{ 
                      background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', 
                      color: 'white', 
                      fontSize: '0.72rem',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    <Sparkles size={12} />
                    <span>Explain in Mentor</span>
                  </button>
                </div>

                {/* Error message or compilation error */}
                {executionResult.compilation_or_runtime_error && (
                  <pre style={{ color: '#F87171', whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                    {executionResult.compilation_or_runtime_error}
                  </pre>
                )}

                {/* Test case breakdown */}
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

      </div>

    </div>
  );
};

export default UnifiedMentor;
