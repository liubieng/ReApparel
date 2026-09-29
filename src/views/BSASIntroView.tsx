import React from 'react';
import { BrainCircuit, ShieldCheck, ArrowRight, BookOpen, Leaf, Sparkles } from 'lucide-react';

/**
 * ============================================================================
 * BSAS ONBOARDING INTRO VIEW (BSASIntroView.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT:
 * - Bergen Shopping Addiction Scale (BSAS) developed by Andreassen et al. (2015).
 * - Serves as the behavioral diagnostic instrument in the ReApparel system.
 * - Educates the user on why self-assessment matters before entering the wardrobe.
 */

interface BSASIntroViewProps {
  onStartAssessment: () => void;
  onSkipToCloset: () => void;
}

export const BSASIntroView: React.FC<BSASIntroViewProps> = ({
  onStartAssessment,
  onSkipToCloset
}) => {
  return (
    <div className="center-shell">
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: '32px 24px', boxShadow: 'var(--shadow)' }}>
        
        {/* Header Icon */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'var(--surface-2)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          border: '1px solid var(--border)'
        }}>
          <BrainCircuit style={{ width: 28, height: 28 }} />
        </div>

        {/* Title & Research Attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'var(--font-display)' }}>
            Mindful Wardrobe Check-In
          </h2>
          <span style={{
            fontSize: 10,
            textTransform: 'uppercase',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'var(--surface-2)',
            color: 'var(--primary)',
            border: '1px solid var(--border)'
          }}>
            BSAS Scale
          </span>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
          Grounded in the <strong>Bergen Shopping Addiction Scale (BSAS)</strong> (Andreassen et al., 2015), this 28-item diagnostic assessment evaluates your shopping motivations across seven core dimensions of compulsive consumption.
        </p>

        {/* 7 Diagnostic Dimensions List */}
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
            7 Clinical Behavioral Dimensions Evaluated (4 Items Each):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <div>1. <strong>Salience</strong> (Preoccupation)</div>
            <div>2. <strong>Mood Modification</strong> (Coping)</div>
            <div>3. <strong>Conflict</strong> (Interpersonal)</div>
            <div>4. <strong>Tolerance</strong> (Escalation)</div>
            <div>5. <strong>Withdrawal</strong> (Restlessness)</div>
            <div>6. <strong>Relapse</strong> (Loss of Control)</div>
            <div style={{ gridColumn: 'span 2' }}>7. <strong>Problems</strong> (Financial/Personal Harm)</div>
          </div>
        </div>

        {/* Scoring Methodology Note for Defense Panel */}
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          lineHeight: 1.4,
          padding: '10px 12px',
          background: 'var(--surface)',
          borderLeft: '3px solid var(--primary)',
          borderRadius: 4,
          marginBottom: 24
        }}>
          <strong>Clinical Scoring (Psychology Tools):</strong> 5-point Likert scale (Completely Disagree to Completely Agree). Scoring <em>Agree</em> or <em>Completely Agree</em> endorses a symptom. Endorsing 4 or more criteria classifies the assessment as <em>Indicative Risk</em>.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            className="btn btn-p"
            style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
            onClick={onStartAssessment}
          >
            Start BSAS Check-In (28 Items) <ArrowRight className="ico" style={{ marginLeft: 6 }} />
          </button>
          
          <button
            type="button"
            className="btn btn-g"
            style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
            onClick={onSkipToCloset}
          >
            Skip to Virtual Closet for Now
          </button>
        </div>

      </div>
    </div>
  );
};
