import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Briefcase, 
  Layers,
  FileText
} from 'lucide-react';
import { Company, SourceEvidence } from '../types';
import { api } from '../services/api';

interface CompanyExplorerProps {
  onStartInterview: (companyId: string, roleTitle: string, track: string) => void;
}

export const CompanyExplorer: React.FC<CompanyExplorerProps> = ({ onStartInterview }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const list = await api.getCompanies();
        setCompanies(list);
        if (list.length > 0) {
          const detail = await api.getCompanyDetail(list[0].id);
          setSelectedCompany(detail);
        }
      } catch (err) {
        console.error('Error loading companies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const handleSelectCompany = async (companyId: string) => {
    try {
      const detail = await api.getCompanyDetail(companyId);
      setSelectedCompany(detail);
    } catch (err) {
      console.error('Error fetching company detail:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading company intelligence & evidence...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Company Recruitment Intelligence & Evidence
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Source-backed interview tracks, reported rounds, and verified candidate experiences.
        </p>
      </div>

      {/* Grid: Companies List on left, Company Evidence Detail on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Column: Companies Selection List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {companies.map((comp) => {
            const isSelected = selectedCompany?.id === comp.id;
            return (
              <div
                key={comp.id}
                onClick={() => handleSelectCompany(comp.id)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: isSelected ? 'var(--accent-light)' : 'var(--bg-surface)',
                  border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border-light)'}`,
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                    color: isSelected ? 'white' : 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem'
                  }}>
                    {comp.logo_letter}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {comp.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {comp.industry}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <span className="badge badge-verified">
                    {comp.source_count} Verified Sources
                  </span>
                  <span className="badge badge-candidate">
                    {comp.reported_rounds.length} Rounds
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Company Details */}
        {selectedCompany && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Card */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedCompany.name}</h2>
                    <span className="badge badge-official">Curated Placement Profile</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                    {selectedCompany.evidence_summary}
                  </p>
                </div>
              </div>

              {/* Roles Offered */}
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={16} color="var(--accent-primary)" />
                  <span>Target Roles & Practice Tracks</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {selectedCompany.roles.map((role) => (
                    <div 
                      key={role.role_id}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-main)'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{role.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {role.description}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {role.common_topics.slice(0, 3).map((topic, i) => (
                          <span key={i} style={{ fontSize: '0.72rem', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                            {topic}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => onStartInterview(selectedCompany.id, role.title, 'technical_interview')}
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: '12px', width: '100%' }}
                      >
                        <span>Start Mock Interview</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reported Rounds Progression */}
            <div className="card">
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="var(--accent-primary)" />
                <span>Reported Interview Rounds</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedCompany.reported_rounds.map((round) => (
                  <div 
                    key={round.round_number}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem'
                    }}>
                      {round.round_number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{round.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Focus: {round.focus_areas.join(', ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <Clock size={14} />
                      <span>{round.typical_duration_minutes} mins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traceable Sources & Evidence */}
            <div className="card">
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--accent-primary)" />
                <span>Traceable Public Sources & Verified Candidate Reports</span>
              </h4>

              {selectedCompany.sources && selectedCompany.sources.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedCompany.sources.map((src) => (
                    <div
                      key={src.id}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        background: 'var(--bg-main)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{src.source_title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Published by: <strong>{src.publisher}</strong> • Retrieval Date: {src.retrieval_date}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span className={`badge ${src.is_official_source ? 'badge-official' : 'badge-verified'}`}>
                            {src.is_official_source ? 'Official Company Guide' : 'Selected Candidate Experience'}
                          </span>
                          <a 
                            href={src.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px' }}
                          >
                            <ExternalLink size={12} />
                            <span>Source</span>
                          </a>
                        </div>
                      </div>

                      {/* Supporting Claims */}
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          Verified Evidence Claims:
                        </div>
                        <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {src.supporting_claims.map((claim, idx) => (
                            <li key={idx}>{claim}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Limitations & Conflicts */}
                      {src.conflicts_and_limitations.length > 0 && (
                        <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-border)', fontSize: '0.78rem', color: '#854D0E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                          <span>Limitations: {src.conflicts_and_limitations.join(' ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No candidate-reported sources currently filed for this company. Showing role-specific practice guidelines.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
