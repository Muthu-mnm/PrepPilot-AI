import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  HelpCircle, 
  AlertCircle, 
  Code2, 
  Sparkles, 
  Clock, 
  Building2, 
  Layers, 
  ChevronRight, 
  ShieldCheck, 
  Target, 
  FileText, 
  RotateCcw, 
  ExternalLink 
} from 'lucide-react';
import { User, ProgressOverview, Company, PreparationPlanResponse, MilestoneItem } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  user: User | null;
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plan, setPlan] = useState<PreparationPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressData, companiesData, planData] = await Promise.all([
          api.getProgressOverview(),
          api.getCompanies(),
          api.getCurrentPlan()
        ]);
        setOverview(progressData);
        setCompanies(companiesData);
        setPlan(planData);
      } catch (e) {
        console.error('Error fetching dashboard data:', e);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Welcome & Next Action Hero Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Welcome back, {user ? user.full_name : 'Candidate'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            Target Track: <strong style={{ color: 'var(--accent-primary)' }}>{plan?.target_role || user?.target_role || 'Software Development Engineer'}</strong>
            {plan?.target_company && <span> • Target Company: <strong style={{ color: 'var(--text-primary)' }}>{plan.target_company}</strong></span>}
            {plan?.target_deadline && <span> • Target Date: <strong style={{ color: 'var(--text-primary)' }}>{plan.target_deadline}</strong></span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('mentor')} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.92rem' }}>
            <Sparkles size={18} />
            <span>Talk to My Mentor</span>
            <ArrowRight size={16} />
          </button>
          <button onClick={() => onNavigate('coding')} className="btn btn-secondary">
            <Code2 size={16} />
            <span>Open Coding Sandbox</span>
          </button>
          <button onClick={() => onNavigate('setup')} className="btn btn-secondary">
            <Target size={16} />
            <span>{plan ? 'Update Prep Setup' : 'Create Prep Setup'}</span>
          </button>
        </div>
      </div>

      {/* Transparent Integrity Notice */}
      <div className="notice-banner">
        <ShieldCheck size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Measurable Knowledge Principle:</strong> PrepPilot AI records verifiable, deterministic problem-solving attempts. We strictly distinguish independent successes from hint-assisted and solution-assisted attempts. PrepPilot AI does not predict selection probability or guarantee placements.
        </div>
      </div>

      {/* Hero Active Preparation Plan Section */}
      {plan ? (
        <div className="card" style={{ border: '1px solid var(--accent-border)', background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFF 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'var(--accent-light)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
                <Target size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Active Preparation Plan: {plan.target_role}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Milestone Progress: {completedMilestonesCount} of {totalMilestonesCount} completed ({milestoneProgressPct}%)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onNavigate('mentor')} className="btn btn-primary btn-sm">
                <Sparkles size={14} />
                <span>Continue with Mentor</span>
              </button>
              <button onClick={() => onNavigate('setup')} className="btn btn-secondary btn-sm">
                <span>View Full Plan</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '20px' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${milestoneProgressPct}%`, 
                background: 'linear-gradient(90deg, #4F46E5 0%, #10B981 100%)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>

          {/* 3-Column Plan Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '16px' }}>
            
            {/* Column 1: Diagnostic & Knowledge Gaps */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} />
                <span>Readiness Diagnostic</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '12px' }}>
                {plan.readiness_diagnostic}
              </p>

              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Diagnosed Knowledge Gaps:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {plan.knowledge_gaps && plan.knowledge_gaps.map((gap, i) => (
                  <span 
                    key={i} 
                    onClick={() => onNavigate('mentor')}
                    className="badge badge-candidate" 
                    style={{ cursor: 'pointer', fontSize: '0.75rem' }}
                    title="Click to discuss with mentor"
                  >
                    🎯 {gap}
                  </span>
                ))}
              </div>
            </div>

            {/* Column 2: Milestones Checklist */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', maxHeight: '220px', overflowY: 'auto' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} color="var(--success)" />
                <span>Plan Milestones</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {plan.milestones.map((m) => (
                  <div 
                    key={m.milestone_id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '8px', 
                      padding: '8px 10px', 
                      background: 'var(--bg-surface)', 
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
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
                      <strong>{m.title}</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {m.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Project Defense Readiness */}
            <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code2 size={16} color="var(--accent-primary)" />
                <span>Project Defense Drill</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Sample defense question generated from your project repositories:
              </p>
              {plan.project_defense_questions && plan.project_defense_questions.length > 0 ? (
                <div style={{ 
                  padding: '10px 12px', 
                  background: 'var(--bg-surface)', 
                  border: '1px dashed var(--accent-border)', 
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontStyle: 'italic',
                  color: 'var(--text-primary)',
                  marginBottom: '10px'
                }}>
                  "{plan.project_defense_questions[0]}"
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Add a GitHub repo in Setup to generate custom architectural defense drills.
                </div>
              )}
              <button 
                onClick={() => onNavigate('mentor')} 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', fontSize: '0.78rem' }}
              >
                <span>Defend Architecture in Mentor</span>
                <ChevronRight size={14} />
              </button>
            </div>

          </div>
        </div>
      ) : (
        /* Setup Invitation Card if No Plan Exists */
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)', 
          border: '1px solid var(--accent-border)',
          padding: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ maxWidth: '650px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                <Target size={18} />
                <span>Personalized Setup Needed</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Build Your Evidence-Backed Placement Preparation Plan
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Upload your resume, connect your GitHub repositories, and enter target roles to receive a tailored readiness diagnostic, project defense questions, and structured milestones.
              </p>
            </div>
            <button 
              onClick={() => onNavigate('setup')} 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Target size={18} />
              <span>Configure Preparation Setup</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 4 Stat Metric Cards */}
      <div className="grid-4">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ marginBottom: 0 }}>Questions Attempted</span>
            <div style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '12px' }}>
            {overview?.total_questions_attempted || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Total verifiable interview turns
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ marginBottom: 0 }}>Independent Successes</span>
            <div style={{ padding: '8px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', color: 'var(--success)' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginTop: '12px' }}>
            {overview?.independent_successes || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Solved with zero hints or reveals
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ marginBottom: 0 }}>Coding Test Pass Rate</span>
            <div style={{ padding: '8px', background: 'var(--accent-light)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
              <Code2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '12px' }}>
            {overview?.coding_pass_rate_percentage || 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {overview?.coding_tests_passed || 0} / {overview?.coding_tests_total || 0} deterministic sandbox runs passed
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ marginBottom: 0 }}>Pending Revisions</span>
            <div style={{ padding: '8px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '12px' }}>
            {overview?.pending_revisions_count || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Spaced retention tasks due
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Topic Mastery & Company Research as Supporting Context */}
      <div className="grid-2">
        {/* Topic Strengths & Mastery */}
        <div className="card">
          <div className="card-title">
            <Layers size={20} color="var(--accent-primary)" />
            <span>Topic-Level Mastery Breakdown</span>
          </div>
          <p className="card-subtitle">
            Measured by the ratio of independent successes to total attempts.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {overview?.topics_breakdown && overview.topics_breakdown.length > 0 ? (
              overview.topics_breakdown.map((t) => (
                <div key={t.topic} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.topic}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {t.independent_success_count} indep. / {t.attempts_count} attempts ({t.mastery_percentage}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.min(100, Math.max(5, t.mastery_percentage))}%`,
                        background: t.mastery_percentage >= 70 ? 'var(--success)' : t.mastery_percentage >= 40 ? 'var(--accent-primary)' : 'var(--warning)',
                        borderRadius: 'var(--radius-full)'
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Start a session with your mentor or solve a challenge in the coding sandbox to calibrate your topic mastery!
              </div>
            )}
          </div>
        </div>

        {/* Company Evidence Overview (Demoted to supporting context) */}
        <div className="card">
          <div className="card-title">
            <Building2 size={20} color="var(--accent-primary)" />
            <span>Company Recruitment Evidence & Sources</span>
          </div>
          <p className="card-subtitle">
            Traceable recruitment patterns, reported rounds, and candidate experiences for contextual prep.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {companies.slice(0, 3).map((comp) => (
              <div 
                key={comp.id} 
                onClick={() => onNavigate('companies')}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 14px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                className="company-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--bg-subtle)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    color: 'var(--accent-primary)' 
                  }}>
                    {comp.logo_letter}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{comp.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {comp.roles.length} roles • {comp.reported_rounds.length} reported rounds
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-verified">
                    {comp.source_count} Verified Sources
                  </span>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => onNavigate('companies')} 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '16px' }}
          >
            <span>Explore Company Evidence</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
