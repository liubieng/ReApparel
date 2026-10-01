import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Sparkles, ImagePlus } from 'lucide-react';
import { ClothingItem } from '../../types/database';
import { 
  CATEGORIES, 
  CURATED_COLOR_FAMILIES, 
  CuratedColorFamily,
  createGarmentSilhouette 
} from '../../data/seedData';
import { removeBackgroundClientSide } from '../../utils/imageProcessing';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onAddItem: (item: Omit<ClothingItem, 'item_id' | 'wear_count' | 'date_added'>) => Promise<void>;
  toast: (msg: string) => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  userId,
  onAddItem,
  toast
}) => {
  const [category, setCategory] = useState<string>('Tops');
  const [selectedColor, setSelectedColor] = useState<string>('Neutral');
  const [selectedColorHex, setSelectedColorHex] = useState<string>('#64748b');
  const [images, setImages] = useState<string[]>([]);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  // Image Upload with Automatic Client-Side Background Removal
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 3) {
      toast('Maximum 3 photos allowed per garment.');
      return;
    }

    setIsProcessingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target?.result as string;
        if (!rawDataUrl) {
          setIsProcessingImage(false);
          return;
        }
        try {
          // Process client-side background removal with safe parameters
          const transparentResult = await removeBackgroundClientSide(rawDataUrl, {
            tolerance: 32,
            removeShadows: false
          });
          const finalImage = transparentResult?.dataUrl || rawDataUrl;
          setImages(prev => [...prev, finalImage]);
          toast('Photo uploaded successfully!');
        } catch {
          // Fallback to raw uploaded image
          setImages(prev => [...prev, rawDataUrl]);
          toast('Photo uploaded successfully!');
        } finally {
          setIsProcessingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingImage(false);
      toast('Failed to process image file.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setFormWarning(null);
  };

  const handleSelectColorFamily = (family: CuratedColorFamily) => {
    setSelectedColor(family.name);
    setSelectedColorHex(family.hex);
    setFormWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormWarning(null);

    // Resolve category, color, and automatic naming
    const finalCategory = category || 'Tops';
    const finalColor = selectedColor || 'Neutral';
    const finalColorHex = selectedColorHex || '#64748b';
    const finalName = selectedColor ? `${selectedColor} ${finalCategory}` : finalCategory;
    const finalType = finalCategory;

    // Generate crisp vector silhouette if no user photo uploaded
    const silType = (finalCategory === 'Bottoms')
      ? 'bottom'
      : (finalCategory === 'Outerwear')
        ? 'outerwear'
        : (finalCategory === 'Dresses')
          ? 'dress'
          : (finalCategory === 'Shoes')
            ? 'shoes'
            : 'top';

    const primaryImage = images.length > 0 
      ? images[0] 
      : createGarmentSilhouette(finalColorHex, finalName, silType);

    setIsSubmitting(true);
    try {
      await onAddItem({
        user_id: userId || 'a0000000-0000-0000-0000-000000000001',
        name: finalName,
        image_url: primaryImage,
        category: finalCategory,
        type_tag: finalType,
        color: finalColor,
        color_tag: finalColorHex,
        images: images.length > 0 ? images : [primaryImage]
      });

      toast(`"${finalName}" added to your virtual closet!`);
      // Reset form fields
      setImages([]);
      setFormWarning(null);
      onClose();
    } catch (err) {
      console.error('Failed to add garment:', err);
      setFormWarning('Unable to save item to closet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={modalRef} className="modal" style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-display)' }}>
            Add Clothing Item
          </h3>
          <button type="button" className="icobtn" onClick={onClose} aria-label="Close modal">
            <X className="ico" />
          </button>
        </div>

        {/* Warning Alert */}
        {formWarning && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            fontSize: 12,
            marginBottom: 14,
            border: '1px solid var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <AlertCircle className="ico" style={{ width: 14, height: 14 }} />
            <span>{formWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Garment Photos (1-3) */}
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Photos (Optional, 1–3)</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{images.length}/3 photos</span>
            </label>

            {/* Photo Previews */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '8px 0' }}>
              {images.map((imgSrc, idx) => {
                const isColorHex = imgSrc.startsWith('#');
                return (
                  <div
                    key={idx}
                    style={{
                      width: 68,
                      height: 68,
                      borderRadius: 8,
                      border: '1.5px solid var(--border)',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: 'var(--surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isColorHex ? (
                      <div style={{ width: '100%', height: '100%', backgroundColor: imgSrc }} />
                    ) : (
                      <img
                        src={imgSrc}
                        alt={`Photo ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      title="Remove photo"
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(0,0,0,0.65)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: 18,
                        height: 18,
                        fontSize: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {images.length < 3 && (
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 12, padding: '6px 12px', height: 68 }}
                  disabled={isProcessingImage}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="ico" style={{ width: 14, height: 14 }} />
                  {isProcessingImage ? 'Uploading...' : 'Upload Photo'}
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageFileChange}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ⚡ Background is automatically isolated. If no photo is uploaded, a crisp vector silhouette is generated.
            </div>
          </div>

          {/* Category Selection */}
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Category</span>
              {category && <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 700 }}>✓ {category}</span>}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {CATEGORIES.map(cat => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`pill ${isSelected ? 'on' : ''}`}
                    style={{
                      cursor: 'pointer',
                      padding: '5px 12px',
                      fontSize: 12,
                      borderRadius: 16,
                      background: isSelected ? 'var(--primary)' : 'var(--surface-2)',
                      color: isSelected ? '#ffffff' : 'var(--text)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      fontWeight: isSelected ? 600 : 400
                    }}
                    onClick={() => handleSelectCategory(cat)}
                  >
                    {cat} {isSelected ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Color Profile</span>
              {selectedColor && (
                <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: selectedColorHex, display: 'inline-block' }} />
                  {selectedColor}
                </span>
              )}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginTop: 4, maxHeight: 110, overflowY: 'auto' }}>
              {CURATED_COLOR_FAMILIES.map(family => {
                const isSelected = selectedColor === family.name;
                return (
                  <button
                    key={family.name}
                    type="button"
                    className="btn btn-g"
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      justifyContent: 'flex-start',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--surface-2)' : 'var(--surface)'
                    }}
                    onClick={() => handleSelectColorFamily(family)}
                  >
                    <span style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: family.hex,
                      display: 'inline-block',
                      marginRight: 4,
                      border: '1px solid rgba(0,0,0,0.15)'
                    }} />
                    <span>{family.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions & Immediate Inline Warning */}
          {formWarning && (
            <div style={{
              color: 'var(--danger)',
              fontSize: 12,
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle className="ico" style={{ width: 14, height: 14 }} />
              <span>{formWarning}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-g" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-p" disabled={isSubmitting} style={{ padding: '8px 20px' }}>
              {isSubmitting ? 'Adding...' : 'Add to Closet'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

