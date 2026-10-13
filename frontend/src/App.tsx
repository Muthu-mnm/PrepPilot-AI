import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { UnifiedMentor } from './components/UnifiedMentor';
import { ProgressDashboard } from './components/ProgressDashboard';
import { PrepProfile } from './components/PrepProfile';
import { AuthModal } from './components/AuthModal';
import { User } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mentorInitialMode, setMentorInitialMode] = useState<
    'mentor_chat' | 'project_defense' | 'concept_explanation' | 'coding_review' | 'knowledge_check'
  >('mentor_chat');

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

  const handleNavigate = (tab: string, mode?: 'mentor_chat' | 'project_defense' | 'concept_explanation' | 'coding_review' | 'knowledge_check') => {
    if (mode) {
      setMentorInitialMode(mode);
    }
    // Route aliases to the 4 canonical tabs
    if (tab === 'dashboard') {
      setCurrentTab('home');
    } else if (tab === 'setup') {
      setCurrentTab('profile');
    } else if (tab === 'revisions') {
      setCurrentTab('progress');
    } else if (tab === 'coding') {
      setMentorInitialMode('coding_review');
      setCurrentTab('mentor');
    } else if (tab === 'interview') {
      setMentorInitialMode('mentor_chat');
      setCurrentTab('mentor');
    } else if (tab === 'mastery') {
      setMentorInitialMode('concept_explanation');
      setCurrentTab('mentor');
    } else if (tab === 'companies') {
      setCurrentTab('profile');
    } else {
      setCurrentTab(tab);
    }
  };

  const handleLogout = () => {
    api.removeToken();
    setUser(null);
  };

  // Canonical tab display label
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'home':
      case 'dashboard':
        return 'Home';
      case 'mentor':
      case 'interview':
      case 'coding':
      case 'mastery':
        return 'My Mentor';
      case 'progress':
      case 'revisions':
        return 'My Progress';
      case 'profile':
      case 'setup':
      case 'companies':
        return 'Preparation Profile';
      default:
        return 'Home';
    }
  };

  return (
    <div className="app-container">
      {/* 4-Destination Primary Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => handleNavigate(tab)}
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
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {getTabTitle(currentTab)}
            </span>
          </div>

          {/* User & Track Information */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {user.target_role || 'AI & Full Stack Engineer Track'}
              </span>
            )}
          </div>
        </header>

        {/* View Router */}
        <div className="content-body">
          {(currentTab === 'home' || currentTab === 'dashboard') && (
            <Dashboard 
              user={user} 
              onNavigate={(tab) => handleNavigate(tab)} 
            />
          )}

          {(currentTab === 'mentor' || currentTab === 'interview' || currentTab === 'coding' || currentTab === 'mastery') && (
            <UnifiedMentor 
              initialMode={mentorInitialMode}
              onNavigate={(tab) => handleNavigate(tab)}
              onNavigateToSetup={() => handleNavigate('profile')}
              onNavigateToRevisions={() => handleNavigate('progress')}
            />
          )}

          {(currentTab === 'progress' || currentTab === 'revisions') && (
            <ProgressDashboard 
              onNavigate={(tab) => handleNavigate(tab)} 
            />
          )}

          {(currentTab === 'profile' || currentTab === 'setup' || currentTab === 'companies') && (
            <PrepProfile
              onNavigateToMentor={() => handleNavigate('mentor')}
              onPlanCreated={() => handleNavigate('mentor')}
            />
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
