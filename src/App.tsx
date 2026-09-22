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
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Visualiser root */}
      </main>

      <ThemeToggle />
    </div>
  );
};
