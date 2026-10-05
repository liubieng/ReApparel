import React, { useState, useMemo } from 'react';
import { ClothingItem } from '../types/database';
import { ArrowLeft, ArrowUpDown, Shirt, RotateCcw } from 'lucide-react';
import { createGarmentSilhouette, NORMAL_CLOTHING_COLORS } from '../data/seedData';

/**
 * ============================================================================
 * CLOSET STATISTICS VIEW (ClosetStatisticsView.tsx)
 * Matches Wireframe Figure .7.1 (Desktop & Mobile Closet Statistics Page)
 * ============================================================================
 */

interface ClosetStatisticsViewProps {
  garments: ClothingItem[];
  onNavigateToRecovery?: () => void;
  onNavigateToCloset?: () => void;
}

export const ClosetStatisticsView: React.FC<ClosetStatisticsViewProps> = ({
  garments,
  onNavigateToRecovery,
  onNavigateToCloset
}) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

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
  };

  const hasActiveFilters = selectedTypes.size > 0 || selectedColors.size > 0;

  // Filter and sort items
  const filteredSortedItems = useMemo(() => {
    let result = garments.filter(g => {
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

      return true;
    });

    result.sort((a, b) => {
      const wearA = a.worn_count ?? a.wear_count ?? 0;
      const wearB = b.worn_count ?? b.wear_count ?? 0;
      return sortOrder === 'desc' ? wearB - wearA : wearA - wearB;
    });

    return result;
  }, [garments, selectedTypes, selectedColors, sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      
      {/* Top Left Navigation Bar: Back to Recovery Progress */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        {onNavigateToRecovery ? (
          <button
            type="button"
            className="btn btn-g"
            style={{
              fontSize: 12.5,
              padding: '6px 14px',
              borderRadius: 20,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer'
            }}
            onClick={onNavigateToRecovery}
          >
            <ArrowLeft className="ico" style={{ width: 14, height: 14 }} />
            Recovery Progress
          </button>
        ) : <div />}

        {/* Sort Control */}
        <button
          type="button"
          className="btn btn-g"
          style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20 }}
          onClick={toggleSort}
          title={`Sort by wears (${sortOrder === 'desc' ? 'High to Low' : 'Low to High'})`}
        >
          <ArrowUpDown className="ico" style={{ width: 13, height: 13 }} />
          <span>Sort {sortOrder === 'desc' ? '↓' : '↑'}</span>
        </button>
      </div>

      {/* Filter Section (Matching Virtual Closet) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
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
              style={{ fontSize: 11.5, padding: '4px 10px', marginLeft: 'auto', color: 'var(--danger)', borderRadius: 20 }}
              onClick={clearAllFilters}
            >
              <RotateCcw className="ico" style={{ width: 12, height: 12 }} /> Reset
            </button>
          )}
        </div>

        {/* Row 2: Color Tags (matching Virtual Closet with colored dots) */}
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

      {/* Grid of Clothing Items with Worn Counts (Figure .7.1) */}
      {filteredSortedItems.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Shirt style={{ width: 40, height: 40, opacity: 0.35, margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontSize: 13 }}>No garments found matching filter.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16
        }}>
          {filteredSortedItems.map(item => {
            const wear = item.worn_count ?? item.wear_count ?? 0;
            const isHex = item.image_url?.startsWith('#');

            return (
              <div
                key={item.item_id}
                className="card"
                style={{
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  borderRadius: 12,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Garment Image Box */}
                <div style={{
                  width: '100%',
                  height: 150,
                  borderRadius: 8,
                  backgroundColor: isHex ? item.image_url : 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  marginBottom: 10
                }}>
                  {isHex ? (
                    <div style={{ width: '100%', height: '100%', backgroundColor: item.image_url, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shirt style={{ width: 36, height: 36, color: '#ffffff' }} />
                    </div>
                  ) : (
                    <img
                      src={item.image_url || createGarmentSilhouette(item.color_tag || '#64748b', item.name)}
                      alt={item.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = createGarmentSilhouette(item.color_tag || '#64748b', item.name);
                      }}
                    />
                  )}
                </div>

                {/* Garment Label & Wear Count (Figure .7.1 format) */}
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, lineHeight: 1.3 }}>
                  {item.category ? item.category.toLowerCase() : 'garment'}
                  {item.color ? ` ${item.color.toLowerCase()}` : ''}
                </div>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 700, 
                  color: wear === 0 ? 'var(--danger)' : 'var(--primary)',
                  marginTop: 2
                }}>
                  Worn {wear}x
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
