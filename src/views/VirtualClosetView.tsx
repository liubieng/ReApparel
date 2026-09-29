import React, { useState, useMemo } from 'react';
import { 
  Shirt, 
  Plus, 
  Search, 
  Filter, 
  X, 
  Pencil, 
  Trash2, 
  RotateCcw, 
  Check, 
  Sparkles, 
  CalendarPlus,
  Layers,
  Info,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { ClothingItem, AdditionType } from '../types/database';
import { CURATED_COLOR_FAMILIES } from '../data/seedData';

interface VirtualClosetViewProps {
  garments: ClothingItem[];
  onOpenAddModal: () => void;
  onEditGarment: (garment: ClothingItem) => void;
  onDeleteGarment: (garment: ClothingItem) => void;
  toast?: (msg: string) => void;
}

export const VirtualClosetView: React.FC<VirtualClosetViewProps> = ({
  garments,
  onOpenAddModal,
  onEditGarment,
  onDeleteGarment,
  toast
}) => {
  // View mode: standard gallery vs "Shop Your Closet" (SFR-17.2)
  const [viewMode, setViewMode] = useState<'gallery' | 'shop'>('gallery');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [wearFilter, setWearFilter] = useState<'all' | 'unworn' | 'low' | 'active'>('all');

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

  // Compute Active Curated Color Families present in user's wardrobe
  const wardrobeColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string; count: number }>();
    garments.forEach(g => {
      const gName = (g.color || '').trim();
      const gHex = (g.color_tag || (g.image_url?.startsWith('#') ? g.image_url : '')).trim();

      const matched = CURATED_COLOR_FAMILIES.find(f => 
        (gName && f.name.toLowerCase() === gName.toLowerCase()) ||
        (gHex && f.hex.toLowerCase() === gHex.toLowerCase())
      );

      const key = matched ? matched.name : (gName || gHex);
      if (!key) return;

      const familyName = matched ? matched.name : (gName || 'Custom');
      const familyHex = gHex || matched?.hex || '#64748b';

      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, { name: familyName, hex: familyHex, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [garments]);

  // Filtered Garment Items
  const filteredGarments = useMemo(() => {
    return garments.filter(g => {
      const type = g.type_tag || g.category || '';
      const wear = g.worn_count ?? g.wear_count ?? 0;

      // Type / Category Filter
      const matchType = selectedTypes.size === 0 || Array.from(selectedTypes).some(sel => {
        return (g.category && g.category.toLowerCase() === sel.toLowerCase()) ||
               (g.type_tag && g.type_tag.toLowerCase() === sel.toLowerCase());
      });
      if (!matchType) return false;

      // Color Filter
      const matchColor = selectedColors.size === 0 || Array.from(selectedColors).some(sel => {
        const itemColor = (g.color || '').toLowerCase();
        const itemColorTag = (g.color_tag || '').toLowerCase();
        const selLower = sel.toLowerCase();
        return itemColor.includes(selLower) || itemColorTag.includes(selLower);
      });
      if (!matchColor) return false;

      // Wear Activity Filter
      if (wearFilter === 'unworn' && wear > 0) return false;
      if (wearFilter === 'low' && (wear < 1 || wear > 2)) return false;
      if (wearFilter === 'active' && wear < 3) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name.toLowerCase().includes(q);
        const matchCat = (g.category || '').toLowerCase().includes(q);
        const matchColorName = (g.color || '').toLowerCase().includes(q);
        const matchTypeTag = (g.type_tag || '').toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchColorName && !matchTypeTag) return false;
      }

      return true;
    });
  }, [garments, selectedTypes, selectedColors, wearFilter, searchQuery]);

  const toggleTypeFilter = (typeName: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeName)) next.delete(typeName);
      else next.add(typeName);
      return next;
    });
  };

  const toggleColorFilter = (colorName: string) => {
    setSelectedColors(prev => {
      const next = new Set(prev);
      if (next.has(colorName)) next.delete(colorName);
      else next.add(colorName);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedTypes(new Set());
    setSelectedColors(new Set());
    setWearFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedTypes.size > 0 || selectedColors.size > 0 || wearFilter !== 'all' || searchQuery.trim().length > 0;

  // SFR-17.1 & SFR-17.2: "Shop Your Closet" Generator
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

  const unwornTotal = useMemo(() => {
    return garments.filter(g => (g.worn_count ?? g.wear_count ?? 0) === 0).length;
  }, [garments]);

  const leastWornTotal = useMemo(() => {
    return garments.filter(g => {
      const w = g.worn_count ?? g.wear_count ?? 0;
      return w > 0 && w <= 2;
    }).length;
  }, [garments]);

  return (
    <div>
      {/* View Header with Mode Toggles and Action Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-display)' }}>
            Virtual Closet
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {viewMode === 'shop' 
              ? 'Shop Your Closet Mode (SFR-17.2) · Rediscover unworn & least-worn pieces'
              : `${garments.length} total garments registered · ${filteredGarments.length} currently displayed`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* SFR-17.2 Mode Switcher */}
          <button
            type="button"
            className={`btn ${viewMode === 'shop' ? 'btn-p' : 'btn-g'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12.5 }}
            onClick={() => setViewMode(prev => prev === 'shop' ? 'gallery' : 'shop')}
          >
            <Sparkles className="ico" style={{ width: 14, height: 14 }} />
            <span>{viewMode === 'shop' ? 'View Closet Gallery' : 'Shop Your Closet ✨'}</span>
          </button>

          <button
            type="button"
            className="btn btn-p"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12.5 }}
            onClick={onOpenAddModal}
          >
            <Plus className="ico" style={{ width: 15, height: 15 }} />
            <span>Add Garment</span>
          </button>
        </div>
      </div>

      {viewMode === 'shop' ? (
        /* ====================================================================
         * SFR-17.2: "SHOP YOUR CLOSET" MODE
         * Displays one least worn and one unworn clothing from each category
         * ==================================================================== */
        <div>
          {/* Informational anti-impulse header banner */}
          <div className="card" style={{
            padding: '16px 20px',
            marginBottom: 18,
            background: 'linear-gradient(135deg, rgba(62, 107, 69, 0.08) 0%, rgba(214, 199, 161, 0.15) 100%)',
            border: '1.5px solid var(--primary-soft)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Sparkles style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                  <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
                    Shop Your Closet (SFR-17.2)
                  </h3>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--primary)', color: '#ffffff' }}>
                    ANTI-IMPULSE CURATION
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5, maxWidth: 640 }}>
                  Feeling the urge to buy new clothes? Combat impulsive purchasing by shopping what you already own.
                  Below is <strong>one unworn (0 wears)</strong> and <strong>one least-worn</strong> garment from each category in your wardrobe.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-g"
                style={{ fontSize: 12 }}
                onClick={() => setViewMode('gallery')}
              >
                &larr; Back to Full Gallery
              </button>
            </div>
          </div>

          {shopYourClosetPairs.length === 0 ? (
            <div className="card" style={{ padding: '36px 20px', textAlign: 'center' }}>
              <Shirt style={{ width: 40, height: 40, color: 'var(--text-muted)', opacity: 0.5, margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>Your closet is empty</h4>
              <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-muted)' }}>
                Add clothes to your virtual closet first to generate your personalized "Shop Your Closet" recommendations!
              </p>
              <button type="button" className="btn btn-p" onClick={onOpenAddModal}>
                <Plus className="ico" /> Add Garment
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {shopYourClosetPairs.map(({ category, count, unwornItem, leastWornItem }) => (
                <div key={category} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--font-display)' }}>
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
                              background: unwornItem.image_url?.startsWith('#') ? unwornItem.image_url : 'var(--surface)',
                              backgroundImage: unwornItem.image_url?.startsWith('#') ? undefined : `url(${unwornItem.image_url})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              flexShrink: 0
                            }} />
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
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                            <button
                              type="button"
                              className="btn btn-g"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => onEditGarment(unwornItem)}
                            >
                              <Pencil style={{ width: 11, height: 11 }} /> Edit
                            </button>
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
                              background: leastWornItem.image_url?.startsWith('#') ? leastWornItem.image_url : 'var(--surface)',
                              backgroundImage: leastWornItem.image_url?.startsWith('#') ? undefined : `url(${leastWornItem.image_url})`,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'center',
                              flexShrink: 0
                            }} />
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
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                            <button
                              type="button"
                              className="btn btn-g"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => onEditGarment(leastWornItem)}
                            >
                              <Pencil style={{ width: 11, height: 11 }} /> Edit
                            </button>
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
      ) : (
        /* Standard Gallery Mode with Recommendation Banner */
        <div>
          {/* Top Shop Your Closet Anti-Impulse Prompt Banner (UFR-17) */}
          {unwornTotal > 0 && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(62, 107, 69, 0.08) 0%, rgba(214, 199, 161, 0.15) 100%)',
              border: '1px solid var(--primary-soft)',
              marginBottom: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles style={{ width: 16, height: 16, color: 'var(--primary)' }} />
                <span style={{ fontSize: 12.5, color: 'var(--text)' }}>
                  <strong>Shop Your Closet Prompt:</strong> You have <strong>{unwornTotal} unworn</strong> and <strong>{leastWornTotal} least-worn</strong> garments waiting to be styled before buying new!
                </span>
              </div>
              <button
                type="button"
                className="btn btn-g"
                style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--primary)', borderColor: 'var(--primary-soft)' }}
                onClick={() => setViewMode('shop')}
              >
                Open Shop Your Closet &rarr;
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search className="ico" style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', width: 15, height: 15 }} />
          <input
            type="text"
            placeholder="Search garments by name, category, or color..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
          {searchQuery && (
            <button
              type="button"
              className="icobtn"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 8, top: 6 }}
            >
              <X className="ico" style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        {/* Multi-Attribute Filter Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          
          {/* 1. Category Filter (Active Wardrobe Only) */}
          {wardrobeCategories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', minWidth: 70 }}>
                Category:
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {wardrobeCategories.map(({ name, count }) => {
                  const isSelected = selectedTypes.has(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`pill ${isSelected ? 'on' : ''}`}
                      style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        borderRadius: 12,
                        background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)'
                      }}
                      onClick={() => toggleTypeFilter(name)}
                    >
                      {name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Curated Color Families Filter (Active Wardrobe Only) */}
          {wardrobeColors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', minWidth: 70 }}>
                Color:
              </span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {wardrobeColors.map(({ name, hex, count }) => {
                  const isSelected = selectedColors.has(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      className="btn btn-g"
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--surface-2)' : 'var(--surface)'
                      }}
                      onClick={() => toggleColorFilter(name)}
                    >
                      <span style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: hex,
                        display: 'inline-block',
                        marginRight: 4,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }} />
                      <span>{name} ({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Wear Activity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Utilization:
              </span>
              {(['all', 'unworn', 'low', 'active'] as const).map(w => (
                <button
                  key={w}
                  type="button"
                  className={`btn ${wearFilter === w ? 'btn-p' : 'btn-g'}`}
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => setWearFilter(w)}
                >
                  {w === 'unworn' ? 'Unworn (0)' : w === 'low' ? 'Low (1–2)' : w === 'active' ? 'Active (3+)' : 'All'}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-g"
                style={{ fontSize: 11, padding: '3px 8px', color: 'var(--danger)' }}
                onClick={clearAllFilters}
              >
                <RotateCcw className="ico" style={{ width: 11, height: 11 }} /> Reset Filters
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Garments Grid */}
      {filteredGarments.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Shirt style={{ width: 44, height: 44, color: 'var(--text-muted)', opacity: 0.4, margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, margin: '0 0 6px', fontFamily: 'var(--font-display)' }}>
            No Garments Found
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 16px' }}>
            {hasActiveFilters ? 'No items in your wardrobe match the selected filter criteria.' : 'Your virtual closet is currently empty. Start logging what you own!'}
          </p>
          {hasActiveFilters ? (
            <button type="button" className="btn btn-g" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          ) : (
            <button type="button" className="btn btn-p" onClick={onOpenAddModal}>
              <Plus className="ico" /> Add Your First Garment
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
          gap: 14
        }}>
          {filteredGarments.map(garment => {
            const wearCount = garment.worn_count ?? garment.wear_count ?? 0;
            const isColorHex = garment.image_url?.startsWith('#');

            return (
              <div
                key={garment.item_id}
                className="card"
                style={{
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Thumbnail / Transparent Silhouette */}
                <div style={{
                  height: 160,
                  width: '100%',
                  borderRadius: 8,
                  marginBottom: 10,
                  background: isColorHex ? garment.image_url : 'var(--surface-2)',
                  backgroundImage: isColorHex ? undefined : `url(${garment.image_url})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {/* Wear Count Badge */}
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: wearCount > 0 ? 'var(--primary)' : 'rgba(100, 116, 139, 0.85)',
                    color: '#ffffff'
                  }}>
                    {wearCount} {wearCount === 1 ? 'wear' : 'wears'}
                  </span>
                </div>

                {/* Garment Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: 13.5, marginBottom: 4, lineHeight: 1.3, color: 'var(--text)' }}>
                    {garment.name}
                  </strong>

                  {/* Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {garment.category && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {garment.category}
                      </span>
                    )}
                    {garment.type_tag && garment.type_tag !== garment.category && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                        {garment.type_tag}
                      </span>
                    )}
                    {garment.color && (
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: garment.color_tag || '#64748b' }} />
                        {garment.color}
                      </span>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="icobtn"
                        title="Edit Garment"
                        onClick={() => onEditGarment(garment)}
                      >
                        <Pencil className="ico" style={{ width: 13, height: 13 }} />
                      </button>
                      <button
                        type="button"
                        className="icobtn"
                        style={{ color: 'var(--danger)' }}
                        title="Delete Garment"
                        onClick={() => onDeleteGarment(garment)}
                      >
                        <Trash2 className="ico" style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>

                </div>

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
