import React, { useState, useRef } from 'react';
import { X, Save, Trash2, AlertTriangle, Upload, Wand2 } from 'lucide-react';
import { ClothingItem, Tag, AdditionType } from '../../types/database';
import { removeBackgroundClientSide, fileToDataUrl } from '../../utils/imageProcessing';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ClothingItem | null;
  tags: Tag[];
  onUpdate: (itemId: number, updates: Partial<ClothingItem>) => Promise<void>;
  onDelete: (itemId: number) => Promise<void>;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  onClose,
  item,
  tags,
  onUpdate,
  onDelete
}) => {
  if (!isOpen || !item) return null;

  const [name, setName] = useState(item.name);
  const [imageUrl, setImageUrl] = useState(item.image_url);
  const [category, setCategory] = useState(item.category || 'Tops');
  const [color, setColor] = useState(item.color || 'Black');
  const [additionType, setAdditionType] = useState<AdditionType>(item.addition_type || 'Old');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const categories = tags.filter(t => t.tag_type === 'Category');
  const colors = tags.filter(t => t.tag_type === 'Color');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingBg(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const result = await removeBackgroundClientSide(dataUrl, {
        tolerance: 52,
        feather: 1.5,
        removeShadows: true
      });
      setImageUrl(result.dataUrl);
    } catch (err) {
      console.warn('Background removal error in edit modal', err);
    } finally {
      setIsProcessingBg(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await onUpdate(item.item_id, {
        name: name.trim(),
        image_url: imageUrl,
        category,
        color,
        addition_type: additionType
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      await onDelete(item.item_id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900 font-display">
            Edit Garment Metadata
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">Cascade Deletion Warning</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Deleting <strong className="text-slate-800">"{item.name}"</strong> will remove it from your virtual closet, all daily outfit logs, and active borrow requests with cascade protection.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Deleting...' : 'Confirm Cascade Delete'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Permanent file input always mounted in DOM */}
            <input
              id="edit-garment-upload-input"
              ref={editFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Visual preview & Change Photo */}
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-lg object-contain bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                  {isProcessingBg && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Wand2 className="w-5 h-5 text-emerald-600 animate-spin" />
                    </div>
                  )}
                  <img
                    src={imageUrl}
                    alt={name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-mono">Item ID: #{item.item_id}</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Worn {item.wear_count} times
                  </span>
                </div>
              </div>

              <label
                htmlFor="edit-garment-upload-input"
                className="text-xs text-slate-700 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Change Photo</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Garment Title
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.tag_id}
                    type="button"
                    onClick={() => setCategory(cat.tag_name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      category === cat.tag_name
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.tag_name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Core Color Family
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              >
                {colors.map((c) => (
                  <option key={c.tag_id} value={c.tag_name}>
                    {c.tag_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Garment
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
