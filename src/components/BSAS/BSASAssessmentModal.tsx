import React, { useState, useRef } from 'react';
import { BrainCircuit, CheckCircle2, ArrowLeft, X, Sparkles } from 'lucide-react';
import { BSASAssessment } from '../../types/database';

/**
 * ============================================================================
 * BSAS ASSESSMENT MODAL / STEPPER (BSASAssessmentModal.tsx)
 * ============================================================================
 * 
 * Source: https://psychology-tools.com/test/bergen-shopping-addiction-scale
 * Bergen Shopping Addiction Scale (BSAS) - Andreassen et al. (2015).
 * 
 * 28 self-report items across 7 core dimensions of addiction:
 * 1. Salience (Items 1-4)
 * 2. Mood Modification (Items 5-8)
 * 3. Conflict (Items 9-12)
 * 4. Tolerance (Items 13-16)
 * 5. Relapse (Items 17-20)
 * 6. Withdrawal (Items 21-24)
 * 7. Problems (Items 25-28)
 * 
 * Clinical Scoring:
 * - 5 response alternatives:
 *   0: Completely Disagree
 *   1: Disagree
 *   2: Neither Disagree Nor Agree
 *   3: Agree
 *   4: Completely Agree
 * - An item is endorsed when rated >= 3 ("Agree" or "Completely Agree").
 * - Endorsing >= 4 of the 7 diagnostic criteria indicates addiction risk.
 */

import { 
  BSASQuestionItem, 
  BSAS_28_ITEMS, 
  BSAS_RESPONSE_OPTIONS 
} from '../../data/seedData';

export type { BSASQuestionItem };
export { BSAS_28_ITEMS, BSAS_RESPONSE_OPTIONS };

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
  const [animationClass, setAnimationClass] = useState<string>('bsas-slide-in-next');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = BSAS_28_ITEMS[currentIndex];
  const selectedScore = answers[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / BSAS_28_ITEMS.length) * 100);

  // Directly advance upon clicking an answer with an animation transition
  const handleSelectAnswer = (score: number) => {
    if (isTransitioning || isSubmitting) return;

    // Save answer immediately so the UI reflects the user's tap
    const updatedAnswers = { ...answers, [currentIndex]: score };
    setAnswers(updatedAnswers);

    // If more questions remain, animate to next question
    if (currentIndex < BSAS_28_ITEMS.length - 1) {
      setIsTransitioning(true);
      setAnimationClass('bsas-slide-out-next');

      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setAnimationClass('bsas-slide-in-next');
        setTimeout(() => {
          setIsTransitioning(false);
        }, 150);
      }, 180);
      return;
    }

    // Final question (Item 28 of 28): Complete diagnostic scoring
    setIsSubmitting(true);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setTimeout(async () => {
      try {
        // Endorsement check: An item is endorsed when answered with >= 3 ("Agree" or "Completely Agree")
        const isDimEndorsed = (indices: number[]) => {
          return indices.some(idx => (updatedAnswers[idx] ?? 0) >= 3);
        };

        const salienceEndorsed = isDimEndorsed([0, 1, 2, 3]);
        const moodEndorsed = isDimEndorsed([4, 5, 6, 7]);
        const conflictEndorsed = isDimEndorsed([8, 9, 10, 11]);
        const toleranceEndorsed = isDimEndorsed([12, 13, 14, 15]);
        const relapseEndorsed = isDimEndorsed([16, 17, 18, 19]);
        const withdrawalEndorsed = isDimEndorsed([20, 21, 22, 23]);
        const problemsEndorsed = isDimEndorsed([24, 25, 26, 27]);

        const breakdown = {
          salience: salienceEndorsed ? 1 : 0,
          mood_modification: moodEndorsed ? 1 : 0,
          conflict: conflictEndorsed ? 1 : 0,
          tolerance: toleranceEndorsed ? 1 : 0,
          relapse: relapseEndorsed ? 1 : 0,
          withdrawal: withdrawalEndorsed ? 1 : 0,
          problems: problemsEndorsed ? 1 : 0
        };

        const endorsedCriteriaCount = Object.values(breakdown).filter(v => v === 1).length;
        await onComplete(endorsedCriteriaCount, breakdown);
      } catch (err) {
        console.error('Error completing BSAS assessment:', err);
      } finally {
        setIsSubmitting(false);
      }
    }, 240);
  };

  // Navigate back to previous question with reverse slide animation
  const handlePrevious = () => {
    if (currentIndex === 0 || isTransitioning || isSubmitting) return;

    setIsTransitioning(true);
    setAnimationClass('bsas-slide-out-prev');

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex(prev => prev - 1);
      setAnimationClass('bsas-slide-in-prev');
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 180);
  };

  return (
    <div className="center-shell" style={{ padding: '16px' }}>
      <div 
        className="card" 
        style={{ 
          maxWidth: 580, 
          width: '100%', 
          padding: '28px 24px', 
          boxShadow: 'var(--shadow)',
          borderRadius: 14,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        
        {/* Header / Brand & Progress Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BrainCircuit className="ico" style={{ color: 'var(--primary)', width: 20, height: 20 }} />
            <strong style={{ fontSize: 14, fontFamily: 'var(--font-display)', letterSpacing: '0.01em' }}>
              Bergen Shopping Addiction Scale (BSAS)
            </strong>
          </div>
          
          <button
            type="button"
            onClick={onCancel}
            title="Close check-in"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 4,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Instructions banner */}
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Thoughts, feelings, and actions in the <strong>last 12 months</strong>. Tap an answer to advance.
        </p>

        {/* Progress Bar & Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 11.5 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Progress: {progressPercent}%
          </span>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
            Question {currentIndex + 1} of {BSAS_28_ITEMS.length}
          </span>
        </div>

        <div style={{ height: 5, width: '100%', background: 'var(--surface-2)', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--primary)',
            transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }} />
        </div>

        {/* Animated Question Content Container */}
        <div className={animationClass} key={currentIndex} style={{ minHeight: 250 }}>
          
          {/* Dimension badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '3px 8px',
              borderRadius: 6,
              background: 'var(--surface-2)',
              color: 'var(--primary-strong)',
              border: '1px solid var(--border)'
            }}>
              {currentItem.dimension} • Item {currentItem.itemNumberInDimension} of 4
            </span>
          </div>

          {/* Question Prompt */}
          <h3 style={{ 
            fontSize: 17, 
            lineHeight: 1.45, 
            margin: '0 0 20px', 
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--text)'
          }}>
            {currentIndex + 1}. "{currentItem.text}"
          </h3>

          {/* Clean, Clickable Response Alternatives (Drag Slider Completely Removed) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {BSAS_RESPONSE_OPTIONS.map(({ val, label, badge }) => {
              const isSelected = selectedScore === val;
              return (
                <button
                  key={val}
                  type="button"
                  disabled={isTransitioning || isSubmitting}
                  className={`bsas-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectAnswer(val)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="bsas-option-badge">
                      {badge}
                    </span>
                    <span>{label}</span>
                  </div>

                  <div className="bsas-indicator-dot">
                    {isSelected && (
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#FFFFFF' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* Submitting Loading Overlay */}
        {isSubmitting && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            padding: 20,
            textAlign: 'center'
          }}>
            <Sparkles style={{ width: 32, height: 32, color: 'var(--primary)', animation: 'spin 2s linear infinite', marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 6px', fontSize: 16 }}>Scoring Your Responses...</h4>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
              Evaluating clinical thresholds across the 7 Bergen behavioral dimensions.
            </p>
          </div>
        )}

        {/* Stepper Navigation Footer */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: 10, 
          alignItems: 'center', 
          paddingTop: 14, 
          borderTop: '1px solid var(--border)' 
        }}>
          <button
            type="button"
            className="btn btn-g"
            disabled={currentIndex === 0 || isTransitioning || isSubmitting}
            onClick={handlePrevious}
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            <ArrowLeft className="ico" style={{ width: 13, height: 13 }} /> Previous Question
          </button>
          
          <button
            type="button"
            className="btn btn-g"
            disabled={isSubmitting}
            onClick={onCancel}
            style={{ fontSize: 12, padding: '6px 12px', color: 'var(--text-muted)' }}
          >
            Exit Check-In
          </button>
        </div>

      </div>
    </div>
  );
};
