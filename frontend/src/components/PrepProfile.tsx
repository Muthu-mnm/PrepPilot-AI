import React, { useState, useEffect } from 'react';
import { 
  FileText,
  FolderGit2,
  Layers, 
  BookOpen, 
  Target, 
  Compass,
  GraduationCap, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  ArrowRight,
  Edit3,
  Calendar,
  Building2,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Save,
  HelpCircle
} from 'lucide-react';
import { 
  ResumeExtractedData, 
  GitHubRepoAnalysis, 
  CandidateExperienceInput, 
  PreparationPlanResponse,
  MilestoneItem,
  Company
} from '../types';
import { api } from '../services/api';

interface PrepProfileProps {
  onPlanCreated?: (plan: PreparationPlanResponse) => void;
  onNavigateToMentor: () => void;
}

export const PrepProfile: React.FC<PrepProfileProps> = ({ onPlanCreated, onNavigateToMentor }) => {
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

  // Plan generation and editing state
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<PreparationPlanResponse | null>(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState('');
  const [editMilestoneDesc, setEditMilestoneDesc] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const [editingDiagnostic, setEditingDiagnostic] = useState(false);
  const [diagnosticText, setDiagnosticText] = useState('');
  const [newGapInput, setNewGapInput] = useState('');

  // Target Company recruitment evidence (only when relevant)
  const [relevantCompanies, setRelevantCompanies] = useState<Company[]>([]);

  useEffect(() => {
    // Load current plan and relevant companies
    const loadProfileData = async () => {
      try {
        const [plan, companiesList] = await Promise.all([
          api.getCurrentPlan().catch(() => null),
          api.getCompanies().catch(() => [])
        ]);

        if (plan) {
          setGeneratedPlan(plan);
          setDiagnosticText(plan.readiness_diagnostic || '');
          if (plan.target_role) setTargetRole(plan.target_role);
          if (plan.target_company) setTargetCompany(plan.target_company);
          if (plan.target_deadline) setTargetDeadline(plan.target_deadline);
          if (plan.knowledge_gaps && plan.knowledge_gaps.length > 0) {
            setWeakTopicsList(plan.knowledge_gaps);
          }
        }

        // Filter companies relevant to target company
        if (companiesList && companiesList.length > 0) {
          setRelevantCompanies(companiesList);
        }
      } catch (err) {
        console.error('Error loading preparation profile:', err);
      }
    };
    loadProfileData();
  }, []);

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResume(true);
    setResumeError(null);
    try {
      const parsed = await api.uploadResume(file);
      setResumeData(parsed);
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

  const handleAddGoal = () => {
    if (newGoalInput.trim() && !learningGoals.includes(newGoalInput.trim())) {
      setLearningGoals([...learningGoals, newGoalInput.trim()]);
      setNewGoalInput('');
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setLearningGoals(learningGoals.filter((g) => g !== goal));
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
      setDiagnosticText(plan.readiness_diagnostic || '');
      if (onPlanCreated) {
        onPlanCreated(plan);
      }
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

  const handleSaveMilestoneEdit = async (milestoneId: string) => {
    if (!generatedPlan) return;
    const updatedMilestones = generatedPlan.milestones.map((m) =>
      m.milestone_id === milestoneId ? { ...m, title: editMilestoneTitle, description: editMilestoneDesc } : m
    );
    try {
      const updated = await api.updatePlan({ milestones: updatedMilestones });
      setGeneratedPlan(updated);
      setEditingMilestoneId(null);
    } catch (err: any) {
      alert(`Error saving milestone edits: ${err.message}`);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!generatedPlan) return;
    const updatedMilestones = generatedPlan.milestones.filter((m) => m.milestone_id !== milestoneId);
    try {
      const updated = await api.updatePlan({ milestones: updatedMilestones });
      setGeneratedPlan(updated);
    } catch (err: any) {
      alert(`Error deleting milestone: ${err.message}`);
    }
  };

  const handleAddNewMilestone = async () => {
    if (!generatedPlan || !newMilestoneTitle.trim()) return;
    const newMilestone: MilestoneItem = {
      milestone_id: `custom-${Date.now()}`,
      title: newMilestoneTitle.trim(),
      description: newMilestoneDesc.trim() || 'Custom learner milestone',
      priority: 'medium',
      topics: [targetRole],
      suggested_activities: ['Practice with My Mentor'],
      completed: false
    };
    const updatedMilestones = [...generatedPlan.milestones, newMilestone];
    try {
      const updated = await api.updatePlan({ milestones: updatedMilestones });
      setGeneratedPlan(updated);
      setNewMilestoneTitle('');
      setNewMilestoneDesc('');
      setIsAddingMilestone(false);
    } catch (err: any) {
      alert(`Error adding new milestone: ${err.message}`);
    }
  };

  const handleSaveDiagnostic = async () => {
    if (!generatedPlan) return;
    try {
      const updated = await api.updatePlan({
        milestones: generatedPlan.milestones,
        readiness_diagnostic: diagnosticText
      });
      setGeneratedPlan(updated);
      setEditingDiagnostic(false);
    } catch (err: any) {
      alert(`Error updating readiness diagnostic: ${err.message}`);
    }
  };

  const handleAddKnowledgeGapToPlan = async () => {
    if (!generatedPlan || !newGapInput.trim()) return;
    const updatedGaps = Array.from(new Set([...(generatedPlan.knowledge_gaps || []), newGapInput.trim()]));
    try {
      const updated = await api.updatePlan({
        milestones: generatedPlan.milestones,
        knowledge_gaps: updatedGaps
      });
      setGeneratedPlan(updated);
      setNewGapInput('');
    } catch (err: any) {
      alert(`Error adding knowledge gap: ${err.message}`);
    }
  };

  const handleRemoveKnowledgeGapFromPlan = async (gap: string) => {
    if (!generatedPlan) return;
    const updatedGaps = (generatedPlan.knowledge_gaps || []).filter((g) => g !== gap);
    try {
      const updated = await api.updatePlan({
        milestones: generatedPlan.milestones,
        knowledge_gaps: updatedGaps
      });
      setGeneratedPlan(updated);
    } catch (err: any) {
      alert(`Error removing knowledge gap: ${err.message}`);
    }
  };

  // Find relevant target company evidence if any
  const matchedCompanyEvidence = relevantCompanies.filter((c) => {
    if (!targetCompany) return false;
    const targetCompLower = targetCompany.toLowerCase();
    return c.name.toLowerCase().includes(targetCompLower) || targetCompLower.includes(c.name.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Preparation Profile & Plan
          </h1>
          <span className="badge badge-verified">
            Context Engine
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
          Persist your resume, GitHub repositories, skills, goals, and candidate experiences to ground My Mentor in your exact background.
        </p>
      </div>

      {/* Main Grid: Left Side Setup Form, Right Side Generated Plan Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: generatedPlan ? '1fr 1fr' : '1fr', gap: '24px' }}>
        
        {/* Left Column: Profile Inputs & Extraction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section 1: Target Opportunity */}
          <div className="card">
            <h3 className="card-title">
              <Target size={18} color="var(--accent-primary)" />
              <span>1. Target Opportunity</span>
            </h3>
            <p className="card-subtitle">
              Specify your target role, company, and timeline.
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
                  placeholder="e.g. AI & Full Stack Engineer"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Company</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Fidelity Investments"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recruitment Track</label>
                <select
                  value={recruitmentType}
                  onChange={(e) => setRecruitmentType(e.target.value)}
                  className="form-control"
                >
                  <option value="campus">On-Campus Placement</option>
                  <option value="off_campus">Off-Campus Recruitment</option>
                  <option value="experienced">Lateral / Experienced</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Interview Date</label>
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
              Upload your resume (.pdf, .docx) to ground interview questions and project defense in verified work.
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
                accept=".pdf,.docx,.doc,.txt"
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
                Parses verified skills, education, and past projects for My Mentor drills.
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
                  <span>Resume Extracted ({resumeData.filename})</span>
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
              Add your GitHub repository URLs to generate realistic architecture defense drills.
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

          {/* Section 4: Skills, Weak Topics & Goals */}
          <div className="card">
            <h3 className="card-title">
              <Layers size={18} color="var(--accent-primary)" />
              <span>4. Technical Skills & Weak Topics</span>
            </h3>
            <p className="card-subtitle">
              Prioritize areas where you need deep conceptual explanations and retesting.
            </p>

            {/* Skills */}
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Core Skills (Click to remove)</label>
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
                  placeholder="Add skill (e.g. React, FastApi, PostgreSQL)"
                  className="form-control"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddSkill} className="btn btn-secondary btn-sm">
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>

            {/* Weak Topics */}
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Self-Identified Weak Topics</label>
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
                  placeholder="Add weak topic (e.g. SQL Joins on Unmatched Records)"
                  className="form-control"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddWeakTopic} className="btn btn-secondary btn-sm">
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>

            {/* Learning Goals */}
            <div>
              <label className="form-label">Key Preparation Goals</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {learningGoals.map((goal) => (
                  <span 
                    key={goal}
                    onClick={() => handleRemoveGoal(goal)}
                    className="badge badge-verified"
                    style={{ cursor: 'pointer', padding: '4px 8px' }}
                    title="Click to remove"
                  >
                    🎯 {goal} ✕
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                  placeholder="Add goal (e.g. Defend project architecture)"
                  className="form-control"
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddGoal} className="btn btn-secondary btn-sm">
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Section 5: Selected-Candidate Interview Experiences */}
          <div className="card">
            <h3 className="card-title">
              <BookOpen size={18} color="var(--accent-primary)" />
              <span>5. Selected-Candidate Interview Experiences</span>
            </h3>
            <p className="card-subtitle">
              Upload interview reports (.pdf, .docx, .txt, .md), paste URLs, or paste notes from selected candidates to extract verified recruitment rounds.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* File Upload Zone */}
              <div style={{
                border: '2px dashed var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-main)'
              }}>
                <Upload size={22} color="var(--accent-primary)" style={{ margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Upload Candidate Experience File
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
                placeholder="https://... public post URL"
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span>{exp.source_url ? exp.source_url : `Candidate Experience #${i + 1}`}</span>
                        <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
                          Verified Experience
                        </span>
                      </div>
                      {exp.reported_rounds && exp.reported_rounds.length > 0 && (
                        <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <strong>Reported Rounds:</strong> {exp.reported_rounds.join(' → ')}
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

          {/* Build / Update Plan CTA Button */}
          <button 
            onClick={handleGeneratePlan}
            disabled={isGeneratingPlan || !targetRole.trim()}
            className="btn btn-primary"
            style={{ padding: '14px 24px', fontSize: '1rem', fontWeight: 700 }}
          >
            <Compass size={18} />
            <span>{isGeneratingPlan ? 'Synthesizing Your Preparation Plan...' : 'Generate / Update Preparation Plan'}</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Right Column: Editable Preparation Plan & Contextual Evidence */}
        {generatedPlan ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Plan Header Card */}
            <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                    Active Preparation Plan
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Target: <strong>{generatedPlan.target_role}</strong> {generatedPlan.target_company && `at ${generatedPlan.target_company}`}
                    {generatedPlan.target_deadline && ` • Date: ${generatedPlan.target_deadline}`}
                  </div>
                </div>
                <button onClick={onNavigateToMentor} className="btn btn-primary btn-sm">
                  <GraduationCap size={14} />
                  <span>Start with My Mentor</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Editable Readiness Diagnostic */}
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} />
                    <span>Readiness Diagnostic</span>
                  </div>
                  {!editingDiagnostic ? (
                    <button onClick={() => setEditingDiagnostic(true)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                      <Edit3 size={12} /> Edit
                    </button>
                  ) : (
                    <button onClick={handleSaveDiagnostic} className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                      <Save size={12} /> Save
                    </button>
                  )}
                </div>
                {editingDiagnostic ? (
                  <textarea
                    value={diagnosticText}
                    onChange={(e) => setDiagnosticText(e.target.value)}
                    className="form-control"
                    style={{ minHeight: '80px', fontSize: '0.85rem' }}
                  />
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {generatedPlan.readiness_diagnostic}
                  </p>
                )}
              </div>

              {/* Strengths & Editable Knowledge Gaps */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>Identified Strengths</div>
                  <ul style={{ paddingLeft: '16px', margin: 0, color: 'var(--text-primary)' }}>
                    {generatedPlan.strengths_summary && generatedPlan.strengths_summary.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ padding: '12px', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>Prioritized Knowledge Gaps</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {generatedPlan.knowledge_gaps && generatedPlan.knowledge_gaps.map((g, idx) => (
                      <span 
                        key={idx} 
                        onClick={() => handleRemoveKnowledgeGapFromPlan(g)}
                        className="badge badge-candidate"
                        style={{ cursor: 'pointer', fontSize: '0.72rem' }}
                        title="Click to remove from plan"
                      >
                        {g} ✕
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={newGapInput}
                      onChange={(e) => setNewGapInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddKnowledgeGapToPlan()}
                      placeholder="Add gap..."
                      className="form-control"
                      style={{ padding: '2px 6px', fontSize: '0.75rem', height: '26px' }}
                    />
                    <button onClick={handleAddKnowledgeGapToPlan} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Project Defense Drills */}
              {generatedPlan.project_defense_questions && generatedPlan.project_defense_questions.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px' }}>
                    Custom Project Architecture Defense Questions:
                  </h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {generatedPlan.project_defense_questions.map((q, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Editable Milestones & Roadmap */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  <Layers size={18} color="var(--accent-primary)" />
                  <span>Preparation Milestones & Roadmap</span>
                </h3>
                <button 
                  onClick={() => setIsAddingMilestone(!isAddingMilestone)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  <Plus size={13} />
                  <span>Add Milestone</span>
                </button>
              </div>

              {/* Add New Milestone Form */}
              {isAddingMilestone && (
                <div style={{ padding: '14px', background: 'var(--bg-main)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>Add Custom Milestone</div>
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    placeholder="Milestone title (e.g. Master SQL Aggregations and Window Functions)"
                    className="form-control"
                    style={{ marginBottom: '8px', fontSize: '0.82rem' }}
                  />
                  <textarea
                    value={newMilestoneDesc}
                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                    placeholder="Description of activities, practice questions, or topics..."
                    className="form-control"
                    style={{ height: '60px', marginBottom: '8px', fontSize: '0.82rem' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setIsAddingMilestone(false)} className="btn btn-secondary btn-sm">Cancel</button>
                    <button onClick={handleAddNewMilestone} className="btn btn-primary btn-sm">Add to Plan</button>
                  </div>
                </div>
              )}

              {/* Milestones List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {generatedPlan.milestones.map((m) => {
                  const isEditing = editingMilestoneId === m.milestone_id;
                  return (
                    <div 
                      key={m.milestone_id}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        background: m.completed ? 'var(--bg-main)' : 'var(--bg-surface)',
                        border: `1px solid ${m.completed ? 'var(--success-border)' : 'var(--border-light)'}`,
                        opacity: m.completed ? 0.8 : 1
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editMilestoneTitle}
                            onChange={(e) => setEditMilestoneTitle(e.target.value)}
                            className="form-control"
                            style={{ fontSize: '0.85rem' }}
                          />
                          <textarea
                            value={editMilestoneDesc}
                            onChange={(e) => setEditMilestoneDesc(e.target.value)}
                            className="form-control"
                            style={{ height: '60px', fontSize: '0.82rem' }}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingMilestoneId(null)} className="btn btn-secondary btn-sm">Cancel</button>
                            <button onClick={() => handleSaveMilestoneEdit(m.milestone_id)} className="btn btn-primary btn-sm">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input
                                type="checkbox"
                                checked={m.completed}
                                onChange={() => handleToggleMilestone(m.milestone_id)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', textDecoration: m.completed ? 'line-through' : 'none' }}>
                                {m.title}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className={`badge ${m.priority === 'high' ? 'badge-candidate' : 'badge-official'}`} style={{ fontSize: '0.7rem' }}>
                                {m.priority.toUpperCase()}
                              </span>
                              <button 
                                onClick={() => {
                                  setEditingMilestoneId(m.milestone_id);
                                  setEditMilestoneTitle(m.title);
                                  setEditMilestoneDesc(m.description);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                                title="Edit milestone"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteMilestone(m.milestone_id)}
                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '2px' }}
                                title="Delete milestone"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '6px', paddingLeft: '26px' }}>
                            {m.description}
                          </div>

                          {m.topics && m.topics.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', paddingLeft: '26px' }}>
                              {m.topics.map((t, idx) => (
                                <span key={idx} style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'var(--bg-subtle)', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Contextual Target Company Recruitment Evidence (Evidence only when relevant!) */}
            {matchedCompanyEvidence.length > 0 && (
              <div className="card" style={{ background: 'var(--bg-main)', border: '1px solid var(--accent-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Building2 size={18} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                    Source-Backed Evidence: {matchedCompanyEvidence[0].name}
                  </h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Sourced from verified selected candidates with provenance tracking.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {matchedCompanyEvidence[0].reported_rounds.map((round) => (
                    <div key={round.round_number} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          Round {round.round_number}: {round.name}
                        </span>
                        <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
                          Verified Recruitment Pattern
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Typical Duration: ~{round.typical_duration_minutes} minutes
                      </div>
                      {round.focus_areas && round.focus_areas.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {round.focus_areas.map((fa, idx) => (
                            <span key={idx} className="badge badge-candidate" style={{ fontSize: '0.68rem' }}>
                              {fa}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* Empty plan prompt */
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', textAlign: 'center', padding: '40px' }}>
            <Compass size={36} color="var(--accent-primary)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              No Active Plan Generated Yet
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.6, marginBottom: '20px' }}>
              Fill in your target role, upload your resume or candidate report, and click <strong>"Generate Preparation Plan"</strong> to build your customized milestone roadmap.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

// Re-export as PrepSetup for backward compatibility
export const PrepSetup = PrepProfile;
export default PrepProfile;
