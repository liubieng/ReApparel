import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DonationOpportunity } from '../../types/database';
import { MapPin, Navigation, Share2, X, AlertCircle } from 'lucide-react';

const customLeafletPinIcon = typeof window !== 'undefined' ? L.divIcon({
  className: 'reapparel-leaflet-pin',
  html: `
    <div style="
      position: relative;
      width: 30px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
    ">
      <svg width="30" height="38" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#2E5234" stroke="#ffffff" stroke-width="1.8"/>
        <circle cx="12" cy="11" r="4.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
  tooltipAnchor: [0, -38]
}) : undefined as any;

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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Mount Leaflet Map with real OpenStreetMap tiles when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      const initialLat = (!isNaN(latitude) && latitude !== 0) ? latitude : (userLocation?.lat || 9.317);
      const initialLng = (!isNaN(longitude) && longitude !== 0) ? longitude : (userLocation?.lng || 123.303);

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        icon: customLeafletPinIcon,
        draggable: true
      }).addTo(map);

      marker.bindTooltip('Drag or click map to move', {
        direction: 'top',
        offset: [0, -32]
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLatitude(Number(pos.lat.toFixed(5)));
        setLongitude(Number(pos.lng.toFixed(5)));
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setLatitude(Number(e.latlng.lat.toFixed(5)));
        setLongitude(Number(e.latlng.lng.toFixed(5)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      map.invalidateSize();
    }, 60);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  // Sync marker position when lat/lng inputs change
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current && !isNaN(latitude) && !isNaN(longitude)) {
      const cur = markerRef.current.getLatLng();
      if (Math.abs(cur.lat - latitude) > 0.0001 || Math.abs(cur.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.panTo([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  const handleUseCurrentLocation = () => {
    if (userLocation) {
      const lat = Number(userLocation.lat.toFixed(5));
      const lng = Number(userLocation.lng.toFixed(5));
      setLatitude(lat);
      setLongitude(lng);
      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], 15);
      }
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setLatitude(lat);
          setLongitude(lng);
          if (markerRef.current && mapInstanceRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            mapInstanceRef.current.setView([lat, lng], 15);
          }
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
      const addrLower = address.toLowerCase();
      let detectedBarangay = 'Daro';
      if (addrLower.includes('bantayan')) detectedBarangay = 'Bantayan';
      else if (addrLower.includes('mangnao')) detectedBarangay = 'Mangnao';
      else if (addrLower.includes('piapi')) detectedBarangay = 'Piapi';
      else if (addrLower.includes('taclobo')) detectedBarangay = 'Taclobo';
      else if (addrLower.includes('calindagan')) detectedBarangay = 'Calindagan';
      else if (addrLower.includes('bagacay')) detectedBarangay = 'Bagacay';
      else if (addrLower.includes('daro')) detectedBarangay = 'Daro';

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
        is_live_drive: true,
        country: 'Philippines',
        region: 'Central Visayas',
        province: 'Negros Oriental',
        city: 'Dumaguete City',
        barangay: detectedBarangay
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit donation drive. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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

            {/* Real Interactive OpenStreetMap (Identical to main page) */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: 240,
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              isolation: 'isolate'
            }}>
              <div
                ref={mapContainerRef}
                style={{
                  width: '100%',
                  height: '100%',
                  zIndex: 1
                }}
              />

              {/* Instructions banner on map */}
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(4px)',
                color: '#1B2A1D',
                fontSize: 10.5,
                padding: '3px 10px',
                borderRadius: 20,
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                zIndex: 400
              }}>
                <MapPin style={{ width: 11, height: 11, color: '#2E5234' }} />
                <span>Click map or drag pin to place</span>
              </div>
            </div>

            {/* Quick Pin Presets & Instructions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 10.5, color: 'var(--text-muted)' }}>
                Click or drag on the map to position the pin, or choose a quick city:
              </p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { name: 'Dumaguete', lat: 9.317, lng: 123.303 },
                  { name: 'Cebu City', lat: 10.316, lng: 123.885 },
                  { name: 'Manila', lat: 14.599, lng: 120.984 },
                  { name: 'Davao', lat: 7.190, lng: 125.455 }
                ].map(loc => (
                  <button
                    key={loc.name}
                    type="button"
                    className="btn btn-g"
                    style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10 }}
                    onClick={() => {
                      setLatitude(loc.lat);
                      setLongitude(loc.lng);
                      if (markerRef.current && mapInstanceRef.current) {
                        markerRef.current.setLatLng([loc.lat, loc.lng]);
                        mapInstanceRef.current.setView([loc.lat, loc.lng], 14);
                      }
                    }}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>
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
              Announcement / Social Post URL (Optional - leave blank if none)
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
