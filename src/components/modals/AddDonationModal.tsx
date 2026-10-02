import React, { useState } from 'react';
import { DonationOpportunity } from '../../types/database';
import { 
  REGIONS, 
  BARANGAYS_BY_REGION, 
  COUNTRIES, 
  PROVINCES_BY_COUNTRY, 
  CITIES_BY_PROVINCE, 
  PRESET_COORDINATES, 
  getCoordinatesForLocation 
} from '../../data/locationDirectory';
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
  const [country, setCountry] = useState('Philippines');
  const [region, setRegion] = useState('Central Visayas');
  const [province, setProvince] = useState('Negros Oriental');
  const [city, setCity] = useState('Dumaguete City');
  const [barangay, setBarangay] = useState('Daro');
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

  const handleCountryChange = (c: string) => {
    setCountry(c);
    const provs = PROVINCES_BY_COUNTRY[c] || [];
    const firstProv = provs[0] || '';
    setProvince(firstProv);
    const cities = CITIES_BY_PROVINCE[firstProv] || [];
    setCity(cities[0] || '');
    updateCoords(c, firstProv, cities[0] || '');
  };

  const handleProvinceChange = (p: string) => {
    setProvince(p);
    const cities = CITIES_BY_PROVINCE[p] || [];
    const firstCity = cities[0] || '';
    setCity(firstCity);
    updateCoords(country, p, firstCity);
  };

  const handleCityChange = (ct: string) => {
    setCity(ct);
    updateCoords(country, province, ct);
  };

  const handleRegionChange = (r: string) => {
    setRegion(r);
    const brgys = BARANGAYS_BY_REGION[r] || [];
    setBarangay(brgys[0] || '');
    if (PRESET_COORDINATES[r]) {
      setLatitude(PRESET_COORDINATES[r].lat);
      setLongitude(PRESET_COORDINATES[r].lng);
    }
  };

  const handleBarangayChange = (b: string) => {
    setBarangay(b);
    if (PRESET_COORDINATES[b]) {
      setLatitude(PRESET_COORDINATES[b].lat);
      setLongitude(PRESET_COORDINATES[b].lng);
    }
  };

  const updateCoords = async (c: string, p: string, ct: string) => {
    try {
      const coords = await getCoordinatesForLocation(c, p, ct);
      if (coords) {
        setLatitude(coords.lat);
        setLongitude(coords.lng);
      }
    } catch {}
  };

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
        country,
        region,
        province,
        city,
        barangay,
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

  const availableProvinces = PROVINCES_BY_COUNTRY[country] || [];
  const availableCities = CITIES_BY_PROVINCE[province] || [];
  const availableBarangays = BARANGAYS_BY_REGION[region] || [];

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

          {/* Cascading Area Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Region</label>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value)}
                style={{ fontSize: 12, padding: '6px 8px' }}
              >
                {REGIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Barangay</label>
              <select
                value={barangay}
                onChange={(e) => handleBarangayChange(e.target.value)}
                style={{ fontSize: 12, padding: '6px 8px' }}
              >
                {availableBarangays.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Country</label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                style={{ fontSize: 12, padding: '6px 8px' }}
              >
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Province</label>
              <select
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                style={{ fontSize: 12, padding: '6px 8px' }}
              >
                {availableProvinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>City</label>
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                style={{ fontSize: 12, padding: '6px 8px' }}
              >
                {availableCities.map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Coordinates & Auto-Detect */}
          <div style={{
            padding: 10,
            background: 'var(--surface-2)',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>
                Map Pin Coordinates (Lat, Lng)
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
