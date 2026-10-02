import React from 'react';
import { MapPin, Navigation, Flag } from 'lucide-react';
import { DonationOpportunity } from '../../types/database';

interface OpportunityDrawerProps {
  opportunity: DonationOpportunity | null;
  onClose: () => void;
  onFlag: (opp: DonationOpportunity) => void;
}

export const OpportunityDrawer: React.FC<OpportunityDrawerProps> = ({
  opportunity,
  onClose,
  onFlag
}) => {
  if (!opportunity) return null;

  const flagCount = (opportunity.flags_count || 0) + (opportunity.flags?.length || 0);

  return (
    <div
      className="card"
      style={{
        border: '2px solid var(--primary)',
        background: 'var(--surface-2)',
        marginBottom: 14,
        position: 'relative'
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)'
        }}
      >
        ✕
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 16 }}>{opportunity.name}</strong>
            {flagCount > 0 ? (
              <span className="pill" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', fontWeight: 700 }}>
                ⚠️ {flagCount} Community Flag{flagCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="pill on">
                ✓ Verified Active
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin className="ico" style={{ width: 14, height: 14 }} />
            <span>{opportunity.address}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>OPERATING HOURS</div>
          <div style={{ fontSize: 12.5, marginTop: 2 }}>{opportunity.hours || 'Regular daily access'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ACCEPTED CLOTHING</div>
          <div style={{ fontSize: 12.5, marginTop: 2 }}>{opportunity.accepted_types || 'All clean apparel and textiles'}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>GEOGRAPHIC COORDINATES</div>
          <div style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>
            {opportunity.latitude.toFixed(5)}, {opportunity.longitude.toFixed(5)}
          </div>
        </div>
        {opportunity.organizer && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ORGANIZED BY</div>
            <div style={{ fontSize: 12.5, marginTop: 2 }}>{opportunity.organizer}</div>
          </div>
        )}
      </div>

      {opportunity.flags && opportunity.flags.length > 0 && (
        <div className="warn" style={{ marginTop: 12 }}>
          <strong>Community Reports:</strong>
          {opportunity.flags.map(f => (
            <div key={f.flag_id} style={{ marginTop: 4, fontSize: 12 }}>
              &bull; <strong>{f.flag_type}</strong>: {f.notes || 'Reported by community member'} ({new Date(f.flagged_at).toLocaleDateString()})
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([opportunity.address, opportunity.city, opportunity.province, opportunity.country].filter(Boolean).join(', '))}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-p"
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          <Navigation className="ico" style={{ width: 13, height: 13 }} /> Navigate via Google Maps
        </a>
        <button
          type="button"
          className="btn btn-g"
          style={{ fontSize: 12, padding: '6px 14px' }}
          onClick={() => onFlag(opportunity)}
        >
          <Flag className="ico" style={{ width: 13, height: 13 }} /> Report Issue
        </button>
      </div>
    </div>
  );
};
