import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  History
} from 'lucide-react';
import { DailyClothingLog, ClothingItem } from '../types/database';

interface DailyLogViewProps {
  todayLog: DailyClothingLog;
  dailyLogs?: DailyClothingLog[];
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
  dailyLogs = [],
  closetGarments,
  onToggleGarmentInOutfit,
  onFinalizeLog,
  onDeleteLog,
  onSimulateMidnight,
  onNavigateToCloset,
  toast
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedItems = todayLog.items || [];
  const isLocked = todayLog.is_finalized;

  // SFR-13.2: Display all daily clothing logs in chronological order by date
  const finalizedLogs = useMemo(() => {
    // Include finalized logs or logs with items
    const logs = dailyLogs.filter(l => l.is_finalized || (l.items && l.items.length > 0));
    return [...logs].sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.log_date.localeCompare(a.log_date)
        : a.log_date.localeCompare(b.log_date);
    });
  }, [dailyLogs, sortOrder]);

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

      {/* View Tabs: Today's Active Log vs Chronological History (SFR-13.2) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'today' ? 'btn-p' : 'btn-g'}`}
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setActiveTab('today')}
        >
          <Calendar className="ico" style={{ width: 14, height: 14 }} />
          <span>Today's Outfit ({selectedItems.length})</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'history' ? 'btn-p' : 'btn-g'}`}
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setActiveTab('history')}
        >
          <History className="ico" style={{ width: 14, height: 14 }} />
          <span>Finalized Wear History ({finalizedLogs.length})</span>
        </button>
      </div>

      {activeTab === 'today' ? (
        <>
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
        </>
      ) : (
        /* ====================================================================
         * SFR-13.2 & UFR-13: CHRONOLOGICAL DAILY WEAR LOGS HISTORY
         * Displays all daily clothing logs in chronological order by date
         * ==================================================================== */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: 16, fontFamily: 'var(--font-display)' }}>
                Finalized Wear Logs Archive (SFR-13.2)
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Historical record of daily garments worn, locked at 00:00 midnight
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Order:</span>
              <button
                type="button"
                className={`btn ${sortOrder === 'desc' ? 'btn-p' : 'btn-g'}`}
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setSortOrder('desc')}
              >
                Newest First ↓
              </button>
              <button
                type="button"
                className={`btn ${sortOrder === 'asc' ? 'btn-p' : 'btn-g'}`}
                style={{ fontSize: 11, padding: '3px 8px' }}
                onClick={() => setSortOrder('asc')}
              >
                Oldest First ↑
              </button>
            </div>
          </div>

          {finalizedLogs.length === 0 ? (
            <div className="card" style={{ padding: '36px 20px', textAlign: 'center' }}>
              <Calendar style={{ width: 40, height: 40, color: 'var(--text-muted)', opacity: 0.4, margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>No Archived Daily Logs Yet</h4>
              <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 420, marginInline: 'auto' }}>
                Daily clothing logs are archived here once finalized manually or automatically locked at 00:00 midnight past the wear date.
              </p>
              <button type="button" className="btn btn-p" onClick={() => setActiveTab('today')}>
                Return to Today's Outfit Log
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {finalizedLogs.map(log => {
                const logItems = log.items || [];
                const formattedDate = new Date(log.log_date + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div key={log.log_id || log.log_date} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar className="ico" style={{ width: 16, height: 16, color: 'var(--primary)' }} />
                        <strong style={{ fontSize: 14.5 }}>{formattedDate}</strong>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>({log.log_date})</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: log.is_finalized ? 'var(--surface-2)' : 'rgba(37, 99, 235, 0.1)',
                          color: log.is_finalized ? 'var(--primary)' : '#2563eb',
                          border: `1px solid ${log.is_finalized ? 'var(--primary-soft)' : 'rgba(37, 99, 235, 0.2)'}`
                        }}>
                          {log.is_finalized ? (
                            <>
                              <CheckCircle2 style={{ width: 12, height: 12 }} />
                              <span>Finalized</span>
                            </>
                          ) : (
                            <>
                              <Unlock style={{ width: 12, height: 12 }} />
                              <span>Unfinalized</span>
                            </>
                          )}
                        </span>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          {logItems.length} {logItems.length === 1 ? 'garment' : 'garments'} worn
                        </span>
                      </div>
                    </div>

                    {logItems.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No individual clothing items recorded for this date.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {logItems.map(item => {
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
                                  width: 26,
                                  height: 26,
                                  borderRadius: 4,
                                  background: isHex ? item.image_url : undefined,
                                  backgroundImage: isHex ? undefined : `url(${item.image_url})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  display: 'inline-block'
                                }}
                              />
                              <div>
                                <strong style={{ fontSize: 12.5, display: 'block', color: 'var(--text)' }}>
                                  {item.name}
                                </strong>
                                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                  {item.category || item.type_tag || 'Garment'} &middot; {item.worn_count ?? item.wear_count ?? 0} total wears
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
