import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  Compass, 
  Clock, 
  Layers, 
  ChevronRight, 
  ShieldCheck, 
  Target, 
  Code2, 
  Calendar,
  CheckCircle2,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import { User, ProgressOverview, PreparationPlanResponse, MilestoneItem } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  user: User | null;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [plan, setPlan] = useState<PreparationPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressData, planData] = await Promise.all([
          api.getProgressOverview().catch(() => null),
          api.getCurrentPlan().catch(() => null)
        ]);
        setOverview(progressData);
        setPlan(planData);
      } catch (e) {
        console.error('Error fetching home data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  // Helper to format milestone titles cleanly without duplicates
  const formatMilestoneTitle = (title: string, index: number) => {
    if (!title) return `Milestone ${index + 1}`;
    const cleaned = title.replace(/^milestone\s*\d+\s*[:\-]\s*/i, '').trim();
    return `Milestone ${index + 1}: ${cleaned}`;
  };

  const completedMilestonesCount = plan ? plan.milestones.filter(m => m.completed).length : 0;
  const totalMilestonesCount = plan ? plan.milestones.length : 0;
  const milestoneProgressPct = totalMilestonesCount > 0 ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) : 0;

  // Next recommended action calculation
  const nextIncompleteMilestone = plan ? plan.milestones.find(m => !m.completed) : null;
  const nextActionTitle = nextIncompleteMilestone 
    ? formatMilestoneTitle(nextIncompleteMilestone.title, plan ? plan.milestones.indexOf(nextIncompleteMilestone) : 0)
    : plan 
      ? 'Mock Interview & Project Defense'
      : 'Set Up Preparation Profile';

  const nextActionDescription = nextIncompleteMilestone
    ? nextIncompleteMilestone.description
    : plan
      ? 'All initial milestones completed. Practice full-length technical rounds with My Mentor.'
      : 'Upload your resume and target role to generate a customized placement plan.';

  // Format upcoming interview date & remaining days
  const calculateDaysRemaining = (deadlineStr?: string) => {
    if (!deadlineStr) return null;
    try {
      const targetDate = new Date(deadlineStr);
      const today = new Date();
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const daysRemaining = calculateDaysRemaining(plan?.target_deadline);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Hero: Welcome & Next Recommended Action Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        color: 'white',
        boxShadow: '0 6px 20px rgba(49, 46, 129, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ 
                background: 'rgba(255,255,255,0.18)', 
                backdropFilter: 'blur(8px)',
                padding: '3px 8px', 
                borderRadius: 'var(--radius-full)', 
                fontSize: '0.72rem', 
                fontWeight: 700, 
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>
                🎯 Next Action
              </span>
              {daysRemaining !== null && (
                <span style={{ 
                  background: daysRemaining > 14 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '3px 8px', 
                  borderRadius: 'var(--radius-full)', 
                  fontSize: '0.72rem', 
                  fontWeight: 600 
                }}>
                  📅 {plan?.target_deadline} ({daysRemaining > 0 ? `${daysRemaining}d left` : 'Today'})
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '6px 0', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              {nextActionTitle}
            </h1>

            <p style={{ fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.5, margin: '6px 0 16px 0' }}>
              {nextActionDescription}
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => onNavigate('mentor')} 
                className="btn btn-primary" 
                style={{ 
                  background: 'white', 
                  color: '#312E81', 
                  fontWeight: 700, 
                  border: 'none',
                  padding: '9px 18px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '0.84rem'
                }}
              >
                <Compass size={16} color="#4338CA" />
                <span>Continue with My Mentor</span>
                <ArrowRight size={15} color="#4338CA" />
              </button>

              <button 
                onClick={() => onNavigate('profile')} 
                className="btn btn-secondary"
                style={{ 
                  background: 'rgba(255,255,255,0.12)', 
                  borderColor: 'rgba(255,255,255,0.25)', 
                  color: 'white',
                  fontSize: '0.84rem',
                  padding: '9px 16px'
                }}
              >
                <Target size={15} />
                <span>{plan ? 'Edit Plan' : 'Set Up Profile'}</span>
              </button>
            </div>
          </div>

          {/* Quick Context Pill */}
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 'var(--radius-md)', 
            padding: '14px 18px',
            minWidth: '200px'
          }}>
            <div style={{ fontSize: '0.72rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>
              Active Track
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, marginTop: '2px' }}>
              {plan?.target_role || user?.target_role || 'AI & Full Stack Engineer'}
            </div>
            {plan?.target_company && (
              <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '1px' }}>
                at <strong>{plan.target_company}</strong>
              </div>
            )}
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span>Milestone Progress</span>
                <strong>{milestoneProgressPct}%</strong>
              </div>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${milestoneProgressPct}%`, background: '#34D399', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Preparation Plan & Recent Verifiable Learning */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
        
        {/* Left Column: Current Preparation Plan */}
        {plan ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Current Preparation Plan
                </h2>
              </div>
              <button onClick={() => onNavigate('profile')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                <span>Edit Plan</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Diagnostic Snippet */}
            <div style={{ 
              padding: '14px 16px', 
              background: 'var(--bg-main)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-light)',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} />
                <span>Readiness Diagnostic</span>
              </div>
              <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {plan.readiness_diagnostic}
              </div>

              {plan.knowledge_gaps && plan.knowledge_gaps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {plan.knowledge_gaps.map((gap, i) => (
                    <span 
                      key={i} 
                      onClick={() => onNavigate('mentor')}
                      className="badge badge-candidate" 
                      style={{ cursor: 'pointer', fontSize: '0.74rem' }}
                      title="Click to practice this topic with mentor"
                    >
                      🎯 {gap}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Milestone Checklist */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Plan Milestones ({completedMilestonesCount}/{totalMilestonesCount} Completed)
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Click to check off
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.milestones.map((m, idx) => (
                  <div 
                    key={m.milestone_id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '10px', 
                      padding: '10px 12px', 
                      background: m.completed ? 'var(--bg-main)' : 'var(--bg-surface)', 
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${m.completed ? 'var(--success-border)' : 'var(--border-light)'}`,
                      fontSize: '0.84rem' 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={m.completed} 
                      onChange={() => handleToggleMilestone(m.milestone_id)}
                      style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <div style={{ flex: 1, textDecoration: m.completed ? 'line-through' : 'none', color: m.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      <strong>{formatMilestoneTitle(m.title, idx)}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {m.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Defense Drill preview */}
            {plan.project_defense_questions && plan.project_defense_questions.length > 0 && (
              <div style={{ padding: '10px 12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--accent-primary)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code2 size={14} />
                  <span>Next Project Defense Drill:</span>
                </div>
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                  "{plan.project_defense_questions[0]}"
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
            <Target size={36} color="var(--accent-primary)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Create Your Preparation Plan</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '8px auto 16px auto' }}>
              Upload your resume and enter your target role in the Preparation Profile to generate customized milestones.
            </p>
            <button onClick={() => onNavigate('profile')} className="btn btn-primary btn-sm">
              <span>Go to Preparation Profile</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Right Column: Quick Practice Launchpad */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              Quick Practice Launchpad
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Quick action 1: Coding */}
            <div 
              onClick={() => onNavigate('mentor')}
              style={{ 
                padding: '10px 12px', 
                background: 'var(--bg-main)', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-light)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              className="quick-launch-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={16} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>Coding Sandbox (SQL & Python)</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Live in-memory SQLite and Python runners</div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </div>

            {/* Quick action 2: Project Defense */}
            <div 
              onClick={() => onNavigate('mentor')}
              style={{ 
                padding: '10px 12px', 
                background: 'var(--bg-main)', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-light)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              className="quick-launch-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="#059669" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>GitHub Project Defense</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Architectural drills on your ingested repos</div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </div>

            {/* Quick action 3: Concept calibration */}
            <div 
              onClick={() => onNavigate('mentor')}
              style={{ 
                padding: '10px 12px', 
                background: 'var(--bg-main)', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-light)', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              className="quick-launch-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="#D97706" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>Concept & Misconception Review</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Targeted analogies and progressive hints</div>
                </div>
              </div>
              <ChevronRight size={15} color="var(--text-muted)" />
            </div>
          </div>

          <button 
            onClick={() => onNavigate('mentor')} 
            className="btn btn-primary btn-sm"
            style={{ width: '100%', marginTop: 'auto', padding: '9px 14px' }}
          >
            <Compass size={14} />
            <span>Open My Mentor Room</span>
          </button>
        </div>

      </div>

      {/* Concise Progress Summary (No duplicate analytics cards or prediction metrics) */}
      <div className="grid-3">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ margin: 0 }}>Questions Attempted</span>
            <div style={{ padding: '6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <Layers size={16} color="var(--text-secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '10px' }}>
            {overview?.total_questions_attempted || 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Verifiable technical turns completed
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ margin: 0 }}>Coding Sandbox Tests Passed</span>
            <div style={{ padding: '6px', background: 'var(--accent-light)', borderRadius: 'var(--radius-md)' }}>
              <Code2 size={16} color="var(--accent-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '10px' }}>
            {overview?.coding_tests_passed || 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Deterministic runs passed in Python/SQL runner
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ margin: 0 }}>Retention Reviews Due</span>
            <div style={{ padding: '6px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)' }}>
              <RotateCcw size={16} color="var(--warning)" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--warning)', marginTop: '10px' }}>
            {overview?.pending_revisions_count || 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Scheduled spaced retention recall tasks
          </p>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
