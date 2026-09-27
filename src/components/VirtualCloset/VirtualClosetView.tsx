import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Tag as TagIcon, 
  Sparkles, 
  Edit3, 
  Check, 
  TrendingUp, 
  AlertCircle,
  Shirt,
  Layers,
  ArrowUpDown,
  Share2
} from 'lucide-react';
import { ClothingItem, Tag } from '../../types/database';
import { AddItemModal } from './AddItemModal';
import { EditItemModal } from './EditItemModal';

interface VirtualClosetViewProps {
  items: ClothingItem[];
  tags: Tag[];
  userId: string;
  onAddItem: (item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>) => Promise<void>;
  onUpdateItem: (itemId: number, updates: Partial<ClothingItem>) => Promise<void>;
  onDeleteItem: (itemId: number) => Promise<void>;
  onSelectForTodayOutfit?: (item: ClothingItem) => void;
}

export const VirtualClosetView: React.FC<VirtualClosetViewProps> = ({
  items,
  tags,
  userId,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSelectForTodayOutfit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [selectedWearFilter, setSelectedWearFilter] = useState<string>('All'); // 'All' | 'Unworn' | 'Low' | 'High'
  const [sortBy, setSortBy] = useState<'recent' | 'wear_desc' | 'wear_asc'>('recent');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);

  const categories = useMemo(() => tags.filter(t => t.tag_type === 'Category'), [tags]);
  const colors = useMemo(() => {
    const itemColors = new Set(items.map(i => (i.color || '').toLowerCase()).filter(Boolean));
    return tags.filter(t => t.tag_type === 'Color' && itemColors.has(t.tag_name.toLowerCase()));
  }, [items, tags]);

  // Filtered and sorted garments
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCat = item.category?.toLowerCase().includes(query);
        const matchesColor = item.color?.toLowerCase().includes(query);
        if (!matchesName && !matchesCat && !matchesColor) return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // Color filter
      if (selectedColor !== 'All' && item.color !== selectedColor) {
        return false;
      }

      // Wear count filter
      if (selectedWearFilter === 'Unworn' && item.wear_count !== 0) return false;
      if (selectedWearFilter === 'Low' && (item.wear_count === 0 || item.wear_count > 5)) return false;
      if (selectedWearFilter === 'High' && item.wear_count <= 5) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'wear_desc') return (b.wear_count || 0) - (a.wear_count || 0);
      if (sortBy === 'wear_asc') return (a.wear_count || 0) - (b.wear_count || 0);
      return new Date(b.date_added).getTime() - new Date(a.date_added).getTime();
    });
  }, [items, searchQuery, selectedCategory, selectedColor, selectedWearFilter, sortBy]);

  // Metrics
  const totalCount = items.length;
  const unwornCount = items.filter(i => i.wear_count === 0).length;
  const activeUtilization = totalCount > 0 ? Math.round(((totalCount - unwornCount) / totalCount) * 100) : 0;
  const totalWearsCount = items.reduce((acc, i) => acc + (i.wear_count || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
            Total Garments
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-display text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500 font-medium">pieces</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
            Active Utilization
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-display text-emerald-600">{activeUtilization}%</span>
            <span className="text-xs text-emerald-700/80 font-medium">closet rotated</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
            Unworn Items (0 Wears)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-display text-amber-600">{unwornCount}</span>
            <span className="text-xs text-amber-700/80 font-medium">need rotation</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
            Total Wears Logged
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-display text-indigo-600">{totalWearsCount}</span>
            <span className="text-xs text-indigo-700/80 font-medium">closet wears</span>
          </div>
        </div>
      </div>

      {/* Action Bar & Search / Multi-attribute Filtering */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        
        {/* Top search & Add Garment button */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search garments by name, category, or core color..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                <option value="recent">Recently Added</option>
                <option value="wear_desc">Most Worn First</option>
                <option value="wear_asc">Least Worn First</option>
              </select>
            </div>

            {/* Add Garment CTA */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Garment</span>
            </button>
          </div>
        </div>

        {/* Multi-attribute Filter Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          
          <div className="flex items-center gap-1 text-slate-400 font-semibold uppercase tracking-wider text-[10px] mr-1">
            <Filter className="w-3 h-3" />
            <span>Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-hidden cursor-pointer hover:bg-slate-50"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c.tag_id} value={c.tag_name}>{c.tag_name}</option>
            ))}
          </select>

          {/* Color Filter */}
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-hidden cursor-pointer hover:bg-slate-50"
          >
            <option value="All">All Core Colors</option>
            {colors.map(c => (
              <option key={c.tag_id} value={c.tag_name}>{c.tag_name}</option>
            ))}
          </select>

          {/* Wear Count Filter */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {[
              { id: 'All', label: 'All Wears' },
              { id: 'Unworn', label: 'Unworn (0)' },
              { id: 'Low', label: 'Low (1-5)' },
              { id: 'High', label: 'High (6+)' }
            ].map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWearFilter(w.id)}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition cursor-pointer ${
                  selectedWearFilter === w.id
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Reset Filters */}
          {(selectedCategory !== 'All' || selectedColor !== 'All' || selectedWearFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedColor('All');
                setSelectedWearFilter('All');
                setSearchQuery('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium underline px-2 py-1 ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}

        </div>

      </div>

      {/* Garments Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Shirt className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 font-display">
            {items.length === 0 ? 'Your Virtual Closet is Empty' : 'No matching garments found'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {items.length === 0 
              ? 'Start building your mindful wardrobe. Upload garment photos with automated background removal to catalog your pieces.'
              : 'Try adjusting your search keywords, category filters, or add a new piece to your virtual closet.'}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            {items.length === 0 ? 'Add Your First Garment' : 'Add Garment Now'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredItems.map((item) => {
            const isUnworn = item.wear_count === 0;
            return (
              <div
                key={item.item_id}
                className="group relative bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition duration-150 flex flex-col"
              >
                {/* Image Silhouette Container */}
                <div className="relative aspect-square w-full bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[size:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0] flex items-center justify-center p-3 overflow-hidden border-b border-slate-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain filter drop-shadow-sm group-hover:scale-105 transition duration-200"
                    loading="lazy"
                  />

                  {/* Wear Count Pill */}
                  <div className="absolute top-2 right-2 z-10">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1 ${
                        isUnworn
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <TrendingUp className="w-2.5 h-2.5" />
                      <span>{item.wear_count} wears</span>
                    </span>
                  </div>

                  {/* Quick Edit Overlay Button */}
                  <button
                    onClick={() => setEditingItem(item)}
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Edit Metadata"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Metadata & Tag Info */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition" title={item.name}>
                      {item.name}
                    </h4>

                    {/* Category & Color */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {item.category && (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      )}
                      {item.color && (
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full border border-slate-300" style={{ backgroundColor: tags.find(t => t.tag_name === item.color)?.hex_color || '#94a3b8' }} />
                          {item.color}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action: Select for Today's Look */}
                  {onSelectForTodayOutfit && (
                    <button
                      onClick={() => onSelectForTodayOutfit(item)}
                      className="mt-3 w-full py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Shirt className="w-3 h-3" />
                      <span>Wear Today</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        tags={tags}
        userId={userId}
        onAddItem={onAddItem}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        tags={tags}
        onUpdate={onUpdateItem}
        onDelete={onDeleteItem}
      />

    </div>
  );
};
