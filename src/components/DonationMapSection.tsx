import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin,
  InfoWindow, 
  useMap 
} from '@vis.gl/react-google-maps';
import { 
  Search, 
  MapPin, 
  Flag, 
  AlertTriangle, 
  ExternalLink, 
  Navigation, 
  Clock, 
  CheckCircle, 
  Filter,
  X,
  Send,
  Layers,
  RefreshCw,
  Radio,
  Sparkles
} from 'lucide-react';
import { DonationOpportunity, DonationFlagType } from '../types/database';
import { mapsService } from '../services/mapsService';
import { donationScraperService } from '../services/donationScraperService';
import { 
  COUNTRIES, 
  PROVINCES_BY_COUNTRY, 
  CITIES_BY_PROVINCE, 
  getCoordinatesForLocation 
} from '../data/locationDirectory';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface DonationMapProps {
  opportunities: DonationOpportunity[];
  currentUserLocation: { lat: number; lng: number } | null;
  onRefreshData: () => Promise<void>;
  toast: (msg: string) => void;
  highlightId: number | null;
  setHighlightId: (id: number | null) => void;
}

// Controller component to smoothly center on selected opportunity or user location
function MapRecenterHandler({ 
  centerTarget 
}: { 
  centerTarget: { lat: number; lng: number; zoom?: number } | null 
}) {
  const map = useMap();
  useEffect(() => {
    if (map && centerTarget) {
      map.panTo({ lat: centerTarget.lat, lng: centerTarget.lng });
      if (centerTarget.zoom) {
        map.setZoom(centerTarget.zoom);
      }
    }
  }, [map, centerTarget]);
  return null;
}

export const DonationMapSection: React.FC<DonationMapProps> = ({
  opportunities,
  onRefreshData,
  toast,
  highlightId,
  setHighlightId
}) => {
  // Cascading Filter states: Country -> Province -> City
  const [selectedCountry, setSelectedCountry] = useState<string>('Philippines');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | 'all'>('all');
  const [onlyActiveDrives, setOnlyActiveDrives] = useState<boolean>(false);

  // Webscrape state (Strict: ONLY real scraped drives, no hallucinated/seeded data)
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapedDrives, setScrapedDrives] = useState<DonationOpportunity[]>([]);
  const [hasScraped, setHasScraped] = useState<boolean>(false);

  // User location state (6.2 Auto-center using browser geolocation API)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>({
    lat: 12.8797,
    lng: 121.7740,
    zoom: 6
  });

  // Selected opportunity for InfoWindow and Bottom Drawer (6.3)
  const [selectedOpp, setSelectedOpp] = useState<DonationOpportunity | null>(null);

  // Flag Modal state (6.4 Community Flagging)
  const [flagModalOpp, setFlagModalOpp] = useState<DonationOpportunity | null>(null);
  const [flagType, setFlagType] = useState<DonationFlagType>('Inactive');
  const [flagNotes, setFlagNotes] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);

  // Cascading location options
  const availableCountries = COUNTRIES;
  const availableProvinces = useMemo(() => {
    if (selectedCountry === 'all') return [];
    return PROVINCES_BY_COUNTRY[selectedCountry] || [];
  }, [selectedCountry]);

  const availableCities = useMemo(() => {
    if (selectedProvince === 'all') return [];
    return CITIES_BY_PROVINCE[selectedProvince] || [];
  }, [selectedProvince]);

  // Request browser geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(userCoords);
          // If within roughly Metro Manila / Philippines bounds, auto center on user
          if (userCoords.lat >= 4 && userCoords.lat <= 22 && userCoords.lng >= 116 && userCoords.lng <= 128) {
            setMapCenterTarget({ ...userCoords, zoom: 14 });
          }
        },
        () => {
          // Default center remains country overview
        },
        { timeout: 7000, enableHighAccuracy: false }
      );
    }
  }, []);

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      toast('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingUser(false);
        const userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(userCoords);
        setMapCenterTarget({ ...userCoords, zoom: 15 });
        toast('Centered on your location!');
      },
      () => {
        setLocatingUser(false);
        toast('Could not retrieve current location.');
      },
      { timeout: 8000 }
    );
  };

  // Webscrape function for specific filters
  const handleTriggerScrape = useCallback(async (country?: string, province?: string, city?: string) => {
    const c = country !== undefined ? country : selectedCountry;
    const p = province !== undefined ? province : selectedProvince;
    const ct = city !== undefined ? city : selectedCity;

    setIsScraping(true);

    const targetLocationParts = [
      ct && ct !== 'all' ? ct : '',
      p && p !== 'all' ? p : '',
      c && c !== 'all' ? c : ''
    ].filter(Boolean);

    const queryLocation = targetLocationParts.length > 0 
      ? targetLocationParts.join(', ') 
      : (c !== 'all' ? c : 'Philippines');

    try {
      // Recenter map to the selected city or province GPS coordinates
      const coords = await getCoordinatesForLocation(
        c === 'all' ? undefined : c,
        p === 'all' ? undefined : p,
        ct === 'all' ? undefined : ct
      );
      if (coords) {
        setMapCenterTarget({ 
          lat: coords.lat, 
          lng: coords.lng, 
          zoom: ct && ct !== 'all' ? 14 : p && p !== 'all' ? 11 : 6 
        });
      }

      const res = await donationScraperService.scrapeOngoingDrives({
        country: c === 'all' ? undefined : c,
        province: p === 'all' ? undefined : p,
        city: ct === 'all' ? undefined : ct,
        location: queryLocation,
        lat: coords?.lat,
        lng: coords?.lng
      });

      setHasScraped(true);
      if (res.success && res.drives && res.drives.length > 0) {
        setScrapedDrives(res.drives);
        mapsService.setDonationOpportunities(res.drives);
        toast(`Found ${res.drives.length} active donation drive${res.drives.length === 1 ? '' : 's'} in ${queryLocation}!`);
      } else {
        setScrapedDrives([]);
        mapsService.clearDonationOpportunities();
      }
    } catch (err) {
      console.warn('Scraping error:', err);
      setScrapedDrives([]);
      mapsService.clearDonationOpportunities();
    } finally {
      setIsScraping(false);
    }
  }, [selectedCountry, selectedProvince, selectedCity, toast]);

  // Initial webscrape on mount
  useEffect(() => {
    handleTriggerScrape('Philippines', 'all', 'all');
  }, []);

  // Use only scraped opportunities (or empty database)
  const currentOpportunities = hasScraped ? scrapedDrives : opportunities;

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    currentOpportunities.forEach(opp => {
      if (opp.accepted_types) {
        opp.accepted_types.split(',').forEach(item => {
          const clean = item.trim();
          if (clean) catSet.add(clean);
        });
      }
    });
    return Array.from(catSet);
  }, [currentOpportunities]);

  // Compute distance and verify ongoing status (Strict: NO Hallucinated Donations)
  const filteredOpportunities = useMemo(() => {
    return currentOpportunities.map(opp => {
      let dist = opp.distance_km;
      if (userLocation) {
        dist = mapsService.calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          opp.latitude,
          opp.longitude
        );
      }
      return { ...opp, calculatedDist: dist };
    }).filter(opp => {
      // 1. Cascading Location Filters: Country -> Province -> City
      if (selectedCountry !== 'all') {
        const oppCountry = opp.country || 'Philippines';
        if (oppCountry.toLowerCase() !== selectedCountry.toLowerCase()) return false;
      }

      if (selectedProvince !== 'all') {
        if (!opp.province || opp.province.toLowerCase() !== selectedProvince.toLowerCase()) {
          return false;
        }
      }

      if (selectedCity !== 'all') {
        if (!opp.city || opp.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = opp.name.toLowerCase().includes(q);
        const matchesAddr = opp.address.toLowerCase().includes(q);
        const matchesTypes = (opp.accepted_types || '').toLowerCase().includes(q);
        const matchesOrg = (opp.organizer || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAddr && !matchesTypes && !matchesOrg) return false;
      }

      // 4. Category filter
      if (selectedCategory !== 'all') {
        const types = (opp.accepted_types || '').toLowerCase();
        if (!types.includes(selectedCategory.toLowerCase())) return false;
      }

      // 5. Distance filter
      if (maxDistanceKm !== 'all' && typeof opp.calculatedDist === 'number') {
        if (opp.calculatedDist > maxDistanceKm) return false;
      }

      // 6. Live drive toggle
      if (onlyActiveDrives && !opp.is_live_drive) {
        return false;
      }

      return true;
    });
  }, [currentOpportunities, selectedCountry, selectedProvince, selectedCity, searchQuery, selectedCategory, maxDistanceKm, onlyActiveDrives, userLocation]);

  // When location filter changes, automatically center the map if matching ongoing donations exist
  useEffect(() => {
    if (filteredOpportunities.length > 0) {
      const first = filteredOpportunities[0];
      setMapCenterTarget({ lat: first.latitude, lng: first.longitude, zoom: 14 });
    }
  }, [selectedCountry, selectedProvince, selectedCity]);

  // Sync external highlightId with selected opportunity
  useEffect(() => {
    if (highlightId) {
      const match = opportunities.find(o => o.donation_id === highlightId);
      if (match) {
        setSelectedOpp(match);
        setMapCenterTarget({ lat: match.latitude, lng: match.longitude, zoom: 15 });
      }
    }
  }, [highlightId, opportunities]);

  const handleSelectOpp = (opp: DonationOpportunity) => {
    setSelectedOpp(opp);
    setHighlightId(opp.donation_id);
    setMapCenterTarget({ lat: opp.latitude, lng: opp.longitude, zoom: 15 });
  };

  // Submit Community Flag (6.4)
  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalOpp) return;
    setIsSubmittingFlag(true);

    try {
      mapsService.addFlag(flagModalOpp.donation_id, flagType, flagNotes.trim() || undefined);
      toast(`Report submitted for ${flagModalOpp.name}. Thank you for helping keep the map accurate!`);
      setFlagModalOpp(null);
      setFlagNotes('');
      await onRefreshData();
    } catch {
      toast('Failed to submit flag. Please try again.');
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {/* 6.1 Filter Location Section: Cascading Country -> Province -> City, Search, Category */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <div style={{ 
            position: 'relative', 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <Search className="ico" style={{ 
              position: 'absolute', 
              left: 10, 
              color: 'var(--text-muted)', 
              width: 15, 
              height: 15 
            }} />
            <input 
              type="text"
              placeholder="Search verified drop-off centers, items (e.g. jackets, uniforms), or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                paddingLeft: 32, 
                width: '100%', 
                fontSize: 13, 
                margin: 0,
                borderRadius: 8
              }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ 
                  position: 'absolute', 
                  right: 8, 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                ✕
              </button>
            )}
          </div>

          <button 
            type="button"
            className="btn btn-g"
            style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}
            onClick={handleLocateMe}
            disabled={locatingUser}
            title="Center map on my location"
          >
            <Navigation className="ico" style={{ width: 14, height: 14, transform: locatingUser ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
            {locatingUser ? 'Locating...' : 'Near Me'}
          </button>

          <button 
            type="button"
            className="btn btn-p"
            style={{ padding: '7px 14px', fontSize: 12, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => handleTriggerScrape()}
            disabled={isScraping}
            title="Perform live web search for clothing donation drives in the selected area"
          >
            <RefreshCw className="ico" style={{ width: 14, height: 14, animation: isScraping ? 'spin 1s linear infinite' : 'none' }} />
            {isScraping ? 'Scraping...' : 'Scan Area'}
          </button>
        </div>

        {/* Cascading Location Hierarchy: Country -> Province -> City */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
              1. Country
            </label>
            <select 
              value={selectedCountry}
              onChange={(e) => {
                const newC = e.target.value;
                setSelectedCountry(newC);
                setSelectedProvince('all');
                setSelectedCity('all');
                handleTriggerScrape(newC, 'all', 'all');
              }}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
            >
              <option value="all">All Countries</option>
              {availableCountries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
              2. Province / Region
            </label>
            <select 
              value={selectedProvince}
              onChange={(e) => {
                const newP = e.target.value;
                setSelectedProvince(newP);
                setSelectedCity('all');
                handleTriggerScrape(selectedCountry, newP, 'all');
              }}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
            >
              <option value="all">All Provinces / Regions</option>
              {availableProvinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
              3. City / Municipality
            </label>
            <select 
              value={selectedCity}
              onChange={(e) => {
                const newCity = e.target.value;
                setSelectedCity(newCity);
                handleTriggerScrape(selectedCountry, selectedProvince, newCity);
              }}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
            >
              <option value="all">All Cities</option>
              {availableCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
              Accepted Category
            </label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', fontSize: 12, padding: '6px 8px', margin: 0 }}
            >
              <option value="all">All Accepted Items</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
              Maximum Distance
            </label>
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

        {/* Quick filter tags and reset */}
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

          {(searchQuery || selectedCountry !== 'Philippines' || selectedProvince !== 'all' || selectedCity !== 'all' || selectedCategory !== 'all' || maxDistanceKm !== 'all' || onlyActiveDrives) && (
            <button 
              type="button"
              className="btn btn-g"
              style={{ padding: '2px 8px', fontSize: 11, marginLeft: 'auto' }}
              onClick={() => {
                setSelectedCountry('Philippines');
                setSelectedProvince('all');
                setSelectedCity('all');
                setSearchQuery('');
                setSelectedCategory('all');
                setMaxDistanceKm('all');
                setOnlyActiveDrives(false);
                handleTriggerScrape('Philippines', 'all', 'all');
              }}
            >
              Reset filters
            </button>
          )}
        </div>

        {isScraping && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
            <RefreshCw className="ico" style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
            <span>Webscraping active clothing donation drives in <strong>{selectedCity !== 'all' ? selectedCity : selectedProvince !== 'all' ? selectedProvince : selectedCountry !== 'all' ? selectedCountry : 'the selected area'}</strong>...</span>
          </div>
        )}
      </div>

      {/* 6.2 Google Maps Display: Full interactive map rendering DONATION_OPPORTUNITY */}
      <div style={{ position: 'relative', height: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
        {GOOGLE_MAPS_API_KEY ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={{ lat: 14.628, lng: 121.050 }}
              defaultZoom={13}
              mapId="reapparel_donation_map_v1"
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              <MapRecenterHandler centerTarget={mapCenterTarget} />

              {/* User current location blue beacon marker */}
              {userLocation && (
                <AdvancedMarker position={userLocation} title="Your Location">
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 10px rgba(37,99,235,0.7)'
                  }} />
                </AdvancedMarker>
              )}

              {/* 6.2 & 6.5 Render Donation Opportunities with custom pins and warning badges */}
              {filteredOpportunities.map(opp => {
                const hasFlags = (opp.flags_count || 0) > 0 || (opp.flags && opp.flags.length > 0);
                const isSelected = selectedOpp?.donation_id === opp.donation_id;

                return (
                  <AdvancedMarker
                    key={opp.donation_id}
                    position={{ lat: opp.latitude, lng: opp.longitude }}
                    onClick={() => handleSelectOpp(opp)}
                    title={opp.name}
                  >
                    <div style={{ position: 'relative', cursor: 'pointer', transition: 'transform 0.15s' }}>
                      <Pin
                        background={hasFlags ? '#d97706' : '#2E5234'}
                        borderColor={isSelected ? '#ffffff' : '#2A3B2E'}
                        glyphColor="#ffffff"
                        scale={isSelected ? 1.25 : 1.0}
                      />

                      {/* 6.5 Dynamic warning badge directly on map pin if active flags exist */}
                      {hasFlags && (
                        <span 
                          title={`Flagged: ${opp.flags?.[0]?.flag_type || 'Reported'}`}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            background: '#dc2626',
                            color: '#ffffff',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 800,
                            border: '2px solid #ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                          }}
                        >
                          !
                        </span>
                      )}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* 6.3 Donation Opportunity Details InfoWindow on Pin Click */}
              {selectedOpp && (
                <InfoWindow
                  position={{ lat: selectedOpp.latitude, lng: selectedOpp.longitude }}
                  onCloseClick={() => {
                    setSelectedOpp(null);
                    setHighlightId(null);
                  }}
                  maxWidth={320}
                >
                  <div style={{ padding: '4px 6px', color: '#1B2A1D', fontFamily: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <strong style={{ fontSize: 13.5, lineHeight: 1.3, color: '#1B2A1D' }}>
                        {selectedOpp.name}
                      </strong>
                      {(selectedOpp.flags_count || 0) > 0 && (
                        <span style={{ 
                          background: '#fef2f2', 
                          color: '#b91c1c', 
                          fontSize: 10, 
                          fontWeight: 700, 
                          padding: '1px 6px', 
                          borderRadius: 99, 
                          border: '1px solid #f87171',
                          flexShrink: 0
                        }}>
                          ⚠️ Flagged ({selectedOpp.flags_count})
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 11.5, color: '#5A6B57', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
                      <span>{selectedOpp.address}</span>
                    </div>

                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                      Coordinates: {selectedOpp.latitude.toFixed(4)}, {selectedOpp.longitude.toFixed(4)}
                    </div>

                    {selectedOpp.accepted_types && (
                      <div style={{ fontSize: 11.5, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>Accepts: </span>
                        <span>{selectedOpp.accepted_types}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOpp.latitude},${selectedOpp.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ 
                          flex: 1, 
                          textAlign: 'center', 
                          fontSize: 11, 
                          padding: '4px 8px', 
                          background: '#3E6B45', 
                          color: '#ffffff', 
                          borderRadius: 6, 
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        Get Directions
                      </a>
                      <button
                        type="button"
                        onClick={() => setFlagModalOpp(selectedOpp)}
                        style={{ 
                          fontSize: 11, 
                          padding: '4px 8px', 
                          background: '#fef2f2', 
                          color: '#b91c1c', 
                          border: '1px solid #fecaca', 
                          borderRadius: 6, 
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Report / Flag
                      </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 50% 50%, var(--surface-2) 0%, var(--surface) 100%)',
            overflow: 'hidden'
          }}>
            {/* Grid Pattern Background */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
              <defs>
                <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapgrid)" />
            </svg>

            {/* Top Indicator */}
            <div style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'rgba(255, 255, 255, 0.92)',
              color: '#1B2A1D',
              backdropFilter: 'blur(6px)',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              zIndex: 4,
              border: '1px solid rgba(0,0,0,0.08)'
            }}>
              🗺️ Interactive GPS Donation Map ({filteredOpportunities.length} locations)
            </div>

            {/* User Location Beacon */}
            {userLocation && (
              <div 
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3
                }}
                title="Your Current Geolocation"
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#2563eb',
                  border: '3px solid #ffffff',
                  boxShadow: '0 0 12px rgba(37,99,235,0.8)'
                }} />
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '1px 4px', borderRadius: 4, position: 'absolute', top: 18, left: -20, whiteSpace: 'nowrap' }}>
                  You are here
                </span>
              </div>
            )}

            {/* Custom Interactive Pins on GPS Projection */}
            {filteredOpportunities.length === 0 && !isScraping && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'var(--surface)',
                color: 'var(--text)',
                padding: '12px 18px',
                borderRadius: 10,
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                border: '1px solid var(--border)',
                zIndex: 4,
                maxWidth: 290
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <MapPin style={{ width: 14, height: 14, color: '#dc2626' }} />
                  <span>No On-Going Drives</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  No active clothing donation drives found in {selectedCity !== 'all' ? selectedCity : selectedProvince !== 'all' ? selectedProvince : selectedCountry !== 'all' ? selectedCountry : 'this area'}.
                </div>
              </div>
            )}

            {(() => {
              if (filteredOpportunities.length === 0) return null;
              const lats = filteredOpportunities.map(o => o.latitude);
              const lngs = filteredOpportunities.map(o => o.longitude);
              const minLat = Math.min(...lats);
              const maxLat = Math.max(...lats);
              const minLng = Math.min(...lngs);
              const maxLng = Math.max(...lngs);
              const latSpan = maxLat - minLat || 0.05;
              const lngSpan = maxLng - minLng || 0.05;

              return filteredOpportunities.map(opp => {
                const xPct = 12 + (((opp.longitude - minLng) / lngSpan) * 76);
                const yPct = 12 + (((maxLat - opp.latitude) / latSpan) * 76);
                const hasFlags = (opp.flags_count || 0) > 0 || (opp.flags && opp.flags.length > 0);
                const isSelected = selectedOpp?.donation_id === opp.donation_id;

                return (
                  <div
                    key={opp.donation_id}
                    onClick={() => handleSelectOpp(opp)}
                    style={{
                      position: 'absolute',
                      left: `${xPct}%`,
                      top: `${yPct}%`,
                      transform: `translate(-50%, -100%) scale(${isSelected ? 1.25 : 1.0})`,
                      cursor: 'pointer',
                      zIndex: isSelected ? 10 : 2,
                      transition: 'transform 0.15s ease'
                    }}
                    title={`${opp.name} - ${opp.address}`}
                  >
                    <div style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center'
                    }}>
                      {/* Map Pin Bubble */}
                      <div style={{
                        background: hasFlags ? '#d97706' : '#2E5234',
                        color: '#ffffff',
                        padding: '4px 7px',
                        borderRadius: 14,
                        fontSize: 11,
                        fontWeight: 700,
                        border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.2)',
                        boxShadow: '0 3px 8px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <MapPin style={{ width: 12, height: 12 }} />
                        <span style={{ maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opp.name.split(' ')[0]}
                        </span>
                      </div>

                      {/* Pin Pointer */}
                      <div style={{
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: `6px solid ${hasFlags ? '#d97706' : '#2E5234'}`
                      }} />

                      {/* 6.5 Dynamic warning badge directly on map pin if active flags exist */}
                      {hasFlags && (
                        <span style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: '#dc2626',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: 17,
                          height: 17,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 800,
                          border: '2px solid #ffffff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}>
                          !
                        </span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Map Legend Overlay */}
        <div style={{ 
          position: 'absolute', 
          bottom: 10, 
          left: 10, 
          background: 'var(--surface)', 
          padding: '4px 10px', 
          borderRadius: 8, 
          fontSize: 11, 
          display: 'flex', 
          gap: 12, 
          alignItems: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          border: '1px solid var(--border)',
          zIndex: 5
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2E5234', display: 'inline-block' }} />
            Active Drop-off Center
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
            Community Flagged
          </span>
        </div>
      </div>

      {/* 6.3 Donation Opportunity Details: Selected Opportunity Bottom Drawer / Spotlight Card */}
      {selectedOpp && (
        <div className="card" style={{ 
          border: '2px solid var(--primary)', 
          background: 'var(--surface-2)', 
          marginBottom: 14,
          position: 'relative'
        }}>
          <button 
            type="button"
            onClick={() => {
              setSelectedOpp(null);
              setHighlightId(null);
            }}
            style={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-muted)' 
            }}
          >
            ✕
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 16 }}>{selectedOpp.name}</strong>
                {(selectedOpp.flags_count || 0) > 0 ? (
                  <span className="pill" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', fontWeight: 700 }}>
                    ⚠️ {selectedOpp.flags_count} Community Flag{selectedOpp.flags_count === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="pill on">
                    ✓ Verified Active
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin className="ico" style={{ width: 14, height: 14 }} />
                <span>{selectedOpp.address}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>OPERATING HOURS</div>
              <div style={{ fontSize: 12.5, marginTop: 2 }}>{selectedOpp.hours || 'Regular daily access'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ACCEPTED CLOTHING</div>
              <div style={{ fontSize: 12.5, marginTop: 2 }}>{selectedOpp.accepted_types || 'All clean apparel and textiles'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>GEOGRAPHIC COORDINATES</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>
                {selectedOpp.latitude.toFixed(5)}, {selectedOpp.longitude.toFixed(5)}
              </div>
            </div>
            {selectedOpp.organizer && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ORGANIZED BY</div>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>{selectedOpp.organizer}</div>
              </div>
            )}
          </div>

          {/* If flags exist, show flag details */}
          {selectedOpp.flags && selectedOpp.flags.length > 0 && (
            <div className="warn" style={{ marginTop: 12 }}>
              <strong>Community Reports:</strong>
              {selectedOpp.flags.map(f => (
                <div key={f.flag_id} style={{ marginTop: 4, fontSize: 12 }}>
                  &bull; <strong>{f.flag_type}</strong>: {f.notes || 'Reported by community member'} ({new Date(f.flagged_at).toLocaleDateString()})
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOpp.latitude},${selectedOpp.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-p"
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              <Navigation className="ico" style={{ width: 13, height: 13 }} /> Navigate via Google Maps
            </a>
            <button
              type="button"
              className="btn btn-g"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => setFlagModalOpp(selectedOpp)}
            >
              <Flag className="ico" style={{ width: 13, height: 13 }} /> Report Issue
            </button>
          </div>
        </div>
      )}

      {/* Drop-off Centers List / Feed Cards (6.5 dynamic warning badge on location cards) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
        <h3 style={{ margin: 0 }}>Nearby Drop-off Centers &amp; Community Drives ({filteredOpportunities.length})</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click card to center on map</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredOpportunities.map(opp => {
          const isSelected = selectedOpp?.donation_id === opp.donation_id;
          const flagCount = opp.flags ? opp.flags.length : (opp.flags_count || 0);

          return (
            <div
              key={opp.donation_id}
              className={`feedcard ${isSelected ? 'hl' : ''}`}
              onClick={() => handleSelectOpp(opp)}
              style={{ padding: '12px 14px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{opp.name}</strong>
                    {/* 6.5 Dynamic warning badges directly on location cards */}
                    {flagCount > 0 ? (
                      <span className="pill" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', fontWeight: 600 }}>
                        ⚠️ {flagCount} active flag{flagCount === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="pill on" style={{ fontSize: 11 }}>Active Bin</span>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {opp.address}
                  </div>
                </div>

                {typeof opp.calculatedDist === 'number' && (
                  <span className="pill" style={{ flexShrink: 0, fontWeight: 600, fontSize: 11 }}>
                    {opp.calculatedDist} km away
                  </span>
                )}
              </div>

              {opp.accepted_types && (
                <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text)' }}>Accepts: </strong>
                  {opp.accepted_types}
                </div>
              )}

              {opp.post_snippet && (
                <div style={{ fontSize: 12, margin: '6px 0', fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  &ldquo;{opp.post_snippet}&rdquo;
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {opp.organizer ? `Organized by ${opp.organizer}` : 'Community Drop-off'}
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-g"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlagModalOpp(opp);
                    }}
                  >
                    <Flag className="ico" style={{ width: 12, height: 12 }} /> Flag
                  </button>
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ padding: '3px 10px', fontSize: 11 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOpp(opp);
                    }}
                  >
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {isScraping ? (
          <div className="card text-center" style={{ padding: '32px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <RefreshCw style={{ width: 24, height: 24, animation: 'spin 1.2s linear infinite' }} />
            </div>
            <strong style={{ fontSize: 16, display: 'block', color: 'var(--text)', marginBottom: 6 }}>
              Webscraping active clothing donation drives...
            </strong>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 auto', maxWidth: 440, lineHeight: 1.5 }}>
              Searching for live verified textile drop-offs, pre-loved garment collection centers, and disaster relief drives in {selectedCity !== 'all' ? selectedCity : selectedProvince !== 'all' ? selectedProvince : selectedCountry !== 'all' ? selectedCountry : 'this area'}.
            </p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="card text-center" style={{ padding: '32px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <AlertTriangle style={{ width: 24, height: 24 }} />
            </div>
            <strong style={{ fontSize: 16, display: 'block', color: 'var(--text)', marginBottom: 6 }}>
              There are no donations ongoing in {selectedCity !== 'all' ? selectedCity : selectedProvince !== 'all' ? selectedProvince : selectedCountry !== 'all' ? selectedCountry : 'this area'}.
            </strong>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 auto 16px', maxWidth: 480, lineHeight: 1.5 }}>
              Live Webscrape Verification: No active collection bins, garment drop-offs, or donation drives are currently ongoing in this location. We do not generate unverified, hallucinated, or seeded donation locations.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-p"
                style={{ fontSize: 12, padding: '7px 16px' }}
                onClick={() => handleTriggerScrape()}
              >
                <RefreshCw className="ico" style={{ width: 13, height: 13 }} /> Re-scan Area
              </button>
              {(selectedCity !== 'all' || selectedProvince !== 'all') && (
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ fontSize: 12, padding: '7px 16px' }}
                  onClick={() => {
                    setSelectedProvince('all');
                    setSelectedCity('all');
                    handleTriggerScrape(selectedCountry, 'all', 'all');
                  }}
                >
                  Search Whole Country
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* 6.4 Community Flagging Modal */}
      {flagModalOpp && (
        <div 
          className="modalScrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setFlagModalOpp(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Report Donation Location</h3>
              <button 
                type="button" 
                onClick={() => setFlagModalOpp(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Help keep the community informed about <strong>{flagModalOpp.name}</strong>.
            </p>

            <form onSubmit={handleSubmitFlag}>
              <div className="field">
                <label>Report Reason</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '8px 12px', 
                    borderRadius: 8, 
                    border: flagType === 'Inactive' ? '2px solid var(--danger)' : '1px solid var(--border)',
                    background: flagType === 'Inactive' ? 'var(--danger-soft)' : 'var(--surface)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="flagType" 
                      value="Inactive" 
                      checked={flagType === 'Inactive'} 
                      onChange={() => setFlagType('Inactive')} 
                    />
                    <div>
                      <strong style={{ fontSize: 13, display: 'block' }}>Inactive / Removed</strong>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>The collection bin or drive has been removed or is no longer accepting clothes.</span>
                    </div>
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '8px 12px', 
                    borderRadius: 8, 
                    border: flagType === 'Inaccurate' ? '2px solid #d97706' : '1px solid var(--border)',
                    background: flagType === 'Inaccurate' ? 'rgba(217, 119, 6, 0.1)' : 'var(--surface)',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="radio" 
                      name="flagType" 
                      value="Inaccurate" 
                      checked={flagType === 'Inaccurate'} 
                      onChange={() => setFlagType('Inaccurate')} 
                    />
                    <div>
                      <strong style={{ fontSize: 13, display: 'block' }}>Inaccurate Details</strong>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Address, hours, coordinates, or accepted garment types are incorrect.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label>Additional Notes (Optional)</label>
                <textarea 
                  rows={3}
                  placeholder="e.g. Bin was moved behind the church gate; only open until 4pm."
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                  style={{ width: '100%', fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-g"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setFlagModalOpp(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-d"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={isSubmittingFlag}
                >
                  {isSubmittingFlag ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
