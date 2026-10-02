import React from 'react';
import { Search, Navigation, RefreshCw } from 'lucide-react';

interface CascadingFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedRegion: string;
  setSelectedRegion: (r: string) => void;
  selectedBarangay: string;
  setSelectedBarangay: (b: string) => void;
  selectedCountry: string;
  setSelectedCountry: (c: string) => void;
  selectedProvince: string;
  setSelectedProvince: (p: string) => void;
  selectedCity: string;
  setSelectedCity: (ct: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  maxDistanceKm: number | 'all';
  setMaxDistanceKm: (dist: number | 'all') => void;
  onlyActiveDrives: boolean;
  setOnlyActiveDrives: (val: boolean) => void;
  onLocateMe: () => void;
  locatingUser: boolean;
  availableRegions: string[];
  availableBarangays: string[];
  availableCountries: string[];
  availableProvinces: string[];
  availableCities: string[];
}

export const CascadingFilters: React.FC<CascadingFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedRegion,
  setSelectedRegion,
  selectedBarangay,
  setSelectedBarangay,
  selectedCountry,
  setSelectedCountry,
  selectedProvince,
  setSelectedProvince,
  selectedCity,
  setSelectedCity,
  selectedCategory,
  setSelectedCategory,
  maxDistanceKm,
  setMaxDistanceKm,
  onlyActiveDrives,
  setOnlyActiveDrives,
  onLocateMe,
  locatingUser,
  availableRegions,
  availableBarangays,
  availableCountries,
  availableProvinces,
  availableCities
}) => {
  const isFiltered = Boolean(
    searchQuery ||
    selectedRegion !== 'all' ||
    selectedBarangay !== 'all' ||
    selectedCountry !== 'Philippines' ||
    selectedProvince !== 'all' ||
    selectedCity !== 'all' ||
    selectedCategory !== 'all' ||
    maxDistanceKm !== 'all' ||
    onlyActiveDrives
  );

  const handleReset = () => {
    setSelectedRegion('all');
    setSelectedBarangay('all');
    setSelectedCountry('Philippines');
    setSelectedProvince('all');
    setSelectedCity('all');
    setSearchQuery('');
    setSelectedCategory('all');
    setMaxDistanceKm('all');
    setOnlyActiveDrives(false);
  };

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
      {/* Top Search & Locate Me */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search className="ico" style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', width: 15, height: 15 }} />
          <input
            type="text"
            placeholder="Search verified drop-off centers, items (e.g. jackets, uniforms), or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 32, width: '100%', fontSize: 13, margin: 0, borderRadius: 8 }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-g"
          style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}
          onClick={onLocateMe}
          disabled={locatingUser}
          title="Auto-center map on your device GPS coordinates"
        >
          <Navigation className="ico" style={{ width: 13, height: 13 }} />
          <span>{locatingUser ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

      {/* Cascading Dropdowns: Region -> Barangay -> Country -> Province -> City -> Distance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {/* Region Dropdown (TC_DONATE_01, 02) */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Region</label>
          <select
            value={selectedRegion}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedRegion(val);
              setSelectedBarangay('all');
            }}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
          >
            <option value="all">All Regions</option>
            {availableRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Barangay Dropdown (TC_DONATE_01, 03, 05) */}
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Barangay</label>
          <select
            value={selectedBarangay}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedBarangay(val);
            }}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
          >
            <option value="all">All Barangays</option>
            {availableBarangays.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCountry(val);
              setSelectedProvince('all');
              setSelectedCity('all');
            }}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
          >
            {availableCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Province / Area</label>
          <select
            value={selectedProvince}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProvince(val);
              setSelectedCity('all');
            }}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
          >
            <option value="all">All Provinces</option>
            {availableProvinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>City / Municipality</label>
          <select
            value={selectedCity}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCity(val);
            }}
            disabled={selectedProvince === 'all'}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
          >
            <option value="all">All Cities</option>
            {availableCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Maximum Distance</label>
          <select
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
          >
            <option value="all">Any distance</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
          </select>
        </div>
      </div>

      {/* Quick category tags and reset */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>Quick tags:</span>
        {['Shirts', 'Shoes', 'Jackets', 'Children'].map(cat => {
          const active = selectedCategory.toLowerCase() === cat.toLowerCase();
          return (
            <span
              key={cat}
              className={`pill ${active ? 'on' : ''}`}
              style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}
              onClick={() => setSelectedCategory(active ? 'all' : cat)}
            >
              {cat}
            </span>
          );
        })}
        <span
          className={`pill ${onlyActiveDrives ? 'on' : ''}`}
          style={{ cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}
          onClick={() => setOnlyActiveDrives(!onlyActiveDrives)}
        >
          🔥 Active Live Drives Only
        </span>

        {isFiltered && (
          <button
            type="button"
            className="btn btn-g"
            style={{ padding: '2px 8px', fontSize: 11, marginLeft: 'auto' }}
            onClick={handleReset}
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
};
