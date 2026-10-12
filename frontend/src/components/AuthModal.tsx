import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Briefcase } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [targetRole, setTargetRole] = useState('Software Development Engineer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          email,
          password,
          full_name: fullName,
          target_role: targetRole,
        });
        api.setToken(res.access_token);
        onLoginSuccess(res.user);
      } else {
        const res = await api.login({ email, password });
        api.setToken(res.access_token);
        onLoginSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('teststudent@preppilot.ai');
    setPassword('password123');
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email: 'teststudent@preppilot.ai', password: 'password123' });
      api.setToken(res.access_token);
      onLoginSuccess(res.user);
      onClose();
    } catch {
      // If demo account not registered yet, register it directly
      try {
        const regRes = await api.register({
          email: 'teststudent@preppilot.ai',
          password: 'password123',
          full_name: 'Alex Sharma',
          target_role: 'Software Development Engineer'
        });
        api.setToken(regRes.access_token);
        onLoginSuccess(regRes.user);
        onClose();
      } catch (err: any) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(17, 24, 39, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: 'var(--shadow-elevated)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {isRegister ? 'Create PrepPilot Account' : 'Welcome to PrepPilot AI'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
          {isRegister ? 'Sign up to track learning history and revision queues.' : 'Sign in to access your mock interview rooms and coding history.'}
        </p>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-control"
                    placeholder="e.g. Alex Sharma"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Software Development Engineer"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              placeholder="candidate@university.edu"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
            {loading ? 'Authenticating...' : isRegister ? 'Register & Begin' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '16px 0', textAlign: 'center', position: 'relative' }}>
          <span style={{ background: 'var(--bg-surface)', padding: '0 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            or quick demo access
          </span>
        </div>

        <button onClick={handleDemoLogin} disabled={loading} className="btn btn-secondary" style={{ width: '100%' }}>
          <span>Instant One-Click Demo Access</span>
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
};
