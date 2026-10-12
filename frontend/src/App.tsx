import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CompanyExplorer } from './components/CompanyExplorer';
import { InterviewRoom } from './components/InterviewRoom';
import { CodingWorkspace } from './components/CodingWorkspace';
import { MentorView } from './components/MentorView';
import { ProgressDashboard } from './components/ProgressDashboard';
import { AuthModal } from './components/AuthModal';
import { PrepSetup } from './components/PrepSetup';
import { UnifiedMentor } from './components/UnifiedMentor';
import { User, PreparationPlanResponse } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [interviewConfig, setInterviewConfig] = useState<{
    companyId?: string;
    role?: string;
    track?: string;
  }>({});

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('preppilot_token');
    if (token) {
      api.getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          api.removeToken();
          setUser(null);
        });
    }
  }, []);

  const handleStartInterview = (companyId: string, roleTitle: string, track: string) => {
    setInterviewConfig({
      companyId,
      role: roleTitle,
      track
    });
    setCurrentTab('interview');
  };

  const handleLogout = () => {
    api.removeToken();
    setUser(null);
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              PrepPilot AI Placement Platform
            </span>
            <span style={{ color: 'var(--border-light)' }}>/</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {currentTab.replace('_', ' ')}
            </span>
          </div>

          {/* Clean User & Track Information */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {user.target_role || 'Software Engineering Track'}
              </span>
            )}
          </div>
        </header>

        {/* View Router */}
        <div className="content-body">
          {currentTab === 'dashboard' && (
            <Dashboard user={user} onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'mentor' && (
            <UnifiedMentor 
              onNavigateToCoding={() => setCurrentTab('coding')}
              onNavigateToSetup={() => setCurrentTab('setup')}
              onNavigateToRevisions={() => setCurrentTab('revisions')}
            />
          )}

          {currentTab === 'setup' && (
            <PrepSetup
              onPlanCreated={() => setCurrentTab('mentor')}
              onNavigateToMentor={() => setCurrentTab('mentor')}
            />
          )}

          {currentTab === 'coding' && (
            <CodingWorkspace />
          )}

          {currentTab === 'interview' && (
            <InterviewRoom
              initialCompanyId={interviewConfig.companyId}
              initialRole={interviewConfig.role || 'Software Development Engineer'}
              initialTrack={interviewConfig.track || 'technical_interview'}
              onFinish={() => setCurrentTab('progress')}
            />
          )}

          {currentTab === 'mastery' && (
            <MentorView />
          )}

          {currentTab === 'progress' && (
            <ProgressDashboard />
          )}

          {currentTab === 'revisions' && (
            <ProgressDashboard />
          )}

          {currentTab === 'companies' && (
            <CompanyExplorer onStartInterview={handleStartInterview} />
          )}
        </div>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(userData) => setUser(userData)}
      />
    </div>
  );
};

export default App;
