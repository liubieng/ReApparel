import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Calendar, 
  Shirt, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Borrow, User } from '../../types/database';
import { checkDateOverlap } from './BorrowModal';

/**
 * ============================================================================
 * LENDING & BORROWING DASHBOARD VIEW (LendingDashboardView.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT & METHODOLOGY:
 * - Manages peer-to-peer garment lifecycle states (Pending -> Accepted -> Returned).
 * - CONFLICT AVOIDANCE:
 *   When a lender accepts a borrow request, the system verifies that the requested
 *   date range does not conflict with another already-approved borrow for that item.
 */

interface LendingDashboardViewProps {
  currentUser: User;
  borrows: Borrow[];
  onCancelBorrow: (borrowId: number, startDate: string) => void;
  onRespondBorrow: (borrowId: number, newStatus: 'Accepted' | 'Rejected' | 'Returned') => void;
  toast: (msg: string) => void;
}

export const LendingDashboardView: React.FC<LendingDashboardViewProps> = ({
  currentUser,
  borrows,
  onCancelBorrow,
  onRespondBorrow,
  toast
}) => {
  const [activeTab, setActiveTab] = useState<'yours' | 'friends'>('yours');

  // Requests the current user sent to borrow other people's garments
  const myRequests = borrows.filter(b => b.borrower_id === currentUser.user_id);

  // Requests friends sent to borrow the current user's garments
  const friendsRequests = borrows.filter(b => {
    // Current user is the owner of the garment
    return b.borrower_id !== currentUser.user_id;
  });

  const handleAcceptWithConflictCheck = (borrow: Borrow) => {
    // Double-check for conflicts with other approved borrows for this garment
    const hasConflict = borrows.some(other => {
      return other.borrow_id !== borrow.borrow_id &&
             other.item_id === borrow.item_id &&
             (other.status === 'Accepted' || (other.status as string) === 'approved') &&
             checkDateOverlap(borrow.start_date, borrow.end_date, other.start_date, other.end_date);
    });

    if (hasConflict) {
      toast('Cannot accept: Dates overlap another currently approved loan for this item.');
      return;
    }

    onRespondBorrow(borrow.borrow_id, 'Accepted');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>
            Lending &amp; Borrow Requests
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Peer-to-peer wardrobe sharing schedules and loan confirmations
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'yours' ? 'btn-p' : 'btn-g'}`}
          style={{ fontSize: 13 }}
          onClick={() => setActiveTab('yours')}
        >
          My Borrow Requests ({myRequests.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'friends' ? 'btn-p' : 'btn-g'}`}
          style={{ fontSize: 13 }}
          onClick={() => setActiveTab('friends')}
        >
          Friends' Requests for My Clothes ({friendsRequests.length})
        </button>
      </div>

      {/* Content for TAB 1: My Borrow Requests */}
      {activeTab === 'yours' && (
        <div>
          {myRequests.length === 0 ? (
            <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shirt style={{ width: 36, height: 36, opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13 }}>You haven't requested to borrow any items yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myRequests.map(borrow => {
                const item = borrow.item;
                const isHex = item?.image_url?.startsWith('#');
                const isPending = borrow.status === 'Pending';
                const isAccepted = borrow.status === 'Accepted' || (borrow.status as string) === 'approved';
                const isReturned = borrow.status === 'Returned';
                const isRejected = borrow.status === 'Rejected';

                return (
                  <div
                    key={borrow.borrow_id}
                    className="card"
                    style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        background: isHex ? item?.image_url : 'var(--surface-2)',
                        backgroundImage: isHex ? undefined : `url(${item?.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        flexShrink: 0
                      }} />
                      <div>
                        <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
                          {item?.name || `Garment #${borrow.item_id}`}
                        </strong>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Schedule: <strong>{borrow.start_date}</strong> to <strong>{borrow.end_date}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Status Badge */}
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: isAccepted ? 'rgba(34, 197, 94, 0.1)' : isPending ? 'rgba(234, 179, 8, 0.1)' : 'var(--surface-2)',
                        color: isAccepted ? '#16a34a' : isPending ? '#ca8a04' : isRejected ? 'var(--danger)' : 'var(--text-muted)',
                        border: `1px solid ${isAccepted ? '#16a34a' : isPending ? '#ca8a04' : 'var(--border)'}`
                      }}>
                        {borrow.status}
                      </span>

                      {/* Cancel Button if pending */}
                      {isPending && (
                        <button
                          type="button"
                          className="btn btn-g"
                          style={{ fontSize: 11, padding: '4px 8px', color: 'var(--danger)' }}
                          onClick={() => onCancelBorrow(borrow.borrow_id, borrow.start_date)}
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content for TAB 2: Friends' Requests for My Clothes */}
      {activeTab === 'friends' && (
        <div>
          {friendsRequests.length === 0 ? (
            <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shirt style={{ width: 36, height: 36, opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13 }}>No friends are currently requesting to borrow your garments.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {friendsRequests.map(borrow => {
                const item = borrow.item;
                const borrower = borrow.borrower;
                const borrowerName = borrower ? `${borrower.first_name} ${borrower.last_name}` : 'A friend';
                const isPending = borrow.status === 'Pending';
                const isAccepted = borrow.status === 'Accepted' || (borrow.status as string) === 'approved';
                const isReturned = borrow.status === 'Returned';

                return (
                  <div
                    key={borrow.borrow_id}
                    className="card"
                    style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        background: item?.image_url?.startsWith('#') ? item.image_url : 'var(--surface-2)',
                        backgroundImage: item?.image_url?.startsWith('#') ? undefined : `url(${item?.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        flexShrink: 0
                      }} />
                      <div>
                        <strong style={{ fontSize: 13.5, display: 'block', color: 'var(--text)' }}>
                          {borrowerName} wants to borrow "{item?.name || 'Garment'}"
                        </strong>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Dates: <strong>{borrow.start_date}</strong> to <strong>{borrow.end_date}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-p"
                            style={{ fontSize: 11.5, padding: '4px 10px' }}
                            onClick={() => handleAcceptWithConflictCheck(borrow)}
                          >
                            Accept Request
                          </button>
                          <button
                            type="button"
                            className="btn btn-g"
                            style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--danger)' }}
                            onClick={() => onRespondBorrow(borrow.borrow_id, 'Rejected')}
                          >
                            Decline
                          </button>
                        </>
                      ) : isAccepted ? (
                        <button
                          type="button"
                          className="btn btn-g"
                          style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                          onClick={() => onRespondBorrow(borrow.borrow_id, 'Returned')}
                        >
                          <CheckCircle2 className="ico" style={{ width: 13, height: 13 }} />
                          <span>Mark as Returned</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                          Status: {borrow.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
