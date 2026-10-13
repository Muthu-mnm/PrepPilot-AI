import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { UnifiedMentor } from './components/UnifiedMentor';
import { ProgressDashboard } from './components/ProgressDashboard';
import { PrepProfile } from './components/PrepProfile';
import { AuthModal } from './components/AuthModal';
import { User, ChatSessionMeta, MentorMode } from './types';
import { api } from './services/api';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

const SESSIONS_STORAGE_KEY = 'preppilot_chat_sessions';
const ACTIVE_SESSION_KEY = 'preppilot_active_session_id';

const loadInitialSessions = (): ChatSessionMeta[] => {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse saved chat sessions', e);
  }
  return [
    {
      id: 'session_default',
      title: 'Placement Guidance & Strategy',
      lastUpdated: new Date().toISOString(),
      mode: 'general_chat' as MentorMode,
      messagesCount: 0,
      preview: 'Initial onboarding and placement strategy'
    }
  ];
};

const loadInitialActiveId = (sessions: ChatSessionMeta[]): string => {
  try {
    const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (saved && sessions.some(s => s.id === saved)) {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return sessions[0]?.id || 'session_default';
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('mentor');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mentorInitialMode, setMentorInitialMode] = useState<
    'general_chat' | 'interview' | 'coding' | 'learn' | 'project_defense' | 'retest'
  >('general_chat');

  // Multi-session chat history state
  const [sessions, setSessions] = useState<ChatSessionMeta[]>(loadInitialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => loadInitialActiveId(sessions));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
    setCurrentTab('mentor');
  };

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSessionMeta = {
      id: newId,
      title: 'New conversation',
      lastUpdated: new Date().toISOString(),
      mode: 'general_chat' as MentorMode,
      messagesCount: 0,
      preview: ''
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newId);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(ACTIVE_SESSION_KEY, newId);
    setCurrentTab('mentor');
  };

  const handleDeleteSession = (sessionId: string) => {
    const remaining = sessions.filter(s => s.id !== sessionId);
    const updated: ChatSessionMeta[] = remaining.length > 0 ? remaining : [
      {
        id: `session_${Date.now()}`,
        title: 'New conversation',
        lastUpdated: new Date().toISOString(),
        mode: 'general_chat' as MentorMode,
        messagesCount: 0,
        preview: ''
      }
    ];
    setSessions(updated);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.removeItem(`preppilot_msgs_${sessionId}`);
    if (activeSessionId === sessionId) {
      setActiveSessionId(updated[0].id);
      localStorage.setItem(ACTIVE_SESSION_KEY, updated[0].id);
    }
  };

  const handleSessionUpdated = (updatedSession: ChatSessionMeta) => {
    setSessions(prev => {
      const existingIndex = prev.findIndex(s => s.id === updatedSession.id);
      let updated: ChatSessionMeta[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = updatedSession;
      } else {
        updated = [updatedSession, ...prev];
      }
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleNavigate = (tab: string, mode?: 'general_chat' | 'interview' | 'coding' | 'learn' | 'project_defense' | 'retest') => {
    if (mode) {
      setMentorInitialMode(mode);
    }
    // Route aliases to the 3 canonical tabs: My Mentor, My Progress, My Profile
    if (tab === 'dashboard' || tab === 'home') {
      setCurrentTab('mentor');
    } else if (tab === 'setup' || tab === 'companies') {
      setCurrentTab('profile');
    } else if (tab === 'revisions' || tab === 'analytics') {
      setCurrentTab('progress');
    } else if (tab === 'coding') {
      setMentorInitialMode('coding');
      setCurrentTab('mentor');
    } else if (tab === 'interview') {
      setMentorInitialMode('interview');
      setCurrentTab('mentor');
    } else if (tab === 'mastery' || tab === 'learn') {
      setMentorInitialMode('learn');
      setCurrentTab('mentor');
    } else if (tab === 'retest') {
      setMentorInitialMode('retest');
      setCurrentTab('mentor');
    } else if (tab === 'project_defense') {
      setMentorInitialMode('project_defense');
      setCurrentTab('mentor');
    } else {
      setCurrentTab(tab);
    }
  };

  const handleLogout = () => {
    api.removeToken();
    setUser(null);
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'mentor':
        return 'My Mentor';
      case 'progress':
      case 'revisions':
        return 'My Progress';
      case 'profile':
      case 'setup':
      case 'companies':
        return 'My Profile';
      default:
        return 'My Mentor';
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      {/* ChatGPT-Style Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => handleNavigate(tab)}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Top Header for Secondary Views (Progress, Profile) */}
        {currentTab !== 'mentor' && currentTab !== 'home' && currentTab !== 'dashboard' && (
          <header className="top-navbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="navbar-toggle-btn"
                title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                aria-label="Toggle navigation sidebar"
              >
                {isSidebarCollapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {getTabTitle(currentTab)}
                </span>
              </div>
            </div>

            {/* User & Track Information */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user && (
                <span className="navbar-role-pill">
                  {user.target_role || 'Target: SDE Placement'}
                </span>
              )}
            </div>
          </header>
        )}

        {/* View Router */}
        <div className={`content-body ${currentTab === 'mentor' || currentTab === 'home' || currentTab === 'dashboard' ? 'content-body-mentor' : 'content-body-scrollable'}`}>
          {(currentTab === 'mentor' || currentTab === 'home' || currentTab === 'dashboard') && (
            <UnifiedMentor 
              initialMode={mentorInitialMode}
              activeSessionId={activeSessionId}
              activeSessionTitle={activeSession?.title}
              onSessionUpdated={handleSessionUpdated}
              onStartNewChat={handleNewChat}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              targetRole={user?.target_role}
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
