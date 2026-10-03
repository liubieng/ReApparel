import React, { useState, useRef, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { ClothingItem } from '../../types/database';
import { CATEGORIES, CURATED_COLOR_FAMILIES } from '../../data/seedData';
import { removeBackgroundClientSide } from '../../utils/imageProcessing';

interface EditItemModalProps {
  garment: ClothingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (itemId: number, updates: Partial<ClothingItem>) => Promise<void>;
  toast: (msg: string) => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  garment,
  isOpen,
  onClose,
  onUpdateItem,
  toast
}) => {
  if (!isOpen || !garment) return null;

  const [category, setCategory] = useState<string>(garment.category || '');
  const [color, setColor] = useState<string>(garment.color || '');
  const [colorHex, setColorHex] = useState<string>(garment.color_tag || '');
  const [images, setImages] = useState<string[]>(
    garment.images && garment.images.length > 0 ? garment.images : [garment.image_url]
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (garment) {
      setCategory(garment.category || '');
      setColor(garment.color || '');
      setColorHex(garment.color_tag || '');
      setImages(garment.images && garment.images.length > 0 ? garment.images : [garment.image_url]);
      setUpdateError(null);
    }
  }, [garment]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 3) {
      toast('Maximum 3 photos per item.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const raw = evt.target?.result as string;
      if (!raw) {
        setIsProcessing(false);
        return;
      }
      try {
        const transparent = await removeBackgroundClientSide(raw, {
          tolerance: 32,
          removeShadows: false
        });
        const finalImage = transparent?.dataUrl || raw;
        setImages(prev => [...prev, finalImage]);
        toast('Photo added successfully!');
      } catch {
        setImages(prev => [...prev, raw]);
        toast('Photo added successfully!');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRetry = () => {
    setUpdateError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const primaryImage = images[0] || garment.image_url;
    setIsSubmitting(true);
    setUpdateError(null);

    try {
      await onUpdateItem(garment.item_id, {
        category,
        type_tag: garment.type_tag,
        color,
        color_tag: colorHex,
        image_url: primaryImage,
        images
      });

      toast(`Updated garment successfully`);
      onClose();
    } catch (err: any) {
      setUpdateError('The system encountered an error updating this garment. Please retry or cancel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modalScrim" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>Edit Clothing Item</h3>
          <button type="button" className="icobtn" onClick={onClose} aria-label="Close modal">
            <X className="ico" />
          </button>
        </div>

        {/* Update Failure Alert with Retry and Cancel Options (TC_EDIT_06, TC_EDIT_07) */}
        {updateError && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            marginBottom: 16
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              Alert: Clothing Item Update Failed
            </div>
            <div style={{ fontSize: 12, marginBottom: 10, color: 'var(--text)' }}>
              {updateError}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-p"
                style={{ fontSize: 11.5, padding: '5px 14px' }}
                onClick={handleRetry}
              >
                Retry Edit
              </button>
              <button
                type="button"
                className="btn btn-g"
                style={{ fontSize: 11.5, padding: '5px 14px' }}
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Photos */}
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Photos ({images.length}/3)</span>
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '8px 0' }}>
              {images.map((src, idx) => (
                <div
                  key={idx}
                  style={{
                    width: 64,
                    height: 64,
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
                  <img
                    src={src}
                    alt={`Photo ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
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
              ))}
              {images.length < 3 && (
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 11, height: 64, padding: '0 12px' }}
                  disabled={isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="ico" style={{ width: 12, height: 12 }} />
                  {isProcessing ? 'Processing...' : 'Add Photo'}
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>

          {/* Category */}
          <div className="field">
            <label>Category (1 only)</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`pill ${category === cat ? 'on' : ''}`}
                  style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 14 }}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Color Profile</span>
              {color && (
                <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorHex, display: 'inline-block' }} />
                  {color}
                </span>
              )}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginTop: 4, maxHeight: 110, overflowY: 'auto' }}>
              {CURATED_COLOR_FAMILIES.map(f => {
                const isSelected = color === f.name;
                return (
                  <button
                    key={f.name}
                    type="button"
                    className="btn btn-g"
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      justifyContent: 'flex-start',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--surface-2)' : 'var(--surface)'
                    }}
                    onClick={() => { setColor(f.name); setColorHex(f.hex); }}
                  >
                    <span style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: f.hex,
                      display: 'inline-block',
                      marginRight: 4,
                      border: '1px solid rgba(0,0,0,0.15)'
                    }} />
                    <span>{f.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-g" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="btn btn-p" disabled={isSubmitting}>Save Changes</button>
          </div>
        </form>

      </div>
    </div>
  );
};
