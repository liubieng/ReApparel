import React from 'react';
import { Settings, Sun, Moon, Database, Bell, ShieldCheck } from 'lucide-react';

interface SettingsViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenDatabaseModal: () => void;
  toast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  onOpenDatabaseModal,
  toast
}) => {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>Settings</h2>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Application preferences, visual theme, and database settings
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Appearance Card */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontFamily: 'var(--font-display)' }}>Appearance</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: 13, display: 'block' }}>Visual Theme</strong>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Currently using {theme} mode</span>
            </div>
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun className="ico" /> : <Moon className="ico" />}
              <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>

        {/* Database & Cloud Connection Card */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, fontFamily: 'var(--font-display)' }}>Database Configuration</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
            ReApparel runs seamlessly with zero-config offline storage and can connect to Supabase PostgreSQL in production.
          </p>
          <button
            type="button"
            className="btn btn-p"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={onOpenDatabaseModal}
          >
            <Database className="ico" />
            <span>Open Database Schema &amp; Connection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
