import React from 'react';
import { Flag, Trash2, Calendar, UserCheck, AlertCircle } from 'lucide-react';
import { DonationOpportunity, User } from '../../shared/types/database';

interface OpportunityCardProps {
  opportunity: DonationOpportunity & { calculatedDist?: number };
  isSelected: boolean;
  onSelect: () => void;
  onFlag: () => void;
  currentUser?: User | null;
  onDelete?: (opportunity: DonationOpportunity) => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isSelected,
  onSelect,
  onFlag,
  currentUser,
  onDelete
}) => {
  const flagCount = opportunity.flags ? opportunity.flags.length : (opportunity.flags_count || 0);

  const isCreator = Boolean(
    currentUser &&
    opportunity.created_by &&
    (opportunity.created_by === currentUser.user_id || opportunity.created_by === currentUser.email)
  );

  return (
    <div
      className={`feedcard ${isSelected ? 'hl' : ''}`}
      onClick={onSelect}
      style={{ padding: '12px 14px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14 }}>{opportunity.name}</strong>
            {opportunity.end_date && (
              <span className="pill" style={{ fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar style={{ width: 11, height: 11 }} /> Until {new Date(opportunity.end_date).toLocaleDateString()}
              </span>
            )}
            {isCreator && (
              <span className="pill" style={{ fontSize: 11, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <UserCheck style={{ width: 11, height: 11 }} /> Your Upload
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {opportunity.address}
          </div>
        </div>

        {typeof opportunity.calculatedDist === 'number' && (
          <span className="pill" style={{ flexShrink: 0, fontWeight: 600, fontSize: 11 }}>
            {opportunity.calculatedDist} km away
          </span>
        )}
      </div>

      {opportunity.accepted_types && (
        <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text)' }}>Accepts: </strong>
          {opportunity.accepted_types}
        </div>
      )}

      {opportunity.post_snippet && (
        <div style={{ fontSize: 12, margin: '6px 0', fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          &ldquo;{opportunity.post_snippet}&rdquo;
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {opportunity.organizer ? `Organized by ${opportunity.organizer}` : 'Community Drop-off'}
        </span>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isCreator && onDelete && (
            <button
              type="button"
              className="btn btn-g"
              style={{
                padding: '3px 8px',
                fontSize: 11,
                color: '#dc2626',
                borderColor: '#fca5a5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Delete this donation drive (Only visible to you as the uploader)"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(opportunity);
              }}
            >
              <Trash2 className="ico" style={{ width: 12, height: 12, color: '#dc2626' }} /> Delete
            </button>
          )}

          <button
            type="button"
            className="btn btn-g"
            style={{
              padding: '3px 8px',
              fontSize: 11,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              ...(flagCount > 0 ? { color: '#dc2626', borderColor: '#fca5a5' } : {})
            }}
            title={flagCount > 0 ? `${flagCount} community report${flagCount === 1 ? '' : 's'}` : 'Report an issue'}
            onClick={(e) => {
              e.stopPropagation();
              onFlag();
            }}
          >
            {flagCount > 0
              ? <AlertCircle className="ico" style={{ width: 12, height: 12, color: '#dc2626' }} />
              : <Flag className="ico" style={{ width: 12, height: 12 }} />} Flag
          </button>
        </div>
      </div>
    </div>
  );
};
