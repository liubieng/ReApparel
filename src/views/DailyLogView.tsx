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
  History,
  Edit3,
  Pencil,
  ArrowLeft
} from 'lucide-react';
import { DailyClothingLog, ClothingItem } from '../types/database';
import { NORMAL_CLOTHING_COLORS } from '../data/seedData';

interface DailyLogViewProps {
  todayLog: DailyClothingLog;
  dailyLogs?: DailyClothingLog[];
  closetGarments: ClothingItem[];
  onToggleGarmentInOutfit: (garment: ClothingItem, targetLogId?: number) => Promise<void>;
  onFinalizeLog: (targetLogId?: number) => Promise<void>;
  onDeleteLog: (targetLogId?: number) => Promise<void>;
  onEditLog?: (targetLogId?: number) => Promise<void>;
  onCreateNewOutfit?: (dateStr: string, title: string) => Promise<DailyClothingLog | void>;
  onSimulateMidnight?: () => Promise<void>;
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
  onEditLog,
  onCreateNewOutfit,
  onSimulateMidnight,
  onNavigateToCloset,
  toast
}) => {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [activeLogId, setActiveLogId] = useState<number>(todayLog.log_id);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingOutfit, setIsAddingOutfit] = useState(false);
  const [newOutfitTitle, setNewOutfitTitle] = useState('');

  // Virtual Closet Filter States for Outfit Picker
  const [closetSelectedTypes, setClosetSelectedTypes] = useState<Set<string>>(new Set());
  const [closetSelectedColors, setClosetSelectedColors] = useState<Set<string>>(new Set());

  const toggleClosetType = (typeName: string) => {
    setClosetSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeName)) next.delete(typeName);
      else next.add(typeName);
      return next;
    });
  };

  const toggleClosetColor = (colorName: string) => {
    setClosetSelectedColors(prev => {
      const next = new Set(prev);
      if (next.has(colorName)) next.delete(colorName);
      else next.add(colorName);
      return next;
    });
  };

  const clearClosetFilters = () => {
    setClosetSelectedTypes(new Set());
    setClosetSelectedColors(new Set());
  };

  const hasActiveClosetFilters = closetSelectedTypes.size > 0 || closetSelectedColors.size > 0;

  const filteredClosetGarments = useMemo(() => {
    return closetGarments.filter(g => {
      // Type / Category Filter
      const matchType = closetSelectedTypes.size === 0 || Array.from(closetSelectedTypes).some(sel => {
        return (g.category && g.category.toLowerCase() === sel.toLowerCase()) ||
               (g.type_tag && g.type_tag.toLowerCase() === sel.toLowerCase());
      });
      if (!matchType) return false;

      // Color Filter
      const matchColor = closetSelectedColors.size === 0 || Array.from(closetSelectedColors).some(sel => {
        const itemColor = (g.color || '').toLowerCase();
        const itemColorTag = (g.color_tag || '').toLowerCase();
        const selLower = sel.toLowerCase();
        return itemColor.includes(selLower) || itemColorTag.includes(selLower);
      });
      if (!matchColor) return false;

      return true;
    });
  }, [closetGarments, closetSelectedTypes, closetSelectedColors]);

  // Find currently active log being viewed or edited
  const activeLog = useMemo(() => {
    return dailyLogs.find(l => l.log_id === activeLogId) || todayLog;
  }, [dailyLogs, activeLogId, todayLog]);

  // Keep activeLogId in sync when todayLog initializes with real database ID
  React.useEffect(() => {
    if (activeLogId === 0 && todayLog.log_id !== 0) {
      setActiveLogId(todayLog.log_id);
    }
  }, [todayLog.log_id, activeLogId]);

  const isEditingHistorical = activeLog.log_date !== todayLog.log_date;
  const isLocked = activeLog.is_finalized;
  const selectedItems = activeLog.items || [];

  // Outfits logged for today (TC_USAGE_06)
  const todayOutfits = useMemo(() => {
    const list = dailyLogs.filter(l => l.log_date === todayLog.log_date);
    if (list.length === 0) return [todayLog];
    return list;
  }, [dailyLogs, todayLog]);

  // All logs sorted chronologically for wear history
  const allLogsSorted = useMemo(() => {
    const logs = dailyLogs.filter(l => l.is_finalized || (l.items && l.items.length > 0));
    return [...logs].sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.log_date.localeCompare(a.log_date)
        : a.log_date.localeCompare(b.log_date);
    });
  }, [dailyLogs, sortOrder]);

  const handleFinalize = async () => {
    if (selectedItems.length === 0) {
      toast('Please select at least one garment you wore.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onFinalizeLog(activeLog.log_id);
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

  const handleEditActiveLog = async () => {
    const logId = activeLog.log_id;
    if (onEditLog) {
      await onEditLog(logId);
    } else {
      await onDeleteLog(logId);
    }
  };

  const handleDeleteActiveLog = async () => {
    const logId = activeLog.log_id;
    await onDeleteLog(logId);
    setActiveLogId(todayLog.log_id);
  };

  const handleCreateOutfit = async () => {
    const title = newOutfitTitle.trim() || `Outfit #${todayOutfits.length + 1}`;
    if (onCreateNewOutfit) {
      const created = await onCreateNewOutfit(todayLog.log_date, title);
      if (created && typeof created === 'object' && 'log_id' in created && (created as any).log_id) {
        setActiveLogId((created as any).log_id);
      }
    }
    setNewOutfitTitle('');
    setIsAddingOutfit(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>
            Daily Outfit Log
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {isEditingHistorical ? (
              <span>Editing outfit record for date: <strong style={{ color: 'var(--primary)' }}>{activeLog.log_date}</strong> (Original date preserved)</span>
            ) : (
              <span>Date: <strong>{todayLog.log_date}</strong> &middot; Track what you wore today to boost wear count metrics</span>
            )}
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

      {/* View Tabs: Today's Active Log vs Chronological History */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'today' ? 'btn-p' : 'btn-g'}`}
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setActiveTab('today')}
        >
          <Calendar className="ico" style={{ width: 14, height: 14 }} />
          <span>{isEditingHistorical ? `Editing Log (${activeLog.log_date})` : "Today's Outfit Entries"} ({selectedItems.length})</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'history' ? 'btn-p' : 'btn-g'}`}
          style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setActiveTab('history')}
        >
          <History className="ico" style={{ width: 14, height: 14 }} />
          <span>Wear History &amp; Logs ({allLogsSorted.length})</span>
        </button>
      </div>

      {activeTab === 'today' ? (
        <>
          {/* Multiple Outfit Entries Selector (TC_USAGE_06) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 14,
            padding: '8px 12px',
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              {isEditingHistorical ? `Editing Historical Log:` : "Today's Outfits:"}
            </span>

            {isEditingHistorical ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="pill on" style={{ fontSize: 12, fontWeight: 700 }}>
                  {activeLog.title || 'Outfit'} &middot; {activeLog.log_date}
                </span>
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => setActiveLogId(todayLog.log_id)}
                >
                  <ArrowLeft className="ico" style={{ width: 11, height: 11 }} /> Return to Today's Outfits
                </button>
              </div>
            ) : (
              <>
                {todayOutfits.map((log, index) => {
                  const isCurrent = log.log_id === activeLog.log_id;
                  const count = (log.items || []).length;
                  const title = log.title || (index === 0 ? 'First Outfit' : (index === 1 ? 'Second Outfit' : `Outfit #${index + 1}`));
                  return (
                    <button
                      key={log.log_id}
                      type="button"
                      className={`btn ${isCurrent ? 'btn-p' : 'btn-g'}`}
                      style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => setActiveLogId(log.log_id)}
                    >
                      <span>{title}</span>
                      <span style={{
                        background: isCurrent ? 'rgba(255,255,255,0.3)' : 'var(--surface-3)',
                        padding: '1px 6px',
                        borderRadius: 10,
                        fontSize: 10.5,
                        fontWeight: 700
                      }}>
                        {count}
                      </span>
                      {log.is_finalized && <CheckCircle2 style={{ width: 12, height: 12 }} />}
                    </button>
                  );
                })}

                {/* TC_USAGE_06: Add second / multiple outfit on same day */}
                {!isAddingOutfit ? (
                  <button
                    type="button"
                    className="btn btn-g"
                    style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 20 }}
                    onClick={() => setIsAddingOutfit(true)}
                  >
                    <Plus className="ico" style={{ width: 12, height: 12 }} />
                    <span>Log Another Outfit Today</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="text"
                      placeholder="e.g. Work Outfit / Evening / Workout"
                      value={newOutfitTitle}
                      onChange={(e) => setNewOutfitTitle(e.target.value)}
                      style={{ padding: '3px 8px', fontSize: 12, borderRadius: 6, margin: 0, width: 180 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-p"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={handleCreateOutfit}
                    >
                      Save Outfit
                    </button>
                    <button
                      type="button"
                      className="btn btn-g"
                      style={{ fontSize: 11, padding: '3px 6px' }}
                      onClick={() => {
                        setIsAddingOutfit(false);
                        setNewOutfitTitle('');
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Today's Selected Outfit Summary Card */}
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shirt className="ico" style={{ color: 'var(--primary)' }} />
                <strong style={{ fontSize: 14 }}>
                  {activeLog.title || (isEditingHistorical ? 'Historical Outfit' : "Today's Outfit")} ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})
                </strong>
              </div>
              
              {!isLocked && selectedItems.length > 0 && (
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)' }}
                  onClick={handleDeleteActiveLog}
                >
                  <Trash2 className="ico" style={{ width: 11, height: 11 }} /> Clear This Log
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
                  No garments selected for this outfit record yet.
                </p>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Tap any item in your wardrobe below to add it to this outfit!
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
                          backgroundColor: isHex ? item.image_url : 'var(--surface-2)',
                          backgroundImage: isHex ? undefined : `url("${item.image_url}")`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
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
                          onClick={() => onToggleGarmentInOutfit(item, activeLog.log_id)}
                          title="Remove from outfit (TC_EDIT_02)"
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
                    <span>{isEditingHistorical ? 'Save & Finalize Record (Preserve Date)' : 'Finalize Outfit & Update Wear Counts'}</span>
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
                      style={{ fontSize: 12, padding: '5px 12px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={handleEditActiveLog}
                      title="Edit this outfit record"
                    >
                      <Pencil className="ico" style={{ width: 13, height: 13 }} />
                      <span>Edit Outfit</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Wardrobe Item Picker Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)' }}>
                Choose from Your Virtual Closet
              </h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isLocked ? 'Record is locked' : 'Tap an item to toggle in/out of selected outfit'}
              </span>
            </div>

            {/* Filter Section (matching Virtual Closet section) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {/* Row 1: Garment Types / Categories */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`pill ${closetSelectedTypes.size === 0 && closetSelectedColors.size === 0 ? 'on' : ''}`}
                  style={{
                    cursor: 'pointer',
                    padding: '5px 12px',
                    fontSize: 12,
                    borderRadius: 20,
                    background: (closetSelectedTypes.size === 0 && closetSelectedColors.size === 0) ? 'var(--primary)' : 'var(--surface-2)',
                    color: (closetSelectedTypes.size === 0 && closetSelectedColors.size === 0) ? '#ffffff' : 'var(--text)',
                    border: (closetSelectedTypes.size === 0 && closetSelectedColors.size === 0) ? '1px solid var(--primary)' : '1px solid var(--border)',
                    fontWeight: 600
                  }}
                  onClick={clearClosetFilters}
                >
                  All
                </button>

                {['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes'].map(cat => {
                  const isSelected = closetSelectedTypes.has(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`pill ${isSelected ? 'on' : ''}`}
                      style={{
                        cursor: 'pointer',
                        padding: '5px 12px',
                        fontSize: 12,
                        borderRadius: 20,
                        background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        fontWeight: isSelected ? 600 : 500
                      }}
                      onClick={() => toggleClosetType(cat)}
                    >
                      {cat}
                    </button>
                  );
                })}

                {hasActiveClosetFilters && (
                  <button
                    type="button"
                    className="btn btn-g"
                    style={{ fontSize: 11, padding: '3px 8px', marginLeft: 'auto', color: 'var(--danger)' }}
                    onClick={clearClosetFilters}
                  >
                    <RotateCcw className="ico" style={{ width: 11, height: 11 }} /> Reset
                  </button>
                )}
              </div>

              {/* Row 2: Color Tags (below garment type tags) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {NORMAL_CLOTHING_COLORS.map(color => {
                  const isSelected = closetSelectedColors.has(color.name);
                  return (
                    <button
                      key={color.name}
                      type="button"
                      className={`pill ${isSelected ? 'on' : ''}`}
                      style={{
                        cursor: 'pointer',
                        padding: '4px 10px',
                        fontSize: 11.5,
                        borderRadius: 20,
                        background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        fontWeight: isSelected ? 600 : 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5
                      }}
                      onClick={() => toggleClosetColor(color.name)}
                    >
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: color.hex,
                        border: color.name === 'White' ? '1px solid #cbd5e1' : 'none',
                        display: 'inline-block'
                      }} />
                      {color.name}
                    </button>
                  );
                })}
              </div>
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
            ) : filteredClosetGarments.length === 0 ? (
              <div className="card" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
                  No garments match the selected filters.
                </p>
                <button type="button" className="btn btn-g" onClick={clearClosetFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 10
              }}>
                {filteredClosetGarments.map(garment => {
                  const isSelected = selectedItems.some(i => i.item_id === garment.item_id);
                  const isHex = garment.image_url?.startsWith('#');

                  return (
                    <div
                      key={garment.item_id}
                      onClick={() => !isLocked && onToggleGarmentInOutfit(garment, activeLog.log_id)}
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
                        backgroundColor: isHex ? garment.image_url : 'var(--surface-2)',
                        backgroundImage: isHex ? undefined : `url("${garment.image_url}")`,
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
         * CHRONOLOGICAL DAILY WEAR LOGS HISTORY (TC_EDIT_01 - TC_EDIT_04)
         * ==================================================================== */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: '0 0 2px', fontSize: 16, fontFamily: 'var(--font-display)' }}>
                Wear History &amp; Logs Archive
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Historical record of daily garments worn. Unfinalized records can be modified before lock.
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

          {allLogsSorted.length === 0 ? (
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
              {allLogsSorted.map(log => {
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
                        {log.title && (
                          <span className="pill" style={{ fontSize: 10.5, padding: '1px 6px' }}>
                            {log.title}
                          </span>
                        )}
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

                        {/* TC_EDIT_01 to TC_EDIT_04: Edit unfinalized log vs locked finalized */}
                        {!log.is_finalized ? (
                          <button
                            type="button"
                            className="btn btn-p"
                            style={{ fontSize: 11.5, padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => {
                              setActiveLogId(log.log_id);
                              setActiveTab('today');
                              toast(`Opened unfinalized record for ${log.log_date} for editing.`);
                            }}
                            title="Edit unfinalized clothing usage record"
                          >
                            <Edit3 style={{ width: 12, height: 12 }} />
                            <span>Edit Record</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-g"
                            style={{ fontSize: 11, padding: '3px 8px', opacity: 0.65, cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => toast('Finalized clothing logs are permanently locked and cannot be edited.')}
                            title="Finalized logs are permanently locked"
                          >
                            <Lock style={{ width: 11, height: 11 }} />
                            <span>Locked</span>
                          </button>
                        )}
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
                                  backgroundColor: isHex ? item.image_url : 'var(--surface-2)',
                                  backgroundImage: isHex ? undefined : `url("${item.image_url}")`,
                                  backgroundSize: 'contain',
                                  backgroundRepeat: 'no-repeat',
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
