import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Shirt, 
  Sparkles, 
  History,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ClothingItem, DailyClothingLog } from '../../types/database';

interface DailyLogViewProps {
  todayLog: DailyClothingLog;
  allLogs: DailyClothingLog[];
  closetItems: ClothingItem[];
  onUpdateTodayItems: (items: ClothingItem[]) => Promise<void>;
  onFinalizeLog: (logId: number) => Promise<void>;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  todayLog,
  allLogs,
  closetItems,
  onUpdateTodayItems,
  onFinalizeLog
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<string>('All');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const selectedItems = todayLog.items || [];
  const isLocked = todayLog.is_finalized;

  const handleToggleItemInOutfit = async (item: ClothingItem) => {
    if (isLocked) return;
    const exists = selectedItems.some(i => i.item_id === item.item_id);
    let updated: ClothingItem[];
    if (exists) {
      updated = selectedItems.filter(i => i.item_id !== item.item_id);
    } else {
      updated = [...selectedItems, item];
    }
    await onUpdateTodayItems(updated);
  };

  const handleRemoveItem = async (itemId: number) => {
    if (isLocked) return;
    const updated = selectedItems.filter(i => i.item_id !== itemId);
    await onUpdateTodayItems(updated);
  };

  const handleClearOutfit = async () => {
    if (isLocked) return;
    if (window.confirm('Clear all garments from today’s outfit log?')) {
      await onUpdateTodayItems([]);
    }
  };

  const handleSimulateMidnight = async () => {
    if (selectedItems.length === 0) {
      alert('Please add at least one garment to today’s outfit before finalization.');
      return;
    }

    setIsFinalizing(true);
    try {
      await onFinalizeLog(todayLog.log_id);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const categories = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Knitwear', 'Dresses', 'Accessories'];

  const availablePickerItems = closetItems.filter(item => {
    if (pickerCategory !== 'All' && item.category !== pickerCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner & Finalization Status */}
      <div className={`p-6 rounded-2xl border transition shadow-xs ${
        isLocked 
          ? 'bg-slate-900 text-white border-slate-800' 
          : 'bg-white text-slate-900 border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase ${
                isLocked 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {isLocked ? 'Finalized & Locked (00:00 pg_cron)' : 'Active Draft (Editing Allowed)'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Log Date: {todayLog.log_date}
              </span>
            </div>

            <h2 className={`text-xl font-bold font-display ${isLocked ? 'text-white' : 'text-slate-900'}`}>
              Daily Outfit & Utilization Builder
            </h2>
            <p className={`text-xs ${isLocked ? 'text-slate-300' : 'text-slate-500'}`}>
              {isLocked 
                ? 'Midnight job completed. Wear counts have been permanently incremented for all logged garments.' 
                : 'Freely assemble or modify your outfit throughout the day. At midnight (00:00), the pg_cron scheduler locks this log and increments wear counts.'}
            </p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-2">
            {!isLocked ? (
              <button
                onClick={handleSimulateMidnight}
                disabled={isFinalizing || selectedItems.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition disabled:opacity-40 cursor-pointer"
                title="Test the midnight trigger without waiting until 00:00"
              >
                <Clock className="w-4 h-4" />
                <span>Simulate Midnight Finalization (00:00)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
                <span>Locked at {new Date(todayLog.finalized_at || Date.now()).toLocaleTimeString()}</span>
              </div>
            )}

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                isLocked 
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Log Archive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Builder Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Today's Outfit Board (Lg: 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 font-display">
                  Today's Composed Outfit ({selectedItems.length} Garments)
                </h3>
              </div>
              {!isLocked && selectedItems.length > 0 && (
                <button
                  onClick={handleClearOutfit}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium transition cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Garments Canvas */}
            {selectedItems.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl my-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <Shirt className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Your Outfit Canvas is Empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tap garments from your closet tray on the right (or below on mobile) to build today’s rotation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 my-4">
                {selectedItems.map((item) => (
                  <div
                    key={item.item_id}
                    className="relative group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col p-2.5"
                  >
                    <div className="aspect-square w-full rounded-lg bg-white border border-slate-100 flex items-center justify-center p-2 overflow-hidden mb-2">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</span>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>{item.category}</span>
                        <span className="font-mono text-emerald-700 font-medium">
                          {isLocked ? `${item.wear_count} wears` : `+1 on lock`}
                        </span>
                      </div>
                    </div>

                    {/* Remove button if not locked */}
                    {!isLocked && (
                      <button
                        onClick={() => handleRemoveItem(item.item_id)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 flex items-center justify-center transition cursor-pointer shadow-xs"
                        title="Remove from outfit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Environmental Metric Footnote */}
            {selectedItems.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-2.5 text-xs text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">UN SDG 12 Impact Contribution:</span>
                  <p className="mt-0.5 text-emerald-800 leading-relaxed text-[11px]">
                    Wearing these {selectedItems.length} existing garments averts an estimated <strong>{(selectedItems.length * 2.8).toFixed(1)} kg CO₂</strong> and <strong>{(selectedItems.length * 1250).toLocaleString()} liters</strong> of freshwater compared to purchasing new fast-fashion replacements.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Closet Picker Tray (Lg: 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 font-display">
                  Select From Virtual Closet
                </h3>
                <p className="text-[11px] text-slate-500">Tap any garment to add or remove</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {closetItems.length} items
              </span>
            </div>

            {/* Category filter strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-3 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPickerCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    pickerCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Item list */}
            {isLocked ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
                <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Log Finalized for Today</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tomorrow’s fresh outfit canvas will unlock at 00:00 midnight.
                </p>
              </div>
            ) : availablePickerItems.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
                <Shirt className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {closetItems.length === 0 ? 'Your Closet is Empty' : 'No garments found in this category'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {closetItems.length === 0 
                    ? 'Add garments to your Virtual Closet to start logging daily outfits.'
                    : 'Switch category filter to see available garments.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {availablePickerItems.map((item) => {
                  const isSelected = selectedItems.some(i => i.item_id === item.item_id);
                  return (
                    <button
                      key={item.item_id}
                      onClick={() => handleToggleItemInOutfit(item)}
                      className={`relative rounded-xl border p-2 text-left transition cursor-pointer flex flex-col ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="aspect-square w-full rounded-lg bg-slate-50 flex items-center justify-center p-1.5 mb-1.5 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-800 line-clamp-1">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.wear_count} wears</span>

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Historical Outfit Logs Drawer / Section */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-base text-slate-900 font-display">
                Wardrobe Utilization History
              </h3>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Close Archive
            </button>
          </div>

          <div className="space-y-3">
            {allLogs.map((log) => (
              <div
                key={log.log_id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{log.log_date}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.is_finalized ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {log.is_finalized ? 'Finalized' : 'Draft'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {log.items?.length || 0} garments worn
                  </span>
                </div>

                {log.items && log.items.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {log.items.map((i) => (
                      <div
                        key={i.item_id}
                        className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0"
                        title={i.name}
                      >
                        <img src={i.image_url} alt={i.name} className="max-h-full max-w-full object-contain" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
