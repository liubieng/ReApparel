import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Shirt, 
  Moon, 
  Sparkles, 
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import { DailyClothingLog, ClothingItem } from '../../types/database';

/**
 * ============================================================================
 * DAILY OUTFIT LOG VIEW (DailyLogView.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE CONTEXT & METHODOLOGY:
 * - Implements daily clothing utilization logging to combat impulse purchasing
 *   and unmindful garment accumulation (UN SDG 12 Target 12.5).
 * - Lifecycle States:
 *   1. Active (Daytime): User can freely add/remove garments worn throughout the day.
 *   2. Finalized / Locked (00:00 Midnight): Automatically locks the day's outfit,
 *      freezes edits, and increments the cumulative `wear_count` for each worn garment.
 * - Panel Simulation Feature: Includes a dedicated "Simulate 00:00 Midnight Job"
 *   button to demonstrate the automated pg_cron / Edge Function behavior on demand.
 */

interface DailyLogViewProps {
  todayLog: DailyClothingLog;
  closetGarments: ClothingItem[];
  onToggleGarmentInOutfit: (garment: ClothingItem) => Promise<void>;
  onFinalizeLog: () => Promise<void>;
  onDeleteLog: () => Promise<void>;
  onSimulateMidnight: () => Promise<void>;
  onNavigateToCloset: () => void;
  toast: (msg: string) => void;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  todayLog,
  closetGarments,
  onToggleGarmentInOutfit,
  onFinalizeLog,
  onDeleteLog,
  onSimulateMidnight,
  onNavigateToCloset,
  toast
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedItems = todayLog.items || [];
  const isLocked = todayLog.is_finalized;

  const handleFinalize = async () => {
    if (selectedItems.length === 0) {
      toast('Please select at least one garment you wore today.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onFinalizeLog();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMidnight = async () => {
    if (selectedItems.length === 0) {
      toast('Select at least one garment before running the midnight simulation.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSimulateMidnight();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>
            Daily Outfit Log
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Date: <strong>{todayLog.log_date}</strong> &middot; Track what you wore today to boost wear count metrics
          </div>
        </div>

        {/* Lock Status Pill */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: 16,
          background: isLocked ? 'var(--surface-2)' : 'rgba(37, 99, 235, 0.1)',
          color: isLocked ? 'var(--text-muted)' : '#2563eb',
          border: `1px solid ${isLocked ? 'var(--border)' : 'rgba(37, 99, 235, 0.2)'}`
        }}>
          {isLocked ? (
            <>
              <Lock className="ico" style={{ width: 13, height: 13 }} />
              <span>Locked &amp; Finalized</span>
            </>
          ) : (
            <>
              <Unlock className="ico" style={{ width: 13, height: 13 }} />
              <span>Editing Open (Unfinalized)</span>
            </>
          )}
        </span>
      </div>

      {/* Today's Selected Outfit Summary Card */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shirt className="ico" style={{ color: 'var(--primary)' }} />
            <strong style={{ fontSize: 14 }}>Today's Outfit Items ({selectedItems.length})</strong>
          </div>
          
          {!isLocked && selectedItems.length > 0 && (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)' }}
              onClick={onDeleteLog}
            >
              <Trash2 className="ico" style={{ width: 11, height: 11 }} /> Clear Today's Log
            </button>
          )}
        </div>

        {selectedItems.length === 0 ? (
          <div style={{
            padding: '24px 16px',
            textAlign: 'center',
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px dashed var(--border)'
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-muted)' }}>
              You haven't logged any garments for today yet.
            </p>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Tap any item in your wardrobe below to add it to today's outfit!
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {selectedItems.map(item => {
              const isHex = item.image_url?.startsWith('#');
              return (
                <div
                  key={item.item_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <span
                    className="swatchsm"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: isHex ? item.image_url : undefined,
                      backgroundImage: isHex ? undefined : `url(${item.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'inline-block'
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: 12.5, display: 'block', color: 'var(--text)' }}>{item.name}</strong>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.category || item.type_tag || 'Garment'}</span>
                  </div>
                  {!isLocked && (
                    <button
                      type="button"
                      className="icobtn"
                      style={{ padding: 2, marginLeft: 4 }}
                      onClick={() => onToggleGarmentInOutfit(item)}
                      title="Remove from outfit"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons & Defense Simulator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--border)'
        }}>
          <div>
            {!isLocked ? (
              <button
                type="button"
                className="btn btn-p"
                disabled={selectedItems.length === 0 || isSubmitting}
                style={{ padding: '8px 18px', fontSize: 13 }}
                onClick={handleFinalize}
              >
                <Check className="ico" style={{ width: 14, height: 14 }} />
                <span>Finalize Outfit &amp; Update Wear Counts</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 className="ico" style={{ width: 14, height: 14 }} />
                  Outfit finalized &amp; wear counts incremented!
                </span>
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  onClick={onDeleteLog}
                  title="Re-open today's log for continuous demonstration and testing"
                >
                  <RotateCcw className="ico" style={{ width: 12, height: 12 }} />
                  <span>Unlock / Reset Today's Log (Demo)</span>
                </button>
              </div>
            )}
          </div>

          {/* Defense Midnight Job Simulation */}
          {!isLocked && (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11.5, padding: '6px 12px', background: 'var(--surface-3)', border: '1px solid var(--primary-soft)' }}
              title="Demonstrates the automated midnight cron lock to the panel"
              onClick={handleMidnight}
              disabled={isSubmitting}
            >
              <Moon className="ico" style={{ width: 13, height: 13, color: 'var(--primary)' }} />
              <span>Simulate 00:00 Midnight Job (Defense Demo)</span>
            </button>
          )}
        </div>

      </div>

      {/* Wardrobe Item Picker Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)' }}>
            Choose from Your Virtual Closet
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Tap an item to toggle in/out of today's outfit
          </span>
        </div>

        {closetGarments.length === 0 ? (
          <div className="card" style={{ padding: '24px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
              No garments found in your closet. Add clothes first to log what you wear!
            </p>
            <button type="button" className="btn btn-p" onClick={onNavigateToCloset}>
              Go to Virtual Closet
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10
          }}>
            {closetGarments.map(garment => {
              const isSelected = selectedItems.some(i => i.item_id === garment.item_id);
              const isHex = garment.image_url?.startsWith('#');

              return (
                <div
                  key={garment.item_id}
                  onClick={() => !isLocked && onToggleGarmentInOutfit(garment)}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    cursor: isLocked ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Selection Indicator Badge */}
                  {isSelected && (
                    <span style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      zIndex: 2
                    }}>
                      ✓
                    </span>
                  )}

                  {/* Thumbnail */}
                  <div style={{
                    height: 110,
                    width: '100%',
                    borderRadius: 6,
                    marginBottom: 8,
                    background: isHex ? garment.image_url : 'var(--surface-2)',
                    backgroundImage: isHex ? undefined : `url(${garment.image_url})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }} />

                  <strong style={{ fontSize: 12.5, marginBottom: 2, color: 'var(--text)' }}>
                    {garment.name}
                  </strong>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{garment.category || garment.type_tag || 'Garment'}</span>
                    <span>{garment.worn_count ?? garment.wear_count ?? 0} wears</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
