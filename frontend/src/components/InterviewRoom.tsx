import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Lightbulb, 
  GraduationCap, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { InterviewSession, Turn } from '../types';
import { api } from '../services/api';

interface InterviewRoomProps {
  initialCompanyId?: string;
  initialRole?: string;
  initialTrack?: string;
  onFinish?: () => void;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  initialCompanyId,
  initialRole = 'Software Development Engineer',
  initialTrack = 'technical_interview',
  onFinish
}) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const historyBottomRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch active session
  useEffect(() => {
    const initSession = async () => {
      try {
        const newSession = await api.createSession({
          company_id: initialCompanyId,
          role: initialRole,
          track: initialTrack,
          initial_difficulty: 'medium'
        });
        setSession(newSession);
      } catch (err: any) {
        console.error('Error creating interview session:', err);
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [initialCompanyId, initialRole, initialTrack]);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new turns
  useEffect(() => {
    historyBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.turns]);

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim() || !session || isSubmitting) return;
    const text = answerInput.trim();
    setAnswerInput('');
    setIsSubmitting(true);

    try {
      const updated = await api.submitAnswer(session.id, text);
      setSession(updated);
    } catch (err: any) {
      alert(`Error submitting answer: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    if (!session || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated = await api.requestHint(session.id, 1);
      setSession(updated);
    } catch (err: any) {
      alert(`Error requesting hint: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchMode = async (mode: 'interviewer' | 'mentor') => {
    if (!session || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated = await api.switchMode(session.id, mode);
      setSession(updated);
    } catch (err: any) {
      alert(`Error switching mode: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Preparing interview session...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Top Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Technical Interview Session</h2>
            <span className={`badge ${session?.current_mode === 'mentor' ? 'badge-candidate' : 'badge-official'}`}>
              {session?.current_mode === 'mentor' ? 'Mentor Mode' : 'Technical Interviewer'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Track: {session?.track} • Question #{Number(session?.current_question_index || 0) + 1} of {session?.total_questions || 3}
          </div>
        </div>

        {/* Action Controls & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
            <Clock size={15} color="var(--accent-primary)" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          <button onClick={handleRequestHint} disabled={isSubmitting} className="btn btn-secondary btn-sm" title="Request subtle hint">
            <Lightbulb size={15} color="var(--warning)" />
            <span>Hint</span>
          </button>

          {session?.current_mode === 'interviewer' ? (
            <button onClick={() => handleSwitchMode('mentor')} disabled={isSubmitting} className="btn btn-outline btn-sm">
              <GraduationCap size={15} />
              <span>Switch to Mentor</span>
            </button>
          ) : (
            <button onClick={() => handleSwitchMode('interviewer')} disabled={isSubmitting} className="btn btn-outline btn-sm">
              <MessageSquare size={15} />
              <span>Back to Interview</span>
            </button>
          )}

          {session?.status === 'completed' && onFinish && (
            <button onClick={onFinish} className="btn btn-success btn-sm">
              <span>View Session Report</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Conversation Container */}
      <div className="chat-container">
        <div className="chat-history">
          {session?.turns.map((turn: Turn) => {
            const isInterviewer = turn.role === 'interviewer';
            const isCandidate = turn.role === 'candidate';
            const isMentor = turn.role === 'mentor';

            return (
              <div 
                key={turn.id} 
                className={`message-bubble ${isCandidate ? 'message-candidate' : isMentor ? 'message-mentor' : 'message-interviewer'}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>
                  {isCandidate ? 'Candidate (You)' : isMentor ? 'Senior Mentor' : 'Interviewer'}
                </div>

                <div style={{ whiteSpace: 'pre-line', fontSize: '0.92rem' }}>
                  {turn.content}
                </div>

                {/* Rubric Evaluation Breakdown if available on candidate turn */}
                {turn.evaluation && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span className="badge badge-candidate" style={{ color: '#172033', background: 'white' }}>
                        Correctness: {turn.evaluation.correctness}
                      </span>
                      <span className="badge badge-official" style={{ color: '#172033', background: 'white' }}>
                        Assistance: {turn.evaluation.assistance_level}
                      </span>
                    </div>

                    {turn.evaluation.concepts_demonstrated.length > 0 && (
                      <div style={{ marginTop: '4px', opacity: 0.9 }}>
                        ✓ Demonstrated: {turn.evaluation.concepts_demonstrated.join(', ')}
                      </div>
                    )}

                    {turn.evaluation.missing_concepts.length > 0 && (
                      <div style={{ marginTop: '2px', opacity: 0.9 }}>
                        ⚠️ Missing: {turn.evaluation.missing_concepts.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={historyBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <textarea
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitAnswer();
              }
            }}
            placeholder="Type your technical response here (Shift+Enter for newline)..."
            className="form-control"
            style={{ resize: 'none', height: '60px', flex: 1 }}
            disabled={isSubmitting || session?.status === 'completed'}
          />
          <button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || !answerInput.trim() || session?.status === 'completed'}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-end', height: '48px', padding: '0 20px' }}
          >
            <Send size={16} />
            <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
