import React from 'react';
import { 
  Compass, 
  MessageSquare, 
  Code2, 
  BookOpen, 
  BarChart3, 
  CheckCircle2, 
  Building2, 
  LogOut, 
  User as UserIcon,
  Sparkles,
  Target
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onOpenAuth,
}) => {
  // Map legacy/sub-route tab IDs to the 3 primary destinations
  const activeTabId = 
    ['mentor', 'home', 'dashboard', 'coding', 'interview', 'mastery'].includes(currentTab) ? 'mentor' :
    ['progress', 'revisions', 'analytics'].includes(currentTab) ? 'progress' :
    ['profile', 'setup', 'companies'].includes(currentTab) ? 'profile' :
    'mentor';

  const navItems = [
    { id: 'mentor', label: 'My Mentor', icon: Sparkles },
    { id: 'progress', label: 'My Progress', icon: BarChart3 },
    { id: 'profile', label: 'My Profile', icon: Target },
  ];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="brand-icon-wrap">
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="brand-title">PrepPilot</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTabId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ width: '100%', textAlign: 'left', background: 'none' }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <>
            <div className="user-profile-widget">
              <div className="user-avatar">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.full_name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {user.target_role || 'Candidate'}
                </div>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="btn btn-secondary btn-sm" 
              style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--text-secondary)' }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <button 
            onClick={onOpenAuth}
            className="btn btn-primary btn-sm" 
            style={{ width: '100%' }}
          >
            <UserIcon size={16} />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>
    </aside>
  );
};
