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
import { CURATED_COLOR_FAMILIES, NORMAL_CLOTHING_COLORS, createGarmentSilhouette } from '../data/seedData';
import { ClothingItem } from '../types/database';

interface VirtualClosetViewProps {
  garments: ClothingItem[];
  onOpenAddModal: () => void;
  onEditGarment: (garment: ClothingItem) => void;
  onDeleteGarment: (garment: ClothingItem) => void;
  onNavigateToRecovery?: () => void;
  toast?: (msg: string) => void;
}

export const VirtualClosetView: React.FC<VirtualClosetViewProps> = ({
  garments,
  onOpenAddModal,
  onEditGarment,
  onDeleteGarment,
  onNavigateToRecovery,
  toast
}) => {

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
    <div style={{ position: 'relative', minHeight: '80vh', paddingBottom: 60 }}>
      {/* Filter Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {/* Row 1: Garment Types / Categories */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`pill ${selectedTypes.size === 0 && selectedColors.size === 0 ? 'on' : ''}`}
            style={{
              cursor: 'pointer',
              padding: '6px 14px',
              fontSize: 12.5,
              borderRadius: 20,
              background: (selectedTypes.size === 0 && selectedColors.size === 0) ? 'var(--primary)' : 'var(--surface-2)',
              color: (selectedTypes.size === 0 && selectedColors.size === 0) ? '#ffffff' : 'var(--text)',
              border: (selectedTypes.size === 0 && selectedColors.size === 0) ? '1px solid var(--primary)' : '1px solid var(--border)',
              fontWeight: 600
            }}
            onClick={clearAllFilters}
          >
            All
          </button>

          {['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes'].map(cat => {
            const isSelected = selectedTypes.has(cat);
            return (
              <button
                key={cat}
                type="button"
                className={`pill ${isSelected ? 'on' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '6px 14px',
                  fontSize: 12.5,
                  borderRadius: 20,
                  background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                  color: isSelected ? '#ffffff' : 'var(--text)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  fontWeight: isSelected ? 600 : 500
                }}
                onClick={() => toggleTypeFilter(cat)}
              >
                {cat}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11.5, padding: '4px 10px', marginLeft: 'auto', color: 'var(--danger)' }}
              onClick={clearAllFilters}
            >
              <RotateCcw className="ico" style={{ width: 12, height: 12 }} /> Reset
            </button>
          )}
        </div>

        {/* Row 2: Color Tags (below garment type tags) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {NORMAL_CLOTHING_COLORS.map(color => {
            const isSelected = selectedColors.has(color.name);
            return (
              <button
                key={color.name}
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
                  fontWeight: isSelected ? 600 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={() => toggleColorFilter(color.name)}
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

      {/* Garments Grid */}
      {filteredGarments.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <Shirt style={{ width: 44, height: 44, color: 'var(--text-muted)', opacity: 0.4, margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, margin: '0 0 6px', fontFamily: 'var(--font-display)' }}>
            No Matching Clothing Items Found
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 16px' }}>
            {hasActiveFilters ? 'No clothing items were found matching the selected filter criteria.' : 'Your virtual closet is currently empty. Start logging what you own!'}
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
                onClick={() => onEditGarment(garment)}
                style={{
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Thumbnail / Transparent Silhouette */}
                <div style={{
                  height: 160,
                  width: '100%',
                  borderRadius: 8,
                  marginBottom: 10,
                  backgroundColor: isColorHex ? garment.image_url : 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {isColorHex ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: garment.image_url,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}>
                      <Shirt style={{ width: 44, height: 44, opacity: 0.8 }} />
                    </div>
                  ) : (
                    <img
                      src={garment.image_url || createGarmentSilhouette(garment.color_tag || '#64748b', garment.name)}
                      alt={garment.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = createGarmentSilhouette(garment.color_tag || '#64748b', garment.name);
                      }}
                    />
                  )}
                  {/* Top-Right Card Actions */}
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    display: 'flex',
                    gap: 4,
                    zIndex: 2
                  }}>
                    <button
                      type="button"
                      className="icobtn"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}
                      title="Edit Garment"
                      onClick={(e) => { e.stopPropagation(); onEditGarment(garment); }}
                    >
                      <Pencil className="ico" style={{ width: 12, height: 12, margin: 0 }} />
                    </button>
                    <button
                      type="button"
                      className="icobtn"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid var(--border)',
                        color: 'var(--danger)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}
                      title="Delete Garment"
                      onClick={(e) => { e.stopPropagation(); onDeleteGarment(garment); }}
                    >
                      <Trash2 className="ico" style={{ width: 12, height: 12, margin: 0 }} />
                    </button>
                  </div>

                  {/* Wear Count Badge */}
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
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

                {/* Garment Details & Tags matching Figure .5.1 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {garment.category && (
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 500 }}>
                        {garment.category}
                      </span>
                    )}
                    {garment.color && (
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: garment.color_tag || '#64748b' }} />
                        {garment.color}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button (+) matching Figure .5.1 */}
      <button
        type="button"
        className="closet-fab"
        onClick={onOpenAddModal}
        aria-label="Add Garment"
        title="Add Garment"
      >
        <Plus style={{ width: 28, height: 28, strokeWidth: 2.5 }} />
      </button>

    </div>
  );
};
