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
  ArrowRight
} from 'lucide-react';
import { ProgressOverview, RevisionTaskItem } from '../types';
import { api } from '../services/api';

export const ProgressDashboard: React.FC = () => {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [revisions, setRevisions] = useState<RevisionTaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressData, revData] = await Promise.all([
          api.getProgressOverview(),
          api.getRevisionQueue()
        ]);
        setOverview(progressData);
        setRevisions(revData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
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

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading learning analytics...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Learning Analytics & Spaced Revision
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Observable performance tracking without unverified placement probabilities.
        </p>
      </div>

      <div className="notice-banner">
        <ShieldCheck size={20} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
        <div>
          {overview?.notice || 'Metrics represent verifiable attempt counts and rubric results. PrepPilot AI does not predict selection probability or guarantee placements.'}
        </div>
      </div>

      {/* Breakdown: Independent vs Assisted */}
      <div className="grid-3">
        <div className="card">
          <span className="card-subtitle">Independent Attempts</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
            {overview?.independent_successes || 0}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Solved independently with zero hints or reveals.
          </p>
        </div>

        <div className="card">
          <span className="card-subtitle">Hint-Assisted Attempts</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>
            {overview?.hint_assisted_attempts || 0}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Solved after receiving progressive directional nudges.
          </p>
        </div>

        <div className="card">
          <span className="card-subtitle">Solution-Assisted Attempts</span>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
            {overview?.solution_assisted_attempts || 0}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Solved after reviewing mentor walk-throughs.
          </p>
        </div>
      </div>

      {/* Spaced Revision Queue */}
      <div className="card">
        <div className="card-title">
          <Clock size={20} color="var(--warning)" />
          <span>Scheduled Spaced Retention Tasks</span>
        </div>
        <p className="card-subtitle">
          Questions and topics where misconceptions were identified during previous mock sessions.
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
                  border: '1px solid var(--border-light)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{rev.question_title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--error)', marginTop: '2px' }}>
                    Misconception: {rev.misconception_addressed}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Due: {rev.due_date} {rev.days_overdue > 0 && `(${rev.days_overdue} days overdue)`}
                  </div>
                </div>

                <button 
                  onClick={() => handleCompleteRevision(rev.id)}
                  className="btn btn-secondary btn-sm"
                >
                  <CheckCircle2 size={15} color="var(--success)" />
                  <span>Mark Reviewed</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            🎉 No pending revision tasks due today! Keep practicing in the Interview Room to uncover new growth areas.
          </div>
        )}
      </div>

      {/* Detailed Topic Mastery Table */}
      <div className="card">
        <div className="card-title">
          <Layers size={20} color="var(--accent-primary)" />
          <span>Measured Topic Breakdown</span>
        </div>
        <div style={{ overflowX: 'auto', marginTop: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>Topic</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Total Attempts</th>
                <th style={{ padding: '10px 12px' }}>Independent Success</th>
                <th style={{ padding: '10px 12px' }}>Assisted / Review</th>
                <th style={{ padding: '10px 12px' }}>Calculated Mastery</th>
              </tr>
            </thead>
            <tbody>
              {overview?.topics_breakdown && overview.topics_breakdown.length > 0 ? (
                overview.topics_breakdown.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{t.topic}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{t.category}</td>
                    <td style={{ padding: '12px' }}>{t.attempts_count}</td>
                    <td style={{ padding: '12px', color: 'var(--success)', fontWeight: 600 }}>{t.independent_success_count}</td>
                    <td style={{ padding: '12px', color: 'var(--warning)' }}>{t.assisted_count}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${t.mastery_percentage >= 70 ? 'badge-verified' : 'badge-candidate'}`}>
                        {t.mastery_percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No topic activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
