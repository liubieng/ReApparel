import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, AlertCircle, Camera, Sliders } from 'lucide-react';
import { ClothingItem } from '../../types/database';
import { 
  CATEGORIES, 
  NORMAL_CLOTHING_COLORS, 
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
  const [category, setCategory] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedColorHex, setSelectedColorHex] = useState<string>('#64748b');
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [isolationLevel, setIsolationLevel] = useState<number>(50);
  const rawImagesRef = useRef<string[]>([]);
  const rawImageElementsRef = useRef<HTMLImageElement[]>([]);
  const isolationSeqRef = useRef<number>(0);
  const debounceTimerRef = useRef<any>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image input options (Upload vs Camera)
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount or mode switch
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      rawImagesRef.current = [];
      rawImageElementsRef.current = [];
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setActiveImageIdx(0);
    }
    return () => {
      stopCameraStream();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isOpen]);

  // Start Camera Stream
  const handleStartCamera = async () => {
    setInputMode('camera');
    setCameraError(null);
    setFormWarning(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } else {
        setIsCameraActive(true); // Fallback to simulated camera view
      }
    } catch (err: any) {
      console.warn('Camera access unavailable, running simulated camera view:', err);
      setIsCameraActive(true);
    }
  };

  // Capture frame from camera stream
  const handleCapturePhoto = async () => {
    if (images.length >= 3) {
      toast('Maximum 3 photos allowed per garment.');
      return;
    }

    try {
      let dataUrl = '';
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      }

      // If no hardware video feed, generate sample captured apparel photo
      if (!dataUrl) {
        dataUrl = createGarmentSilhouette(selectedColorHex || '#2563eb', 'Captured Garment', 'top');
      }

      const imgEl = new Image();
      imgEl.crossOrigin = 'anonymous';
      imgEl.src = dataUrl;
      await imgEl.decode?.().catch(() => {});

      rawImagesRef.current.push(dataUrl);
      rawImageElementsRef.current.push(imgEl);

      setIsProcessingImage(true);
      try {
        const transparentResult = await removeBackgroundClientSide(imgEl, {
          tolerance: isolationLevel,
          removeShadows: isolationLevel >= 25
        });
        const finalImage = transparentResult?.dataUrl || dataUrl;
        setImages(prev => {
          const next = [...prev, finalImage];
          setActiveImageIdx(next.length - 1);
          return next;
        });
      } catch {
        setImages(prev => {
          const next = [...prev, dataUrl];
          setActiveImageIdx(next.length - 1);
          return next;
        });
      } finally {
        setIsProcessingImage(false);
      }

      stopCameraStream();
      setInputMode('upload');
      toast('Photo captured successfully!');
    } catch (err) {
      setCameraError('Failed to capture photo from camera.');
    }
  };

  // Upload image button trigger (directly functional)
  const handleUploadClick = () => {
    stopCameraStream();
    setInputMode('upload');
    setCameraError(null);
    if (images.length >= 3) {
      toast('Maximum 3 photos allowed per garment.');
      return;
    }
    fileInputRef.current?.click();
  };

  // Image Upload with Automatic Client-Side Background Removal
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormWarning('The selected file is unsupported. Please upload a valid image file (e.g., JPG, PNG).');
      toast('Unsupported file format.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (images.length >= 3) {
      toast('Maximum 3 photos allowed per garment.');
      return;
    }

    setIsProcessingImage(true);
    setFormWarning(null);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawDataUrl = event.target?.result as string;
        if (!rawDataUrl) {
          setIsProcessingImage(false);
          return;
        }

        const imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';
        imgEl.src = rawDataUrl;
        await imgEl.decode?.().catch(() => {});

        rawImagesRef.current.push(rawDataUrl);
        rawImageElementsRef.current.push(imgEl);

        try {
          const transparentResult = await removeBackgroundClientSide(imgEl, {
            tolerance: isolationLevel,
            removeShadows: isolationLevel >= 25
          });
          const finalImage = transparentResult?.dataUrl || rawDataUrl;
          setImages(prev => {
            const next = [...prev, finalImage];
            setActiveImageIdx(next.length - 1);
            return next;
          });
          toast('Photo uploaded successfully!');
        } catch {
          setImages(prev => {
            const next = [...prev, rawDataUrl];
            setActiveImageIdx(next.length - 1);
            return next;
          });
          toast('Photo uploaded successfully!');
        } finally {
          setIsProcessingImage(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingImage(false);
      toast('Failed to process image file.');
    }
  };

  // Live adjustment of background isolation level via slider (smooth, debounced & non-blocking)
  const handleIsolationChange = (newVal: number) => {
    setIsolationLevel(newVal);
    if (rawImageElementsRef.current.length === 0 && rawImagesRef.current.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentSeq = ++isolationSeqRef.current;
    setIsProcessingImage(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const count = Math.max(rawImageElementsRef.current.length, rawImagesRef.current.length);
        const updatedImages: string[] = [];

        for (let i = 0; i < count; i++) {
          const imgEl = rawImageElementsRef.current[i];
          const rawUrl = rawImagesRef.current[i];
          const source = (imgEl && imgEl.complete && imgEl.naturalWidth > 0) ? imgEl : rawUrl;

          if (!source) continue;
          if (typeof source === 'string' && !source.startsWith('data:image')) {
            updatedImages.push(source);
            continue;
          }

          try {
            const res = await removeBackgroundClientSide(source, {
              tolerance: newVal,
              removeShadows: newVal >= 25
            });
            updatedImages.push(res?.dataUrl || (typeof source === 'string' ? source : source.src));
          } catch {
            updatedImages.push(typeof source === 'string' ? source : source.src);
          }
        }

        if (currentSeq === isolationSeqRef.current && updatedImages.length > 0) {
          setImages(updatedImages);
        }
      } catch (err) {
        console.error('Failed to update isolation:', err);
      } finally {
        if (currentSeq === isolationSeqRef.current) {
          setIsProcessingImage(false);
        }
      }
    }, 40);
  };

  const handleRemoveImage = (index: number) => {
    rawImagesRef.current = rawImagesRef.current.filter((_, i) => i !== index);
    rawImageElementsRef.current = rawImageElementsRef.current.filter((_, i) => i !== index);
    setImages(prev => prev.filter((_, i) => i !== index));
    setActiveImageIdx(prev => Math.max(0, prev >= index ? prev - 1 : prev));
  };

  const handleSelectCategory = (cat: string) => {
    setCategory(prev => prev === cat ? '' : cat);
    setFormWarning(null);
  };

  const handleSelectColorFamily = (family: CuratedColorFamily) => {
    setSelectedColor(prev => prev === family.name ? '' : family.name);
    setSelectedColorHex(family.hex);
    setFormWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormWarning(null);

    if (!category && !selectedColor) {
      setFormWarning('Please complete the required clothing category and color details before submitting.');
      return;
    }
    if (!category) {
      setFormWarning('Please select a clothing category or type.');
      return;
    }
    if (!selectedColor) {
      setFormWarning('Please select a clothing color.');
      return;
    }

    const finalCategory = category;
    const finalColor = selectedColor;
    const finalColorHex = selectedColorHex || '#64748b';
    const finalName = `${finalColor} ${finalCategory}`;
    const finalType = finalCategory;

    // Generate crisp vector silhouette if no user photo uploaded
    const silType = (finalCategory === 'Bottoms' || finalCategory === 'Pants' || finalCategory === 'Shorts')
      ? 'bottom'
      : (finalCategory === 'Outerwear')
        ? 'outerwear'
        : (finalCategory === 'Dresses' || finalCategory === 'Skirt')
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
        images: images.length > 0 ? images : [primaryImage],
        is_public: true,
        is_active: true,
        status: 'Available'
      });

      toast(`"${finalName}" added to your virtual closet!`);
      // Reset form fields
      rawImagesRef.current = [];
      rawImageElementsRef.current = [];
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      setImages([]);
      setActiveImageIdx(0);
      setFormWarning(null);
      setCategory('');
      setSelectedColor('');
      setIsolationLevel(50);
      onClose();
    } catch (err) {
      console.error('Failed to add garment:', err);
      setFormWarning('Unable to save item to closet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
          
          {/* Image Input Options */}
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Clothing Image ({images.length}/3)</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Choose input method</span>
            </label>

            {/* Input Method Switcher */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className={`btn ${inputMode === 'upload' ? 'btn-p' : 'btn-g'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={handleUploadClick}
                disabled={isProcessingImage}
              >
                <Upload className="ico" style={{ width: 14, height: 14 }} />
                {isProcessingImage ? 'Processing...' : 'Upload Image'}
              </button>

              <button
                type="button"
                className={`btn ${inputMode === 'camera' ? 'btn-p' : 'btn-g'}`}
                style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={handleStartCamera}
              >
                <Camera className="ico" style={{ width: 14, height: 14 }} />
                Camera
              </button>
            </div>

            {/* Camera View Interface */}
            {inputMode === 'camera' && (
              <div style={{
                background: 'var(--surface-2)',
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
                border: '1px solid var(--border)',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 8,
                  background: '#000000',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {!isCameraActive && (
                    <div style={{ position: 'absolute', color: '#ffffff', fontSize: 13 }}>
                      Camera feed ready
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    right: 8,
                    padding: '4px 8px',
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 4,
                    color: '#ffffff',
                    fontSize: 11
                  }}>
                    Position your clothing item within the camera view
                  </div>
                </div>

                {cameraError && (
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: 'var(--danger-soft)',
                    color: 'var(--danger)',
                    fontSize: 11.5,
                    marginBottom: 10,
                    textAlign: 'left'
                  }}>
                    {cameraError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ fontSize: 12, padding: '7px 18px' }}
                    onClick={handleCapturePhoto}
                    disabled={isProcessingImage}
                  >
                    <Camera className="ico" style={{ width: 13, height: 13 }} />
                    {isProcessingImage ? 'Processing...' : 'Capture Photo'}
                  </button>
                </div>
              </div>
            )}

            {/* Enlarged & Centered Photo Preview */}
            {images.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0', width: '100%' }}>
                <div style={{
                  width: '100%',
                  maxWidth: 320,
                  height: 220,
                  borderRadius: 12,
                  border: '1.5px solid var(--border)',
                  position: 'relative',
                  overflow: 'hidden',
                  // Subtle checkered pattern to visualize transparent background isolation:
                  backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
                }}>
                  {images[activeImageIdx]?.startsWith('#') ? (
                    <div style={{ width: '100%', height: '100%', backgroundColor: images[activeImageIdx] }} />
                  ) : (
                    <img
                      src={images[activeImageIdx] || images[0]}
                      alt="Garment Preview"
                      style={{
                        maxWidth: '92%',
                        maxHeight: '92%',
                        objectFit: 'contain',
                        display: 'block',
                        filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.12))',
                        transition: 'opacity 0.15s ease'
                      }}
                    />
                  )}

                  {/* Delete active photo button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(activeImageIdx)}
                    title="Remove photo"
                    aria-label="Remove photo"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.65)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    ✕
                  </button>

                  {/* Processing indicator badge */}
                  {isProcessingImage && (
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      background: 'rgba(0,0,0,0.7)',
                      color: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                      Isolating...
                    </div>
                  )}
                </div>

                {/* Thumbnail gallery if multiple photos */}
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
                    {images.map((imgSrc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIdx(idx)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          border: activeImageIdx === idx ? '2px solid var(--primary)' : '1px solid var(--border)',
                          padding: 0,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: 'var(--surface-2)'
                        }}
                      >
                        <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageFileChange}
            />

            {/* Background Isolation Slider */}
            <div style={{
              marginTop: 10,
              padding: '10px 14px',
              background: 'var(--surface-2)',
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label htmlFor="bg-isolation-range" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sliders className="ico" style={{ width: 13, height: 13, color: 'var(--primary)' }} />
                  <span>Background Isolation Level</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'rgba(34, 197, 94, 0.12)',
                    padding: '1px 6px',
                    borderRadius: 4
                  }}>
                    {isolationLevel}%
                  </span>
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {isolationLevel <= 30 ? 'Low / Soft' : isolationLevel <= 65 ? 'Standard' : 'Aggressive'}
                </span>
              </div>

              <input
                id="bg-isolation-range"
                type="range"
                min="10"
                max="90"
                step="5"
                value={isolationLevel}
                onChange={(e) => handleIsolationChange(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--primary)',
                  cursor: 'pointer'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>Subtle (10%)</span>
                <span style={{ textAlign: 'center' }}>Adjusts how strictly the background is isolated from the garment</span>
                <span>Max isolation (90%)</span>
              </div>
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

          {/* Color Selection - matched to Virtual Closet colors */}
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
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {NORMAL_CLOTHING_COLORS.map(color => {
                const isSelected = selectedColor === color.name;
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
                    onClick={() => handleSelectColorFamily(color)}
                  >
                    <span style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: color.hex,
                      display: 'inline-block',
                      border: color.name === 'White' ? '1px solid #cbd5e1' : 'none'
                    }} />
                    <span>{color.name}</span>
                    {isSelected && <span>✓</span>}
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
