import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  ShieldCheck, 
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  Code2,
  Sparkles,
  RotateCcw,
  Check
} from 'lucide-react';
import { ProgressOverview, RevisionTaskItem } from '../types';
import { api } from '../services/api';

interface ProgressDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ onNavigate }) => {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [revisions, setRevisions] = useState<RevisionTaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressData, revData] = await Promise.all([
          api.getProgressOverview().catch(() => null),
          api.getRevisionQueue().catch(() => [])
        ]);
        setOverview(progressData);
        setRevisions(revData || []);
      } catch (err) {
        console.error('Error fetching progress analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCompleteRevision = async (taskId: string) => {
    try {
      await api.completeRevisionTask(taskId);
      setRevisions((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(`Error completing revision: ${err.message}`);
    }
  };

  const handleRetestWithMentor = (topic: string) => {
    if (onNavigate) {
      onNavigate('mentor');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '16px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-light)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>Loading observable learning analytics...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            My Progress & Learning Analytics
          </h1>
          <span className="badge badge-verified">
            Deterministic Tracking
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Observable performance tracking without fabricated placement probabilities or guarantees.
        </p>
      </div>

      {/* Strict Ethical Integrity Notice Banner */}
      <div className="notice-banner">
        <ShieldCheck size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div>
          {overview?.notice || 'Metrics represent verifiable attempt counts and rubric results. PrepPilot AI does not predict selection probability or guarantee placements.'}
        </div>
      </div>

      {/* Primary Metrics: Independent vs Assisted Attempts + Coding Sandbox Results */}
      <div className="grid-4">
        {/* Independent Attempts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ margin: 0 }}>Independent Attempts</span>
            <div style={{ padding: '6px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={16} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginTop: '8px' }}>
            {overview?.independent_successes || 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Solved with zero hints or reveals
          </p>
        </div>

        {/* Hint-Assisted Attempts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ margin: 0 }}>Hint-Assisted Attempts</span>
            <div style={{ padding: '6px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)' }}>
              <HelpCircle size={16} color="var(--warning)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '8px' }}>
            {overview?.hint_assisted_attempts || 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Solved after directional nudges
          </p>
        </div>

        {/* Solution-Assisted Attempts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ margin: 0 }}>Solution-Assisted Attempts</span>
            <div style={{ padding: '6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <Layers size={16} color="var(--text-secondary)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '8px' }}>
            {overview?.solution_assisted_attempts || 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Solved after reviewing walk-throughs
          </p>
        </div>

        {/* Coding Pass Rate */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-subtitle" style={{ margin: 0 }}>Coding Test Pass Rate</span>
            <div style={{ padding: '6px', background: 'var(--accent-light)', borderRadius: 'var(--radius-md)' }}>
              <Code2 size={16} color="var(--accent-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '8px' }}>
            {overview?.coding_pass_rate_percentage || 0}%
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            {overview?.coding_tests_passed || 0} of {overview?.coding_tests_total || 0} sandbox runs passed
          </p>
        </div>
      </div>

      {/* Spaced Retention Queue & Diagnosed Misconceptions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={18} color="var(--warning)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Scheduled Spaced Retention Tasks & Diagnosed Misconceptions
            </h3>
          </div>
          <span className="badge badge-candidate">
            {revisions.length} Active Retention Items
          </span>
        </div>

        <p className="card-subtitle" style={{ marginBottom: '16px' }}>
          Questions and topics where misconceptions were identified during previous mentor sessions, scheduled for spaced retrieval.
        </p>

        {revisions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {revisions.map((rev) => (
              <div 
                key={rev.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-light)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {rev.question_title}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--error)', marginTop: '3px' }}>
                    <strong>Misconception:</strong> {rev.misconception_addressed}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Topic: <strong>{rev.topic}</strong></span>
                    <span>•</span>
                    <span>Due: {rev.due_date} {rev.days_overdue > 0 && <span style={{ color: 'var(--warning)', fontWeight: 600 }}>({rev.days_overdue} days overdue)</span>}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    onClick={() => handleRetestWithMentor(rev.topic)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <Sparkles size={13} />
                    <span>Retest with Mentor</span>
                  </button>

                  <button 
                    onClick={() => handleCompleteRevision(rev.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                    title="Mark this retention item as mastered"
                  >
                    <CheckCircle2 size={14} color="var(--success)" />
                    <span>Mark Mastered</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
            🎉 <strong>Zero pending retention items!</strong> All diagnosed misconceptions have been verified or completed. Continue practicing in My Mentor to calibrate new areas.
          </div>
        )}
      </div>

      {/* Detailed Measured Topic Mastery Breakdown Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Layers size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
            Measured Topic Breakdown
          </h3>
        </div>

        <p className="card-subtitle" style={{ marginBottom: '16px' }}>
          Verifiable rubric measurements per topic, calculated as (Independent Successes / Total Attempts).
        </p>

        {overview?.topics_breakdown && overview.topics_breakdown.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px' }}>Topic</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Total Attempts</th>
                  <th style={{ padding: '10px 12px' }}>Independent Successes</th>
                  <th style={{ padding: '10px 12px' }}>Mastery Rate</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.topics_breakdown.map((t) => (
                  <tr key={t.topic} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {t.topic}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {t.category}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {t.attempts_count}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--success)', fontWeight: 600 }}>
                      {t.independent_success_count}
                    </td>
                    <td style={{ padding: '12px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${Math.min(100, Math.max(5, t.mastery_percentage))}%`,
                              background: t.mastery_percentage >= 70 ? 'var(--success)' : t.mastery_percentage >= 40 ? 'var(--accent-primary)' : 'var(--warning)',
                              borderRadius: '4px'
                            }} 
                          />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem', minWidth: '35px' }}>
                          {t.mastery_percentage}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${t.mastery_percentage >= 70 ? 'badge-verified' : t.mastery_percentage >= 40 ? 'badge-official' : 'badge-candidate'}`} style={{ fontSize: '0.72rem' }}>
                        {t.mastery_percentage >= 70 ? 'Calibrated' : t.mastery_percentage >= 40 ? 'Developing' : 'Needs Practice'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            No calibrated attempts yet. Practice with My Mentor or run a sandbox challenge to populate your topic mastery metrics!
          </div>
        )}
      </div>

    </div>
  );
};

export default ProgressDashboard;
