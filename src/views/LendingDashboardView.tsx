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
import { Borrow, User } from '../types/database';
import { checkDateOverlap } from '../components/modals/BorrowModal';

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
  onNavigateToFriends?: () => void;
  toast: (msg: string) => void;
}

export const LendingDashboardView: React.FC<LendingDashboardViewProps> = ({
  currentUser,
  borrows,
  onCancelBorrow,
  onRespondBorrow,
  onNavigateToFriends,
  toast
}) => {
  const [activeTab, setActiveTab] = useState<'yours' | 'friends'>('yours');

  // Requests the current user sent to borrow other people's garments
  const myRequests = borrows.filter(b => b.borrower_id === currentUser.user_id);

  // Requests friends sent to borrow the current user's garments
  const friendsRequests = borrows.filter(b => {
    // Current user is the owner of the garment
    return b.lender?.user_id === currentUser.user_id || b.item?.user_id === currentUser.user_id;
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
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* 2-Column Split matching Figure .9.1: Your Requests & Friends Requests */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'start'
      }}>
        {/* COLUMN 1: Your Requests ∨ */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
              Your Requests
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {myRequests.length} total
            </span>
          </div>

          {myRequests.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shirt style={{ width: 40, height: 40, opacity: 0.35, margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--text)' }}>No requests yet</h4>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 320, marginInline: 'auto' }}>
                You haven't requested to borrow any items yet. Explore your friends' shared closets to request garments!
              </p>
              {onNavigateToFriends && (
                <button
                  type="button"
                  className="btn btn-p"
                  style={{ fontSize: 12.5, marginInline: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={onNavigateToFriends}
                >
                  <Users className="ico" style={{ width: 14, height: 14 }} />
                  <span>Browse Friends' Closets</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Item Image */}
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        backgroundColor: isHex ? item?.image_url : 'var(--surface)',
                        backgroundImage: isHex ? undefined : `url("${item?.image_url}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        flexShrink: 0,
                        border: '1px solid var(--border)'
                      }} />

                      {/* Details & Requestee */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--text)',
                            color: 'var(--surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700
                          }}>
                            {borrow.lender?.first_name ? borrow.lender.first_name[0] : 'F'}
                          </div>
                          <strong style={{ fontSize: 12.5, color: 'var(--text)' }}>
                            {borrow.lender ? `${borrow.lender.first_name} ${borrow.lender.last_name}` : 'Friend'}
                          </strong>
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                          {item?.name || `Garment #${borrow.item_id}`}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ background: 'var(--surface)', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                            Borrow: <strong>{borrow.start_date}</strong>
                          </div>
                          <div style={{ background: 'var(--surface)', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                            Return: <strong>{borrow.end_date}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill (Figure .9.1) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: isAccepted ? 'rgba(34, 197, 94, 0.15)' : isPending ? 'rgba(234, 179, 8, 0.15)' : 'var(--danger-soft)',
                        color: isAccepted ? '#16a34a' : isPending ? '#ca8a04' : 'var(--danger)'
                      }}>
                        STATUS: {borrow.status.toUpperCase()}
                      </span>

                      {isPending && (
                        <button
                          type="button"
                          className="btn btn-g"
                          style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)' }}
                          onClick={() => onCancelBorrow(borrow.borrow_id, borrow.start_date)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 2: Friends Requests ∨ */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
              Friends Requests
            </h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {friendsRequests.length} total
            </span>
          </div>

          {friendsRequests.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Shirt style={{ width: 36, height: 36, opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13 }}>No friends are currently requesting to borrow your garments.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {friendsRequests.map(borrow => {
                const item = borrow.item;
                const borrower = borrow.borrower;
                const borrowerName = borrower ? `${borrower.first_name} ${borrower.last_name}` : 'A friend';
                const isPending = borrow.status === 'Pending';
                const isAccepted = borrow.status === 'Accepted' || (borrow.status as string) === 'approved';

                return (
                  <div
                    key={borrow.borrow_id}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Item Image */}
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        backgroundColor: item?.image_url?.startsWith('#') ? item.image_url : 'var(--surface)',
                        backgroundImage: item?.image_url?.startsWith('#') ? undefined : `url("${item?.image_url}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        flexShrink: 0,
                        border: '1px solid var(--border)'
                      }} />

                      {/* Details & Requester */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700
                          }}>
                            {borrower?.first_name ? borrower.first_name[0] : 'U'}
                          </div>
                          <strong style={{ fontSize: 12.5, color: 'var(--text)' }}>
                            {borrowerName}
                          </strong>
                        </div>

                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                          "{item?.name || 'Garment'}"
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Dates: <strong>{borrow.start_date}</strong> to <strong>{borrow.end_date}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: [Accept] [Deny] matching Figure .9.1 */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-p"
                            style={{ fontSize: 11.5, padding: '5px 14px' }}
                            onClick={() => handleAcceptWithConflictCheck(borrow)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn-g"
                            style={{ fontSize: 11.5, padding: '5px 14px', color: 'var(--danger)' }}
                            onClick={() => onRespondBorrow(borrow.borrow_id, 'Rejected')}
                          >
                            Deny
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
      </div>
    </div>
  );
};
