import React, { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { ClothingItem } from '../../types/database';
import { CATEGORIES, GARMENT_TYPES, CURATED_COLOR_FAMILIES } from '../../data/seedData';
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

  const [name, setName] = useState(garment.name);
  const [category, setCategory] = useState<string>(garment.category || '');
  const [garmentType, setGarmentType] = useState<string>(garment.type_tag || '');
  const [color, setColor] = useState<string>(garment.color || '');
  const [colorHex, setColorHex] = useState<string>(garment.color_tag || '');
  const [images, setImages] = useState<string[]>(
    garment.images && garment.images.length > 0 ? garment.images : [garment.image_url]
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      try {
        const transparent = await removeBackgroundClientSide(raw);
        setImages(prev => [...prev, transparent.dataUrl]);
        toast('Photo updated!');
      } catch {
        setImages(prev => [...prev, raw]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Garment name cannot be empty.');
      return;
    }

    const primaryImage = images[0] || garment.image_url;

    await onUpdateItem(garment.item_id, {
      name: name.trim(),
      addition_type: garment.addition_type || 'Old',
      category,
      type_tag: garmentType,
      color,
      color_tag: colorHex,
      image_url: primaryImage,
      images
    });

    toast(`Updated "${name.trim()}"`);
    onClose();
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

        <form onSubmit={handleSubmit}>
          {/* Photos */}
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Photos ({images.length}/3)</span>
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
              {images.map((src, idx) => (
                <span key={idx} className="swatchsm" style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <span className="x" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}>✕</span>
                </span>
              ))}
              {images.length < 3 && (
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 11 }}
                  disabled={isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="ico" style={{ width: 12, height: 12 }} /> Add Photo
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>

          {/* Name */}
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
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

          {/* Garment Type */}
          <div className="field">
            <label>Garment Type (1 only)</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4, maxHeight: 90, overflowY: 'auto' }}>
              {GARMENT_TYPES.map(gt => (
                <button
                  key={gt}
                  type="button"
                  className={`pill ${garmentType === gt ? 'on' : ''}`}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 12 }}
                  onClick={() => setGarmentType(gt)}
                >
                  {gt}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="field">
            <label>Color</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 4, maxHeight: 90, overflowY: 'auto' }}>
              {CURATED_COLOR_FAMILIES.map(f => (
                <button
                  key={f.name}
                  type="button"
                  className="btn btn-g"
                  style={{
                    fontSize: 10.5, padding: '3px 6px',
                    border: color === f.name ? '2px solid var(--primary)' : '1px solid var(--border)'
                  }}
                  onClick={() => { setColor(f.name); setColorHex(f.hex); }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: f.hex, display: 'inline-block', marginRight: 4 }} />
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-g" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-p">Save Changes</button>
          </div>
        </form>

      </div>
    </div>
  );
};
