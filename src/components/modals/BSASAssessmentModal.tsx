import React, { useState, useRef } from 'react';
import { BrainCircuit, CheckCircle2, ArrowLeft, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
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
 * - Note: This is not a diagnosis. It is an assessment for self-reflection.
 */

import { 
  BSASQuestionItem, 
  BSAS_28_ITEMS, 
  BSAS_RESPONSE_OPTIONS 
} from '../../data/seedData';

export type { BSASQuestionItem };
export { BSAS_28_ITEMS, BSAS_RESPONSE_OPTIONS };

interface BSASAssessmentModalProps {
  onComplete: (score: number, breakdown: NonNullable<BSASAssessment['breakdown']>, targetView?: 'closet' | 'recovery') => void | Promise<void>;
  onCancel?: () => void;
}

export const BSASAssessmentModal: React.FC<BSASAssessmentModalProps> = ({
  onComplete
}) => {
  const [viewMode, setViewMode] = useState<'stepper' | 'scroll'>('stepper');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [unansweredError, setUnansweredError] = useState<string | null>(null);
  const [animationClass, setAnimationClass] = useState<string>('bsas-slide-in-next');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = BSAS_28_ITEMS[currentIndex];
  const [completedResult, setCompletedResult] = useState<{
    score: number;
    riskLevel: string;
    breakdown: NonNullable<BSASAssessment['breakdown']>;
  } | null>(null);

  const handleFinish = async (targetView: 'closet' | 'recovery' = 'closet') => {
    if (!completedResult || isFinishing) return;
    setIsFinishing(true);
    setFinishError(null);
    try {
      await onComplete(completedResult.score, completedResult.breakdown, targetView);
    } catch (err: any) {
      console.error('Error completing BSAS check-in:', err);
      setFinishError(err?.message || 'Failed to complete check-in. Please try again.');
      setIsFinishing(false);
    }
  };

  const selectedScore = answers[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / BSAS_28_ITEMS.length) * 100);

  const finalizeAssessment = (finalAnswers: Record<number, number>) => {
    setIsSubmitting(true);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    setTimeout(() => {
      try {
        // Endorsement check: An item is endorsed when answered with >= 3 ("Agree" or "Completely Agree")
        const isDimEndorsed = (indices: number[]) => {
          return indices.some(idx => (finalAnswers[idx] ?? 0) >= 3);
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
        const riskLevel = endorsedCriteriaCount >= 4 ? 'Indicative' : 'Non-Indicative';

        setCompletedResult({
          score: endorsedCriteriaCount,
          riskLevel,
          breakdown
        });
      } catch (err) {
        console.error('Error completing BSAS assessment:', err);
      } finally {
        setIsSubmitting(false);
      }
    }, 240);
  };

  // Mark answer for a specific question item
  const handleSelectAnswerForIndex = (index: number, score: number) => {
    setUnansweredError(null);
    setAnswers(prev => ({ ...prev, [index]: score }));
  };

  const handleSelectAnswer = (score: number) => {
    handleSelectAnswerForIndex(currentIndex, score);
  };

  // Check all questions on submission (TC_BSAS_07)
  const handleSubmitAssessment = () => {
    const unansweredIndices = BSAS_28_ITEMS.map((_, idx) => idx).filter(idx => answers[idx] === undefined);
    if (unansweredIndices.length > 0) {
      setUnansweredError(`One or more questions (${unansweredIndices.length} remaining) remain unanswered. Please complete all questions before submitting.`);
      return;
    }
    setUnansweredError(null);
    finalizeAssessment(answers);
  };

  // Next Question / Submit handler
  const handleNext = () => {
    if (isTransitioning || isSubmitting) return;

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

    // On last item, trigger submit validation
    handleSubmitAssessment();
  };

  // Navigate back to previous question with reverse slide animation
  const handlePrevious = () => {
    if (currentIndex === 0 || isTransitioning || isSubmitting) return;
    setUnansweredError(null);

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

  if (completedResult) {
    return (
      <div className="center-shell" style={{ padding: '16px' }}>
        <div 
          className="card" 
          style={{ 
            maxWidth: 480, 
            width: '100%', 
            padding: '36px 28px', 
            textAlign: 'center',
            boxShadow: 'var(--shadow)',
            borderRadius: 16
          }}
        >
          {/* Top Icon Badge (Figure .4.1) */}
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <CheckCircle2 style={{ width: 30, height: 30 }} />
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            Questionnaire Complete
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
            Your Bergen Shopping Addiction Scale check-in has been recorded.
          </p>

          {/* Result Card Box (Figure .4.1) */}
          <div style={{
            background: 'var(--surface-2)',
            borderRadius: 12,
            padding: '16px',
            marginBottom: 20,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            textAlign: 'left'
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <BrainCircuit style={{ width: 24, height: 24, color: 'var(--primary)' }} />
            </div>
            <div>
              <strong style={{ fontSize: 14, display: 'block', color: 'var(--text)' }}>
                Score: {completedResult.score}/7 criteria endorsed
              </strong>
              <span style={{ 
                fontSize: 12, 
                color: completedResult.riskLevel === 'Indicative' ? 'var(--danger, #dc2626)' : 'var(--primary)',
                fontWeight: 600
              }}>
                {completedResult.riskLevel} Risk Level
              </span>
            </div>
          </div>

          {/* Info callout box (Figure .4.1) */}
          <div style={{
            background: 'var(--surface-2)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 26,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            textAlign: 'left'
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ⓘ</span>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              This is a self-reflection tool, not a medical diagnosis. If shopping is causing you distress, consider speaking with a counselor or healthcare provider.
            </p>
          </div>

          {/* Error notice if submission failed */}
          {finishError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--danger-soft, rgba(239, 68, 68, 0.12))',
              color: 'var(--danger, #dc2626)',
              fontSize: 12.5,
              marginBottom: 16,
              border: '1px solid var(--danger, #dc2626)',
              textAlign: 'center'
            }}>
              {finishError}
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="btn btn-p"
              disabled={isFinishing}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px 18px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 24,
                cursor: isFinishing ? 'wait' : 'pointer'
              }}
              onClick={() => handleFinish('closet')}
            >
              {isFinishing ? 'Entering Virtual Closet...' : 'Continue to Virtual Closet'}
            </button>

            <button
              type="button"
              className="btn btn-g"
              disabled={isFinishing}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 24
              }}
              onClick={() => handleFinish('recovery')}
            >
              View Recovery Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              className={`btn ${viewMode === 'stepper' ? 'btn-p' : 'btn-g'}`}
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => setViewMode('stepper')}
            >
              Step-by-Step
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'scroll' ? 'btn-p' : 'btn-g'}`}
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => setViewMode('scroll')}
            >
              Scroll All Questions
            </button>
          </div>
        </div>

        {/* Instructions banner */}
        <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Thoughts, feelings, and actions in the <strong>last 12 months</strong>.
          <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic', color: 'var(--text)' }}>
            This is not a diagnosis. It is an assessment for self-reflection.
          </span>
        </p>

        {/* Unanswered Error Alert (TC_BSAS_07) */}
        {unansweredError && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            fontSize: 12,
            marginBottom: 14,
            border: '1px solid var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <AlertCircle className="ico" style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>{unansweredError}</span>
          </div>
        )}

        {/* Progress Bar & Counter */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 11.5 }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Answered: {answeredCount} / {BSAS_28_ITEMS.length} ({progressPercent}%)
          </span>
          {viewMode === 'stepper' && (
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
              Question {currentIndex + 1} of {BSAS_28_ITEMS.length}
            </span>
          )}
        </div>

        <div style={{ height: 5, width: '100%', background: 'var(--surface-2)', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--primary)',
            transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }} />
        </div>

        {/* Stepper Mode */}
        {viewMode === 'stepper' ? (
          <div>
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

              {/* Clean, Clickable Response Alternatives */}
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
              
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-p"
                  disabled={isTransitioning || isSubmitting}
                  onClick={handleSubmitAssessment}
                  style={{ fontSize: 12, padding: '6px 14px', background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  Submit
                </button>

                <button
                  type="button"
                  className="btn btn-p"
                  disabled={isTransitioning || isSubmitting}
                  onClick={handleNext}
                  style={{ fontSize: 12, padding: '6px 16px' }}
                >
                  {currentIndex === BSAS_28_ITEMS.length - 1 ? 'Submit Assessment' : 'Next Question'}
                  <ArrowRight className="ico" style={{ width: 13, height: 13, marginLeft: 4 }} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Scroll All Questions Mode (TC_BSAS_02, TC_BSAS_03, TC_BSAS_04, TC_BSAS_07) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {BSAS_28_ITEMS.map((item, idx) => {
                const itemAns = answers[idx];
                return (
                  <div key={item.id} style={{ 
                    padding: 14, 
                    borderRadius: 10, 
                    background: 'var(--surface-2)', 
                    border: itemAns === undefined && unansweredError ? '1px solid var(--danger)' : '1px solid var(--border)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-strong)' }}>
                        {item.dimension} • Item {item.itemNumberInDimension} of 4
                      </span>
                      {itemAns !== undefined && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>
                          ✓ Answered
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: 14, margin: '0 0 12px', fontWeight: 600 }}>
                      {idx + 1}. "{item.text}"
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                      {BSAS_RESPONSE_OPTIONS.map(({ val, label, badge }) => {
                        const isSelected = itemAns === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            className={`btn ${isSelected ? 'btn-p' : 'btn-g'}`}
                            style={{ 
                              fontSize: 11, 
                              padding: '6px 8px', 
                              justifyContent: 'flex-start',
                              textAlign: 'left'
                            }}
                            onClick={() => handleSelectAnswerForIndex(idx, val)}
                          >
                            <span style={{ fontWeight: 700, marginRight: 6 }}>{badge}.</span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-p"
                disabled={isSubmitting}
                onClick={handleSubmitAssessment}
                style={{ padding: '8px 24px', fontSize: 13, fontWeight: 600 }}
              >
                Submit Completed Questionnaire
              </button>
            </div>
          </div>
        )}

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
              Evaluating clinical thresholds across the 7 Bergen behavioral dimensions. This is not a diagnosis; it is an assessment for self-reflection.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
