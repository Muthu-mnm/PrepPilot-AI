import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  Sparkles, 
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

  const completedMilestonesCount = plan ? plan.milestones.filter(m => m.completed).length : 0;
  const totalMilestonesCount = plan ? plan.milestones.length : 0;
  const milestoneProgressPct = totalMilestonesCount > 0 ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) : 0;

  // Next recommended action calculation
  const nextIncompleteMilestone = plan ? plan.milestones.find(m => !m.completed) : null;
  const nextActionTitle = nextIncompleteMilestone 
    ? `Milestone ${plan?.milestones.indexOf(nextIncompleteMilestone)! + 1}: ${nextIncompleteMilestone.title}`
    : plan 
      ? 'Comprehensive Mock Interview & Project Defense'
      : 'Configure Your Preparation Profile';

  const nextActionDescription = nextIncompleteMilestone
    ? nextIncompleteMilestone.description
    : plan
      ? 'All initial milestones completed. Practice full-length technical rounds and architectural defense with My Mentor.'
      : 'Upload your resume and enter your target role to generate a personalized placement plan.';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Hero: Welcome & Next Recommended Action Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        color: 'white',
        boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ 
                background: 'rgba(255,255,255,0.18)', 
                backdropFilter: 'blur(8px)',
                padding: '4px 10px', 
                borderRadius: 'var(--radius-full)', 
                fontSize: '0.78rem', 
                fontWeight: 700, 
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                🎯 Next Recommended Action
              </span>
              {daysRemaining !== null && (
                <span style={{ 
                  background: daysRemaining > 14 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '4px 10px', 
                  borderRadius: 'var(--radius-full)', 
                  fontSize: '0.78rem', 
                  fontWeight: 600 
                }}>
                  📅 Interview: {plan?.target_deadline} ({daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Today'})
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '8px 0', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              {nextActionTitle}
            </h1>

            <p style={{ fontSize: '0.92rem', opacity: 0.9, lineHeight: 1.6, margin: '8px 0 20px 0' }}>
              {nextActionDescription}
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => onNavigate('mentor')} 
                className="btn btn-primary" 
                style={{ 
                  background: 'white', 
                  color: '#312E81', 
                  fontWeight: 700, 
                  border: 'none',
                  padding: '11px 22px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <Sparkles size={18} color="#4338CA" />
                <span>Continue with My Mentor</span>
                <ArrowRight size={16} color="#4338CA" />
              </button>

              <button 
                onClick={() => onNavigate('profile')} 
                className="btn btn-secondary"
                style={{ 
                  background: 'rgba(255,255,255,0.12)', 
                  borderColor: 'rgba(255,255,255,0.25)', 
                  color: 'white' 
                }}
              >
                <Target size={16} />
                <span>{plan ? 'View / Edit Preparation Plan' : 'Set Up Profile'}</span>
              </button>
            </div>
          </div>

          {/* Quick Context Pill */}
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 'var(--radius-md)', 
            padding: '16px 20px',
            minWidth: '220px'
          }}>
            <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>
              Active Track
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '4px' }}>
              {plan?.target_role || user?.target_role || 'AI & Full Stack Engineer'}
            </div>
            {plan?.target_company && (
              <div style={{ fontSize: '0.84rem', opacity: 0.9, marginTop: '2px' }}>
                at <strong>{plan.target_company}</strong>
              </div>
            )}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                <span>Milestone Completion</span>
                <strong>{milestoneProgressPct}%</strong>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${milestoneProgressPct}%`, background: '#34D399', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integrity Notice Banner */}
      <div className="notice-banner">
        <ShieldCheck size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Measurable Knowledge Principle:</strong> PrepPilot AI records verifiable, deterministic attempts. We distinguish independent successes from hint-assisted and solution-assisted practice. PrepPilot AI does not predict selection probability or guarantee placements.
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
                {plan.milestones.map((m) => (
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
                      <strong>{m.title}</strong>
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
              <div style={{ padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Code2 size={15} />
                  <span>Next Project Defense Drill:</span>
                </div>
                <div style={{ fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
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

        {/* Right Column: Recent Learning Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              Recent Learning & Verifiable Actions
            </h3>
          </div>

          <p className="card-subtitle" style={{ margin: 0 }}>
            Traceable problem-solving events and mentor interactions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Event 1 */}
            <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  SQL Coding Sandbox Execution
                </span>
                <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}>
                  Passed (100%)
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                Solved "Customers with No Orders" (SQLite in-memory engine).
              </div>
            </div>

            {/* Event 2 */}
            <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  GitHub Architecture Defense
                </span>
                <span className="badge badge-candidate" style={{ fontSize: '0.68rem' }}>
                  Brain-Tumor-Segmentation
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                Defended model inference pipeline latency and memory constraints.
              </div>
            </div>

            {/* Event 3 */}
            <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  5-Step Concept Explanation
                </span>
                <span className="badge badge-official" style={{ fontSize: '0.68rem' }}>
                  Misconception Calibrated
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                Reviewed SQL Joins & Unmatched NULLs with Senior Mentor.
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigate('mentor')} 
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: 'auto' }}
          >
            <Sparkles size={14} />
            <span>Launch Practice Session with Mentor</span>
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
