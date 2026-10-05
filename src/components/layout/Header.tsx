import React from 'react';
import { Menu, Sun, Moon, UserCircle } from 'lucide-react';
import { User } from '../../types/database';

interface HeaderProps {
  currentView: string;
  theme: 'light' | 'dark';
  currentUser: User | null;
  onOpenMobileSidebar: () => void;
  onToggleTheme: () => void;
  onNavigateToProfile?: () => void;
  customTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  theme,
  currentUser,
  onOpenMobileSidebar,
  onToggleTheme,
  onNavigateToProfile,
  customTitle
}) => {
  // Title mapping matching wireframes
  const getWireframeTitle = () => {
    if (customTitle) return customTitle;
    switch (currentView) {
      case 'closet':
        return 'My Closet';
      case 'recovery':
        return 'Recovery Progress';
      case 'closet-statistics':
        return 'Closet Statistics';
      case 'notifications':
        return 'Notification';
      case 'requests':
        return 'Requests';
      case 'friends':
        return 'Friends';
      case 'all-friends-closets':
        return 'Friends Closets';
      case 'donations':
        return 'Donation Opportunities';
      case 'profile':
        return 'Profile';
      case 'settings':
        return 'Settings';
      case 'daily-log':
        return 'Daily Clothing Log';
      default:
        return 'ReApparel';
    }
  };

  const title = getWireframeTitle();
  const displayName = currentUser
    ? `${currentUser.first_name ? currentUser.first_name[0] + '.' : ''} ${currentUser.last_name || currentUser.first_name || 'User'}`
    : 'M. Cruz';

  return (
    <div className="top" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 15
    }}>
      {/* Mobile Menu Icon (Mobile Only) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          className="icobtn mobile-menu-btn"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation sidebar"
        >
          <Menu className="ico" style={{ width: 18, height: 18 }} />
        </button>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          margin: 0,
          color: 'var(--text)',
          fontWeight: 600
        }}>
          {title}
        </h1>
      </div>

      {/* Right: Theme Toggle & User Profile Chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="icobtn"
          onClick={onToggleTheme}
          aria-label="Toggle visual theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="ico" style={{ width: 17, height: 17 }} /> : <Moon className="ico" style={{ width: 17, height: 17 }} />}
        </button>

        {/* User Chip matching wireframe: [Name] [Avatar] */}
        <button
          type="button"
          onClick={onNavigateToProfile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 8px 4px 12px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
          title="View Profile"
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {displayName}
          </span>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--text)',
            color: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCircle style={{ width: 20, height: 20 }} />
          </div>
        </button>
      </div>
    </div>
  );
};
