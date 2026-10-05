import React, { useMemo, useState } from 'react';
import { 
  BrainCircuit, 
  ChevronDown, 
  ChevronUp, 
  Shirt, 
  ArrowRight, 
  Clock, 
  RotateCcw,
  Sparkles,
  Info,
  UserCheck
} from 'lucide-react';
import { BSASAssessment, ClothingItem, Borrow } from '../types/database';
import { deduplicateAssessments } from '../services/closetService';

/**
 * ============================================================================
 * RECOVERY PROGRESS VIEW (RecoveryView.tsx)
 * ============================================================================
 * 
 * Implements wireframe layout from Figure .6.1 (SDD Pages 45 & 46):
 * - Left Column:
 *   1. BSAS Questionnaire Results (Vertical bar chart showing longitudinal progress)
 *   2. How to interpret your BSAS Score (Accordion for Salience, Mood Modification,
 *      Conflict, Tolerance, Withdrawal, Relapse, Problems)
 * - Right Column:
 *   1. Statistics with 'see Full Statistics' button
 *   2. Least worn from each category (grid with tags and 'Worn Xx' labels)
 *   3. Borrowed (borrowed items with avatar icons)
 */

interface RecoveryViewProps {
  assessments: BSASAssessment[];
  garments: ClothingItem[];
  simulatedDaysOffset: number;
  borrows?: Borrow[];
  onSimulateCooldownAdvance: () => void;
  onStartRetakeAssessment: () => void;
  onNavigateToCloset: () => void;
  onNavigateToDailyLog?: () => void;
  onNavigateToStatistics?: () => void;
  onEditGarment?: (garment: ClothingItem) => void;
  onOpenAddGarment?: () => void;
}

interface BSASDimensionDef {
  key: string;
  name: string;
  description: string;
  questionExample: string;
}

const BSAS_DIMENSIONS: BSASDimensionDef[] = [
  {
    key: 'salience',
    name: 'Salience',
    description: 'Shopping or thinking about shopping dominates thinking and behavior even when doing other things.',
    questionExample: 'You think about shopping or buying things practically all the time.'
  },
  {
    key: 'mood_modification',
    name: 'Mood Modification',
    description: 'Shopping is used primarily as an emotional regulation strategy to alter mood, escape reality, or reduce negative feelings.',
    questionExample: 'You shop/buy things in order to change your mood or alleviate stress.'
  },
  {
    key: 'conflict',
    name: 'Conflict',
    description: 'Shopping habits cause arguments, interpersonal strain, or conflict with family, partners, and work commitments.',
    questionExample: 'Shopping/buying has created conflicts with family members or friends.'
  },
  {
    key: 'tolerance',
    name: 'Tolerance',
    description: 'Needing to buy increasingly more items, or spend more money and time, to achieve the same initial excitement.',
    questionExample: 'You feel that you need to shop/buy more and more to obtain the same satisfaction.'
  },
  {
    key: 'withdrawal',
    name: 'Withdrawal',
    description: 'Experiencing distress, agitation, restlessness, or irritability when unable or prevented from shopping.',
    questionExample: 'You feel bad, uncomfortable, or agitated if you are prevented from shopping.'
  },
  {
    key: 'relapse',
    name: 'Relapse',
    description: 'Repeated unsuccessful efforts to control, reduce, or stop impulsive garment buying.',
    questionExample: 'You have tried to cut down on shopping/buying without succeeding.'
  },
  {
    key: 'problems',
    name: 'Problems',
    description: 'Shopping interferes with daily responsibilities, study, work, or results in financial hardship.',
    questionExample: 'You shop/buy things so much that it has negatively impacted your well-being or obligations.'
  }
];

export const RecoveryView: React.FC<RecoveryViewProps> = ({
  assessments,
  garments,
  simulatedDaysOffset,
  borrows = [],
  onSimulateCooldownAdvance,
  onStartRetakeAssessment,
  onNavigateToStatistics
}) => {
  // Accordion state for "How to interpret your BSAS Score" (starts collapsed by default)
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  // Deduplicate assessments to filter test spam & rapid duplicates
  const deduplicatedAssessments = useMemo(() => {
    return deduplicateAssessments(assessments);
  }, [assessments]);

  // Assessments sorted chronologically (oldest to newest for bar chart)
  const sortedAsc = useMemo(() => {
    return [...deduplicatedAssessments].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
  }, [deduplicatedAssessments]);

  // Assessments sorted reverse chronologically (newest first for comparison)
  const sortedDesc = useMemo(() => {
    return [...deduplicatedAssessments].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
  }, [deduplicatedAssessments]);

  const latestAssessment = sortedAsc[sortedAsc.length - 1];

  // 30-Day Cooldown logic
  const cooldownInfo = useMemo(() => {
    if (!latestAssessment) return { canTake: true, daysRemaining: 0, nextDueDate: null };
    const lastDate = new Date(latestAssessment.taken_at);
    const msSince = Date.now() - lastDate.getTime() + simulatedDaysOffset * 86400000;
    const daysSince = Math.floor(msSince / 86400000);
    const daysRemaining = Math.max(0, 30 - daysSince);
    const nextDate = new Date(lastDate.getTime() + 30 * 86400000);
    const nextDueDate = nextDate.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
    return {
      canTake: daysRemaining === 0,
      daysRemaining,
      nextDueDate
    };
  }, [latestAssessment, simulatedDaysOffset]);

  // Least worn item from each category (Figure .6.1: "Least worn from each category")
  const leastWornByCategory = useMemo(() => {
    const categories = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear'];
    const results: ClothingItem[] = [];

    categories.forEach(cat => {
      const itemsInCat = garments.filter(g => 
        (g.category || g.type_tag || '').toLowerCase() === cat.toLowerCase()
      );
      if (itemsInCat.length > 0) {
        // Sort by wear count ascending
        const sorted = [...itemsInCat].sort((a, b) => {
          const wearA = a.worn_count ?? a.wear_count ?? 0;
          const wearB = b.worn_count ?? b.wear_count ?? 0;
          return wearA - wearB;
        });
        results.push(sorted[0]);
      }
    });

    // If fewer than 2 categories exist, just pick the least worn garments overall
    if (results.length < 2 && garments.length > 0) {
      const sorted = [...garments].sort((a, b) => (a.worn_count ?? 0) - (b.worn_count ?? 0));
      return sorted.slice(0, 4);
    }

    return results;
  }, [garments]);

  // "Shop Your Closet" Pairs (One least-worn and one unworn item from each category)
  const shopYourClosetByCategory = useMemo(() => {
    const categories = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Outerwear'];
    return categories.map(cat => {
      const itemsInCat = garments.filter(g => 
        (g.category || g.type_tag || '').toLowerCase() === cat.toLowerCase()
      );
      if (itemsInCat.length === 0) return null;

      // 1. Unworn item (wear_count === 0)
      const unworn = itemsInCat.find(g => (g.worn_count ?? g.wear_count ?? 0) === 0) || null;

      // 2. Least worn item (wear count > 0 if available, distinct from unworn if possible)
      const wornItems = itemsInCat
        .filter(g => (g.worn_count ?? g.wear_count ?? 0) > 0)
        .sort((a, b) => (a.worn_count ?? a.wear_count ?? 0) - (b.worn_count ?? b.wear_count ?? 0));
      
      const leastWorn = wornItems.length > 0 ? wornItems[0] : null;

      return {
        category: cat,
        leastWorn,
        unworn,
        totalItems: itemsInCat.length
      };
    }).filter(Boolean) as {
      category: string;
      leastWorn: ClothingItem | null;
      unworn: ClothingItem | null;
      totalItems: number;
    }[];
  }, [garments]);

  // Active accepted borrows
  const activeBorrows = useMemo(() => {
    return borrows.filter(b => b.status === 'Accepted' || (b.status as string) === 'approved');
  }, [borrows]);

  // BSAS Progression modal state (TC_PROG_01, TC_PROG_02)
  const [showProgression, setShowProgression] = useState(false);

  // Current and previous assessments for comparison
  const currentAssessment = sortedDesc[0] || null;
  const previousAssessment = sortedDesc[1] || null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* Page Layout: 2 Columns on Desktop, 1 Column on Mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        alignItems: 'start'
      }}>
        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* 1. BSAS Questionnaire Results Card */}
          <div className="card" style={{ padding: 20, borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                  BSAS Questionnaire Results
                </h3>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Score progress across periodic check-ins (Cut-off: 4)
                </span>
              </div>

              {/* Retake / Cooldown Indicator & Progression Button */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20 }}
                  onClick={() => setShowProgression(true)}
                  title="View BSAS Score Progression and Compare Scores"
                >
                  <BrainCircuit className="ico" style={{ width: 12, height: 12 }} />
                  <span>BSAS Progression</span>
                </button>

                {cooldownInfo.canTake ? (
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ fontSize: 11.5, padding: '5px 12px', borderRadius: 20 }}
                    onClick={onStartRetakeAssessment}
                  >
                    {sortedAsc.length === 0 ? 'Take Check-In' : 'Retake Check-In'}
                  </button>
                ) : (
                  <div
                    style={{ 
                      fontSize: 11, 
                      padding: '4px 10px', 
                      borderRadius: 20, 
                      background: 'var(--surface-2)', 
                      color: 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      border: '1px solid var(--border)',
                      userSelect: 'none'
                    }}
                    title={cooldownInfo.nextDueDate ? `Next check-in scheduled for ${cooldownInfo.nextDueDate}` : undefined}
                  >
                    <Clock className="ico" style={{ width: 11, height: 11, color: 'var(--text-muted)' }} />
                    <span>Next test: {cooldownInfo.nextDueDate ? `${cooldownInfo.nextDueDate} (${cooldownInfo.daysRemaining}d)` : `in ${cooldownInfo.daysRemaining}d`}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical Bar Chart */}
            {sortedAsc.length === 0 ? (
              <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No BSAS assessment completed yet. Take your check-in to track recovery.
              </div>
            ) : (
              <div style={{ 
                height: 180, 
                display: 'flex', 
                alignItems: 'flex-end', 
                justifyContent: 'space-around',
                paddingTop: 24,
                paddingBottom: 24,
                borderBottom: '1px solid var(--border)',
                position: 'relative'
              }}>
                {/* 4/7 Risk Cut-off Reference Line */}
                <div style={{
                  position: 'absolute',
                  top: `${100 - (4 / 7) * 75}%`,
                  left: 0,
                  right: 0,
                  borderTop: '1px dashed var(--danger, #dc2626)',
                  opacity: 0.5,
                  pointerEvents: 'none'
                }}>
                  <span style={{ 
                    position: 'absolute', 
                    right: 4, 
                    top: -16, 
                    fontSize: 10, 
                    color: 'var(--danger, #dc2626)', 
                    fontWeight: 600 
                  }}>
                    Cut-off: 4
                  </span>
                </div>

                {sortedAsc.map((assessment, index) => {
                  const dateLabel = new Date(assessment.taken_at).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  const barHeightPct = Math.max(12, (assessment.score / 7) * 80);
                  const isIndicative = assessment.score >= 4;

                  return (
                    <div 
                      key={assessment.assessment_id || index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        height: '100%',
                        justifyContent: 'flex-end',
                        width: `${Math.min(48, 100 / sortedAsc.length)}%`
                      }}
                    >
                      {/* Score number on top of bar */}
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 700, 
                        color: isIndicative ? 'var(--danger, #dc2626)' : 'var(--primary)' 
                      }}>
                        {assessment.score}
                      </span>

                      {/* Vertical bar */}
                      <div style={{
                        width: '100%',
                        maxWidth: 28,
                        height: `${barHeightPct}%`,
                        borderRadius: '6px 6px 0 0',
                        background: isIndicative 
                          ? 'linear-gradient(180deg, #f87171, #dc2626)' 
                          : 'linear-gradient(180deg, var(--primary-soft, #a7f3d0), var(--primary, #059669))',
                        transition: 'height 0.3s ease'
                      }} />

                      {/* Date label underneath */}
                      <span style={{ 
                        fontSize: 10, 
                        color: 'var(--text-muted)', 
                        whiteSpace: 'nowrap',
                        marginTop: 4 
                      }}>
                        {dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Lower score indicates behavioral recovery</span>
              <span>Latest: {latestAssessment ? `${latestAssessment.score}/7 criteria (${latestAssessment.risk_level})` : 'N/A'}</span>
            </div>
          </div>

          {/* 2. How to interpret your BSAS Score Accordion */}
          <div className="card" style={{ padding: 20, borderRadius: 14 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              How to interpret your BSAS Score
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--text-muted)' }}>
              The Bergen Shopping Addiction Scale assesses 7 psychological dimensions of compulsive consumption.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BSAS_DIMENSIONS.map((dim) => {
                const isExpanded = expandedDimension === dim.key;
                const isEndorsed = latestAssessment?.breakdown && (latestAssessment.breakdown as any)[dim.key] === 1;

                return (
                  <div
                    key={dim.key}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      overflow: 'hidden',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() => setExpandedDimension(isExpanded ? null : dim.key)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {dim.name}
                        </span>
                        {isEndorsed && (
                          <span style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: 'var(--danger-soft, #fee2e2)',
                            color: 'var(--danger, #dc2626)'
                          }}>
                            Endorsed
                          </span>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                      ) : (
                        <ChevronDown style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                      )}
                    </button>

                    {/* Accordion Body */}
                    {isExpanded && (
                      <div style={{ padding: '0 14px 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>
                        <p style={{ margin: '0 0 6px' }}>{dim.description}</p>
                        <div style={{ 
                          fontStyle: 'italic', 
                          fontSize: 11, 
                          color: 'var(--text)', 
                          padding: '6px 10px', 
                          background: 'var(--surface)', 
                          borderRadius: 6,
                          borderLeft: '3px solid var(--primary)'
                        }}>
                          "{dim.questionExample}"
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* 1. Statistics Section with 'see Full Statistics' button */}
          <div className="card" style={{ padding: 20, borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                Statistics
              </h3>

              {onNavigateToStatistics && (
                <button
                  type="button"
                  className="btn btn-p"
                  style={{
                    borderRadius: 20,
                    fontSize: 11.5,
                    padding: '5px 14px',
                    fontWeight: 600
                  }}
                  onClick={onNavigateToStatistics}
                >
                  Full Statistics
                </button>
              )}
            </div>

            {/* Overall Closet Utilization */}
            {(() => {
              const total = garments.length;
              const worn = garments.filter(g => (g.worn_count ?? g.wear_count ?? 0) > 0).length;
              const utilPct = total > 0 ? Math.round((worn / total) * 100) : 0;
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                      Overall Closet Utilization
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: utilPct >= 70 ? 'var(--primary)' : utilPct >= 40 ? '#f59e0b' : 'var(--danger, #dc2626)' }}>
                      {utilPct}%
                    </span>
                  </div>
                  <div style={{ height: 10, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      height: '100%',
                      width: `${utilPct}%`,
                      borderRadius: 6,
                      background: utilPct >= 70
                        ? 'linear-gradient(90deg, var(--primary-soft, #a7f3d0), var(--primary, #059669))'
                        : utilPct >= 40
                        ? 'linear-gradient(90deg, #fcd34d, #f59e0b)'
                        : 'linear-gradient(90deg, #fca5a5, #dc2626)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>{worn} of {total} items worn at least once</span>
                    <span>{total - worn} items never worn</span>
                  </div>
                </div>
              );
            })()}

            {/* Most to Least Worn */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 10 }}>
                {garments.length > 5 ? 'Top 5 Most to Least Worn' : 'Most to Least Worn'}
              </span>
              {garments.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, background: 'var(--surface-2)', borderRadius: 10 }}>
                  Add clothes to your closet to see wear rankings.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...garments]
                    .sort((a, b) => (b.worn_count ?? b.wear_count ?? 0) - (a.worn_count ?? a.wear_count ?? 0))
                    .slice(0, 5)
                    .map((item, idx) => {
                      const wears = item.worn_count ?? item.wear_count ?? 0;
                      const maxWears = Math.max(...garments.map(g => g.worn_count ?? g.wear_count ?? 0), 1);
                      const barPct = Math.max(4, (wears / maxWears) * 100);
                      const isHex = item.image_url?.startsWith('#');
                      return (
                        <div key={item.item_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', width: 14, textAlign: 'right', flexShrink: 0 }}>#{idx + 1}</span>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            flexShrink: 0,
                            backgroundColor: isHex ? item.image_url : 'var(--surface-2)',
                            backgroundImage: isHex ? undefined : `url("${item.image_url}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid var(--border)'
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden', marginTop: 3 }}>
                              <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 3, background: 'var(--primary)' }} />
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{wears}×</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* "Shop Your Closet" - One least-worn and one unworn item from each category */}
            <div style={{
              marginBottom: 20,
              background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles style={{ width: 16, height: 16, color: 'var(--primary)' }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Shop Your Closet</span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Rediscover neglected garments: one least-worn &amp; one unworn item per category
                  </span>
                </div>
              </div>

              {shopYourClosetByCategory.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Add clothes across categories to generate your "Shop Your Closet" recommendations.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shopYourClosetByCategory.map(({ category, leastWorn, unworn }) => (
                    <div 
                      key={category}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                        {category}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                        {/* 1. Least-Worn Item */}
                        {leastWorn ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: 8,
                            borderRadius: 8,
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)'
                          }}>
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: 6,
                              flexShrink: 0,
                              backgroundColor: leastWorn.image_url?.startsWith('#') ? leastWorn.image_url : 'var(--surface)',
                              backgroundImage: leastWorn.image_url?.startsWith('#') ? undefined : `url("${leastWorn.image_url}")`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center'
                            }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                                Least Worn
                              </span>
                              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {leastWorn.name || leastWorn.category}
                              </div>
                              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                Worn {leastWorn.worn_count ?? leastWorn.wear_count ?? 0}×
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: 8, fontStyle: 'italic' }}>
                            No worn item in this category.
                          </div>
                        )}

                        {/* 2. Unworn Item */}
                        {unworn ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: 8,
                            borderRadius: 8,
                            background: 'rgba(239, 68, 68, 0.04)',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            <div style={{
                              width: 44,
                              height: 44,
                              borderRadius: 6,
                              flexShrink: 0,
                              backgroundColor: unworn.image_url?.startsWith('#') ? unworn.image_url : 'var(--surface)',
                              backgroundImage: unworn.image_url?.startsWith('#') ? undefined : `url("${unworn.image_url}")`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center'
                            }} />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                                Unworn (0×)
                              </span>
                              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {unworn.name || unworn.category}
                              </div>
                              <span style={{ fontSize: 10.5, color: 'var(--danger)' }}>
                                Wear this today!
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: 8,
                            borderRadius: 8,
                            background: 'var(--surface-2)',
                            fontSize: 11,
                            color: 'var(--text-muted)'
                          }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>✓</span>
                            All items worn at least once!
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subheading: Least worn from each category */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 10 }}>
                Least worn from each category
              </span>

              {leastWornByCategory.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  Add clothes to your closet to see category utilization.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 12
                }}>
                  {leastWornByCategory.slice(0, 4).map(item => {
                    const isHex = item.image_url?.startsWith('#');
                    const wears = item.worn_count ?? item.wear_count ?? 0;
                    const catTag = item.category || item.type_tag || 'Garment';

                    return (
                      <div 
                        key={item.item_id}
                        style={{
                          background: 'var(--surface-2)',
                          borderRadius: 12,
                          padding: 8,
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center'
                        }}
                      >
                        {/* Garment Image Box */}
                        <div style={{
                          width: '100%',
                          height: 90,
                          borderRadius: 8,
                          marginBottom: 6,
                          backgroundColor: isHex ? item.image_url : 'var(--surface)',
                          backgroundImage: isHex ? undefined : `url("${item.image_url}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center'
                        }} />

                        {/* Labels: category and Worn Xx */}
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block' }}>
                          {catTag}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          Worn {wears}x
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Subheading: Borrowed */}
            <div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 10 }}>
                Borrowed
              </span>

              {activeBorrows.length === 0 ? (
                <div style={{ 
                  padding: 16, 
                  textAlign: 'center', 
                  color: 'var(--text-muted)', 
                  fontSize: 12, 
                  background: 'var(--surface-2)', 
                  borderRadius: 10 
                }}>
                  No active borrowed garments. Explore friends' closets to share outfits!
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: 12
                }}>
                  {activeBorrows.slice(0, 4).map(borrow => {
                    const item = borrow.item;
                    const lender = borrow.lender;
                    const isHex = item?.image_url?.startsWith('#');
                    const lenderInitial = lender?.first_name?.[0] || 'F';

                    return (
                      <div
                        key={borrow.borrow_id}
                        style={{
                          background: 'var(--surface-2)',
                          borderRadius: 12,
                          padding: 8,
                          border: '1px solid var(--border)',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        {/* Friend Avatar indicator (Figure .6.1) */}
                        <div
                          title={`Borrowed from ${lender?.first_name || 'Friend'}`}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#FFFFFF',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2
                          }}
                        >
                          {lenderInitial}
                        </div>

                        {/* Garment image */}
                        <div style={{
                          width: '100%',
                          height: 90,
                          borderRadius: 8,
                          marginBottom: 6,
                          backgroundColor: isHex ? item?.image_url : 'var(--surface)',
                          backgroundImage: isHex ? undefined : `url("${item?.image_url}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center'
                        }} />

                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>
                          {item?.name || item?.category || 'Garment'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {borrow.end_date ? `Due ${borrow.end_date}` : 'Active'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* BSAS Score Progression & Comparison Modal (TC_PROG_01, TC_PROG_02) */}
      {showProgression && (
        <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget) setShowProgression(false); }}>
          <div className="modal" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-display)' }}>
                  BSAS Score Progression
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Display and compare current vs previous BSAS assessment scores
                </span>
              </div>
              <button type="button" className="btn btn-g" onClick={() => setShowProgression(false)}>
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
              {/* Total Current Assessment Section */}
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--primary)' }}>
                    Current Assessment
                  </strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {currentAssessment ? new Date(currentAssessment.taken_at).toLocaleDateString() : 'None'}
                  </span>
                </div>

                {currentAssessment ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                      Total Score: {currentAssessment.score} / 7
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: currentAssessment.risk_level === 'Indicative' ? 'var(--danger-soft)' : 'rgba(34,197,94,0.15)',
                      color: currentAssessment.risk_level === 'Indicative' ? 'var(--danger)' : '#16a34a',
                      marginBottom: 12
                    }}>
                      Status: {currentAssessment.risk_level}
                    </div>

                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      <div>Salience: {currentAssessment.breakdown?.salience ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Mood Modification: {currentAssessment.breakdown?.mood_modification ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Conflict: {currentAssessment.breakdown?.conflict ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Tolerance: {currentAssessment.breakdown?.tolerance ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Relapse: {currentAssessment.breakdown?.relapse ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Withdrawal: {currentAssessment.breakdown?.withdrawal ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Problems: {currentAssessment.breakdown?.problems ? 'Endorsed' : 'Not Endorsed'}</div>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 0' }}>
                    No assessment completed yet.
                  </p>
                )}
              </div>

              {/* Total Previous Assessment Section */}
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Previous Assessment
                  </strong>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {previousAssessment ? new Date(previousAssessment.taken_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                {previousAssessment ? (
                  <>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
                      Total Score: {previousAssessment.score} / 7
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: previousAssessment.risk_level === 'Indicative' ? 'var(--danger-soft)' : 'rgba(34,197,94,0.15)',
                      color: previousAssessment.risk_level === 'Indicative' ? 'var(--danger)' : '#16a34a',
                      marginBottom: 12
                    }}>
                      Status: {previousAssessment.risk_level}
                    </div>

                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      <div>Salience: {previousAssessment.breakdown?.salience ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Mood Modification: {previousAssessment.breakdown?.mood_modification ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Conflict: {previousAssessment.breakdown?.conflict ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Tolerance: {previousAssessment.breakdown?.tolerance ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Relapse: {previousAssessment.breakdown?.relapse ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Withdrawal: {previousAssessment.breakdown?.withdrawal ? 'Endorsed' : 'Not Endorsed'}</div>
                      <div>Problems: {previousAssessment.breakdown?.problems ? 'Endorsed' : 'Not Endorsed'}</div>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 0' }}>
                    No previous assessment found for longitudinal comparison. Complete your next monthly check-in to track changes.
                  </p>
                )}
              </div>
            </div>

            {/* Score Comparison Analysis Summary */}
            {currentAssessment && previousAssessment && (
              <div style={{ padding: 14, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>Score Progression Trend:</strong>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text)' }}>
                  {currentAssessment.score < previousAssessment.score ? (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      ✓ Your score improved by {previousAssessment.score - currentAssessment.score} point(s) compared to your previous assessment!
                    </span>
                  ) : currentAssessment.score > previousAssessment.score ? (
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      Your score increased by {currentAssessment.score - previousAssessment.score} point(s). Review your shopping habits and self-care strategies.
                    </span>
                  ) : (
                    <span>Your BSAS score remains stable at {currentAssessment.score} / 7.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
