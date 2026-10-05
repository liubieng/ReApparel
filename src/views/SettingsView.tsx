import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { safeStorage } from '../services/supabaseClient';

/**
 * ============================================================================
 * SETTINGS VIEW (SettingsView.tsx)
 * ============================================================================
 * 
 * Implements wireframe layout from Figure .15.1 (SDD Pages 62 & 63):
 * - Header: 'Settings'
 * - Card 1: 'Appearance'
 *   - 'Dark Mode' row with subtitle 'Deeper greens, easier at night' and toggle switch
 * - Card 2: 'Notifications' (TC_NOTIF_01 - TC_NOTIF_05)
 *   - 'Borrow requests' (default ON)
 *   - 'Recovery milestones' (default ON)
 *   - 'Donation drives near me' (default ON)
 *   - 'Friend activity' (default OFF)
 *   - Persistence via safeStorage
 *   - Offline detection: if offline, display 'Notification preference could not be saved.' and revert
 * - Centered button at bottom: 'Delete account'
 */

interface SettingsViewProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenDatabaseModal?: () => void;
  onDeleteAccount?: () => void;
  toast: (msg: string) => void;
}

interface NotificationPrefs {
  borrowRequests: boolean;
  recoveryMilestones: boolean;
  donationDrives: boolean;
  friendActivity: boolean;
}

const STORAGE_KEY_NOTIF_PREFS = 'reapparel_notification_prefs';

const DEFAULT_PREFS: NotificationPrefs = {
  borrowRequests: true,
  recoveryMilestones: true,
  donationDrives: true,
  friendActivity: false
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  onOpenDatabaseModal,
  onDeleteAccount,
  toast
}) => {
  // Load notification preferences from storage or use defaults
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    try {
      const stored = safeStorage.getItem(STORAGE_KEY_NOTIF_PREFS);
      if (stored) {
        return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
      }
    } catch {}
    return DEFAULT_PREFS;
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync to safeStorage
  const handleTogglePref = (key: keyof NotificationPrefs, label: string) => {
    setErrorMessage(null);

    // Check online status (TC_NOTIF_05)
    const isOffline = !navigator.onLine;
    if (isOffline) {
      const msg = 'Notification preference could not be saved.';
      setErrorMessage(msg);
      toast(msg);
      // Revert/preserve current state (do not update prefs or safeStorage)
      return;
    }

    const nextValue = !prefs[key];
    const updated = {
      ...prefs,
      [key]: nextValue
    };

    setPrefs(updated);
    safeStorage.setItem(STORAGE_KEY_NOTIF_PREFS, JSON.stringify(updated));
    toast(`${label} notifications ${nextValue ? 'enabled' : 'disabled'}`);
  };

  // Toggle switch helper component matching wireframe
  const renderToggle = (checked: boolean, onToggle: () => void, label: string) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? 'var(--primary, #059669)' : 'var(--border, #d1d5db)',
        border: 'none',
        padding: 2,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.2s ease',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          transform: checked ? 'translateX(20px)' : 'translateX(0px)',
          transition: 'transform 0.2s ease'
        }}
      />
    </button>
  );

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', width: '100%', padding: '10px 0 40px' }}>
      
      {/* 1. Appearance Card (Figure .15.1) */}
      <div className="card" style={{ padding: 22, borderRadius: 14, marginBottom: 18 }}>
        <h3 style={{ 
          margin: '0 0 16px', 
          fontSize: 15, 
          fontFamily: 'var(--font-display)',
          color: 'var(--text)' 
        }}>
          Appearance
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
              Dark Mode
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Deeper greens, easier at night
            </span>
          </div>

          {renderToggle(theme === 'dark', onToggleTheme, 'Toggle Dark Mode')}
        </div>
      </div>

      {/* 2. Notifications Card (TC_NOTIF_01 - TC_NOTIF_05) */}
      <div className="card" style={{ padding: 22, borderRadius: 14, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: 15, 
            fontFamily: 'var(--font-display)',
            color: 'var(--text)' 
          }}>
            Notification Preferences
          </h3>
        </div>

        {/* Offline Error Banner (TC_NOTIF_05) */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--danger)',
            fontSize: 12.5,
            fontWeight: 600,
            marginBottom: 16
          }}>
            <AlertTriangle className="ico" style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Row 1: Borrow requests (default ON) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingBottom: 14,
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
              Borrow requests
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Alerts when friends request to borrow garments or accept your loans
            </span>
          </div>

          {renderToggle(
            prefs.borrowRequests, 
            () => handleTogglePref('borrowRequests', 'Borrow requests'),
            'Toggle borrow requests notifications'
          )}
        </div>

        {/* Row 2: Recovery milestones (default ON) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: 14,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
              Recovery milestones
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Updates on BSAS recovery progress, streaks, and check-in reminders
            </span>
          </div>

          {renderToggle(
            prefs.recoveryMilestones, 
            () => handleTogglePref('recoveryMilestones', 'Recovery milestones'),
            'Toggle recovery milestones notifications'
          )}
        </div>

        {/* Row 3: Donation drives near me (default ON) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: 14,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
              Donation drives near me
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Notifications when new textile recycling drop-offs open in your area
            </span>
          </div>

          {renderToggle(
            prefs.donationDrives, 
            () => handleTogglePref('donationDrives', 'Donation drives near me'),
            'Toggle donation drives notifications'
          )}
        </div>

        {/* Row 4: Friend activity (default OFF) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: 14
        }}>
          <div>
            <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
              Friend activity
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Social updates when friends upload new garments to their shared closets
            </span>
          </div>

          {renderToggle(
            prefs.friendActivity, 
            () => handleTogglePref('friendActivity', 'Friend activity'),
            'Toggle friend activity notifications'
          )}
        </div>
      </div>

      {/* 3. Centered 'Delete account' Button (Figure .15.1) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          className="btn btn-g"
          style={{
            minWidth: 260,
            justifyContent: 'center',
            borderRadius: 24,
            padding: '10px 24px',
            fontSize: 14,
            fontWeight: 600,
            background: 'var(--surface-2)',
            color: 'var(--danger, #dc2626)',
            borderColor: 'var(--border)'
          }}
          onClick={onDeleteAccount}
        >
          Delete account
        </button>
      </div>

    </div>
  );
};
