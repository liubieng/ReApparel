import React, { useState } from 'react';
import { BrainCircuit, CheckCircle2, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { BSASAssessment } from '../../types/database';

/**
 * ============================================================================
 * BSAS ASSESSMENT MODAL / STEPPER (BSASAssessmentModal.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT:
 * - Bergen Shopping Addiction Scale (BSAS) - Andreassen et al. (2015).
 * - 7 Diagnostic Criteria:
 *   1. Salience (Preoccupation)
 *   2. Mood Modification (Emotional regulation / coping)
 *   3. Conflict (Interpersonal or social impairment)
 *   4. Tolerance (Escalating frequency or expenditure)
 *   5. Withdrawal (Restlessness/anxiety when prevented)
 *   6. Relapse (Repeated failed attempts to cut down)
 *   7. Problems (Financial strain, debt, personal consequences)
 * 
 * DIAGNOSTIC ALGORITHM:
 * - Each item is rated from 0 (Never / Completely Disagree) to 7 (Always / Completely Agree).
 * - Cutoff Threshold: An item score >= 4 represents clinical endorsement of that criterion.
 * - Total Score = Number of endorsed criteria (0 to 7).
 * - Risk Categorization:
 *   * Score >= 4 endorsed criteria => "Indicative Risk"
 *   * Score < 4 endorsed criteria  => "Non-Indicative Risk"
 */

export const BSAS_ITEMS: [string, string, string][] = [
  ['Salience', 'You think about shopping and buying products all the time.', 'Preoccupation with shopping in daily thought patterns.'],
  ['Mood Modification', 'You shop or buy things in order to change your mood or relieve stress.', 'Using purchases as an emotional coping mechanism.'],
  ['Conflict', 'Shopping has caused friction with people close to you or impaired your daily responsibilities.', 'Interpersonal strain or neglect of duties.'],
  ['Tolerance', 'You feel you have to buy more and more than before to achieve the same satisfaction.', 'Escalation of purchases to attain fulfillment.'],
  ['Withdrawal', 'You feel restless, anxious, or irritable if you are prevented or unable to shop.', 'Negative psychological sensations upon restriction.'],
  ['Relapse', 'You have tried to cut down or stop shopping, but were unable to succeed.', 'Difficulty regaining behavioral self-control.'],
  ['Problems', 'Shopping has resulted in debts, financial difficulties, or harmed your personal wellbeing.', 'Tangible adverse life and economic consequences.']
];

const SCORING_DESCRIPTIONS = [
  { val: 0, label: '0 - Never / Completely Disagree' },
  { val: 1, label: '1 - Rarely' },
  { val: 2, label: '2 - Occasionally' },
  { val: 3, label: '3 - Sometimes / Neutral' },
  { val: 4, label: '4 - Often (Diagnostic Criterion Endorsed)' },
  { val: 5, label: '5 - Very Frequently' },
  { val: 6, label: '6 - Almost Constantly' },
  { val: 7, label: '7 - Always / Completely Agree' }
];

interface BSASAssessmentModalProps {
  onComplete: (score: number, breakdown: NonNullable<BSASAssessment['breakdown']>) => Promise<void>;
  onCancel: () => void;
}

export const BSASAssessmentModal: React.FC<BSASAssessmentModalProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentItem = BSAS_ITEMS[currentIndex];
  const selectedScore = answers[currentIndex];

  const handleSelectScore = async (score: number) => {
    const updatedAnswers = { ...answers, [currentIndex]: score };
    setAnswers(updatedAnswers);

    // If more questions remain, advance to next question
    if (currentIndex < BSAS_ITEMS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return;
    }

    // Final question answered: Calculate diagnostic score
    setIsSubmitting(true);
    try {
      const breakdown = {
        salience: updatedAnswers[0] || 0,
        mood_modification: updatedAnswers[1] || 0,
        conflict: updatedAnswers[2] || 0,
        tolerance: updatedAnswers[3] || 0,
        withdrawal: updatedAnswers[4] || 0,
        relapse: updatedAnswers[5] || 0,
        problems: updatedAnswers[6] || 0
      };

      // Count criteria with score >= 4 (endorsed)
      const endorsedCount = Object.values(breakdown).filter(scoreVal => scoreVal >= 4).length;
      await onComplete(endorsedCount, breakdown);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="center-shell">
      <div className="card" style={{ maxWidth: 540, width: '100%', padding: '28px 24px', boxShadow: 'var(--shadow)' }}>
        
        {/* Progress Bar & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BrainCircuit className="ico" style={{ color: 'var(--primary)', width: 20, height: 20 }} />
            <strong style={{ fontSize: 14 }}>BSAS Diagnostic Scale</strong>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
            Question {currentIndex + 1} of 7
          </span>
        </div>

        {/* Visual Progress Line */}
        <div style={{ height: 4, width: '100%', background: 'var(--surface-2)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${((currentIndex + 1) / 7) * 100}%`,
            background: 'var(--primary)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Question Dimension Badge */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '3px 8px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            color: 'var(--primary)',
            border: '1px solid var(--border)'
          }}>
            Dimension: {currentItem[0]}
          </span>
        </div>

        {/* Question Title & Description */}
        <h3 style={{ fontSize: 18, lineHeight: 1.4, margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>
          "{currentItem[1]}"
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
          {currentItem[2]}
        </p>

        {/* Interactive Scoring Slider */}
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 16,
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Response Slider:</span>
            <strong style={{ fontSize: 13.5, color: (selectedScore ?? 0) >= 4 ? 'var(--danger)' : 'var(--primary)' }}>
              {selectedScore !== undefined ? `Selected Score: ${selectedScore} / 7` : 'Slide or tap to score'}
            </strong>
          </div>
          <input
            type="range"
            min="0"
            max="7"
            step="1"
            value={selectedScore ?? 0}
            onChange={(e) => setAnswers(prev => ({ ...prev, [currentIndex]: parseInt(e.target.value, 10) }))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>0 (Never)</span>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>4 (Criterion)</span>
            <span>5</span>
            <span>6</span>
            <span>7 (Always)</span>
          </div>

          {selectedScore !== undefined && (
            <button
              type="button"
              className="btn btn-p"
              style={{ width: '100%', justifyContent: 'center', marginTop: 12, fontSize: 13 }}
              disabled={isSubmitting}
              onClick={() => handleSelectScore(selectedScore)}
            >
              {isSubmitting ? 'Submitting Assessment...' : (
                currentIndex < 6 ? `Confirm Score (${selectedScore}) & Next Dimension →` : `Confirm Score (${selectedScore}) & Calculate BSAS Results`
              )}
            </button>
          )}
        </div>

        {/* Supportive Radio Options */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
          Or select an explicit rating:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {SCORING_DESCRIPTIONS.map(({ val, label }) => {
            const isSelected = selectedScore === val;
            const isCriterionThreshold = val >= 4;
            return (
              <button
                key={val}
                type="button"
                className={`btn ${isSelected ? 'btn-p' : 'btn-g'}`}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '7px 12px',
                  fontSize: 12,
                  border: isCriterionThreshold && isSelected ? '2px solid var(--primary-strong)' : undefined
                }}
                onClick={() => handleSelectScore(val)}
              >
                <span style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: isSelected ? '4px solid #ffffff' : '2px solid var(--border)',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  display: 'inline-block',
                  marginRight: 8,
                  flexShrink: 0
                }} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Stepper Navigation Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn btn-g"
            disabled={currentIndex === 0 || isSubmitting}
            onClick={() => setCurrentIndex(prev => prev - 1)}
            style={{ fontSize: 12, padding: '5px 10px' }}
          >
            <ArrowLeft className="ico" style={{ width: 13, height: 13 }} /> Previous
          </button>
          
          <button
            type="button"
            className="btn btn-g"
            onClick={onCancel}
            style={{ fontSize: 12, padding: '5px 10px', color: 'var(--text-muted)' }}
          >
            Cancel / Close
          </button>
        </div>

      </div>
    </div>
  );
};
