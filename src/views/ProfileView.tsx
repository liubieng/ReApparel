import React from 'react';
import { User, ClothingItem, Borrow } from '../types/database';
import { UserCircle, ShieldCheck, Leaf, Shirt, Trash2, ArrowRight } from 'lucide-react';

/**
 * ============================================================================
 * PROFILE VIEW (ProfileView.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT:
 * - Displays active user identity and sustainability statistics.
 * - Account Deletion Safeguard: Prevents deleting an account if active/unreturned borrows exist.
 */

interface ProfileViewProps {
  currentUser: User;
  allUsers?: User[];
  garments: ClothingItem[];
  borrows: Borrow[];
  onSwitchUser?: (userId: string) => Promise<void>;
  onDeleteAccount: () => void;
  toast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  allUsers,
  garments,
  borrows,
  onSwitchUser,
  onDeleteAccount,
  toast
}) => {
  const totalWears = garments.reduce((sum, g) => sum + (g.worn_count ?? g.wear_count ?? 0), 0);
  const initials = `${currentUser.first_name[0] || ''}${currentUser.last_name[0] || ''}`.toUpperCase();

  // Check if current user has active unreturned borrows (as borrower or lender)
  const activeUnreturned = borrows.filter(
    b => (b.status === 'Accepted' || (b.status as string) === 'approved') &&
         (b.borrower_id === currentUser.user_id || b.lender?.user_id === currentUser.user_id || b.item?.user_id === currentUser.user_id)
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>User Profile</h2>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Manage your account and view wardrobe sustainability impact
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {/* Profile Details Card */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700
            }}>
              {initials}
            </div>
            <div>
              <strong style={{ fontSize: 16, display: 'block', color: 'var(--text)' }}>
                {currentUser.first_name} {currentUser.last_name}
              </strong>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentUser.email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Friend Code:</span>
              <strong style={{ fontFamily: 'monospace' }}>{currentUser.friend_code}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Garments Registered:</span>
              <strong>{garments.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Cumulative Wears:</span>
              <strong style={{ color: 'var(--primary)' }}>{totalWears} wears</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Account Deletion Safeguard */}
      <div className="card" style={{ padding: 18, marginTop: 18, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--danger)', fontFamily: 'var(--font-display)' }}>
          Danger Zone
        </h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
          Deleting your account will erase your virtual closet and logs.
          {activeUnreturned.length > 0 && ' (Blocked: You have active unreturned borrows linked to your account).'}
        </p>

        <button
          type="button"
          className="btn btn-g"
          style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
          disabled={activeUnreturned.length > 0}
          onClick={onDeleteAccount}
        >
          <Trash2 className="ico" style={{ width: 13, height: 13 }} />
          <span>Delete Account &amp; Closet Data</span>
        </button>
      </div>
    </div>
  );
};
