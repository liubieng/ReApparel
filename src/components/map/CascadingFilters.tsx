import React from 'react';
import { Search, Navigation, MapPin } from 'lucide-react';

interface CascadingFiltersProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  maxDistanceKm: number | 'all';
  setMaxDistanceKm: (dist: number | 'all') => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onlyActiveDrives: boolean;
  setOnlyActiveDrives: (val: boolean) => void;
  onLocateMe: () => void;
  locatingUser: boolean;
  userLocation?: { lat: number; lng: number } | null;
  // Optional for backward compatibility with callers
  selectedRegion?: string;
  setSelectedRegion?: (r: string) => void;
  selectedBarangay?: string;
  setSelectedBarangay?: (b: string) => void;
  selectedCountry?: string;
  setSelectedCountry?: (c: string) => void;
  selectedProvince?: string;
  setSelectedProvince?: (p: string) => void;
  selectedCity?: string;
  setSelectedCity?: (ct: string) => void;
  availableRegions?: string[];
  availableBarangays?: string[];
  availableCountries?: string[];
  availableProvinces?: string[];
  availableCities?: string[];
}

export const CascadingFilters: React.FC<CascadingFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  maxDistanceKm,
  setMaxDistanceKm,
  selectedCategory,
  setSelectedCategory,
  onlyActiveDrives,
  setOnlyActiveDrives,
  onLocateMe,
  locatingUser,
  userLocation,
  setSelectedRegion,
  setSelectedBarangay,
  setSelectedCountry,
  setSelectedProvince,
  setSelectedCity
}) => {
  const isFiltered = Boolean(
    searchQuery ||
    selectedCategory !== 'all' ||
    maxDistanceKm !== 'all' ||
    onlyActiveDrives
  );

  const handleReset = () => {
    if (setSelectedRegion) setSelectedRegion('all');
    if (setSelectedBarangay) setSelectedBarangay('all');
    if (setSelectedCountry) setSelectedCountry('Philippines');
    if (setSelectedProvince) setSelectedProvince('all');
    if (setSelectedCity) setSelectedCity('all');
    setSearchQuery('');
    setSelectedCategory('all');
    setMaxDistanceKm('all');
    setOnlyActiveDrives(false);
  };

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
      {/* Top Search & Locate Me */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search className="ico" style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', width: 15, height: 15 }} />
          <input
            type="text"
            placeholder="Search drop-off centers, items, cities, or keywords..."
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
          style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={onLocateMe}
          disabled={locatingUser}
          title="Auto-center map on your device GPS coordinates"
        >
          <Navigation className="ico" style={{ width: 13, height: 13 }} />
          <span>{locatingUser ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

      {/* "In My Area" Distance Filter Section */}
      <div style={{
        background: 'var(--surface-muted, rgba(0,0,0,0.02))',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin style={{ width: 15, height: 15, color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>In My Area</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {maxDistanceKm === 'all'
                ? '— Showing all donation drives'
                : `— Showing drives within ${maxDistanceKm} km`}
            </span>
          </div>
          {userLocation ? (
            <span style={{
              fontSize: 11,
              color: 'var(--primary)',
              background: 'rgba(22, 101, 52, 0.08)',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
              Device Location Active
            </span>
          ) : (
            <button
              type="button"
              onClick={onLocateMe}
              disabled={locatingUser}
              style={{
                fontSize: 11,
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
                padding: 0
              }}
            >
              {locatingUser ? 'Acquiring GPS...' : 'Enable GPS location'}
            </button>
          )}
        </div>

        {/* Distance Radius Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'All Locations', value: 'all' },
            { label: 'Within 5 km', value: 5 },
            { label: 'Within 10 km', value: 10 },
            { label: 'Within 25 km', value: 25 },
            { label: 'Within 50 km', value: 50 },
            { label: 'Within 100 km', value: 100 }
          ].map(option => {
            const isSelected = maxDistanceKm === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                className={`btn ${isSelected ? 'btn-p' : 'btn-g'}`}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: 20,
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setMaxDistanceKm(option.value as number | 'all')}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick category tags and reset */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4 }}>
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
