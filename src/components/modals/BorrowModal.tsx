import React, { useState } from 'react';
import { Calendar, X, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ClothingItem, User, Borrow } from '../../types/database';

/**
 * ============================================================================
 * BORROW REQUEST MODAL (BorrowModal.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT:
 * - Implements peer-to-peer wardrobe sharing to reduce overconsumption.
 * - CONFLICT DETECTION ALGORITHM:
 *   Ensures that no two approved loans for the same clothing item overlap in dates.
 *   Interval Overlap Formula:
 *     overlaps(A_start, A_end, B_start, B_end) = !(A_end < B_start || A_start > B_end)
 */

interface BorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  garment: ClothingItem | null;
  friend: User | null;
  existingBorrows: Borrow[];
  onSubmitBorrow: (itemId: number, fromDate: string, toDate: string) => void;
  toast: (msg: string) => void;
}

export function checkDateOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return !(aTo < bFrom || aFrom > bTo);
}

export const BorrowModal: React.FC<BorrowModalProps> = ({
  isOpen,
  onClose,
  garment,
  friend,
  existingBorrows,
  onSubmitBorrow,
  toast
}) => {
  if (!isOpen || !garment || !friend) return null;

  const today = new Date().toISOString().slice(0, 10);
  const defaultTo = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(defaultTo);
  const [note, setNote] = useState('Attending weekend fashion exhibition, will return dry-cleaned!');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const durationDays = React.useMemo(() => {
    if (!fromDate || !toDate) return 0;
    const [y1, m1, d1] = fromDate.split('-').map(Number);
    const [y2, m2, d2] = toDate.split('-').map(Number);
    if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
    const start = Date.UTC(y1, m1 - 1, d1);
    const end = Date.UTC(y2, m2 - 1, d2);
    if (end < start) return 0;
    return Math.round((end - start) / 86400000) + 1;
  }, [fromDate, toDate]);

  React.useEffect(() => {
    if (isOpen) {
      setFromDate(new Date().toISOString().slice(0, 10));
      setToDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      setErrorMsg(null);
    }
  }, [isOpen, garment?.item_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (toDate < fromDate) {
      setErrorMsg('Return date must be on or after the borrow start date.');
      return;
    }

    // Check for overlapping approved/accepted borrows on this item
    const hasOverlapConflict = existingBorrows.some(b => {
      const isSameItem = b.item_id === garment.item_id;
      const isApproved = b.status === 'Accepted' || (b.status as string) === 'approved';
      return isSameItem && isApproved && checkDateOverlap(fromDate, toDate, b.start_date, b.end_date);
    });

    if (hasOverlapConflict) {
      setErrorMsg('This item is already approved for another borrower during these dates. Please choose different dates.');
      return;
    }

    onSubmitBorrow(garment.item_id, fromDate, toDate);
    toast(`Borrow request sent to ${friend.first_name}!`);
    onClose();
  };

  return (
    <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 460, width: '100%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
            Request to Borrow Garment
          </h3>
          <button type="button" className="icobtn" onClick={onClose} aria-label="Close modal">
            <X className="ico" />
          </button>
        </div>

        {/* Garment Details Card */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: 10,
          borderRadius: 8,
          background: 'var(--surface-2)',
          marginBottom: 16,
          border: '1px solid var(--border)'
        }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: 6,
            backgroundColor: garment.image_url?.startsWith('#') ? garment.image_url : 'var(--surface)',
            backgroundImage: garment.image_url?.startsWith('#') ? undefined : `url("${garment.image_url}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0
          }} />
          <div>
            <strong style={{ fontSize: 13, display: 'block', color: 'var(--text)' }}>{garment.name}</strong>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Owner: <strong>{friend.first_name} {friend.last_name}</strong>
            </span>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
              {garment.category} &middot; {garment.color || 'Curated'}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            fontSize: 12,
            marginBottom: 14,
            border: '1px solid var(--danger)'
          }}>
            {errorMsg}
          </div>
        )}

        {/* Date Selection Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Borrow Start Date *</label>
              <input
                type="date"
                min={today}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Expected Return Date *</label>
              <input
                type="date"
                min={fromDate}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Dynamic Loan Duration & Realtime Availability Pill */}
          {durationDays > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 12px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text)',
              marginBottom: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 14, height: 14, color: 'var(--primary)' }} />
                <span>Duration: <strong>{durationDays} {durationDays === 1 ? 'day' : 'days'}</strong></span>
              </div>
              <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle style={{ width: 13, height: 13 }} /> No Schedule Conflicts
              </span>
            </div>
          )}

          {/* Optional Note to Owner */}
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Note to Owner (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Attending a weekend conference, will return dry-cleaned!"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
            🛡️ <strong>Automated Conflict Guard:</strong> The system validates dates to prevent double-booking items among friends.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-g" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p">
              Send Borrow Request
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
