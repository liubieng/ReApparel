import React from 'react';
import { 
  Shirt, 
  Calendar, 
  Leaf, 
  Users, 
  HeartHandshake, 
  UserCircle, 
  Settings, 
  LogOut, 
  MapPin,
  Sparkles,
  Database
} from 'lucide-react';
import { User } from '../../types/database';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'closet', label: 'Virtual Closet', icon: Shirt },
  { id: 'daily-log', label: 'Daily Outfit Log', icon: Calendar },
  { id: 'recovery', label: 'Recovery Progress', icon: Leaf },
  { id: 'requests', label: 'Lending & Requests', icon: HeartHandshake },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'donations', label: 'Donation Map', icon: MapPin },
  { id: 'profile', label: 'Profile', icon: UserCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  currentView: string;
  isOpen: boolean;
  currentUser: User | null;
  pendingRequestsCount?: number;
  pendingBorrowsCount?: number;
  pendingFriendsCount?: number;
  isBSASDue?: boolean;
  onSelectView: (viewId: string) => void;
  onCloseMobile: () => void;
  onLogout: () => void;
  onOpenDatabase: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  isOpen,
  currentUser,
  pendingRequestsCount = 0,
  pendingBorrowsCount,
  pendingFriendsCount = 0,
  isBSASDue = false,
  onSelectView,
  onCloseMobile,
  onLogout,
  onOpenDatabase
}) => {
  const borrowsCount = pendingBorrowsCount !== undefined ? pendingBorrowsCount : pendingRequestsCount;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="mobile-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }}
          onClick={onCloseMobile}
        />
      )}

      <nav className={`side ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shirt style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <strong style={{ fontSize: 16, fontFamily: 'var(--font-display)', display: 'block', color: 'var(--text)' }}>
              ReApparel
            </strong>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isRequests = item.id === 'requests';
            const isFriends = item.id === 'friends';
            const badgeCount = isRequests ? borrowsCount : isFriends ? pendingFriendsCount : 0;

            return (
              <button
                key={item.id}
                type="button"
                className={`navitem ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  width: '100%'
                }}
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
              >
                <Icon style={{ width: 16, height: 16 }} />
                <span style={{ flex: 1 }}>{item.label}</span>

                {/* Badge for pending requests & friend connections */}
                {badgeCount > 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: 'var(--danger)',
                    color: '#ffffff'
                  }}>
                    {badgeCount}
                  </span>
                )}

                {/* Notification when BSAS questionnaire is available to be retaken */}
                {item.id === 'recovery' && isBSASDue && (
                  <span 
                    title="BSAS Questionnaire is available to be retaken!"
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: 'var(--primary)',
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Due
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            className="btn btn-g"
            style={{ fontSize: 11.5, justifyContent: 'flex-start', padding: '6px 10px' }}
            onClick={onOpenDatabase}
          >
            <Database className="ico" style={{ width: 13, height: 13 }} />
            <span>Database Schema</span>
          </button>

          <button
            type="button"
            className="btn btn-g"
            style={{ fontSize: 11.5, justifyContent: 'flex-start', padding: '6px 10px', color: 'var(--danger)' }}
            onClick={onLogout}
          >
            <LogOut className="ico" style={{ width: 13, height: 13 }} />
            <span>Sign Out</span>
          </button>
        </div>

      </nav>
    </>
  );
};
