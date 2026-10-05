import React, { useState, useMemo } from 'react';
import { User, ClothingItem, Borrow, BSASAssessment } from '../types/database';
import { 
  UserCircle, 
  Trash2, 
  LogOut, 
  ChevronRight, 
  Copy, 
  Check, 
  Edit3, 
  BarChart2, 
  Clock, 
  Shirt, 
  Users 
} from 'lucide-react';
import { mockDatabase, deduplicateAssessments } from '../services/supabaseClient';

/**
 * ============================================================================
 * PROFILE VIEW (ProfileView.tsx)
 * ============================================================================
 * 
 * Implements wireframe layout from Figure .14.1 (SDD Pages 60 & 61):
 * - Left Column:
 *   1. Avatar Circle
 *   2. User Name (e.g. M. Cruz)
 *   3. 3-item stat strip: [X items] [X friends] [Xd streak]
 *   4. BSAS Questionnaire Results (mini bar chart)
 *   5. Action buttons: 'How to interpret' & 'Retake BSAS Test'
 * - Right Column:
 *   Stacked action menu card:
 *   - Edit Profile
 *   - Change Password
 *   - Closet Statistics
 *   - Create friend code
 *   - Requests
 *   - Log Out
 *   - Delete Account
 */

interface ProfileViewProps {
  currentUser: User;
  allUsers?: User[];
  garments: ClothingItem[];
  borrows: Borrow[];
  assessments?: BSASAssessment[];
  friendsCount?: number;
  onSwitchUser?: (userId: string) => Promise<void>;
  onDeleteAccount: () => void;
  onLogout?: () => void;
  onNavigateToView?: (view: string) => void;
  onStartRetakeAssessment?: () => void;
  toast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  garments,
  borrows,
  assessments = [],
  friendsCount = 4,
  onDeleteAccount,
  onLogout,
  onNavigateToView,
  onStartRetakeAssessment,
  toast
}) => {
  // Initials for avatar
  const initials = `${currentUser.first_name[0] || ''}${currentUser.last_name[0] || ''}`.toUpperCase();
  const displayName = `${currentUser.first_name[0] ? currentUser.first_name[0] + '.' : ''} ${currentUser.last_name || currentUser.first_name}`;

  // Modals for menu actions
  const [modalAction, setModalAction] = useState<'edit-profile' | 'friend-code' | null>(null);
  const [editFirstName, setEditFirstName] = useState(currentUser.first_name);
  const [editLastName, setEditLastName] = useState(currentUser.last_name);
  const [copiedCode, setCopiedCode] = useState(false);

  // Streak calculation (days logged)
  const streakDays = useMemo(() => {
    return Math.max(1, garments.reduce((acc, g) => acc + (g.worn_count ? 1 : 0), 0) % 15);
  }, [garments]);

  // Assessments sorted chronologically (oldest to newest for bar chart)
  const sortedAsc = useMemo(() => {
    return deduplicateAssessments(assessments).sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
  }, [assessments]);

  const handleCopyFriendCode = () => {
    if (currentUser.friend_code) {
      navigator.clipboard.writeText(currentUser.friend_code);
      setCopiedCode(true);
      toast('Friend code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim()) {
      toast('First name cannot be empty.');
      return;
    }
    const updatedUser: User = {
      ...currentUser,
      first_name: editFirstName.trim(),
      last_name: editLastName.trim()
    };
    mockDatabase.upsertUser(updatedUser);
    toast('Profile updated successfully!');
    setModalAction(null);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {/* 2-Column Grid on Desktop, 1 Column on Mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 32,
        alignItems: 'start'
      }}>
        {/* ================= LEFT COLUMN ================= */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          {/* 1. Avatar in Circle */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            marginBottom: 12
          }}>
            {initials || <UserCircle style={{ width: 44, height: 44 }} />}
          </div>

          {/* 2. User Name */}
          <h2 style={{
            margin: '0 0 10px',
            fontSize: 22,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--text)'
          }}>
            {displayName}
          </h2>

          {/* 3. Stats Strip: [X items] [X friends] [Xd streak] */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            padding: '8px 18px',
            background: 'var(--surface-2)',
            borderRadius: 24,
            marginBottom: 24,
            border: '1px solid var(--border)'
          }}>
            <div>
              <strong style={{ fontSize: 16, display: 'block', color: 'var(--text)' }}>
                {garments.length}
              </strong>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>items</span>
            </div>
            <div>
              <strong style={{ fontSize: 16, display: 'block', color: 'var(--text)' }}>
                {friendsCount}
              </strong>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>friends</span>
            </div>
            <div>
              <strong style={{ fontSize: 16, display: 'block', color: 'var(--text)' }}>
                {streakDays}d
              </strong>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>streak</span>
            </div>
          </div>

          {/* 4. BSAS Questionnaire Results (Mini Bar Chart) */}
          <div className="card" style={{ width: '100%', padding: '16px 14px', borderRadius: 14, marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 10 }}>
              BSAS Questionnaire Results
            </span>

            {sortedAsc.length === 0 ? (
              <div style={{ padding: '24px 8px', color: 'var(--text-muted)', fontSize: 12 }}>
                No BSAS records yet.
              </div>
            ) : (
              <div style={{
                height: 120,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                paddingBottom: 16,
                borderBottom: '1px solid var(--border)'
              }}>
                {sortedAsc.slice(-6).map((item, idx) => {
                  const dateLabel = new Date(item.taken_at).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
                  const barHeightPct = Math.max(15, (item.score / 7) * 85);
                  const isIndicative = item.score >= 4;

                  return (
                    <div 
                      key={item.assessment_id || idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        height: '100%',
                        justifyContent: 'flex-end',
                        width: '14%'
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: isIndicative ? 'var(--danger, #dc2626)' : 'var(--primary)' }}>
                        {item.score}
                      </span>
                      <div style={{
                        width: 14,
                        height: `${barHeightPct}%`,
                        borderRadius: '4px 4px 0 0',
                        background: isIndicative 
                          ? 'linear-gradient(180deg, #f87171, #dc2626)' 
                          : 'linear-gradient(180deg, var(--primary-soft), var(--primary))'
                      }} />
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                        {dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buttons: 'How to interpret' & 'Retake BSAS Test' */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-g"
                style={{ borderRadius: 20, fontSize: 11.5, padding: '5px 12px' }}
                onClick={() => onNavigateToView?.('recovery')}
              >
                How to interpret
              </button>

              <button
                type="button"
                className="btn btn-p"
                style={{ borderRadius: 20, fontSize: 11.5, padding: '5px 12px' }}
                onClick={onStartRetakeAssessment}
              >
                Retake BSAS Test
              </button>
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN: ACTION MENU LIST ================= */}
        <div className="card" style={{ padding: '8px 0', borderRadius: 14, overflow: 'hidden' }}>
          
          {/* 1. Edit Profile */}
          <button
            type="button"
            onClick={() => setModalAction('edit-profile')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--text)' }}>Edit Profile</span>
            <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          </button>

          {/* 3. Closet Statistics */}
          <button
            type="button"
            onClick={() => onNavigateToView?.('closet-statistics')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--text)' }}>Closet Statistics</span>
            <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          </button>

          {/* 4. Create friend code */}
          <button
            type="button"
            onClick={() => setModalAction('friend-code')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--text)' }}>Create friend code</span>
            <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          </button>

          {/* 5. Requests */}
          <button
            type="button"
            onClick={() => onNavigateToView?.('requests')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--text)' }}>Requests</span>
            <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          </button>

          {/* 6. Log Out */}
          <button
            type="button"
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--text)' }}>Log Out</span>
            <ChevronRight style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          </button>

          {/* 7. Delete Account */}
          <button
            type="button"
            onClick={onDeleteAccount}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ fontSize: 14, color: 'var(--danger, #dc2626)' }}>Delete Account</span>
            <ChevronRight style={{ width: 16, height: 16, color: 'var(--danger, #dc2626)' }} />
          </button>

        </div>
      </div>

      {/* Modal: Edit Profile */}
      {modalAction === 'edit-profile' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div className="card" style={{ maxWidth: 400, width: '100%', padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontFamily: 'var(--font-display)' }}>Edit Profile</h3>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>First Name</label>
                <input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Last Name</label>
                <input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-g" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModalAction(null)}>Cancel</button>
                <button type="submit" className="btn btn-p" style={{ flex: 1, justifyContent: 'center' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Friend Code */}
      {modalAction === 'friend-code' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div className="card" style={{ maxWidth: 400, width: '100%', padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontFamily: 'var(--font-display)' }}>Your Friend Code</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              Give this code to friends so they can view and borrow from your closet.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <input type="text" readOnly value={currentUser.friend_code} style={{ fontWeight: 700, fontFamily: 'monospace' }} />
              <button type="button" className="btn btn-p" style={{ fontSize: 12 }} onClick={handleCopyFriendCode}>
                {copiedCode ? <Check className="ico" /> : <Copy className="ico" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <button type="button" className="btn btn-g" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setModalAction(null)}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
