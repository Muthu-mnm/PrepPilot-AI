import React, { useState } from 'react';
import { 
  Compass,
  GraduationCap,
  BarChart3, 
  Target, 
  LogOut, 
  User as UserIcon,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  X,
  Terminal,
  RotateCcw,
  BookOpen,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { User, ChatSessionMeta } from '../types';

export interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  sessions: ChatSessionMeta[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession?: (sessionId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onOpenAuth,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Map legacy/sub-route tab IDs to the 3 primary destinations
  const activeTabId = 
    ['mentor', 'home', 'dashboard', 'coding', 'interview', 'mastery'].includes(currentTab) ? 'mentor' :
    ['progress', 'revisions', 'analytics'].includes(currentTab) ? 'progress' :
    ['profile', 'setup', 'companies'].includes(currentTab) ? 'profile' :
    'mentor';

  const secondaryNavItems = [
    { id: 'mentor', label: 'My Mentor', icon: GraduationCap },
    { id: 'progress', label: 'My Progress', icon: BarChart3 },
    { id: 'profile', label: 'My Profile', icon: Target },
  ];

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || (s.preview && s.preview.toLowerCase().includes(q));
  });

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'coding':
        return <Terminal size={14} className="session-icon" />;
      case 'interview':
        return <Target size={14} className="session-icon" />;
      case 'retest':
        return <RotateCcw size={14} className="session-icon" />;
      case 'learn':
      case 'project_defense':
        return <BookOpen size={14} className="session-icon" />;
      default:
        return <MessageSquare size={14} className="session-icon" />;
    }
  };

  return (
    <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-logo-row">
          <div className="brand-icon-wrap" title="PrepPilot AI Placement Mentor">
            <Compass size={18} />
          </div>
          <div className="brand-title-wrap">
            <span className="brand-title">PrepPilot</span>
            <span className="brand-subtitle">AI Mentor</span>
          </div>
        </div>
        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse}
            className="sidebar-toggle-btn"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Main Action: + New Chat */}
      <div className="sidebar-action-wrap">
        <button
          onClick={onNewChat}
          className="btn-new-chat"
          title="Start a new conversation"
        >
          <Plus size={16} />
          <span>New chat</span>
        </button>
      </div>

      {/* Search Conversation History */}
      {sessions.length > 3 && (
        <div className="sidebar-search-wrap">
          <div className="sidebar-search-box">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="sidebar-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="clear-search-btn"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dominant Content: Conversation History */}
      <div className="sidebar-history-container">
        <div className="history-section-header">
          <span>Recent Conversations</span>
          <span className="history-count">{filteredSessions.length}</span>
        </div>

        <div className="sidebar-sessions-list">
          {filteredSessions.length === 0 ? (
            <div className="sidebar-empty-history">
              {searchQuery ? 'No matching conversations' : 'No previous conversations'}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = activeTabId === 'mentor' && session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    if (currentTab !== 'mentor') {
                      setCurrentTab('mentor');
                    }
                  }}
                  className={`sidebar-session-item ${isActive ? 'active' : ''}`}
                  title={session.title}
                >
                  {getModeIcon(session.mode)}
                  <div className="session-info">
                    <span className="session-title">{session.title}</span>
                  </div>
                  {onDeleteSession && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="session-delete-btn"
                      title="Delete conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Secondary Destinations: Visually Quiet */}
      <div className="sidebar-secondary-nav">
        <div className="secondary-divider" />
        <div className="secondary-nav-items">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTabId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`secondary-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account / Profile Footer */}
      <div className="sidebar-footer">
        {user ? (
          <div className="user-profile-row">
            <div className="user-avatar-small" title={user.full_name}>
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-meta-wrap">
              <span className="user-name-text">{user.full_name}</span>
              <span className="user-role-text">{user.target_role || 'Placement Candidate'}</span>
            </div>
            <button 
              onClick={onLogout}
              className="user-logout-btn" 
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="btn-auth-signin" 
          >
            <UserIcon size={15} />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
