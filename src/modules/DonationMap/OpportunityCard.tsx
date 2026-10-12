import React from 'react';
import { Flag } from 'lucide-react';
import { DonationOpportunity } from '../../types/database';

interface OpportunityCardProps {
  opportunity: DonationOpportunity & { calculatedDist?: number };
  isSelected: boolean;
  onSelect: () => void;
  onFlag: () => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isSelected,
  onSelect,
  onFlag
}) => {
  const flagCount = opportunity.flags ? opportunity.flags.length : (opportunity.flags_count || 0);

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
            {flagCount > 0 ? (
              <span className="pill" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', fontWeight: 600 }}>
                ⚠️ {flagCount} active flag{flagCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="pill on" style={{ fontSize: 11 }}>Active Bin</span>
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

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn btn-g"
            style={{ padding: '3px 8px', fontSize: 11 }}
            onClick={(e) => {
              e.stopPropagation();
              onFlag();
            }}
          >
            <Flag className="ico" style={{ width: 12, height: 12 }} /> Flag
          </button>

        </div>
      </div>
    </div>
  );
};
