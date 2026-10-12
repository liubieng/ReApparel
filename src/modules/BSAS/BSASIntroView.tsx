import React from 'react';
import { Shirt, Info, ArrowRight } from 'lucide-react';

/**
 * ============================================================================
 * BSAS QUESTIONNAIRE PROMPT VIEW (BSASIntroView.tsx)
 * ============================================================================
 * 
 * Implements wireframe layout from Figure .2.1 & .2.2 (SDD Pages 36, 37, 38):
 * - Center Logo / Hanger icon
 * - Heading: "A quick check-in"
 * - Subheading: "Before we build your closet, take the Bergen Shopping Addiction Scale Questionnaire..."
 * - Info Box: "ⓘ This is a self-reflection tool, not a medical diagnosis..."
 * - Button: "Begin" (or "Take BSAS Now")
 */

interface BSASIntroViewProps {
  onStartAssessment: () => void;
}

export const BSASIntroView: React.FC<BSASIntroViewProps> = ({
  onStartAssessment
}) => {
  return (
    <div className="center-shell">
      <div className="card" style={{ maxWidth: 460, width: '100%', padding: '36px 28px', textAlign: 'center', borderRadius: 16, boxShadow: 'var(--shadow)' }}>
        
        {/* Header Icon (Figure .2.1 & .2.2) */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--primary)',
          color: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16
        }}>
          <Shirt style={{ width: 26, height: 26 }} />
        </div>

        {/* Title */}
        <h2 style={{ 
          margin: '0 0 12px', 
          fontSize: 22, 
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          color: 'var(--text)'
        }}>
          A quick check-in
        </h2>

        {/* Subtitle / Description */}
        <p style={{ 
          fontSize: 13, 
          color: 'var(--text-muted)', 
          lineHeight: 1.5, 
          marginBottom: 20,
          maxWidth: 380,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          Before we build your closet, take the Bergen Shopping Addiction Scale Questionnaire &ndash; a short reflection used to understand shopping habits.
        </p>

        {/* Info Box Callout (Figure .2.2) */}
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 26,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          textAlign: 'left'
        }}>
          <Info style={{ width: 18, height: 18, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>
            This is a self-reflection tool, not a medical diagnosis. If shopping is causing you distress, consider speaking with a counselor or healthcare provider.
          </p>
        </div>

        {/* Action Button: Begin (Figure .2.2) */}
        <button
          type="button"
          className="btn btn-p"
          style={{ 
            width: '100%', 
            justifyContent: 'center', 
            padding: '10px 16px', 
            fontSize: 14, 
            fontWeight: 600,
            borderRadius: 20 
          }}
          onClick={onStartAssessment}
        >
          Begin
        </button>

      </div>
    </div>
  );
};
