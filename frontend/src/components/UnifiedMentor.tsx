import React, { useState, useEffect, useRef } from 'react';
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
  Compass
} from 'lucide-react';
import { 
  MentorChatMessage, 
  PreparationPlanResponse, 
  MilestoneItem 
} from '../types';
import { api } from '../services/api';

interface UnifiedMentorProps {
  onNavigateToCoding?: () => void;
  onNavigateToSetup?: () => void;
  onNavigateToRevisions?: () => void;
}

export const UnifiedMentor: React.FC<UnifiedMentorProps> = ({
  onNavigateToCoding,
  onNavigateToSetup,
  onNavigateToRevisions
}) => {
  const [messages, setMessages] = useState<MentorChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [currentMode, setCurrentMode] = useState<
    'mentor_chat' | 'project_defense' | 'concept_explanation' | 'coding_review' | 'knowledge_check'
  >('mentor_chat');

  // Plan context
  const [plan, setPlan] = useState<PreparationPlanResponse | null>(null);
  const [planExpanded, setPlanExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const modeOptions = [
    {
      id: 'mentor_chat' as const,
      label: 'Target Role Practice',
      description: 'Role-specific mock interview questions & guidance',
      icon: Target
    },
    {
      id: 'project_defense' as const,
      label: 'Defend My GitHub Project',
      description: 'Architectural trade-offs, scalability, and code defense',
      icon: Code2
    },
    {
      id: 'concept_explanation' as const,
      label: '5-Step Concept Explanation',
      description: 'Misconception → Analogy → Contrast → Retest check',
      icon: Lightbulb
    },
    {
      id: 'coding_review' as const,
      label: 'Coding Challenge & Review',
      description: 'Algorithm design, edge cases, and code walkthroughs',
      icon: Terminal
    },
    {
      id: 'knowledge_check' as const,
      label: 'Retest Misconceptions',
      description: 'Spaced recall checks on previous weak spots',
      icon: RotateCcw
    }
  ];

  // Load initial conversation and plan
  useEffect(() => {
    const initData = async () => {
      try {
        const [msgs, planData] = await Promise.all([
          api.getMentorMessages(),
          api.getCurrentPlan()
        ]);
        setMessages(msgs || []);
        setPlan(planData);
        if (planData && planData.knowledge_gaps && planData.knowledge_gaps.length > 0) {
          setSelectedTopic(planData.knowledge_gaps[0]);
        }
      } catch (err) {
        console.error('Error loading mentor initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    if (!textToSend) {
      setInputMessage('');
    }

    const snippetToSend = showCodeInput ? codeSnippet.trim() : undefined;
    if (showCodeInput) {
      setCodeSnippet('');
      setShowCodeInput(false);
    }

    // Optimistically add user turn
    const optimisticUserMsg: MentorChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'candidate',
      content: text + (snippetToSend ? `\n\n\`\`\`\n${snippetToSend}\n\`\`\`` : ''),
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

      // Replace optimistic message or append response
      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticUserMsg.id), optimisticUserMsg, mentorResp]);
    } catch (err: any) {
      console.error('Error sending message to mentor:', err);
      alert(`Could not deliver message to mentor: ${err.message || 'Network error'}`);
    } finally {
      setSending(false);
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)', gap: '16px' }}>
      
      {/* Mentor Header & Mode Switcher */}
      <div style={{ 
        background: 'var(--bg-surface)', 
        border: '1px solid var(--border-light)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '16px 20px', 
        boxShadow: 'var(--shadow-sm)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: 'var(--radius-md)', 
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  My Placement Mentor
                </h2>
                <span className="badge badge-verified">
                  Adaptive Pedagogy
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Target: <strong>{plan?.target_role || 'Software Development Engineer'}</strong>
                {plan?.target_company && <span> at <strong>{plan.target_company}</strong></span>}
                {plan?.target_deadline && <span> • Target Date: {plan.target_deadline}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {plan && (
              <button 
                onClick={() => setPlanExpanded(!planExpanded)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
              >
                <Layers size={14} />
                <span>{planExpanded ? 'Hide Preparation Plan' : 'View Preparation Plan'}</span>
                {planExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            {onNavigateToSetup && (
              <button 
                onClick={onNavigateToSetup}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
                title="Edit skills, upload resume or GitHub repository"
              >
                <span>Edit Setup</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Plan Drawer */}
        {plan && planExpanded && (
          <div style={{ 
            marginTop: '16px', 
            paddingTop: '16px', 
            borderTop: '1px solid var(--border-light)', 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px' 
          }}>
            <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} />
                <span>Readiness Diagnostic & Knowledge Gaps</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '10px' }}>
                {plan.readiness_diagnostic}
              </p>
              {plan.knowledge_gaps && plan.knowledge_gaps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {plan.knowledge_gaps.map((gap, i) => (
                    <span 
                      key={i} 
                      onClick={() => { setSelectedTopic(gap); setCurrentMode('concept_explanation'); }}
                      className="badge badge-candidate" 
                      style={{ cursor: 'pointer', fontSize: '0.75rem' }}
                      title="Click to focus mentor on this topic"
                    >
                      🎯 {gap}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="var(--success)" />
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
                      padding: '6px 8px', 
                      background: 'var(--bg-surface)', 
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem' 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={m.completed} 
                      onChange={() => handleToggleMilestone(m.milestone_id)}
                      style={{ marginTop: '3px', cursor: 'pointer' }}
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
          marginTop: '14px', 
          overflowX: 'auto', 
          paddingBottom: '4px' 
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
                  fontSize: '0.78rem', 
                  padding: '6px 14px',
                  whiteSpace: 'nowrap'
                }}
                title={opt.description}
              >
                <Icon size={14} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div style={{ 
        flex: 1, 
        background: 'var(--bg-surface)', 
        border: '1px solid var(--border-light)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '24px', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)', maxWidth: '400px' }}>
            <Sparkles size={32} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Your Placement Mentor is Ready
            </h3>
            <p style={{ fontSize: '0.85rem' }}>
              Ask a question, request a project architecture defense drill, or practice role-specific technical questions.
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
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  {isMentor ? (
                    <>
                      <Sparkles size={13} color="var(--accent-primary)" />
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
                    maxWidth: '85%',
                    padding: '16px 20px',
                    borderRadius: isMentor ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
                    background: isMentor ? 'var(--bg-main)' : 'var(--accent-primary)',
                    color: isMentor ? 'var(--text-primary)' : 'var(--text-inverse)',
                    border: isMentor ? '1px solid var(--border-light)' : 'none',
                    boxShadow: 'var(--shadow-sm)',
                    lineHeight: 1.6,
                    fontSize: '0.92rem'
                  }}
                >
                  {/* Step 1 / Misconception Alert if Present */}
                  {isMentor && msg.misconception_detected && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--error-bg)',
                      border: '1px solid var(--error-border)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '14px',
                      fontSize: '0.85rem',
                      color: 'var(--error)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                        <AlertCircle size={15} />
                        <span>Diagnosed Misconception:</span>
                      </div>
                      <div>{msg.misconception_detected}</div>
                    </div>
                  )}

                  {/* Step 2 / Affirmation if Present */}
                  {isMentor && msg.affirmation && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--success-bg)',
                      border: '1px solid var(--success-border)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '14px',
                      fontSize: '0.85rem',
                      color: 'var(--success)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                        <CheckCircle2 size={15} />
                        <span>Acknowledged Reasoning:</span>
                      </div>
                      <div>{msg.affirmation}</div>
                    </div>
                  )}

                  {/* Message Body with Markdown formatting support */}
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>

                  {/* Action Callouts */}
                  {isMentor && msg.action_type === 'offer_code' && onNavigateToCoding && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                      <button 
                        onClick={onNavigateToCoding}
                        className="btn btn-secondary btn-sm"
                        style={{ background: 'var(--bg-surface)' }}
                      >
                        <Code2 size={15} color="var(--accent-primary)" />
                        <span>Open Coding Sandbox for this problem</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}

                  {isMentor && msg.action_type === 'schedule_revision' && onNavigateToRevisions && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                      <button 
                        onClick={onNavigateToRevisions}
                        className="btn btn-secondary btn-sm"
                        style={{ background: 'var(--bg-surface)' }}
                      >
                        <Clock size={15} color="var(--warning)" />
                        <span>View in Spaced Revision Queue</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Suggested Action Chips (only on the last mentor turn) */}
                {isMentor && idx === messages.length - 1 && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px', maxWidth: '85%' }}>
                    {msg.suggested_actions.map((actionText, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSendMessage(actionText)}
                        disabled={sending}
                        className="btn btn-secondary btn-sm"
                        style={{ 
                          fontSize: '0.8rem', 
                          padding: '5px 12px', 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '10px 0' }}>
            <div style={{ width: '16px', height: '16px', border: '2px solid var(--accent-light)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Senior Mentor is formulating personalized feedback...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box & Code Snippet Toggle */}
      <div style={{ 
        background: 'var(--bg-surface)', 
        border: '1px solid var(--border-light)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {showCodeInput && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Attach Code Snippet (Python / SQL)
              </span>
              <button 
                onClick={() => setShowCodeInput(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste your code implementation or query here..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: '#1E1E1E',
                color: '#E5E7EB',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.85rem',
                resize: 'vertical'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`btn btn-sm ${showCodeInput ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                title="Attach or paste code to discuss"
              >
                <Code2 size={13} />
                <span>{showCodeInput ? 'Hide Code' : 'Attach Code'}</span>
              </button>

              {plan?.knowledge_gaps && plan.knowledge_gaps.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Topic Context:</span>
                  <select 
                    value={selectedTopic} 
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    style={{ 
                      padding: '2px 8px', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-light)', 
                      fontSize: '0.75rem',
                      background: 'var(--bg-surface)' 
                    }}
                  >
                    <option value="">General</option>
                    {plan.knowledge_gaps.map((gap, i) => (
                      <option key={i} value={gap}>{gap}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask your mentor about ${currentMode.replace('_', ' ')}... (Press Enter to send, Shift+Enter for new line)`}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-main)',
                fontSize: '0.9rem',
                color: 'var(--text-primary)',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={(!inputMessage.trim() && !codeSnippet.trim()) || sending}
            className="btn btn-primary"
            style={{ height: '48px', padding: '0 20px', borderRadius: 'var(--radius-md)' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
