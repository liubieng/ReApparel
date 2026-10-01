import React, { useMemo, useState } from 'react';
import { 
  BrainCircuit, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  Leaf, 
  Sparkles, 
  RotateCcw, 
  Shirt, 
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Filter,
  AlertCircle,
  Flame,
  Award,
  Pencil,
  Plus
} from 'lucide-react';
import { BSASAssessment, ClothingItem } from '../types/database';
import { createGarmentSilhouette } from '../data/seedData';

/**
 * ============================================================================
 * RECOVERY & WARDROBE ANALYTICS VIEW (RecoveryView.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT & METHODOLOGY:
 * 1. Bergen Shopping Addiction Scale (BSAS) Clinical Progress Monitoring:
 *    - Diagnostic cut-off score >= 4 indicates "Indicative Risk" for compulsive shopping.
 *    - Score < 4 indicates "Non-Indicative Risk" (behavioral stabilization).
 * 2. 30-Day Assessment Cooldown:
 *    - Prevents test-retest learning bias in psychological instruments.
 *    - Includes a testing override ("Simulate +30 Days") for panel demonstration.
 * 3. Longitudinal Recovery Chart & Clinical Diagnostics:
 *    - Renders a score progression chart showing reduction of compulsive tendencies.
 *    - Criteria breakdown analyzing specific psychological dimensions.
 * 4. Wardrobe Circularity Metrics & Frequency Ranking:
 *    - Tracks wardrobe utilization rate, total wardrobe wears, and wear distribution.
 * 5. Anti-Impulse "Shop Your Closet" Curation:
 *    - Displays one unworn (0 wears) and one least-worn clothing item from each category.
 *    - Directly promotes re-wearing and styling existing wardrobe pieces before buying new.
 */

interface RecoveryViewProps {
  assessments: BSASAssessment[];
  garments: ClothingItem[];
  simulatedDaysOffset: number;
  onSimulateCooldownAdvance: () => void;
  onStartRetakeAssessment: () => void;
  onNavigateToCloset: () => void;
  onNavigateToDailyLog?: () => void;
  onEditGarment?: (garment: ClothingItem) => void;
  onOpenAddGarment?: () => void;
}

export const RecoveryView: React.FC<RecoveryViewProps> = ({
  assessments,
  garments,
  simulatedDaysOffset,
  onSimulateCooldownAdvance,
  onStartRetakeAssessment,
  onNavigateToCloset,
  onNavigateToDailyLog,
  onEditGarment,
  onOpenAddGarment
}) => {
  const [rankCategoryFilter, setRankCategoryFilter] = useState<string>('All');

  // Sort assessments chronologically (latest first for card, oldest first for chart)
  const sortedDesc = useMemo(() => {
    return [...assessments].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
  }, [assessments]);

  const sortedAsc = useMemo(() => {
    return [...assessments].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
  }, [assessments]);

  const latest = sortedDesc[0];

  // 30-Day Cooldown Calculation
  const cooldownInfo = useMemo(() => {
    if (!latest) {
      return { canTake: true, daysRemaining: 0, lastDate: null, nextDate: null };
    }
    const lastDate = new Date(latest.taken_at);
    const msSince = Date.now() - lastDate.getTime() + simulatedDaysOffset * 86400000;
    const daysSince = Math.floor(msSince / (1000 * 60 * 60 * 24));
    const COOLDOWN_DAYS = 30;
    const daysRemaining = Math.max(0, COOLDOWN_DAYS - daysSince);

    const nextDate = new Date(lastDate.getTime() + COOLDOWN_DAYS * 86400000);

    return {
      canTake: daysRemaining === 0,
      daysRemaining,
      lastDate: lastDate.toLocaleDateString(),
      nextDate: nextDate.toLocaleDateString()
    };
  }, [latest, simulatedDaysOffset]);

  // Wardrobe Utilization Metrics
  const wardrobeStats = useMemo<{
    total: number;
    wornCount: number;
    unwornCount: number;
    rate: number;
    totalWears: number;
    hero: ClothingItem | null;
  }>(() => {
    const total = garments.length;
    if (total === 0) {
      return { total: 0, wornCount: 0, unwornCount: 0, rate: 0, totalWears: 0, hero: null };
    }

    let totalWorn = 0;
    let totalWears = 0;
    let maxWear = 0;
    let heroItem: ClothingItem | null = null;

    garments.forEach(g => {
      const wear = g.worn_count ?? g.wear_count ?? 0;
      totalWears += wear;
      if (wear > 0) totalWorn++;
      if (wear > maxWear) {
        maxWear = wear;
        heroItem = g;
      }
    });

    const rate = Math.round((totalWorn / total) * 100);

    return {
      total,
      wornCount: totalWorn,
      unwornCount: total - totalWorn,
      rate,
      totalWears,
      hero: heroItem
    };
  }, [garments]);

  // Compute Active Categories present in user's wardrobe
  const wardrobeCategories = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    garments.forEach(g => {
      const cat = (g.category || g.type_tag || '').trim();
      if (!cat) return;
      if (map.has(cat)) {
        map.get(cat)!.count += 1;
      } else {
        map.set(cat, { name: cat, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [garments]);

  // "Shop Your Closet" Generator
  // Displays one least worn and one unworn clothing item from each category of clothing
  const shopYourClosetPairs = useMemo(() => {
    return wardrobeCategories.map(({ name: catName, count }) => {
      const itemsInCat = garments.filter(g => {
        const cat = (g.category || g.type_tag || '').trim().toLowerCase();
        return cat === catName.toLowerCase();
      });

      // 1. One unworn clothing item (wear_count === 0)
      const unwornItem = itemsInCat.find(g => (g.worn_count ?? g.wear_count ?? 0) === 0) || null;

      // 2. One least worn clothing item (lowest wear_count > 0, or alternative item)
      const wornItems = itemsInCat
        .filter(g => (g.worn_count ?? g.wear_count ?? 0) > 0)
        .sort((a, b) => (a.worn_count ?? a.wear_count ?? 0) - (b.worn_count ?? b.wear_count ?? 0));

      const leastWornItem = wornItems[0] || (unwornItem ? itemsInCat.find(g => g.item_id !== unwornItem.item_id) || null : null);

      return {
        category: catName,
        count,
        unwornItem,
        leastWornItem
      };
    });
  }, [wardrobeCategories, garments]);

  // Most-to-Least Frequently Used Garments Ranking
  const sortedGarments = useMemo(() => {
    return [...garments].sort((a, b) => {
      const wearA = a.worn_count ?? a.wear_count ?? 0;
      const wearB = b.worn_count ?? b.wear_count ?? 0;
      return wearB - wearA;
    });
  }, [garments]);

  const maxGarmentWear = useMemo(() => {
    return Math.max(1, ...garments.map(g => g.worn_count ?? g.wear_count ?? 0));
  }, [garments]);

  const filteredSortedGarments = useMemo(() => {
    if (rankCategoryFilter === 'All') return sortedGarments;
    return sortedGarments.filter(g => (g.category || 'Tops').toLowerCase() === rankCategoryFilter.toLowerCase());
  }, [sortedGarments, rankCategoryFilter]);

  // SVG Chart Geometry
  const chartHeight = 160;
  const chartWidth = 560;
  const maxScore = 7;

  const points = sortedAsc.map((a, idx) => {
    const x = sortedAsc.length > 1
      ? 40 + (idx / (sortedAsc.length - 1)) * (chartWidth - 80)
      : chartWidth / 2;
    const y = chartHeight - 25 - (a.score / maxScore) * (chartHeight - 50);
    return {
      x,
      y,
      score: a.score,
      date: new Date(a.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`), '')
    : '';

  return (
    <div>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>
            Recovery Progress &amp; Impact
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Longitudinal BSAS tracking, wardrobe circularity, and anti-impulse wardrobe rediscovery
          </div>
        </div>

        {/* Retake or Cooldown Action */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {cooldownInfo.canTake ? (
            <button
              type="button"
              className="btn btn-p"
              style={{ fontSize: 13, padding: '7px 14px' }}
              onClick={onStartRetakeAssessment}
            >
              <BrainCircuit className="ico" style={{ width: 14, height: 14 }} />
              <span>Take BSAS Now</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock className="ico" style={{ width: 13, height: 13 }} />
                <span>Next in {cooldownInfo.daysRemaining} days</span>
              </span>
              <button
                type="button"
                className="btn btn-g"
                style={{ fontSize: 11, padding: '4px 8px' }}
                title="Simulates 30 days passing to unlock immediate retake for panel demo"
                onClick={onSimulateCooldownAdvance}
              >
                Simulate +30 Days
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Status KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 20 }}>
        
        {/* Card 1: Diagnostic BSAS Status */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                BSAS Clinical Status
              </span>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                {latest ? `${latest.score} / 7 Criteria` : 'No Check-In Yet'}
              </div>
            </div>

            {latest && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 6,
                background: latest.score >= 4 ? 'var(--danger-soft)' : 'var(--surface-2)',
                color: latest.score >= 4 ? 'var(--danger)' : 'var(--primary)',
                border: `1px solid ${latest.score >= 4 ? 'var(--danger)' : 'var(--primary)'}`
              }}>
                {latest.score >= 4 ? (
                  <>
                    <AlertTriangle style={{ width: 12, height: 12 }} /> Indicative Risk
                  </>
                ) : (
                  <>
                    <ShieldCheck style={{ width: 12, height: 12 }} /> Non-Indicative Risk
                  </>
                )}
              </span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {latest ? (
              latest.score >= 4
                ? 'Clinical cutoff reached (>=4). Mindful borrowing and "Shop Your Closet" rediscovery recommended.'
                : 'Shopping behaviors remain within healthy, non-compulsive thresholds (<4 criteria endorsed).'
            ) : (
              'Complete your first 7-item check-in to establish your baseline score.'
            )}
          </p>
        </div>

        {/* Card 2: Wardrobe Utilization Rate */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Wardrobe Utilization Rate
              </span>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>
                {wardrobeStats.rate}% Worn
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {wardrobeStats.wornCount} / {wardrobeStats.total} Items
            </span>
          </div>

          <div style={{ height: 6, width: '100%', background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${wardrobeStats.rate}%`, background: 'var(--primary)' }} />
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)' }}>
            {wardrobeStats.unwornCount > 0
              ? `${wardrobeStats.unwornCount} items unworn in closet. Maximize active wears before buying new!`
              : 'Outstanding! 100% of your current wardrobe has been actively utilized.'}
          </p>
        </div>

        {/* Card 3: Total Wardrobe Wears */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Wardrobe Wears
              </span>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                {wardrobeStats.totalWears} Wears
              </div>
            </div>
            <Shirt className="ico" style={{ color: 'var(--primary)', width: 18, height: 18 }} />
          </div>

          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
            {wardrobeStats.hero
              ? `Most utilized item: "${wardrobeStats.hero.name}" (${wardrobeStats.hero.worn_count ?? wardrobeStats.hero.wear_count ?? 0} wears).`
              : 'Maximize repeat wears across your wardrobe to reduce textile waste.'}
          </p>
        </div>

      </div>

      {/* ====================================================================
       * SECTION 1: BSAS PROGRESSION TIMELINE & CRITERIA BREAKDOWN
       * ==================================================================== */}
      <div style={{ marginBottom: 24 }}>
        {/* Longitudinal BSAS Progression Line Chart */}
        <div className="card" style={{ padding: '18px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: 16, fontFamily: 'var(--font-display)' }}>
                BSAS Score Progression Timeline
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Diagnostic score trajectory across repeated check-ins (Target: score &lt; 4)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} /> Score Line
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)' }}>
                <span style={{ width: 12, height: 2, background: 'var(--danger)', display: 'inline-block' }} /> Threshold (4)
              </span>
            </div>
          </div>

          {sortedAsc.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No assessment history logged yet. Complete a check-in to plot your recovery curve.
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', maxHeight: 200 }}>
                {/* Grid Lines */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map(scoreVal => {
                  const y = chartHeight - 25 - (scoreVal / maxScore) * (chartHeight - 50);
                  const isThreshold = scoreVal === 4;
                  return (
                    <g key={scoreVal}>
                      <line
                        x1={35}
                        y1={y}
                        x2={chartWidth - 20}
                        y2={y}
                        stroke={isThreshold ? 'var(--danger)' : 'var(--border)'}
                        strokeDasharray={isThreshold ? '4 3' : undefined}
                        strokeWidth={isThreshold ? 1.5 : 1}
                        opacity={isThreshold ? 0.8 : 0.4}
                      />
                      <text x={18} y={y + 4} fontSize={9.5} fill={isThreshold ? 'var(--danger)' : 'var(--text-muted)'} fontWeight={isThreshold ? 700 : 400}>
                        {scoreVal}
                      </text>
                    </g>
                  );
                })}

                {/* Score Line Path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Point Circles */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={5}
                      fill="var(--surface)"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                    />
                    <text
                      x={p.x}
                      y={chartHeight - 6}
                      fontSize={10}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                    >
                      {p.date}
                    </text>
                    <text
                      x={p.x}
                      y={p.y - 8}
                      fontSize={10}
                      fontWeight={700}
                      textAnchor="middle"
                      fill="var(--text)"
                    >
                      {p.score}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Latest Assessment Diagnostic Breakdown */}
        {latest && latest.breakdown && (
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-display)' }}>
                Criteria Endorsement Breakdown (Latest Check-In)
              </h3>
              <span style={{ 
                fontSize: 11.5, 
                fontWeight: 700, 
                color: latest.score >= 4 ? 'var(--danger)' : 'var(--primary)' 
              }}>
                {latest.score} of 7 Criteria Endorsed ({latest.score >= 4 ? 'Indicative Risk' : 'Non-Indicative Risk'})
              </span>
            </div>

            <div className="bsas-criteria-grid">
              {['salience', 'mood_modification', 'conflict', 'tolerance', 'relapse', 'withdrawal', 'problems'].map((dim) => {
                const score = (latest.breakdown as any)[dim];
                const isEndorsed = Number(score) === 1 || Number(score) >= 4;
                return (
                  <div
                    key={dim}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 8,
                      background: isEndorsed ? 'var(--danger-soft)' : 'var(--surface-2)',
                      border: `1.5px solid ${isEndorsed ? 'var(--danger)' : 'var(--border)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 70,
                      boxShadow: isEndorsed ? '0 1px 3px rgba(166,72,58,0.1)' : 'none'
                    }}
                  >
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 600, 
                      textTransform: 'capitalize', 
                      color: isEndorsed ? 'var(--danger)' : 'var(--text)',
                      lineHeight: 1.25,
                      minHeight: 28
                    }}>
                      {dim.replace('_', ' ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <strong style={{ fontSize: 11.5, color: isEndorsed ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {isEndorsed ? 'Endorsed' : 'Normal'}
                      </strong>
                      <span style={{ 
                        fontSize: 8.5, 
                        fontWeight: 800, 
                        padding: '2px 4px', 
                        borderRadius: 4, 
                        background: isEndorsed ? 'rgba(166, 72, 58, 0.15)' : 'rgba(62, 107, 69, 0.15)',
                        color: isEndorsed ? 'var(--danger)' : 'var(--primary)' 
                      }}>
                        {isEndorsed ? 'CRITERION' : 'NORMAL'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
       * SECTION 2: WARDROBE UTILIZATION RANKING
       * ==================================================================== */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 style={{ width: 17, height: 17, color: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)' }}>
                Wardrobe Utilization Ranking
              </h3>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Clothing items sorted from most frequently to least frequently worn
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'].map(cat => (
              <button
                key={cat}
                type="button"
                className={`btn ${rankCategoryFilter === cat ? 'btn-p' : 'btn-g'}`}
                style={{ fontSize: 11, padding: '4px 8px' }}
                onClick={() => setRankCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredSortedGarments.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No clothing items found for category "{rankCategoryFilter}".
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredSortedGarments.map((item, idx) => {
              const wear = item.worn_count ?? item.wear_count ?? 0;
              const wearPct = maxGarmentWear > 0 ? (wear / maxGarmentWear) * 100 : 0;
              const isUnworn = wear === 0;
              const isStaple = wear >= 10;
              const isHero = idx === 0 && wear > 0;

              return (
                <div
                  key={item.item_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: isUnworn ? 'var(--danger-soft)' : 'var(--surface-2)',
                    border: `1px solid ${isUnworn ? 'var(--danger)' : isHero ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Rank Badge */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: isHero ? 'var(--primary)' : idx < 3 ? 'var(--surface)' : 'transparent',
                    color: isHero ? '#ffffff' : 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                    border: isHero ? 'none' : '1px solid var(--border)'
                  }}>
                    #{idx + 1}
                  </div>

                  {/* Thumbnail / Swatch */}
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 6,
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid var(--border)'
                  }}>
                    {item.image_url && !item.image_url.startsWith('#') ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.onerror = null;
                          target.src = createGarmentSilhouette(item.color_tag || '#64748b', item.name);
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: item.color_tag || (item.image_url?.startsWith('#') ? item.image_url : 'var(--primary)'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <Shirt style={{ width: 18, height: 18 }} />
                      </div>
                    )}
                  </div>

                  {/* Garment Details & Utilization Bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 13, color: 'var(--text)' }}>
                        {item.name}
                      </strong>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        &bull; {item.category}
                      </span>
                      {item.color && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          ({item.color})
                        </span>
                      )}
                    </div>

                    {/* Progress Bar of Relative Wear */}
                    <div style={{
                      marginTop: 6,
                      height: 5,
                      width: '100%',
                      background: 'var(--surface)',
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${wearPct}%`,
                        background: isUnworn ? 'var(--danger)' : isHero ? 'var(--primary)' : 'var(--accent)',
                        borderRadius: 3
                      }} />
                    </div>
                  </div>

                  {/* Wear Count Metric */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 70 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isUnworn ? 'var(--danger)' : 'var(--text)' }}>
                      {wear} {wear === 1 ? 'wear' : 'wears'}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>
                      {isUnworn ? (
                        <span style={{ color: 'var(--danger)' }}>Unworn ⚠️</span>
                      ) : isStaple ? (
                        <span style={{ color: 'var(--primary)' }}>Staple 🌟</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>In Rotation</span>
                      )}
                    </div>
                  </div>

                  {/* Action Link for Unworn Items */}
                  {isUnworn && (
                    <button
                      type="button"
                      className="btn btn-g"
                      style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
                      onClick={onNavigateToDailyLog || onNavigateToCloset}
                      title="Wear this unworn item today in your Daily Log"
                    >
                      Wear Today &rarr;
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====================================================================
       * SECTION 3: "SHOP YOUR CLOSET" (ANTI-IMPULSE CURATION)
       * Displays one least worn and one unworn clothing from each category
       * ==================================================================== */}
      <div style={{ marginBottom: 24 }}>
        {/* Informational anti-impulse header banner */}
        <div className="card" style={{
          padding: '16px 20px',
          marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(62, 107, 69, 0.08) 0%, rgba(214, 199, 161, 0.15) 100%)',
          border: '1.5px solid var(--primary-soft)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Sparkles style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
                  Shop Your Closet
                </h3>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--primary)', color: '#ffffff' }}>
                  ANTI-IMPULSE CURATION
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, maxWidth: 640 }}>
                Feeling the urge to buy new clothes? Combat impulsive purchasing by shopping what you already own.
                Below is <strong>one unworn (0 wears)</strong> and <strong>one least-worn</strong> garment from each category in your wardrobe waiting to be styled before buying new!
              </p>
            </div>

            {onNavigateToDailyLog && (
              <button
                type="button"
                className="btn btn-p"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}
                onClick={onNavigateToDailyLog}
              >
                <Shirt style={{ width: 14, height: 14 }} />
                <span>Log Outfit in Daily Log &rarr;</span>
              </button>
            )}
          </div>
        </div>

        {shopYourClosetPairs.length === 0 ? (
          <div className="card" style={{ padding: '36px 20px', textAlign: 'center' }}>
            <Shirt style={{ width: 40, height: 40, color: 'var(--text-muted)', opacity: 0.5, margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>Your closet is empty</h4>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-muted)' }}>
              Add clothes to your virtual closet first to generate your personalized "Shop Your Closet" recommendations!
            </p>
            <button
              type="button"
              className="btn btn-p"
              onClick={onOpenAddGarment || onNavigateToCloset}
            >
              <Plus className="ico" /> Add Garment
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {shopYourClosetPairs.map(({ category, count, unwornItem, leastWornItem }) => (
              <div key={category} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 15.5, fontFamily: 'var(--font-display)' }}>
                      {category}
                    </h4>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ({count} {count === 1 ? 'garment' : 'garments'} registered)
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600 }}>
                    {unwornItem ? '✨ Unworn Piece Available' : '✅ 100% Utilized'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {/* Unworn Spotlight */}
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1.5px dashed var(--primary-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                        🌟 Unworn Garment
                      </span>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(220, 38, 38, 0.1)', color: 'var(--danger)', fontWeight: 700 }}>
                        0 Wears
                      </span>
                    </div>

                    {unwornItem ? (
                      <div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: 'var(--surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            {unwornItem.image_url?.startsWith('#') ? (
                              <div style={{ width: '100%', height: '100%', backgroundColor: unwornItem.image_url }} />
                            ) : (
                              <img
                                src={unwornItem.image_url || createGarmentSilhouette(unwornItem.color_tag || '#64748b', unwornItem.name)}
                                alt={unwornItem.name}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = createGarmentSilhouette(unwornItem.color_tag || '#64748b', unwornItem.name);
                                }}
                              />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: 13, display: 'block', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {unwornItem.name}
                            </strong>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {unwornItem.color || 'Neutral'} &middot; {unwornItem.type_tag || category}
                            </span>
                            <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>
                              💡 <em>Wear this first before buying new!</em>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          {onEditGarment && (
                            <button
                              type="button"
                              className="btn btn-g"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => onEditGarment(unwornItem)}
                            >
                              <Pencil style={{ width: 11, height: 11 }} /> Edit
                            </button>
                          )}
                          {onNavigateToDailyLog && (
                            <button
                              type="button"
                              className="btn btn-p"
                              style={{ fontSize: 11, padding: '3px 10px' }}
                              onClick={onNavigateToDailyLog}
                            >
                              Wear Today &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                        🎉 You have worn every {category.toLowerCase()} item at least once!
                      </div>
                    )}
                  </div>

                  {/* Least-Worn Spotlight */}
                  <div style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        🔄 Least-Worn Garment
                      </span>
                      {leastWornItem && (
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text)', fontWeight: 700 }}>
                          {leastWornItem.worn_count ?? leastWornItem.wear_count ?? 0} {(leastWornItem.worn_count ?? leastWornItem.wear_count ?? 0) === 1 ? 'wear' : 'wears'}
                        </span>
                      )}
                    </div>

                    {leastWornItem ? (
                      <div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: 8,
                            backgroundColor: 'var(--surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            {leastWornItem.image_url?.startsWith('#') ? (
                              <div style={{ width: '100%', height: '100%', backgroundColor: leastWornItem.image_url }} />
                            ) : (
                              <img
                                src={leastWornItem.image_url || createGarmentSilhouette(leastWornItem.color_tag || '#64748b', leastWornItem.name)}
                                alt={leastWornItem.name}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.onerror = null;
                                  target.src = createGarmentSilhouette(leastWornItem.color_tag || '#64748b', leastWornItem.name);
                                }}
                              />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ fontSize: 13, display: 'block', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {leastWornItem.name}
                            </strong>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {leastWornItem.color || 'Neutral'} &middot; {leastWornItem.type_tag || category}
                            </span>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              🌱 <em>Only worn {leastWornItem.worn_count ?? leastWornItem.wear_count ?? 0}x. Keep styling it!</em>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          {onEditGarment && (
                            <button
                              type="button"
                              className="btn btn-g"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => onEditGarment(leastWornItem)}
                            >
                              <Pencil style={{ width: 11, height: 11 }} /> Edit
                            </button>
                          )}
                          {onNavigateToDailyLog && (
                            <button
                              type="button"
                              className="btn btn-p"
                              style={{ fontSize: 11, padding: '3px 10px' }}
                              onClick={onNavigateToDailyLog}
                            >
                              Wear Today &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                        No additional items in this category.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
