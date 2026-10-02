import React, { useState, useMemo } from 'react';
import { ClothingItem } from '../types/database';
import { Filter, ArrowUpDown, Shirt, RotateCcw } from 'lucide-react';
import { createGarmentSilhouette } from '../data/seedData';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedColor, setSelectedColor] = useState<string>('All');

  // Filter and sort items
  const filteredSortedItems = useMemo(() => {
    let result = [...garments];

    if (selectedCategory !== 'All') {
      result = result.filter(g => (g.category || g.type_tag || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    if (selectedColor !== 'All') {
      result = result.filter(g => (g.color || '').toLowerCase() === selectedColor.toLowerCase());
    }

    result.sort((a, b) => {
      const wearA = a.worn_count ?? a.wear_count ?? 0;
      const wearB = b.worn_count ?? b.wear_count ?? 0;
      return sortOrder === 'desc' ? wearB - wearA : wearA - wearB;
    });

    return result;
  }, [garments, selectedCategory, selectedColor, sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const categories = ['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Knitwear'];

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    garments.forEach(g => {
      const c = (g.color || '').trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [garments]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      
      {/* Filter & Sort Bar (Matching Figure .7.1: [All] [Type] [Color] Filter Sort) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)'
      }}>
        {/* Category Pills & Color Filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
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
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            );
          })}

          {availableColors.length > 0 && (
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              style={{
                fontSize: 12,
                padding: '5px 10px',
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: selectedColor !== 'All' ? 'var(--primary-soft)' : 'var(--surface-2)',
                color: selectedColor !== 'All' ? 'var(--primary)' : 'var(--text)',
                fontWeight: selectedColor !== 'All' ? 700 : 500,
                cursor: 'pointer'
              }}
              title="Filter by color"
            >
              <option value="All">All Colors</option>
              {availableColors.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {(selectedCategory !== 'All' || selectedColor !== 'All') && (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20 }}
              onClick={() => { setSelectedCategory('All'); setSelectedColor('All'); }}
            >
              <RotateCcw className="ico" style={{ width: 11, height: 11 }} /> Reset
            </button>
          )}
        </div>

        {/* Action Controls: Navigation & Sort */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onNavigateToCloset && (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={onNavigateToCloset}
            >
              &larr; Virtual Closet
            </button>
          )}

          {onNavigateToRecovery && (
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={onNavigateToRecovery}
            >
              &larr; Recovery Progress
            </button>
          )}

          <button
            type="button"
            className="btn btn-g"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px' }}
            onClick={toggleSort}
            title={`Sort by wears (${sortOrder === 'desc' ? 'High to Low' : 'Low to High'})`}
          >
            <ArrowUpDown className="ico" style={{ width: 13, height: 13 }} />
            <span>Sort {sortOrder === 'desc' ? '↓' : '↑'}</span>
          </button>
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
