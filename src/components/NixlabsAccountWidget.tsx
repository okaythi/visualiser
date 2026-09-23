/**
 * Nixlabs Ecosystem Account Widget.
 * Concern: Floating avatar control and dynamic ecosystem drawer supporting real SSO session resolution.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

export interface NixlabsUser {
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

export interface AppEntry {
  id: string;
  name: string;
  description: string;
  url: string;
}

interface SessionResponse {
  authenticated?: boolean;
  user?: {
    name: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  };
}

interface EcosystemResponse {
  apps?: AppEntry[];
}

export interface NixlabsAccountWidgetProps {
  currentApp?: string;
  user?: NixlabsUser | null;
  onLogout?: () => void;
}

function detectCurrentApp(propApp?: string): string {
  if (propApp) return propApp;
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 3 && parts[parts.length - 2] === 'nixlabs') {
    return parts[0] || '';
  }
  return '';
}

export const NixlabsAccountWidget: React.FC<NixlabsAccountWidgetProps> = ({
  currentApp: propApp,
  user: propUser,
  onLogout
}) => {
  const currentApp = detectCurrentApp(propApp);
  const [isOpen, setIsOpen] = useState(false);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [sessionUser, setSessionUser] = useState<NixlabsUser | null>(propUser ?? null);
  const [theme, toggleTheme] = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (propUser !== undefined) {
      setSessionUser(propUser);
    }
  }, [propUser]);

  useEffect(() => {
    if (propUser !== undefined) return;

    let isMounted = true;
    fetch('https://accounts.nixlabs.tech/api/session', {
      credentials: 'include'
    })
      .then((r) => (r.ok ? (r.json() as Promise<SessionResponse>) : null))
      .then((data: SessionResponse | null) => {
        if (!isMounted) return;
        if (data?.authenticated && data.user) {
          setSessionUser({
            name: data.user.name,
            email: data.user.email || (data.user.name ? `${data.user.name.toLowerCase()}@nixlabs.tech` : ''),
            role: data.user.role || 'USER',
            avatarUrl: data.user.avatarUrl || '/avatar.png'
          });
        } else {
          setSessionUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setSessionUser(null);
      });

    return () => {
      isMounted = false;
    };
  }, [propUser]);

  useEffect(() => {
    fetch('/ecosystem.json')
      .then((r) => r.json() as Promise<EcosystemResponse>)
      .then((data: EcosystemResponse) => {
        if (Array.isArray(data?.apps)) {
          setApps(data.apps);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    try {
      const isSubdomain = window.location.hostname.endsWith('nixlabs.tech');
      const domainAttr = isSubdomain ? '; Domain=.nixlabs.tech' : '';
      document.cookie = `_nixlabs_theme=${next}${domainAttr}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
  };

  const handleLogout = async () => {
    setIsOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await fetch('https://accounts.nixlabs.tech/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {}
    const redirectTarget = typeof window !== 'undefined' ? window.location.href : 'https://nixlabs.tech';
    window.location.href = `https://accounts.nixlabs.tech/login?r=${encodeURIComponent(redirectTarget)}`;
  };

  const isAuthenticated = sessionUser !== null;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://nixlabs.tech';
  const loginUrl = `https://accounts.nixlabs.tech/login?r=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="nixlabs-account-widget">
      <button
        ref={buttonRef}
        type="button"
        className={`nixlabs-avatar-btn ${isOpen ? 'active' : ''} ${!isAuthenticated ? 'unauthenticated' : ''}`}
        aria-label="Account Menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isAuthenticated ? (
          <>
            <img
              src={sessionUser.avatarUrl || '/avatar.png'}
              alt={sessionUser.name}
              className="nixlabs-avatar-img"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="nixlabs-avatar-fallback">{sessionUser.name.charAt(0)}</span>
            <span className="nixlabs-status-dot" />
          </>
        ) : (
          <span className="nixlabs-avatar-guest" title="Sign In">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
        )}
      </button>

      {isOpen && (
        <div ref={menuRef} className="nixlabs-account-card" role="dialog" aria-modal="true">
          {isAuthenticated ? (
            <div className="nixlabs-card-header">
              <div className="nixlabs-header-avatar">
                <img
                  src={sessionUser.avatarUrl || '/avatar.png'}
                  alt={sessionUser.name}
                  className="nixlabs-header-avatar-img"
                />
                <span className="nixlabs-header-fallback">{sessionUser.name.charAt(0)}</span>
              </div>
              <div className="nixlabs-header-details">
                <div className="nixlabs-header-name-row">
                  <span className="nixlabs-user-name">{sessionUser.name}</span>
                  {sessionUser.role && <span className="nixlabs-role-badge">{sessionUser.role}</span>}
                </div>
                {sessionUser.email && <span className="nixlabs-user-email">{sessionUser.email}</span>}
              </div>
            </div>
          ) : (
            <div className="nixlabs-card-header">
              <div className="nixlabs-header-avatar">
                <span className="nixlabs-header-fallback">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              </div>
              <div className="nixlabs-header-details">
                <div className="nixlabs-header-name-row">
                  <span className="nixlabs-user-name">Guest</span>
                  <span className="nixlabs-role-badge" style={{ opacity: 0.65 }}>ANONYMOUS</span>
                </div>
                <span className="nixlabs-user-email">Not authenticated</span>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div style={{ padding: '0.4rem 0' }}>
              <a href={loginUrl} className="nixlabs-signin-btn">
                <span>Sign In with Nixlabs</span>
                <span className="nixlabs-link-arrow">→</span>
              </a>
            </div>
          )}

          <div className="nixlabs-card-divider" />

          <div className="nixlabs-menu-section">
            <div className="nixlabs-section-label">ECOSYSTEM</div>
            <div className="nixlabs-apps-list">
              {apps.map((app) => {
                const isCurrent = app.id === currentApp;
                return (
                  <a
                    key={app.id}
                    href={app.url}
                    className={`nixlabs-app-item ${isCurrent ? 'current' : ''}`}
                    onClick={(e) => {
                      if (isCurrent) {
                        e.preventDefault();
                        setIsOpen(false);
                      }
                    }}
                  >
                    <span className="nixlabs-app-indicator">{isCurrent ? '●' : '○'}</span>
                    <div className="nixlabs-app-meta">
                      <span className="nixlabs-app-name">
                        {app.name}
                        {isCurrent && <span className="nixlabs-current-tag"> (current)</span>}
                      </span>
                      <span className="nixlabs-app-desc">{app.description}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="nixlabs-card-divider" />

          <div className="nixlabs-menu-section">
            <div className="nixlabs-section-label">PREFERENCES</div>
            <div className="nixlabs-action-row">
              <span className="nixlabs-action-label">Theme</span>
              <button
                type="button"
                className="nixlabs-theme-toggle-btn"
                onClick={handleToggleTheme}
              >
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                <span className="nixlabs-theme-icon">{theme === 'dark' ? '☼' : '☽'}</span>
              </button>
            </div>

            {currentApp !== 'security' && (
              <a
                href="https://security.nixlabs.tech"
                className="nixlabs-action-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Sovereign Vault</span>
                <span className="nixlabs-link-arrow">↗</span>
              </a>
            )}
          </div>

          {isAuthenticated && (
            <>
              <div className="nixlabs-card-divider" />
              <div className="nixlabs-card-footer">
                <button
                  type="button"
                  className="nixlabs-signout-btn"
                  onClick={handleLogout}
                >
                  <span>Sign Out</span>
                  <span className="nixlabs-signout-icon">⎋</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
