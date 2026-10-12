import React, { useState, useEffect } from 'react';
import { 
  FileText,
  FolderGit2,
  Layers, 
  BookOpen, 
  Target, 
  Sparkles, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  ArrowRight,
  Edit3,
  Calendar,
  Building2,
  ExternalLink
} from 'lucide-react';
import { 
  ResumeExtractedData, 
  GitHubRepoAnalysis, 
  CandidateExperienceInput, 
  PreparationPlanResponse,
  MilestoneItem
} from '../types';
import { api } from '../services/api';

interface PrepSetupProps {
  onPlanCreated: (plan: PreparationPlanResponse) => void;
  onNavigateToMentor: () => void;
}

export const PrepSetup: React.FC<PrepSetupProps> = ({ onPlanCreated, onNavigateToMentor }) => {
  // Opportunity state
  const [targetRole, setTargetRole] = useState('Software Development Engineer');
  const [targetCompany, setTargetCompany] = useState('');
  const [recruitmentType, setRecruitmentType] = useState('campus');
  const [targetDeadline, setTargetDeadline] = useState('2026-11-20');

  // Resume state
  const [resumeData, setResumeData] = useState<ResumeExtractedData | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // GitHub state
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [githubRepos, setGithubRepos] = useState<GitHubRepoAnalysis[]>([]);
  const [isAnalyzingRepo, setIsAnalyzingRepo] = useState(false);

  // Skills & Weak topics state
  const [skillsList, setSkillsList] = useState<string[]>(['Data Structures', 'Python', 'SQL', 'Algorithms']);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [weakTopicsList, setWeakTopicsList] = useState<string[]>(['SQL Joins on Unmatched Records', 'System Architecture Bottlenecks']);
  const [newWeakInput, setNewWeakInput] = useState('');
  const [learningGoals, setLearningGoals] = useState<string[]>(['Pass technical round 1', 'Defend GitHub project architecture']);
  const [newGoalInput, setNewGoalInput] = useState('');

  // Candidate experiences state
  const [experienceUrlInput, setExperienceUrlInput] = useState('');
  const [experienceTextInput, setExperienceTextInput] = useState('');
  const [experiences, setExperiences] = useState<CandidateExperienceInput[]>([]);
  const [isExtractingExp, setIsExtractingExp] = useState(false);

  // Plan generation state
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<PreparationPlanResponse | null>(null);

  useEffect(() => {
    // Check if user already has an active plan
    api.getCurrentPlan().then((plan) => {
      if (plan) {
        setGeneratedPlan(plan);
      }
    }).catch(() => {});
  }, []);

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    setResumeError(null);
    try {
      const parsed = await api.uploadResume(file);
      setResumeData(parsed);
      // Auto-add detected skills
      if (parsed.skills.length > 0) {
        setSkillsList((prev) => Array.from(new Set([...prev, ...parsed.skills])));
      }
    } catch (err: any) {
      setResumeError(err.message || 'Error parsing resume file.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleAddGitHubRepo = async () => {
    if (!repoUrlInput.trim()) return;
    setIsAnalyzingRepo(true);
    try {
      const analysis = await api.analyzeGitHub(repoUrlInput.trim());
      setGithubRepos((prev) => [...prev, analysis]);
      setRepoUrlInput('');
    } catch (err: any) {
      alert(`Error analyzing repository: ${err.message}`);
    } finally {
      setIsAnalyzingRepo(false);
    }
  };

  const handleRemoveRepo = (index: number) => {
    setGithubRepos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !skillsList.includes(newSkillInput.trim())) {
      setSkillsList([...skillsList, newSkillInput.trim()]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillsList(skillsList.filter((s) => s !== skill));
  };

  const handleAddWeakTopic = () => {
    if (newWeakInput.trim() && !weakTopicsList.includes(newWeakInput.trim())) {
      setWeakTopicsList([...weakTopicsList, newWeakInput.trim()]);
      setNewWeakInput('');
    }
  };

  const handleRemoveWeakTopic = (t: string) => {
    setWeakTopicsList(weakTopicsList.filter((x) => x !== t));
  };

  const handleAddExperience = async () => {
    if (!experienceUrlInput.trim() && !experienceTextInput.trim()) return;
    setIsExtractingExp(true);
    try {
      const exp = await api.extractExperience(
        experienceUrlInput.trim() || undefined,
        experienceTextInput.trim() || undefined
      );
      setExperiences((prev) => [...prev, exp]);
      setExperienceUrlInput('');
      setExperienceTextInput('');
    } catch (err: any) {
      alert(`Error extracting experience: ${err.message}`);
    } finally {
      setIsExtractingExp(false);
    }
  };

  const handleExperienceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtractingExp(true);
    try {
      const exp = await api.uploadExperienceFile(file);
      setExperiences((prev) => [...prev, exp]);
    } catch (err: any) {
      alert(`Error parsing interview experience file: ${err.message}`);
    } finally {
      setIsExtractingExp(false);
      e.target.value = '';
    }
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const plan = await api.generatePlan({
        target_role: targetRole,
        target_company: targetCompany || undefined,
        recruitment_type: recruitmentType,
        target_deadline: targetDeadline || undefined,
        skills: skillsList,
        weak_topics: weakTopicsList,
        learning_goals: learningGoals,
        resume_data: resumeData || undefined,
        github_repos: githubRepos,
        candidate_experiences: experiences
      });
      setGeneratedPlan(plan);
      onPlanCreated(plan);
    } catch (err: any) {
      alert(`Error generating plan: ${err.message}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!generatedPlan) return;
    const updatedMilestones = generatedPlan.milestones.map((m) =>
      m.milestone_id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    try {
      const updated = await api.updatePlan({ milestones: updatedMilestones });
      setGeneratedPlan(updated);
    } catch (err: any) {
      alert(`Error updating milestone: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Personalized Preparation Setup
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Provide your resume, GitHub projects, self-identified growth areas, and target role to generate a traceable preparation plan.
        </p>
      </div>

      {/* Main Grid: Left Side Setup Form, Right Side Generated Plan Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: generatedPlan ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Setup Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Target Opportunity */}
          <div className="card">
            <h3 className="card-title">
              <Target size={18} color="var(--accent-primary)" />
              <span>1. Target Opportunity</span>
            </h3>
            <p className="card-subtitle">
              Specify the role and optional company you are preparing for.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Target Role *</label>
                <input
                  type="text"
                  required
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Software Development Engineer"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company (Optional)</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Amazon, Google, TCS, or General Tech"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recruitment Type</label>
                <select
                  value={recruitmentType}
                  onChange={(e) => setRecruitmentType(e.target.value)}
                  className="form-control"
                >
                  <option value="campus">On-Campus Placement</option>
                  <option value="off_campus">Off-Campus Recruitment</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Deadline / Interview Date</label>
                <input
                  type="date"
                  value={targetDeadline}
                  onChange={(e) => setTargetDeadline(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Resume Upload */}
          <div className="card">
            <h3 className="card-title">
              <FileText size={18} color="var(--accent-primary)" />
              <span>2. Resume Upload</span>
            </h3>
            <p className="card-subtitle">
              Upload your PDF or DOCX resume to extract verified projects, education, and skills.
            </p>

            <div style={{
              border: '2px dashed var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-main)',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleResumeFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <Upload size={28} color="var(--accent-primary)" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {isUploadingResume ? 'Parsing Document...' : 'Click or drag your PDF / DOCX resume here'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Files are parsed strictly to personalize interview questions and defense prompts.
              </div>
            </div>

            {resumeError && (
              <div style={{ marginTop: '10px', color: 'var(--error)', fontSize: '0.85rem' }}>
                {resumeError}
              </div>
            )}

            {resumeData && (
              <div style={{ marginTop: '14px', padding: '12px 16px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>
                  <CheckCircle2 size={16} />
                  <span>Resume Extracted Successfully ({resumeData.filename})</span>
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {resumeData.summary}
                </div>
                {resumeData.projects.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong>Key Projects:</strong> {resumeData.projects.slice(0, 3).join(' • ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: GitHub Repositories */}
          <div className="card">
            <h3 className="card-title">
              <FolderGit2 size={18} color="var(--accent-primary)" />
              <span>3. GitHub Project Repositories</span>
            </h3>
            <p className="card-subtitle">
              Add your public GitHub repository URLs to generate authentic project architecture defense questions.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="url"
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                placeholder="https://github.com/username/project-repo"
                className="form-control"
                style={{ flex: 1 }}
              />
              <button 
                onClick={handleAddGitHubRepo} 
                disabled={isAnalyzingRepo || !repoUrlInput.trim()} 
                className="btn btn-secondary"
              >
                {isAnalyzingRepo ? 'Analyzing...' : 'Add Repository'}
              </button>
            </div>

            {/* List of Analyzed Repos */}
            {githubRepos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                {githubRepos.map((repo, idx) => (
                  <div 
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{repo.owner}/{repo.repo_name}</span>
                        {repo.primary_language && (
                          <span className="badge badge-candidate" style={{ fontSize: '0.7rem' }}>
                            {repo.primary_language}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {repo.architecture_summary}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveRepo(idx)} className="btn btn-secondary btn-sm" title="Remove">
                      <Trash2 size={14} color="var(--error)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Skills & Self-Reported Weaknesses */}
          <div className="card">
            <h3 className="card-title">
              <Layers size={18} color="var(--accent-primary)" />
              <span>4. Technical Skills & Weak Topics</span>
            </h3>
            <p className="card-subtitle">
              Enter your current skills and specify weak areas for prioritized reinforcement.
            </p>

            {/* Skills */}
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Core Skills (Click tag to remove)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {skillsList.map((skill) => (
                  <span 
                    key={skill}
                    onClick={() => handleRemoveSkill(skill)}
                    className="badge badge-official"
                    style={{ cursor: 'pointer', padding: '4px 8px' }}
                    title="Click to remove"
                  >
                    {skill} ✕
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                  placeholder="Add skill (e.g. React, PostgreSQL)"
                  className="form-control"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddSkill} className="btn btn-secondary btn-sm">
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>

            {/* Weak Topics */}
            <div>
              <label className="form-label">Self-Identified Weak Topics (Prioritized in Plan)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {weakTopicsList.map((topic) => (
                  <span 
                    key={topic}
                    onClick={() => handleRemoveWeakTopic(topic)}
                    className="badge badge-candidate"
                    style={{ cursor: 'pointer', padding: '4px 8px' }}
                    title="Click to remove"
                  >
                    ⚠️ {topic} ✕
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newWeakInput}
                  onChange={(e) => setNewWeakInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWeakTopic()}
                  placeholder="Add weak topic (e.g. Dynamic Programming, SQL Aggregations)"
                  className="form-control"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddWeakTopic} className="btn btn-secondary btn-sm">
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Candidate Experiences (Optional) */}
          <div className="card">
            <h3 className="card-title">
              <BookOpen size={18} color="var(--accent-primary)" />
              <span>5. Selected-Candidate Interview Experiences (Optional)</span>
            </h3>
            <p className="card-subtitle">
              Upload interview experience files (PDF, DOCX, TXT, MD), paste public report URLs, or enter notes from previously selected candidates to extract recruitment patterns.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* File Upload Zone */}
              <div style={{
                border: '2px dashed var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-main)',
                transition: 'var(--transition)'
              }}>
                <Upload size={22} color="var(--accent-primary)" style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Upload Candidate Experience Document
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', marginBottom: '10px' }}>
                  Supports PDF, DOCX, TXT, and Markdown files
                </div>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  <FileText size={14} />
                  <span>{isExtractingExp ? 'Processing File...' : 'Choose File to Extract'}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleExperienceFileUpload}
                    disabled={isExtractingExp}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Or separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Or enter URL / notes
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
              </div>

              <input
                type="url"
                value={experienceUrlInput}
                onChange={(e) => setExperienceUrlInput(e.target.value)}
                placeholder="https://geeksforgeeks.org/... or public post URL"
                className="form-control"
              />
              <textarea
                value={experienceTextInput}
                onChange={(e) => setExperienceTextInput(e.target.value)}
                placeholder="Or paste candidate interview experience text here..."
                className="form-control"
                style={{ height: '70px', resize: 'none' }}
              />
              <button 
                onClick={handleAddExperience} 
                disabled={isExtractingExp || (!experienceUrlInput.trim() && !experienceTextInput.trim())}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-start' }}
              >
                {isExtractingExp ? 'Extracting...' : 'Extract Reported Rounds & Topics'}
              </button>
            </div>

            {experiences.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                {experiences.map((exp, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '12px', 
                      background: 'var(--bg-main)', 
                      borderRadius: 'var(--radius-sm)', 
                      border: '1px solid var(--border-light)', 
                      fontSize: '0.82rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {exp.source_url ? exp.source_url : `Extracted Candidate Experience #${i + 1}`}
                      </div>
                      {exp.reported_rounds && exp.reported_rounds.length > 0 && (
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <strong>Rounds:</strong> {exp.reported_rounds.join(' → ')}
                        </div>
                      )}
                      {exp.extracted_topics && exp.extracted_topics.length > 0 && (
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <strong>Topics:</strong> {exp.extracted_topics.join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveExperience(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }}
                      title="Remove experience"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Build Plan CTA Button */}
          <button 
            onClick={handleGeneratePlan}
            disabled={isGeneratingPlan || !targetRole.trim()}
            className="btn btn-primary"
            style={{ padding: '14px 24px', fontSize: '1rem', fontWeight: 700 }}
          >
            <Sparkles size={18} />
            <span>{isGeneratingPlan ? 'Synthesizing Your Preparation Plan...' : 'Build My Preparation Plan'}</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Right Side: Generated Plan & Milestones Review */}
        {generatedPlan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Your Personalized Preparation Plan</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Target: <strong>{generatedPlan.target_role}</strong> {generatedPlan.target_company && `at ${generatedPlan.target_company}`}
                  </div>
                </div>
                <button onClick={onNavigateToMentor} className="btn btn-primary btn-sm">
                  <span>Start with My Mentor</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Readiness Diagnostic */}
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                <strong>Readiness Diagnostic:</strong> {generatedPlan.readiness_diagnostic}
              </div>

              {/* Strengths & Knowledge Gaps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>Identified Strengths</div>
                  <ul style={{ paddingLeft: '16px', color: 'var(--text-primary)' }}>
                    {generatedPlan.strengths_summary.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ padding: '12px', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>Target Knowledge Gaps</div>
                  <ul style={{ paddingLeft: '16px', color: 'var(--text-primary)' }}>
                    {generatedPlan.knowledge_gaps.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Project Defense Questions */}
              {generatedPlan.project_defense_questions.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
                    Target Project & Architecture Defense Questions:
                  </h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {generatedPlan.project_defense_questions.map((q, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sequential Milestones */}
            <div className="card">
              <h3 className="card-title">
                <Layers size={18} color="var(--accent-primary)" />
                <span>Preparation Milestones & Roadmap</span>
              </h3>
              <p className="card-subtitle">
                Mark milestones as completed as you work through topics with My Mentor.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {generatedPlan.milestones.map((m) => (
                  <div 
                    key={m.milestone_id}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: m.completed ? 'var(--bg-main)' : 'var(--bg-surface)',
                      border: `1px solid ${m.completed ? 'var(--success-border)' : 'var(--border-light)'}`,
                      opacity: m.completed ? 0.8 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={m.completed}
                          onChange={() => handleToggleMilestone(m.milestone_id)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', textDecoration: m.completed ? 'line-through' : 'none' }}>
                          {m.title}
                        </span>
                      </div>
                      <span className={`badge ${m.priority === 'high' ? 'badge-candidate' : 'badge-official'}`}>
                        {m.priority.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '8px', paddingLeft: '28px' }}>
                      {m.description}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', paddingLeft: '28px' }}>
                      {m.topics.map((t, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={onNavigateToMentor} className="btn btn-primary" style={{ width: '100%' }}>
                  <Sparkles size={16} />
                  <span>Begin Preparation with My Mentor</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
