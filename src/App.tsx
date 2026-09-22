import React from 'react';
import { ThemeToggle } from './components/ThemeToggle';

export const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <a href="/" className="brand-badge">
          <span className="subdomain">visualiser</span>
          <span className="tld">.nixlabs.tech</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="tag">28 stems</span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card">
          <h1 className="card-title">Stem Visualiser</h1>
          <p className="card-desc">
            Audio stems visualisation canvas. Refer to <span className="mono">BRAND_GUIDELINES.md</span> for styling and design system standards.
          </p>
        </div>
      </main>

      <ThemeToggle />
    </div>
  );
};
