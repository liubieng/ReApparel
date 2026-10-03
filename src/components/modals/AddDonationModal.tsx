import React, { useState } from 'react';
import { DonationOpportunity } from '../../types/database';
import { MapPin, Navigation, Share2, X, AlertCircle } from 'lucide-react';

interface AddDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<DonationOpportunity, 'donation_id'>) => Promise<void>;
  userLocation?: { lat: number; lng: number } | null;
}

export const AddDonationModal: React.FC<AddDonationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userLocation
}) => {
  const [name, setName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(9.317);
  const [longitude, setLongitude] = useState<number>(123.303);
  const [hours, setHours] = useState('Mon-Sat 8:00 AM - 5:00 PM');
  const [acceptedTypes, setAcceptedTypes] = useState('Everyday clean clothing, jackets, children wear, shoes, blankets');
  const [contactNumber, setContactNumber] = useState('');
  const [postPlatform, setPostPlatform] = useState<'facebook' | 'instagram' | 'community' | 'announcement'>('facebook');
  const [postUrl, setPostUrl] = useState('');
  const [postSnippet, setPostSnippet] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      setLatitude(Number(userLocation.lat.toFixed(5)));
      setLongitude(Number(userLocation.lng.toFixed(5)));
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(5)));
          setLongitude(Number(pos.coords.longitude.toFixed(5)));
        },
        () => {
          setErrorMsg('Could not detect device GPS location.');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter the donation drive or drop-off name.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter a location or street address.');
      return;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      setErrorMsg('Please enter valid geographic coordinates.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSubmit({
        name: name.trim(),
        organizer: organizer.trim() || undefined,
        address: address.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        hours: hours.trim() || 'Daily access',
        accepted_types: acceptedTypes.trim() || 'All clean apparel and textiles',
        source_url: postUrl.trim() || undefined,
        post_url: postUrl.trim() || undefined,
        post_platform: postPlatform,
        post_title: `${name.trim()} - Community Donation Drive`,
        post_snippet: postSnippet.trim() || undefined,
        post_date: 'Active Community Drive',
        is_live_drive: true
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit donation drive. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute pin position within a small preview box
  // Clamp lat to ~0–20°N (rough PH range), lng to ~115–130°E
  const MAP_W = 260;
  const MAP_H = 140;
  const LAT_MIN = 4, LAT_MAX = 22;
  const LNG_MIN = 114, LNG_MAX = 130;
  const pinX = Math.max(0, Math.min(MAP_W, ((longitude - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W));
  const pinY = Math.max(0, Math.min(MAP_H, ((LAT_MAX - latitude) / (LAT_MAX - LAT_MIN)) * MAP_H));
  const isValidCoords = !isNaN(latitude) && !isNaN(longitude);

  return (
    <div
      className="modalScrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ zIndex: 1000 }}
    >
      <div className="modal" style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Share2 style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-display)' }}>
                Share a Donation Drive
              </h3>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Post an active garment collection point or charity drive for the community
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            fontSize: 12,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Drive & Organizer Name */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Drive / Drop-Off Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Silliman Green Apparel Drive"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Organizer / Organization
              </label>
              <input
                type="text"
                placeholder="e.g. Red Cross Negros, Parish, Student Club"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          </div>

          {/* Full Street Address */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Full Location Address *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hibbard Ave, Daro, Dumaguete City (in front of university gym)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Map Pin Coordinates + Visual Preview */}
          <div style={{
            padding: 12,
            background: 'var(--surface-2)',
            borderRadius: 10,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin style={{ width: 13, height: 13, color: 'var(--primary)' }} />
                Map Pin Coordinates
              </span>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="btn btn-g"
                style={{ fontSize: 11, padding: '3px 8px' }}
              >
                <Navigation className="ico" style={{ width: 11, height: 11 }} /> Use My GPS
              </button>
            </div>

            {/* Coordinate inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Latitude</label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  style={{ fontSize: 12, padding: '5px 8px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Longitude</label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  style={{ fontSize: 12, padding: '5px 8px' }}
                />
              </div>
            </div>

            {/* Visual map preview */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: MAP_H,
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'linear-gradient(160deg, #dbeafe 0%, #bfdbfe 40%, #93c5fd 70%, #60a5fa 100%)'
            }}>
              {/* SVG land mass (simplified Philippine silhouette-style blobs) */}
              <svg
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                {[0.25, 0.5, 0.75].map(f => (
                  <React.Fragment key={f}>
                    <line x1={MAP_W * f} y1={0} x2={MAP_W * f} y2={MAP_H} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
                    <line x1={0} y1={MAP_H * f} x2={MAP_W} y2={MAP_H * f} stroke="rgba(255,255,255,0.3)" strokeWidth={0.5} />
                  </React.Fragment>
                ))}
                {/* Simplified land blobs */}
                <ellipse cx={130} cy={70} rx={32} ry={55} fill="rgba(134,239,172,0.55)" />
                <ellipse cx={155} cy={45} rx={20} ry={28} fill="rgba(134,239,172,0.45)" />
                <ellipse cx={108} cy={100} rx={18} ry={22} fill="rgba(134,239,172,0.5)" />
                <ellipse cx={165} cy={88} rx={16} ry={24} fill="rgba(134,239,172,0.4)" />
                <ellipse cx={90} cy={65} rx={14} ry={18} fill="rgba(134,239,172,0.4)" />
                <ellipse cx={142} cy={108} rx={10} ry={14} fill="rgba(134,239,172,0.35)" />
                {/* Corner labels */}
                <text x={4} y={11} fontSize={8} fill="rgba(0,0,0,0.35)">N 22°</text>
                <text x={4} y={MAP_H - 4} fontSize={8} fill="rgba(0,0,0,0.35)">N 4°</text>
                <text x={MAP_W - 28} y={11} fontSize={8} fill="rgba(0,0,0,0.35)">130°E</text>
                <text x={4} y={MAP_H / 2 + 4} fontSize={8} fill="rgba(0,0,0,0.35)">114°E</text>
              </svg>

              {/* Pin marker */}
              {isValidCoords && (
                <div style={{
                  position: 'absolute',
                  left: `${(pinX / MAP_W) * 100}%`,
                  top: `${(pinY / MAP_H) * 100}%`,
                  transform: 'translate(-50%, -100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    background: 'var(--primary, #059669)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    border: '2px solid #fff'
                  }} />
                  <div style={{
                    marginTop: 2,
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    fontSize: 8.5,
                    padding: '1px 4px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap'
                  }}>
                    {latitude.toFixed(3)}, {longitude.toFixed(3)}
                  </div>
                </div>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--text-muted)' }}>
              Adjust coordinates above or use GPS to position the pin on the map.
            </p>
          </div>

          {/* Hours & Accepted Materials */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Operating Hours / Schedule
              </label>
              <input
                type="text"
                placeholder="e.g. Mon-Sat 8:00 AM - 5:00 PM or 24/7 Drop Box"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Accepted Garments & Materials
              </label>
              <input
                type="text"
                placeholder="e.g. Everyday clothes, school uniforms, denim, blankets"
                value={acceptedTypes}
                onChange={(e) => setAcceptedTypes(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          </div>

          {/* Social Media Link / Post Reference */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Announcement / Social Post URL (Facebook, Instagram, or Website)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={postPlatform}
                onChange={(e) => setPostPlatform(e.target.value as any)}
                style={{ width: 120, fontSize: 12, padding: '6px 8px' }}
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="announcement">Announcement</option>
                <option value="community">Community</option>
              </select>
              <input
                type="url"
                placeholder="https://facebook.com/post/... or website link"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                style={{ flex: 1, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Optional Post Snippet */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Callout Snippet or Special Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Please wash clothing before donating. Drop off at main security desk."
              value={postSnippet}
              onChange={(e) => setPostSnippet(e.target.value)}
              style={{ fontSize: 12.5 }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn btn-g"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-p"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publishing...' : 'Publish Donation Drive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
