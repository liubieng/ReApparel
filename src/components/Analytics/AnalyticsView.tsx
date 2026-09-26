import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  AlertCircle, 
  Award, 
  Sparkles, 
  Shirt, 
  Droplet, 
  Leaf, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { ClothingItem, BSASAssessment } from '../../types/database';
import { closetService } from '../../services/closetService';

interface AnalyticsViewProps {
  items: ClothingItem[];
  assessments: BSASAssessment[];
  onSelectForTodayOutfit?: (item: ClothingItem) => void;
  onNavigateToCloset?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  items,
  assessments,
  onSelectForTodayOutfit,
  onNavigateToCloset
}) => {
  const analytics = useMemo(() => {
    return closetService.calculateClosetAnalytics(items);
  }, [items]);

  // Sort assessments chronologically for line chart
  const sortedAssessments = useMemo(() => {
    return [...assessments].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
  }, [assessments]);

  // SVG Chart Dimensions for BSAS Score Progression
  const chartHeight = 160;
  const chartWidth = 560;
  const maxScore = 7;

  const points = sortedAssessments.map((a, idx) => {
    const x = sortedAssessments.length > 1 
      ? 40 + (idx / (sortedAssessments.length - 1)) * (chartWidth - 80)
      : chartWidth / 2;
    const y = chartHeight - 30 - (a.score / maxScore) * (chartHeight - 60);
    return { x, y, score: a.score, date: new Date(a.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) };
  });

  const pathD = points.length > 0 
    ? points.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`), '')
    : '';

  // Indicative threshold y coordinate (score = 4)
  const thresholdY = chartHeight - 30 - (4 / maxScore) * (chartHeight - 60);

  // Category breakdown
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => {
      const cat = i.category || 'Other';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  return (
    <div className="space-y-6">
      
      {/* 4.2.3 Least Worn Clothing Prompt (Automated Nudge Banner) */}
      {analytics.unwornList.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Wardrobe Rotation Nudge
                </span>
                <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  {analytics.unwornList.length} Neglected Garments
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5">
                You have {analytics.unwornList.length} items with 0 wears in your closet. Circulate them in your next daily outfit to maximize garment lifespan and prevent deadstock waste.
              </p>
            </div>
          </div>

          {/* Quick spotlight item */}
          {analytics.unwornList[0] && onSelectForTodayOutfit && (
            <button
              onClick={() => onSelectForTodayOutfit(analytics.unwornList[0])}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Wear "{analytics.unwornList[0].name.slice(0, 18)}..." Today</span>
            </button>
          )}
        </div>
      )}

      {/* UN SDG 12 Environmental Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Active Utilization</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-slate-900">
              {analytics.utilizationRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({analytics.wornItems}/{analytics.totalItems})
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Leaf className="w-4 h-4 text-emerald-600" />
            <span>CO₂ Emissions Averted</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-emerald-600">
              {analytics.co2AvertedKg}
            </span>
            <span className="text-xs text-slate-500 font-medium">kg CO₂e</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Droplet className="w-4 h-4 text-sky-600" />
            <span>Water Saved (SDG 12)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-sky-600">
              {analytics.waterAvertedLiters.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">liters</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Average Wears / Item</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-indigo-600">
              {analytics.averageWears}
            </span>
            <span className="text-xs text-slate-500 font-medium">times</span>
          </div>
        </div>
      </div>

      {/* Grid: 4.1 BSAS Progression Chart + 4.2.1 Wardrobe Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 4.1 BSAS Score Progression Time-Series */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                4.1 BSAS Score Progression (Monthly Recovery Trend)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracking shopping addiction reduction toward the safe Non-Indicative threshold (&lt;4)
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 font-medium text-amber-600">
                <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Cutoff (4)
              </span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Actual Score
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
              
              {/* Background grid horizontal lines */}
              {[0, 2, 4, 6].map((score) => {
                const y = chartHeight - 30 - (score / maxScore) * (chartHeight - 60);
                return (
                  <g key={score}>
                    <line x1="30" y1={y} x2={chartWidth - 20} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x="18" y={y + 3} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">
                      {score}
                    </text>
                  </g>
                );
              })}

              {/* Indicative Threshold Line (Score 4) */}
              <line
                x1="30"
                y1={thresholdY}
                x2={chartWidth - 20}
                y2={thresholdY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x={chartWidth - 15} y={thresholdY - 4} fill="#d97706" fontSize="9" textAnchor="end" fontWeight="bold">
                Threshold: 4.0
              </text>

              {/* Score Trend Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="hover:r-7 transition cursor-pointer"
                  />
                  <text
                    x={p.x}
                    y={p.y - 10}
                    fill="#0f172a"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {p.score}
                  </text>
                  <text
                    x={p.x}
                    y={chartHeight - 12}
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {p.date}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {sortedAssessments.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 text-center">
              No BSAS clinical assessments recorded yet. Take the Bergen Shopping Addiction Scale questionnaire in the BSAS tab to plot your baseline score.
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
              <span>
                Latest assessment: <strong>{sortedAssessments[sortedAssessments.length - 1]?.score || 0} / 7</strong> ({sortedAssessments[sortedAssessments.length - 1]?.risk_level || 'N/A'})
              </span>
              <span className="text-emerald-700 font-semibold">
                ↓ Lower score denotes positive behavioral recovery
              </span>
            </div>
          )}
        </div>

        {/* 4.2.1 Wardrobe Donut / Utilization Ratio */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 font-display flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              4.2.1 Wardrobe Active Ratio
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active vs unworn deadstock inventory breakdown
            </p>
          </div>

          <div className="flex items-center justify-around py-3">
            {/* Visual SVG Donut */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                {/* Background Ring */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="3.8"
                />
                {/* Worn Items Stroke (Emerald) */}
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.8"
                  strokeDasharray={`${analytics.utilizationRate}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-bold font-display text-slate-900">
                  {analytics.utilizationRate}%
                </span>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                  Active
                </span>
              </div>
            </div>

            {/* Legend & Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-700">Worn ({analytics.wornItems} items)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-200 shrink-0" />
                <span className="text-slate-500">Unworn ({analytics.unwornItems} items)</span>
              </div>
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div>Total tracked garments: <strong>{analytics.totalItems}</strong></div>
              </div>
            </div>
          </div>

          {/* Category distribution bars */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Category Distribution:
            </span>
            {categoryCounts.slice(0, 4).map(([cat, count]) => {
              const pct = Math.round((count / (analytics.totalItems || 1)) * 100);
              return (
                <div key={cat} className="space-y-0.5">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span>{cat}</span>
                    <span className="font-mono text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* 4.2.2 Most to Least Worn: Ranked Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Most Worn Garments (Wardrobe Champions) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900 font-display">
                Top 5 Most Worn Garments (High Rotation)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Lowest Cost-Per-Wear
            </span>
          </div>

          <div className="space-y-2.5">
            {analytics.mostWorn.map((item, index) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-bold text-xs text-slate-400 font-mono">
                    #{index + 1}
                  </span>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                  />
                  <div>
                    <h5 className="font-semibold text-xs text-slate-900 line-clamp-1">{item.name}</h5>
                    <span className="text-[11px] text-slate-500">{item.category}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-xs text-emerald-700 font-mono block">
                    {item.wear_count} wears
                  </span>
                  <span className="text-[10px] text-slate-400">Rotated actively</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Least Worn Garments (Need Rotation) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900 font-display">
                Least Worn Garments (Target for Rotation)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Neglected Pieces
            </span>
          </div>

          <div className="space-y-2.5">
            {analytics.leastWorn.map((item, index) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-bold text-xs text-slate-400 font-mono">
                    #{index + 1}
                  </span>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-0.5"
                  />
                  <div>
                    <h5 className="font-semibold text-xs text-slate-900 line-clamp-1">{item.name}</h5>
                    <span className="text-[11px] text-slate-500">{item.category}</span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <span className="font-bold text-xs text-amber-700 font-mono block">
                      {item.wear_count} wears
                    </span>
                    <span className="text-[10px] text-slate-400">{item.wear_count === 0 ? 'Unworn' : 'Low wear'}</span>
                  </div>

                  {onSelectForTodayOutfit && (
                    <button
                      onClick={() => onSelectForTodayOutfit(item)}
                      title="Wear today"
                      className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition cursor-pointer"
                    >
                      <Shirt className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
