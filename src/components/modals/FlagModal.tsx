import React, { useState } from 'react';
import { DonationOpportunity, DonationFlagType } from '../../types/database';

interface FlagModalProps {
  opportunity: DonationOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitFlag: (flagType: DonationFlagType, notes?: string) => Promise<void>;
}

export const FlagModal: React.FC<FlagModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSubmitFlag
}) => {
  const [flagType, setFlagType] = useState<DonationFlagType>('Inactive');
  const [flagNotes, setFlagNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !opportunity) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitFlag(flagType, flagNotes.trim() || undefined);
      setFlagNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modalScrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Report Donation Location</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Help keep the community informed about <strong>{opportunity.name}</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Report Reason</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: flagType === 'Inactive' ? '2px solid var(--danger)' : '1px solid var(--border)',
                background: flagType === 'Inactive' ? 'var(--danger-soft)' : 'var(--surface)',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="flagType"
                  value="Inactive"
                  checked={flagType === 'Inactive'}
                  onChange={() => setFlagType('Inactive')}
                />
                <div>
                  <strong style={{ fontSize: 13, display: 'block' }}>Inactive / Removed</strong>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>The collection bin or drive has been removed or is no longer accepting clothes.</span>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: flagType === 'Inaccurate' ? '2px solid #d97706' : '1px solid var(--border)',
                background: flagType === 'Inaccurate' ? 'rgba(217, 119, 6, 0.1)' : 'var(--surface)',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="flagType"
                  value="Inaccurate"
                  checked={flagType === 'Inaccurate'}
                  onChange={() => setFlagType('Inaccurate')}
                />
                <div>
                  <strong style={{ fontSize: 13, display: 'block' }}>Inaccurate Details</strong>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Address, hours, coordinates, or accepted garment types are incorrect.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label>Additional Notes (Optional)</label>
            <textarea
              rows={3}
              placeholder="e.g. Bin was moved behind the church gate; only open until 4pm."
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              style={{ width: '100%', fontSize: 12.5 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-g"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-d"
              style={{ flex: 1, justifyContent: 'center' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
