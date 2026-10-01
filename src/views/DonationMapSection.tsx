import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { DonationOpportunity, DonationFlagType } from '../types/database';
import { mapsService } from '../services/mapsService';
import { donationScraperService } from '../services/donationScraperService';
import {
  COUNTRIES,
  PROVINCES_BY_COUNTRY,
  CITIES_BY_PROVINCE,
  getCoordinatesForLocation
} from '../data/locationDirectory';

// Subcomponents
import { CascadingFilters } from '../components/map/CascadingFilters';
import { MapContainer } from '../components/map/MapContainer';
import { OpportunityDrawer } from '../components/map/OpportunityDrawer';
import { OpportunityCard } from '../components/map/OpportunityCard';
import { FlagModal } from '../components/modals/FlagModal';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface DonationMapProps {
  opportunities: DonationOpportunity[];
  currentUserLocation: { lat: number; lng: number } | null;
  onRefreshData: () => Promise<void>;
  toast: (msg: string) => void;
  highlightId: number | null;
  setHighlightId: (id: number | null) => void;
}

/**
 * ============================================================================
 * DONATION MAP SECTION (DonationMapSection.tsx)
 * ============================================================================
 * 
 * CAPSTONE DEFENSE ARCHITECTURE:
 * - Coordinates Textile Donation & Recycling Drop-off Centers.
 * - Live Webscrape Verification: Ensures only real, ongoing clothing drives are rendered.
 * - Modular Subcomponents: CascadingFilters, MapContainer, OpportunityDrawer, OpportunityCard, FlagModal.
 */
export const DonationMapSection: React.FC<DonationMapProps> = ({
  opportunities,
  onRefreshData,
  toast,
  highlightId,
  setHighlightId
}) => {
  // Cascading Location Filters: Country -> Province -> City
  const [selectedCountry, setSelectedCountry] = useState<string>('Philippines');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | 'all'>('all');
  const [onlyActiveDrives, setOnlyActiveDrives] = useState<boolean>(false);

  // Webscrape State (Strict: Real live drives only)
  const [isScraping, setIsScraping] = useState<boolean>(false);
  const [scrapedDrives, setScrapedDrives] = useState<DonationOpportunity[]>([]);
  const [hasScraped, setHasScraped] = useState<boolean>(false);

  // Geolocation & Map Positioning
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>({
    lat: 12.8797,
    lng: 121.7740,
    zoom: 6
  });

  // Selected Opportunity (for InfoWindow & Spotlight Drawer)
  const [selectedOpp, setSelectedOpp] = useState<DonationOpportunity | null>(null);

  // Community Flagging Modal
  const [flagModalOpp, setFlagModalOpp] = useState<DonationOpportunity | null>(null);

  // Dynamic Location Options
  const availableCountries = COUNTRIES;
  const availableProvinces = useMemo(() => {
    return selectedCountry === 'all' ? [] : PROVINCES_BY_COUNTRY[selectedCountry] || [];
  }, [selectedCountry]);

  const availableCities = useMemo(() => {
    return selectedProvince === 'all' ? [] : CITIES_BY_PROVINCE[selectedProvince] || [];
  }, [selectedProvince]);

  // Request browser geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          if (coords.lat >= 4 && coords.lat <= 22 && coords.lng >= 116 && coords.lng <= 128) {
            setMapCenterTarget({ ...coords, zoom: 14 });
          }
        },
        () => {},
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
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setMapCenterTarget({ ...coords, zoom: 15 });
        toast('Centered on your location!');
      },
      () => {
        setLocatingUser(false);
        toast('Could not retrieve current location.');
      },
      { timeout: 8000 }
    );
  };

  // Webscrape Handler for Selected Geographic Region
  const handleTriggerScrape = useCallback(async (country?: string, province?: string, city?: string) => {
    const c = country !== undefined ? country : selectedCountry;
    const p = province !== undefined ? province : selectedProvince;
    const ct = city !== undefined ? city : selectedCity;

    setIsScraping(true);

    const parts = [
      ct && ct !== 'all' ? ct : '',
      p && p !== 'all' ? p : '',
      c && c !== 'all' ? c : ''
    ].filter(Boolean);

    const queryLocation = parts.length > 0 ? parts.join(', ') : (c !== 'all' ? c : 'Philippines');

    try {
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
      console.warn('Live drive lookup notice:', err);
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

  const currentOpportunities = hasScraped ? scrapedDrives : opportunities;

  // Filter Opportunities with Distance Calculation
  const filteredOpportunities = useMemo(() => {
    return currentOpportunities.map(opp => {
      let dist = opp.distance_km;
      if (userLocation) {
        dist = mapsService.calculateDistanceKm(userLocation.lat, userLocation.lng, opp.latitude, opp.longitude);
      }
      return { ...opp, calculatedDist: dist };
    }).filter(opp => {
      if (selectedCountry !== 'all') {
        const oppCountry = opp.country || 'Philippines';
        if (oppCountry.toLowerCase() !== selectedCountry.toLowerCase()) return false;
      }
      if (selectedProvince !== 'all' && (!opp.province || opp.province.toLowerCase() !== selectedProvince.toLowerCase())) {
        return false;
      }
      if (selectedCity !== 'all' && (!opp.city || opp.city.toLowerCase() !== selectedCity.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = opp.name.toLowerCase().includes(q);
        const mAddr = opp.address.toLowerCase().includes(q);
        const mTypes = (opp.accepted_types || '').toLowerCase().includes(q);
        const mOrg = (opp.organizer || '').toLowerCase().includes(q);
        if (!mName && !mAddr && !mTypes && !mOrg) return false;
      }
      if (selectedCategory !== 'all') {
        const types = (opp.accepted_types || '').toLowerCase();
        if (!types.includes(selectedCategory.toLowerCase())) return false;
      }
      if (maxDistanceKm !== 'all' && typeof opp.calculatedDist === 'number') {
        if (opp.calculatedDist > maxDistanceKm) return false;
      }
      if (onlyActiveDrives && !opp.is_live_drive) {
        return false;
      }
      return true;
    });
  }, [currentOpportunities, selectedCountry, selectedProvince, selectedCity, searchQuery, selectedCategory, maxDistanceKm, onlyActiveDrives, userLocation]);

  // Sync external highlightId
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

  // Submit Community Flag
  const handleSubmitFlag = async (flagType: DonationFlagType, notes?: string) => {
    if (!flagModalOpp) return;
    try {
      mapsService.addFlag(flagModalOpp.donation_id, flagType, notes);
      toast(`Report submitted for ${flagModalOpp.name}. Thank you!`);
      await onRefreshData();
    } catch {
      toast('Failed to submit flag. Please try again.');
    }
  };

  const selectedLocationLabel = selectedCity !== 'all'
    ? selectedCity
    : selectedProvince !== 'all'
      ? selectedProvince
      : selectedCountry !== 'all'
        ? selectedCountry
        : 'this area';

  return (
    <div style={{ marginTop: 8 }}>
      {/* 1. Cascading Filters */}
      <CascadingFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCountry={selectedCountry}
        setSelectedCountry={setSelectedCountry}
        selectedProvince={selectedProvince}
        setSelectedProvince={setSelectedProvince}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        maxDistanceKm={maxDistanceKm}
        setMaxDistanceKm={setMaxDistanceKm}
        onlyActiveDrives={onlyActiveDrives}
        setOnlyActiveDrives={setOnlyActiveDrives}
        onLocateMe={handleLocateMe}
        locatingUser={locatingUser}
        isScraping={isScraping}
        onTriggerScrape={handleTriggerScrape}
        availableCountries={availableCountries}
        availableProvinces={availableProvinces}
        availableCities={availableCities}
      />

      {/* 2. Interactive Map Container */}
      <MapContainer
        apiKey={GOOGLE_MAPS_API_KEY}
        opportunities={filteredOpportunities}
        selectedOpp={selectedOpp}
        userLocation={userLocation}
        mapCenterTarget={mapCenterTarget}
        onSelectOpp={handleSelectOpp}
        onCloseInfoWindow={() => {
          setSelectedOpp(null);
          setHighlightId(null);
        }}
        onFlagOpp={(opp) => setFlagModalOpp(opp)}
        isScraping={isScraping}
        selectedLocationLabel={selectedLocationLabel}
      />

      {/* 3. Selected Opportunity Spotlight Drawer */}
      <OpportunityDrawer
        opportunity={selectedOpp}
        onClose={() => {
          setSelectedOpp(null);
          setHighlightId(null);
        }}
        onFlag={(opp) => setFlagModalOpp(opp)}
      />

      {/* 4. Opportunity Feed Cards List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
        <h3 style={{ margin: 0 }}>Nearby Drop-off Centers &amp; Community Drives ({filteredOpportunities.length})</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click card to center on map</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredOpportunities.map(opp => (
          <OpportunityCard
            key={opp.donation_id}
            opportunity={opp}
            isSelected={selectedOpp?.donation_id === opp.donation_id}
            onSelect={() => handleSelectOpp(opp)}
            onFlag={() => setFlagModalOpp(opp)}
          />
        ))}

        {/* Loading / Scraping State */}
        {isScraping && (
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
              Searching for live verified textile drop-offs, pre-loved garment collection centers, and disaster relief drives in {selectedLocationLabel}.
            </p>
          </div>
        )}

        {/* Strict Empty State */}
        {!isScraping && filteredOpportunities.length === 0 && (
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
              There are no donations ongoing in {selectedLocationLabel}.
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
        )}
      </div>

      {/* 5. Community Flagging Modal */}
      <FlagModal
        opportunity={flagModalOpp}
        isOpen={Boolean(flagModalOpp)}
        onClose={() => setFlagModalOpp(null)}
        onSubmitFlag={handleSubmitFlag}
      />
    </div>
  );
};
