import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Search, 
  Filter, 
  AlertTriangle, 
  Flag, 
  CheckCircle2, 
  Navigation, 
  Clock, 
  Layers, 
  Plus, 
  ExternalLink, 
  Info, 
  X, 
  Compass,
  Globe,
  RefreshCw,
  Sparkles,
  Building2,
  Calendar,
  Radio,
  Trash2,
  Check,
  MapPinOff,
  ChevronDown
} from 'lucide-react';
import { DonationOpportunity, DonationFlag, DonationFlagType } from '../../types/database';
import { mapsService } from '../../services/mapsService';
import { donationScraperService } from '../../services/donationScraperService';
import { 
  COUNTRIES, 
  PROVINCES_BY_COUNTRY, 
  CITIES_BY_PROVINCE, 
  getCoordinatesForLocation 
} from '../../data/locationDirectory';

interface DonationMapViewProps {
  opportunities: DonationOpportunity[];
  onAddFlag: (donationId: number, flagType: DonationFlagType, notes?: string) => void;
  onAddOpportunity?: (opp: Omit<DonationOpportunity, 'donation_id'>) => void;
  onUpdateOpportunities?: (opps: DonationOpportunity[]) => void;
}

export const DonationMapView: React.FC<DonationMapViewProps> = ({
  opportunities,
  onAddFlag,
  onAddOpportunity,
  onUpdateOpportunities
}) => {
  // Location Hierarchy Filters
  const [selectedCountry, setSelectedCountry] = useState<string>('Philippines');
  const [selectedProvince, setSelectedProvince] = useState<string>('Negros Oriental');
  const [selectedCity, setSelectedCity] = useState<string>('Dumaguete City');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<DonationOpportunity | null>(
    opportunities[0] || null
  );
  const [flagFilter, setFlagFilter] = useState<'all' | 'live-drives' | 'verified' | 'flagged'>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<'last30Days' | 'all'>('last30Days');
  
  // User geolocation coordinates (initialized to Dumaguete City, Negros Oriental)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>({
    lat: 9.3068,
    lng: 123.3054
  });
  const [isLocating, setIsLocating] = useState(false);

  // Webscrape state
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeNotice, setScrapeNotice] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Add Location Modal state
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newLocationHours, setNewLocationHours] = useState('Mon-Sun 8:00 AM - 6:00 PM');
  const [newLocationTypes, setNewLocationTypes] = useState('Clean clothing, shoes, beddings, fabric scraps');
  const [newLocationPostUrl, setNewLocationPostUrl] = useState('');
  const [newLocationLat, setNewLocationLat] = useState('9.3068');
  const [newLocationLng, setNewLocationLng] = useState('123.3054');
  const [newLocationCountry, setNewLocationCountry] = useState('Philippines');
  const [newLocationProvince, setNewLocationProvince] = useState('Negros Oriental');
  const [newLocationCity, setNewLocationCity] = useState('Dumaguete City');

  // Flag Modal state
  const [flagModalTarget, setFlagModalTarget] = useState<DonationOpportunity | null>(null);
  const [flagType, setFlagType] = useState<DonationFlagType>('Inaccurate');
  const [flagNotes, setFlagNotes] = useState('');

  // Dropdown options based on selected country and province
  const availableProvinces = useMemo(() => {
    return PROVINCES_BY_COUNTRY[selectedCountry] || ['All Provinces'];
  }, [selectedCountry]);

  const availableCities = useMemo(() => {
    return CITIES_BY_PROVINCE[selectedProvince] || ['All Cities'];
  }, [selectedProvince]);

  // Helper to ensure direct, verified Facebook post links (prioritizes exact permalink where the drive was announced)
  const getSanitizedFacebookSearchUrl = (opp: DonationOpportunity) => {
    if (opp.post_url && opp.post_url.trim()) {
      return opp.post_url.trim();
    }
    if (opp.facebook_search_url && opp.facebook_search_url.trim()) {
      return opp.facebook_search_url.trim();
    }
    const cleanName = opp.organizer || opp.name;
    const query = `${cleanName} clothing donation ${opp.city || ''}`.trim();
    return `https://www.facebook.com/search/posts?q=${encodeURIComponent(query)}`;
  };

  const getSanitizedOfficialUrl = (opp: DonationOpportunity) => {
    if (opp.official_page_url && !opp.official_page_url.includes('/posts/') && !opp.official_page_url.includes('/photos/')) {
      return opp.official_page_url;
    }
    if (opp.source_url && !opp.source_url.includes('/posts/') && !opp.source_url.includes('/photos/')) {
      return opp.source_url;
    }
    return null;
  };

  // Initial load check: purge any stale 2025 drives and run scrape for default location (Dumaguete City)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const hasStaleDrives = opportunities.some(o => 
        (o.post_url && (o.post_url.includes('1427784105372353') || o.post_url.includes('803320922451969') || o.post_url.includes('SPUDPSG') || o.post_url.includes('2025'))) ||
        o.name.toLowerCase().includes('red cross') || 
        o.name.toLowerCase().includes('silliman university') ||
        o.name.toLowerCase().includes('rotary') ||
        o.name.toLowerCase().includes('dswd crisis support') ||
        o.name.toLowerCase().includes('st. catherine of alexandria') ||
        o.name.toLowerCase().includes('little children') ||
        o.name.toLowerCase().includes('bata ng calabnugan') ||
        o.name.toLowerCase().includes('casa esperanza') ||
        o.name.toLowerCase().includes('st. paul') ||
        o.name.toLowerCase().includes('bazinga') ||
        o.name.toLowerCase().includes('bayanihan')
      );

      if (hasStaleDrives) {
        if (onUpdateOpportunities) {
          onUpdateOpportunities([]);
        } else {
          mapsService.clearDonationOpportunities();
        }
        setSelectedOpportunity(null);
      }

      handleFindAndScrapeLocation('Philippines', 'Negros Oriental', 'Dumaguete City');
    }
  }, []);

  // Update country handler
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    const provinces = PROVINCES_BY_COUNTRY[country] || [];
    const firstProv = provinces[0] || '';
    setSelectedProvince(firstProv);
    const cities = CITIES_BY_PROVINCE[firstProv] || [];
    const firstCity = cities[0] || '';
    setSelectedCity(firstCity);
  };

  // Update province handler
  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    const cities = CITIES_BY_PROVINCE[province] || [];
    const firstCity = cities[0] || '';
    setSelectedCity(firstCity);
  };

  // Find donation drives and scrape specifically for the chosen Country, Province, City
  const handleFindAndScrapeLocation = async (
    country?: string,
    province?: string,
    city?: string,
    forceEmpty: boolean = false
  ) => {
    const targetCountry = country || selectedCountry;
    const targetProvince = province || selectedProvince;
    const targetCity = city || selectedCity;

    setIsScraping(true);
    setScrapeNotice(null);

    try {
      // 1. Resolve coordinates for the selected city/province/country
      const coords = await getCoordinatesForLocation(targetCity, targetProvince, targetCountry);
      setUserLocation(coords);

      // Update default modal lat/lng
      setNewLocationLat(coords.lat.toString());
      setNewLocationLng(coords.lng.toString());
      setNewLocationCountry(targetCountry);
      setNewLocationProvince(targetProvince);
      setNewLocationCity(targetCity);

      // 2. Perform location-strict webscrape
      const result = await donationScraperService.scrapeOngoingDrives({
        country: targetCountry,
        province: targetProvince,
        city: targetCity,
        lat: coords.lat,
        lng: coords.lng,
        forceEmpty
      });

      if (result.drives && result.drives.length > 0) {
        // Tag drives with location metadata
        const taggedDrives = result.drives.map(d => ({
          ...d,
          country: targetCountry,
          province: targetProvince,
          city: targetCity
        }));

        if (onUpdateOpportunities) {
          onUpdateOpportunities(taggedDrives);
        } else {
          mapsService.setDonationOpportunities(taggedDrives);
        }
        setSelectedOpportunity(taggedDrives[0]);
        setScrapeNotice({
          text: `Found ${taggedDrives.length} on-going donation drives in ${targetCity}, ${targetProvince}!`,
          type: 'success'
        });
      } else {
        // No donation drives found for this specific location
        if (onUpdateOpportunities) {
          onUpdateOpportunities([]);
        } else {
          mapsService.clearDonationOpportunities();
        }
        setSelectedOpportunity(null);
        setScrapeNotice({
          text: 'No donation drives on-going',
          type: 'warning'
        });
      }
    } catch (err) {
      console.error('Find/Scrape location error:', err);
      setScrapeNotice({
        text: 'No donation drives on-going',
        type: 'warning'
      });
    } finally {
      setIsScraping(false);
    }
  };

  // Clear all to immediately simulate/test zero donations
  const handleClearAllDrives = () => {
    if (onUpdateOpportunities) {
      onUpdateOpportunities([]);
    } else {
      mapsService.clearDonationOpportunities();
    }
    setSelectedOpportunity(null);
    setScrapeNotice({
      text: 'No donation drives on-going',
      type: 'warning'
    });
  };

  // Auto-detect browser geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setIsLocating(false);
        setScrapeNotice({
          text: `GPS centered at ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}.`,
          type: 'info'
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Calculate distances from current center/user location
  const opportunitiesWithDistance = useMemo(() => {
    return opportunities.map(opp => {
      let distance = 0;
      if (userLocation) {
        distance = mapsService.calculateDistanceKm(
          userLocation.lat,
          userLocation.lng,
          opp.latitude,
          opp.longitude
        );
      }
      return { ...opp, distance_km: distance };
    });
  }, [opportunities, userLocation]);

  // Strict location and search filtering
  const filteredOpportunities = useMemo(() => {
    return opportunitiesWithDistance.filter(opp => {
      // Country Filter
      if (selectedCountry && selectedCountry !== 'All' && selectedCountry !== 'Other') {
        const cLower = selectedCountry.toLowerCase();
        const oppCountry = (opp.country || '').toLowerCase();
        const oppAddr = opp.address.toLowerCase();
        if (oppCountry) {
          if (oppCountry !== cLower) return false;
        } else if (!oppAddr.includes(cLower)) {
          if (cLower === 'philippines' && !oppAddr.includes('philippines') && !oppAddr.includes('negros') && !oppAddr.includes('cebu') && !oppAddr.includes('manila')) {
            return false;
          }
          if (cLower === 'united states' && !oppAddr.includes('ca ') && !oppAddr.includes('california') && !oppAddr.includes('usa') && !oppAddr.includes('san francisco')) {
            return false;
          }
        }
      }

      // Province Filter
      if (selectedProvince && selectedProvince !== 'All' && selectedProvince !== 'All Provinces') {
        const pLower = selectedProvince.toLowerCase();
        const oppProvince = (opp.province || '').toLowerCase();
        const oppAddr = opp.address.toLowerCase();
        if (oppProvince) {
          if (!oppProvince.includes(pLower) && !pLower.includes(oppProvince)) return false;
        } else if (!oppAddr.includes(pLower)) {
          return false;
        }
      }

      // City Filter
      if (selectedCity && selectedCity !== 'All' && selectedCity !== 'All Cities') {
        const cityLower = selectedCity.toLowerCase();
        const oppCity = (opp.city || '').toLowerCase();
        const oppAddr = opp.address.toLowerCase();
        if (oppCity) {
          if (!oppCity.includes(cityLower) && !cityLower.includes(oppCity)) return false;
        } else if (!oppAddr.includes(cityLower)) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = opp.name.toLowerCase().includes(q);
        const matchAddr = opp.address.toLowerCase().includes(q);
        const matchTypes = opp.accepted_types?.toLowerCase().includes(q);
        const matchOrg = opp.organizer?.toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchTypes && !matchOrg) return false;
      }

      // Timeframe Filter: Last 30 Days (Active & Ongoing)
      if (timeframeFilter === 'last30Days') {
        if (opp.is_last_30_days === false) return false;
        if (opp.days_ago !== undefined && opp.days_ago > 30) return false;
      }

      // Flag Filter
      const hasFlags = (opp.flags_count || 0) > 0;
      if (flagFilter === 'live-drives' && !opp.is_live_drive) return false;
      if (flagFilter === 'verified' && hasFlags) return false;
      if (flagFilter === 'flagged' && !hasFlags) return false;

      return true;
    }).sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
  }, [opportunitiesWithDistance, searchQuery, flagFilter, timeframeFilter, selectedCountry, selectedProvince, selectedCity]);

  // Keep selectedOpportunity in sync
  useEffect(() => {
    if (filteredOpportunities.length === 0) {
      setSelectedOpportunity(null);
    } else if (!selectedOpportunity || !filteredOpportunities.some(o => o.donation_id === selectedOpportunity.donation_id)) {
      setSelectedOpportunity(filteredOpportunities[0]);
    }
  }, [filteredOpportunities]);

  const handleCreateOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim() || !newLocationAddress.trim()) return;

    const newOpp: Omit<DonationOpportunity, 'donation_id'> = {
      name: newLocationName.trim(),
      address: newLocationAddress.trim(),
      latitude: parseFloat(newLocationLat) || userLocation?.lat || 9.3068,
      longitude: parseFloat(newLocationLng) || userLocation?.lng || 123.3054,
      hours: newLocationHours,
      accepted_types: newLocationTypes,
      post_url: newLocationPostUrl.trim() || undefined,
      source_url: newLocationPostUrl.trim() || undefined,
      post_platform: 'facebook',
      post_title: `${newLocationName.trim()} - Community Donation Announcement`,
      post_date: 'Posted today (Last 30 Days)',
      days_ago: 0,
      active_window: 'Active in the Last 30 Days',
      drive_dates: 'Active: Last 30 Days',
      is_last_30_days: true,
      country: newLocationCountry || selectedCountry,
      province: newLocationProvince || selectedProvince,
      city: newLocationCity || selectedCity
    };

    if (onAddOpportunity) {
      onAddOpportunity(newOpp);
    }

    setIsAddLocationOpen(false);
    setNewLocationName('');
    setNewLocationAddress('');
    setNewLocationPostUrl('');
    setScrapeNotice({
      text: 'New donation center registered in the database!',
      type: 'success'
    });
  };

  const handleSubmitFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalTarget) return;

    onAddFlag(flagModalTarget.donation_id, flagType, flagNotes);
    setFlagModalTarget(null);
    setFlagNotes('');
  };

  // Helper to project lat/lng onto visual map canvas relative to current center
  const getPinPosition = (opp: DonationOpportunity, index: number) => {
    const centerLat = userLocation?.lat || 9.3068;
    const centerLng = userLocation?.lng || 123.3054;

    const deltaLat = opp.latitude - centerLat;
    const deltaLng = opp.longitude - centerLng;

    // Normal coordinate projection
    let posX = 50 + (deltaLng / 0.05) * 35;
    let posY = 50 - (deltaLat / 0.05) * 35;

    if (isNaN(posX) || isNaN(posY) || Math.abs(deltaLat) > 0.4 || Math.abs(deltaLng) > 0.4) {
      const distributed = [
        { x: 34, y: 32 },
        { x: 58, y: 44 },
        { x: 74, y: 28 },
        { x: 42, y: 68 },
        { x: 22, y: 56 },
        { x: 64, y: 62 },
        { x: 48, y: 22 },
        { x: 80, y: 48 },
        { x: 28, y: 78 }
      ];
      const slot = distributed[index % distributed.length];
      posX = slot.x;
      posY = slot.y;
    }

    const clampedX = Math.max(12, Math.min(88, posX));
    const clampedY = Math.max(14, Math.min(84, posY));
    return { left: `${clampedX}%`, top: `${clampedY}%` };
  };

  const liveDrivesCount = filteredOpportunities.filter(o => o.is_live_drive).length;

  return (
    <div className="space-y-6">
      
      {/* Header and Geographic Filters */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-bold font-display text-slate-900">
                Sustainable Textile & Garment Donation Map
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Clothing & textile donation drives happening in the last 30 days with direct links to actual Facebook & announcement posts (SDG 12.5)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => handleFindAndScrapeLocation()}
              disabled={isScraping}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-70"
              title="Scrape and show active on-going donation drives in this specific location"
            >
              <Globe className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
              <span>{isScraping ? 'Scraping Live Drives...' : `Scrape ${selectedCity || 'Location'}`}</span>
            </button>

            <button
              onClick={() => setIsAddLocationOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add Location</span>
            </button>

            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <Compass className={`w-3.5 h-3.5 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'My GPS'}</span>
            </button>

            <button
              onClick={handleClearAllDrives}
              className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium transition cursor-pointer"
              title="Simulate 0 donations: directly tests 'No donation drives on-going'"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* GEOGRAPHIC LOCATION FILTER CONTROLS: COUNTRY, PROVINCE, CITY */}
        {/* ======================================================== */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Location Filters (Country • Province • City):</span>
            </span>
            <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
              📍 {selectedCity}, {selectedProvince}, {selectedCountry}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Country Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Country
              </label>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer"
                >
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Province / State Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Province / State / Region
              </label>
              <div className="relative">
                <select
                  value={selectedProvince}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer"
                >
                  {availableProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* City Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                City / Municipality
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 appearance-none cursor-pointer"
                >
                  {availableCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick Apply Button */}
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Looking for drives in:</span>
              <strong className="text-slate-800 underline decoration-emerald-500 underline-offset-2">
                {selectedCity}, {selectedProvince}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFindAndScrapeLocation()}
                disabled={isScraping}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3 h-3 ${isScraping ? 'animate-spin' : ''}`} />
                <span>Find Drives in {selectedCity}</span>
              </button>

              <button
                onClick={() => handleFindAndScrapeLocation(selectedCountry, selectedProvince, selectedCity, true)}
                disabled={isScraping}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-medium transition cursor-pointer"
                title="Test empty scenario: shows 'No donation drives on-going'"
              >
                Test 0 Drives
              </button>
            </div>
          </div>
        </div>

        {/* Notice alert */}
        {scrapeNotice && (
          <div className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 ${
            scrapeNotice.type === 'success' 
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : scrapeNotice.type === 'warning'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-blue-100 text-blue-900 border border-blue-300'
          }`}>
            <div className="flex items-center gap-2">
              {scrapeNotice.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              )}
              <span className="font-semibold">{scrapeNotice.text}</span>
            </div>
            <button 
              onClick={() => setScrapeNotice(null)}
              className="text-slate-500 hover:text-slate-800 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search bar & sub-filters */}
        <div className="pt-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by center name, street, or accepted garments..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Timeframe Filter Pill */}
            <div className="flex rounded-xl border border-blue-200 p-0.5 bg-blue-50/70 text-xs shrink-0 items-center">
              <button
                onClick={() => setTimeframeFilter('last30Days')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  timeframeFilter === 'last30Days'
                    ? 'bg-[#1877F2] text-white shadow-2xs'
                    : 'text-blue-700 hover:text-blue-900'
                }`}
                title="Filter drives happening or posted within the last 30 days"
              >
                <Calendar className="w-3 h-3" />
                <span>Last 30 Days</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  timeframeFilter === 'last30Days' ? 'bg-white/25 text-white' : 'bg-blue-200/80 text-blue-900'
                }`}>
                  Current
                </span>
              </button>
              <button
                onClick={() => setTimeframeFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer text-xs ${
                  timeframeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Show all records without date restrictions"
              >
                All Dates
              </button>
            </div>

            <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs shrink-0">
              <button
                onClick={() => setFlagFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  flagFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                }`}
              >
                All in {selectedCity} ({filteredOpportunities.length})
              </button>
              <button
                onClick={() => setFlagFilter('live-drives')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                  flagFilter === 'live-drives' ? 'bg-white text-emerald-800 shadow-2xs font-semibold' : 'text-slate-500'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>On-Going ({liveDrivesCount})</span>
              </button>
              <button
                onClick={() => setFlagFilter('verified')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  flagFilter === 'verified' ? 'bg-white text-teal-800 shadow-2xs font-semibold' : 'text-slate-500'
                }`}
              >
                Clean
              </button>
              <button
                onClick={() => setFlagFilter('flagged')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  flagFilter === 'flagged' ? 'bg-white text-amber-800 shadow-2xs font-semibold' : 'text-slate-500'
                }`}
              >
                Flagged
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map View & Details Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Map Display (Lg: 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Map Focus: {selectedCity}, {selectedProvince}</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {filteredOpportunities.length > 0 
                ? `Showing ${filteredOpportunities.length} donation hubs`
                : 'No donation drives on-going'}
            </span>
          </div>

          {/* Interactive Vector Map Canvas */}
          <div className="relative w-full h-[470px] bg-[#E5EDF0] overflow-hidden select-none">
            
            {/* Street Grid Graphic Pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D1DEE3" strokeWidth="1" />
                </pattern>
                <pattern id="majorgrid" width="160" height="160" patternUnits="userSpaceOnUse">
                  <path d="M 160 0 L 0 0 0 160" fill="none" stroke="#B8CBD2" strokeWidth="2.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapgrid)" />
              <rect width="100%" height="100%" fill="url(#majorgrid)" />
              {/* Coastline / Water feature (Simulated Tañon Strait for Negros/Dumaguete or local bay) */}
              <path
                d="M 520 0 Q 420 180 440 320 T 600 480 L 600 0 Z"
                fill="#CBE2EB"
                opacity="0.9"
              />
            </svg>

            {/* City Center Marker */}
            {userLocation && (
              <div 
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: '48%', top: '50%' }}
                title={`Center: ${selectedCity}, ${selectedProvince}`}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/25 animate-ping" />
                  <div className="absolute w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md" />
                </div>
              </div>
            )}

            {/* Custom Interactive Map Pins */}
            {filteredOpportunities.map((opp, idx) => {
              const isSelected = selectedOpportunity?.donation_id === opp.donation_id;
              const hasFlags = (opp.flags_count || 0) > 0;
              const isLive = opp.is_live_drive;
              const pos = getPinPosition(opp, idx);

              return (
                <div
                  key={opp.donation_id}
                  onClick={() => setSelectedOpportunity(opp)}
                  className="absolute z-20 -translate-x-1/2 -translate-y-full cursor-pointer transition transform hover:scale-110 duration-150"
                  style={{ left: pos.left, top: pos.top }}
                >
                  <div className="relative group">
                    {/* Live Drive Pulsing Beacon */}
                    {isLive && (
                      <span className="absolute -inset-1 rounded-2xl bg-emerald-400/50 animate-ping pointer-events-none" />
                    )}

                    {/* Pin Shape */}
                    <div className={`p-2 rounded-2xl shadow-lg border flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 ring-4 ring-emerald-500/30'
                        : hasFlags
                        ? 'bg-amber-500 text-white border-amber-600'
                        : isLive
                        ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-300/60'
                        : 'bg-teal-700 text-white border-teal-800'
                    }`}>
                      <MapPin className="w-5 h-5 fill-current" />
                      
                      {/* Flag warning badge on pin */}
                      {hasFlags && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center border border-white shadow-xs">
                          !
                        </div>
                      )}

                      {/* Live Drive Badge */}
                      {isLive && !hasFlags && (
                        <div className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-emerald-500 text-white text-[8px] font-extrabold flex items-center justify-center border border-white shadow-xs">
                          LIVE
                        </div>
                      )}
                    </div>

                    {/* Pin Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 bg-slate-900/95 text-white text-[11px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-md z-30 flex items-center gap-1.5">
                      {isLive && <Sparkles className="w-3 h-3 text-emerald-400" />}
                      <span>{opp.name}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ======================================================== */}
            {/* EMPTY STATE OVERLAY ON MAP: "No donation drives on-going" */}
            {/* ======================================================== */}
            {filteredOpportunities.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-2xs z-30">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 max-w-sm text-center border border-slate-200 shadow-xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      No donation drives on-going
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      There are currently no active donation drives on-going in {selectedCity}, {selectedProvince}.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => handleFindAndScrapeLocation()}
                      disabled={isScraping}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Globe className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                      <span>{isScraping ? 'Scraping Live Drives...' : `Webscrape ${selectedCity}`}</span>
                    </button>
                    <button
                      onClick={() => setIsAddLocationOpen(true)}
                      className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition"
                    >
                      Add a Drop-off Location in {selectedCity}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Map Legend Floating Pill */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md rounded-xl p-2.5 border border-slate-200 text-[11px] shadow-sm flex flex-wrap items-center gap-3 z-20">
              <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-300" /> ✨ On-Going Drive
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-700" /> Permanent Center
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> ⚠ Flagged
              </span>
              <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> {selectedCity} Center
              </span>
            </div>
          </div>
        </div>

        {/* Details Drawer & Location Cards (Lg: 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {selectedOpportunity ? (
            /* Selected Spot Detailed Drawer */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 font-display">
                      {selectedOpportunity.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedOpportunity.address}</p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {selectedOpportunity.is_live_drive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>On-Going Drive</span>
                    </span>
                  )}

                  {(selectedOpportunity.flags_count || 0) > 0 ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                      <span>{selectedOpportunity.flags_count} Flag(s)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Coordinates, Organizer & Hours */}
              <div className="space-y-2.5 text-xs text-slate-600">
                {selectedOpportunity.organizer && (
                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Organizer: <strong>{selectedOpportunity.organizer}</strong></span>
                  </div>
                )}

                {selectedOpportunity.drive_dates && (
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Drive Schedule: <strong>{selectedOpportunity.active_window || selectedOpportunity.drive_dates}</strong></span>
                    {selectedOpportunity.is_last_30_days && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded ml-auto">
                        Last 30 Days
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Hours: <strong>{selectedOpportunity.hours || 'Standard Hours'}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-500">
                    GPS: {selectedOpportunity.latitude.toFixed(4)}, {selectedOpportunity.longitude.toFixed(4)}
                  </span>
                  {selectedOpportunity.distance_km !== undefined && (
                    <span className="text-emerald-700 font-semibold ml-auto text-[11px]">
                      ~{selectedOpportunity.distance_km} km away
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Accepted Textiles & Materials:
                  </span>
                  <span className="text-slate-800 text-xs font-medium">
                    {selectedOpportunity.accepted_types || 'Clean clothing, shoes, jackets, and textiles'}
                  </span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* VERIFIED COMMUNITY DRIVE & DIRECT FACEBOOK POST */}
              {/* ======================================================== */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                    <span className="w-4.5 h-4.5 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-[10px] shadow-xs">f</span>
                    <span>{selectedOpportunity.post_url ? 'Direct Facebook Post Announcement' : 'Live Facebook Feed & Announcements'}</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-200">
                    {selectedOpportunity.post_url ? 'Verified Direct Post' : (selectedOpportunity.post_date || 'Active Hub')}
                  </span>
                </div>

                {selectedOpportunity.post_title && (
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {selectedOpportunity.post_title}
                  </h4>
                )}

                <div className="text-[11px] text-slate-700 bg-white/95 p-2.5 rounded-lg border border-blue-100 leading-relaxed">
                  {selectedOpportunity.post_snippet ? (
                    <div className="space-y-2">
                      <p className="italic">"{selectedOpportunity.post_snippet}"</p>
                      {selectedOpportunity.post_url && (
                        <a
                          href={selectedOpportunity.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1877F2] hover:text-[#166fe5] hover:underline pt-1 border-t border-blue-100 w-full"
                        >
                          <span>Open original post on Facebook &rarr;</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p>
                      Active textile & garment collection center. Click <strong>View Donation Post</strong> to view public Facebook announcements and community drives from <strong>{selectedOpportunity.organizer || selectedOpportunity.name}</strong>.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] text-blue-700 font-medium">
                    {selectedOpportunity.post_url
                      ? 'Direct permalink to the original donation drive post'
                      : 'Active drop-off hub • Recent updates from online posts'}
                  </span>
                  <a
                    href={getSanitizedFacebookSearchUrl(selectedOpportunity)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#1877F2] hover:text-[#166fe5] hover:underline flex items-center gap-1"
                  >
                    <span>{selectedOpportunity.post_url ? 'Open Direct Post' : 'Search Live Posts'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Community Flags List if present */}
              {selectedOpportunity.flags && selectedOpportunity.flags.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                    <Flag className="w-3 h-3 text-amber-700" />
                    Community Reports:
                  </span>
                  <div className="space-y-1.5">
                    {selectedOpportunity.flags.map(f => (
                      <div key={f.flag_id} className="text-xs text-amber-950 bg-white/70 p-2 rounded-lg border border-amber-100">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-amber-900">
                            Reason: {f.flag_type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            by {f.user_name || 'Community Member'}
                          </span>
                        </div>
                        {f.notes && <p className="text-[11px] text-slate-600 mt-1">"{f.notes}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons: Direct Redirection to Live Facebook Post & Official Portal */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFlagModalTarget(selectedOpportunity)}
                  className="py-2 px-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-xs font-semibold text-slate-700 hover:text-amber-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Report Inactive</span>
                </button>

                {/* Redirects directly to the specific Facebook post where the donation drive was posted */}
                <a
                  href={getSanitizedFacebookSearchUrl(selectedOpportunity)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[140px] py-2 px-3.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  title={selectedOpportunity.post_url ? "Go directly to the specific post where this donation drive was posted from" : "Search Facebook for real live posts and updates about this drive"}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-white text-[#1877F2] flex items-center justify-center font-bold text-[9px]">f</span>
                  <span>{selectedOpportunity.post_url ? 'View Donation Post' : 'Live FB Posts'}</span>
                  <ExternalLink className="w-3 h-3 text-white/90" />
                </a>

                {getSanitizedOfficialUrl(selectedOpportunity) && (
                  <a
                    href={getSanitizedOfficialUrl(selectedOpportunity)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                    title="Visit official organization portal or Facebook page"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>Official Page</span>
                    <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                  </a>
                )}

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOpportunity.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Directions</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
              <p className="text-xs font-semibold text-slate-600">
                {filteredOpportunities.length === 0 ? 'No donation drives on-going' : 'Select a map pin to view full details.'}
              </p>
            </div>
          )}

          {/* List of drop-off spots & EMPTY STATE */}
          {filteredOpportunities.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 font-display">
                  No donation drives on-going
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  There are currently no active donation drives on-going in {selectedCity}, {selectedProvince}. You can launch a real-time webscrape to find live pop-ups or register a local bin.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={() => handleFindAndScrapeLocation()}
                  disabled={isScraping}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Globe className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                  <span>Webscrape {selectedCity}</span>
                </button>
                <button
                  onClick={() => setIsAddLocationOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredOpportunities.map((opp) => {
                const isSelected = selectedOpportunity?.donation_id === opp.donation_id;
                const hasFlags = (opp.flags_count || 0) > 0;
                const isLive = opp.is_live_drive;

                return (
                  <div
                    key={opp.donation_id}
                    onClick={() => setSelectedOpportunity(opp)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-xs text-slate-900 truncate">{opp.name}</h5>
                        {isLive && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            <span>LIVE</span>
                          </span>
                        )}
                        {opp.is_last_30_days && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Last 30 Days
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 truncate block mt-0.5">{opp.address}</span>
                      {opp.organizer && (
                        <span className="text-[10px] text-slate-600 font-medium block truncate mt-0.5">
                          by {opp.organizer}
                        </span>
                      )}
                      {opp.post_date ? (
                        <span className="text-[10px] text-blue-700 font-medium block truncate mt-0.5">
                          📢 {opp.post_date}
                        </span>
                      ) : opp.drive_dates ? (
                        <span className="text-[10px] text-emerald-700 font-medium block truncate mt-0.5">
                          🗓 {opp.drive_dates}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1">
                        {getSanitizedOfficialUrl(opp) && (
                          <a
                            href={getSanitizedOfficialUrl(opp)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] border border-slate-200 cursor-pointer transition"
                            title="Official Organization Page"
                          >
                            <Globe className="w-2.5 h-2.5 text-slate-500" />
                            <span>Org</span>
                          </a>
                        )}

                        <a
                          href={getSanitizedFacebookSearchUrl(opp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-[#1877F2] font-bold text-[10px] border border-blue-200 cursor-pointer transition shadow-2xs"
                          title={opp.post_url ? "Go directly to the donation drive post on Facebook" : "Search live Facebook posts about this drive"}
                        >
                          <span className="w-3 h-3 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-[8px]">f</span>
                          <span>{opp.post_url ? 'View Post' : 'Live Posts'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>

                      {hasFlags ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          ⚠ {opp.flags_count} flag
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Verified Hub
                        </span>
                      )}
                      {opp.distance_km !== undefined && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {opp.distance_km} km
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Add Drop-off Center Modal */}
      {isAddLocationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 font-display flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Add Textile Drop-off Center
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Register a donation bin in {selectedCity}, {selectedProvince}</p>
              </div>
              <button
                onClick={() => setIsAddLocationOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location / Facility Name *
                </label>
                <input
                  type="text"
                  required
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g. Little Children of the Philippines Drop Box"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                  placeholder="e.g. Claytown, Daro, Dumaguete City, Negros Oriental"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={newLocationCountry}
                    onChange={(e) => setNewLocationCountry(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Province
                  </label>
                  <input
                    type="text"
                    value={newLocationProvince}
                    onChange={(e) => setNewLocationProvince(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newLocationCity}
                    onChange={(e) => setNewLocationCity(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={newLocationLat}
                    onChange={(e) => setNewLocationLat(e.target.value)}
                    placeholder="9.3068"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={newLocationLng}
                    onChange={(e) => setNewLocationLng(e.target.value)}
                    placeholder="123.3054"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={newLocationHours}
                  onChange={(e) => setNewLocationHours(e.target.value)}
                  placeholder="e.g. 24/7 Drop Box or Mon-Fri 8AM-5PM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accepted Materials
                </label>
                <input
                  type="text"
                  value={newLocationTypes}
                  onChange={(e) => setNewLocationTypes(e.target.value)}
                  placeholder="e.g. Clean shirts, jackets, shoes, fabric scraps"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Drive Post / Facebook Announcement Link (Optional)</span>
                  <span className="text-[10px] text-blue-600 font-normal">Direct post URL</span>
                </label>
                <input
                  type="url"
                  value={newLocationPostUrl}
                  onChange={(e) => setNewLocationPostUrl(e.target.value)}
                  placeholder="e.g. https://www.facebook.com/.../posts/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLocationOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Drop-off Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag / Inaccurate Modal */}
      {flagModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-amber-600" />
                Report Center Issue
              </h3>
              <button
                onClick={() => setFlagModalTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFlag} className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                Reporting: <strong className="text-slate-900">{flagModalTarget.name}</strong>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Type
                </label>
                <select
                  value={flagType}
                  onChange={(e) => setFlagType(e.target.value as DonationFlagType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="Inactive">Bin Removed / Inactive Location</option>
                  <option value="Inaccurate">Inaccurate Address or Operating Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Community Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={flagNotes}
                  onChange={(e) => setFlagNotes(e.target.value)}
                  placeholder="e.g. Bin is locked or overflowing..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFlagModalTarget(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
