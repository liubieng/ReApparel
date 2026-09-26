import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  Wand2, 
  Sliders, 
  Tag as TagIcon, 
  Check, 
  AlertCircle,
  Camera,
  Layers,
  CheckCircle2,
  Pipette
} from 'lucide-react';
import { Tag, AdditionType, ClothingItem } from '../../types/database';
import { removeBackgroundClientSide, fileToDataUrl } from '../../utils/imageProcessing';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  userId: string;
  onAddItem: (item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>) => Promise<void>;
}

// Curated high quality presets for instant testing
const PRESET_CLOTHES = [
  {
    name: 'Vintage Merino Turtleneck',
    category: 'Knitwear',
    color: 'Olive',
    type: 'Old' as AdditionType,
    url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Tailored Wide-Leg Gabardine Trousers',
    category: 'Bottoms',
    color: 'Navy',
    type: 'Old' as AdditionType,
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Recent Impulse Purchase Bomber',
    category: 'Outerwear',
    color: 'Black',
    type: 'New' as AdditionType,
    url: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80'
  },
  {
    name: 'Raw Silk Relaxed Button-Down',
    category: 'Tops',
    color: 'White',
    type: 'Old' as AdditionType,
    url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
  }
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  tags,
  userId,
  onAddItem
}) => {
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tops');
  const [selectedColor, setSelectedColor] = useState('Black');
  const [additionType, setAdditionType] = useState<AdditionType>('Old');
  
  // Image states
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [tolerance, setTolerance] = useState(52);
  const [removeShadows, setRemoveShadows] = useState(true);
  const [targetBgColor, setTargetBgColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [previewMode, setPreviewMode] = useState<'processed' | 'original'>('processed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories = tags.filter(t => t.tag_type === 'Category');
  const colors = tags.filter(t => t.tag_type === 'Color');

  const processBackgroundRemoval = async (
    sourceUrl: string, 
    tolVal: number = tolerance,
    shadowsVal: boolean = removeShadows,
    customBg: { r: number; g: number; b: number } | null = targetBgColor
  ) => {
    setIsProcessingBg(true);
    try {
      const result = await removeBackgroundClientSide(sourceUrl, {
        tolerance: tolVal,
        feather: 1.5,
        removeShadows: shadowsVal,
        targetBgColor: customBg
      });
      setProcessedImageUrl(result.dataUrl);
    } catch (err) {
      console.warn('Background removal error, using original', err);
      setProcessedImageUrl(sourceUrl);
    } finally {
      setIsProcessingBg(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setOriginalImageUrl(dataUrl);
      setTargetBgColor(null);
      processBackgroundRemoval(dataUrl, tolerance, removeShadows, null);
      if (!name) {
        // Generate nice default from file name
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err) {
      console.error('File load failed', err);
    } finally {
      // Clear input value so selecting the same or different photo triggers onChange reliably
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleImageSampleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!originalImageUrl) return;
    const imgElement = e.currentTarget;
    const rect = imgElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      tempCanvas.width = tempImg.width;
      tempCanvas.height = tempImg.height;
      tempCtx.drawImage(tempImg, 0, 0);

      const normX = Math.max(0, Math.min(tempImg.width - 1, Math.floor((clickX / rect.width) * tempImg.width)));
      const normY = Math.max(0, Math.min(tempImg.height - 1, Math.floor((clickY / rect.height) * tempImg.height)));
      const pixel = tempCtx.getImageData(normX, normY, 1, 1).data;

      const sampled = { r: pixel[0], g: pixel[1], b: pixel[2] };
      setTargetBgColor(sampled);
      processBackgroundRemoval(originalImageUrl, tolerance, removeShadows, sampled);
    };
    tempImg.src = originalImageUrl;
  };

  const handleSelectPreset = (preset: typeof PRESET_CLOTHES[0]) => {
    setName(preset.name);
    setSelectedCategory(preset.category);
    setSelectedColor(preset.color);
    setAdditionType(preset.type);
    setOriginalImageUrl(preset.url);
    setTargetBgColor(null);
    processBackgroundRemoval(preset.url, tolerance, removeShadows, null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalImageUrl = processedImageUrl || originalImageUrl;
    if (!finalImageUrl) {
      alert('Please upload or select a garment photo');
      return;
    }

    if (!name.trim()) {
      alert('Please provide a name for this garment');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddItem({
        user_id: userId,
        name: name.trim(),
        image_url: finalImageUrl,
        addition_type: additionType,
        category: selectedCategory,
        color: selectedColor
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Add Garment to Virtual Closet
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Client-side background removal isolates the garment silhouette for UN SDG 12 tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Permanent file input always mounted in DOM */}
          <input
            id="garment-upload-input"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* 1. Image Upload & Background Removal Section */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              1. Garment Photo & Silhouette Isolation
            </label>

            {!originalImageUrl ? (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      fileToDataUrl(file).then(dataUrl => {
                        setOriginalImageUrl(dataUrl);
                        processBackgroundRemoval(dataUrl, tolerance);
                        if (!name) {
                          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                          setName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
                        }
                      }).catch(err => console.error(err));
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-6 text-center transition cursor-pointer group"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-600 flex items-center justify-center transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    Click to upload photo or take a picture
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-detects and removes background to create clean catalog silhouette (drag & drop supported)
                  </p>
                </div>

                {/* Instant Presets */}
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                    Or select a sample garment to test:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_CLOTHES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition cursor-pointer text-xs"
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <span className="font-medium text-slate-700 truncate">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  {/* Canvas Silhouette Preview with Checkered Background */}
                  <div 
                    className="relative w-full sm:w-56 h-56 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[size:16px_16px] group cursor-crosshair"
                    title={previewMode === 'original' ? 'Click anywhere on the backdrop to sample and eliminate that color' : 'Silhouette preview with transparent background'}
                  >
                    {isProcessingBg && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-10">
                        <Wand2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        <span className="text-xs font-semibold text-slate-600 mt-2">Isolating garment...</span>
                      </div>
                    )}
                    <img
                      src={previewMode === 'processed' ? (processedImageUrl || originalImageUrl) : originalImageUrl}
                      alt="Garment Preview"
                      onClick={handleImageSampleClick}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md select-none transition-transform"
                    />

                    {/* Mode badge */}
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                      {previewMode === 'processed' ? (
                        <>
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>Silhouette Isolated</span>
                        </>
                      ) : (
                        <>
                          <Pipette className="w-3 h-3 text-amber-400" />
                          <span>Tap Background to Sample</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Processing controls */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Wand2 className="w-4 h-4 text-emerald-600" />
                        Garment Silhouette Isolation
                      </span>
                      <div className="flex rounded-lg border border-slate-200 p-0.5 bg-white text-xs">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('processed')}
                          className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                            previewMode === 'processed' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                          }`}
                        >
                          Isolated
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('original')}
                          className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                            previewMode === 'original' ? 'bg-slate-800 text-white' : 'text-slate-600'
                          }`}
                        >
                          Original
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      Border-connected flood fill preserves inner graphics while eliminating backdrop, bedsheets, and floor textures.
                    </p>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <span>Tolerance Cutoff:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tolerance >= 85 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : tolerance >= 60 
                              ? 'bg-teal-100 text-teal-800 border border-teal-300' 
                              : tolerance >= 40 
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {tolerance >= 85 
                              ? 'Maximum (Clothing Only)' 
                              : tolerance >= 60 
                              ? 'Deep Cut (Removes Shadows)' 
                              : tolerance >= 40 
                              ? 'Balanced Studio Cut' 
                              : 'Subtle Edge Clean'}
                          </span>
                        </span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {tolerance}
                        </span>
                      </div>

                      <input
                        type="range"
                        min="10"
                        max="115"
                        step="1"
                        value={tolerance}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTolerance(val);
                          if (originalImageUrl) {
                            processBackgroundRemoval(originalImageUrl, val, removeShadows, targetBgColor);
                          }
                        }}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />

                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>10 (Gentle)</span>
                        <span>52 (Standard)</span>
                        <span>115 (Clothing Only)</span>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {[
                          { label: 'Subtle', val: 35 },
                          { label: 'Balanced', val: 52 },
                          { label: 'Deep Cut', val: 75 },
                          { label: 'Clothing Only', val: 98 }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setTolerance(preset.val);
                              if (originalImageUrl) {
                                processBackgroundRemoval(originalImageUrl, preset.val, removeShadows, targetBgColor);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                              Math.abs(tolerance - preset.val) <= 4
                                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shadow Cutoff & Sample Point Row */}
                    <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={removeShadows}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setRemoveShadows(val);
                            if (originalImageUrl) {
                              processBackgroundRemoval(originalImageUrl, tolerance, val, targetBgColor);
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          Cut cast shadows & floor reflections
                        </span>
                      </label>

                      {targetBgColor ? (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-md text-[11px]">
                          <span 
                            className="w-3 h-3 rounded-full border border-slate-300 inline-block" 
                            style={{ backgroundColor: `rgb(${targetBgColor.r},${targetBgColor.g},${targetBgColor.b})` }} 
                          />
                          <span className="text-slate-600 font-mono text-[10px]">Sampled</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetBgColor(null);
                              if (originalImageUrl) {
                                processBackgroundRemoval(originalImageUrl, tolerance, removeShadows, null);
                              }
                            }}
                            className="text-rose-600 hover:underline font-semibold ml-1 cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Pipette className="w-3 h-3" />
                          <span>Click photo to eye-drop backdrop</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/80">
                      <label
                        htmlFor="garment-upload-input"
                        className="text-xs text-slate-700 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Change Photo</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOriginalImageUrl(null);
                          setProcessedImageUrl(null);
                          setTargetBgColor(null);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg bg-rose-50/40 hover:bg-rose-50 font-medium transition cursor-pointer"
                      >
                        Remove Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (originalImageUrl) processBackgroundRemoval(originalImageUrl, tolerance, removeShadows, targetBgColor);
                        }}
                        className="text-xs text-emerald-700 hover:text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-lg bg-emerald-50 font-medium transition cursor-pointer"
                      >
                        Re-process
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Garment Details & Metadata */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Garment Title / Description *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Organic Cotton Crewneck, Selvedge Denim Jacket"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            {/* 3. Category Tag */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category *
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.tag_name;
                  return (
                    <button
                      key={cat.tag_id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.tag_name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.tag_name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Core Color Family Tag */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Primary Core Color Family (Curated Catalog) *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {colors.map((c) => {
                  const isSelected = selectedColor === c.tag_name;
                  return (
                    <button
                      key={c.tag_id}
                      type="button"
                      onClick={() => setSelectedColor(c.tag_name)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0"
                        style={{ backgroundColor: c.hex_color || '#94a3b8' }}
                      />
                      <span className="truncate">{c.tag_name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !originalImageUrl}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>Saving Garment...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save to Virtual Closet
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
