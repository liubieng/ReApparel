import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Plus, MapPin } from 'lucide-react';
import { DonationOpportunity, DonationFlagType, User } from '../../shared/types/database';
import { mapsService } from './mapsService';
import {
  COUNTRIES,
  PROVINCES_BY_COUNTRY,
  CITIES_BY_PROVINCE,
  REGIONS,
  BARANGAYS_BY_REGION,
  PRESET_COORDINATES,
  getCoordinatesForLocation
} from './locationDirectory';

import { CascadingFilters } from './CascadingFilters';
import { MapContainer } from './MapContainer';
import { OpportunityDrawer } from './OpportunityDrawer';
import { OpportunityCard } from './OpportunityCard';
import { FlagModal } from './FlagModal';
import { AddDonationModal } from './AddDonationModal';
import { ConfirmModal } from '../../shared/modals/ConfirmModal';

const getCleanSnippet = (snippet?: string): string => {
  if (!snippet) return '';
  return snippet.replace(/\[REAPPAREL_META:[\s\S]*?\]/g, '').trim();
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface DonationMapProps {
  opportunities: DonationOpportunity[];
  currentUserLocation: { lat: number; lng: number } | null;
  onRefreshData: () => Promise<void>;
  toast: (msg: string) => void;
  highlightId: number | null;
  setHighlightId: (id: number | null) => void;
  currentUser?: User | null;
}

export const DonationMapSection: React.FC<DonationMapProps> = ({
  opportunities,
  onRefreshData,
  toast,
  highlightId,
  setHighlightId,
  currentUser
}) => {

  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('Philippines');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | 'all'>('all');
  const [onlyActiveDrives, setOnlyActiveDrives] = useState<boolean>(false);

  const [isAddDriveOpen, setIsAddDriveOpen] = useState<boolean>(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>({
    lat: 12.8797,
    lng: 121.7740,
    zoom: 6
  });

  const [selectedOpp, setSelectedOpp] = useState<DonationOpportunity | null>(null);

  const [flagModalOpp, setFlagModalOpp] = useState<DonationOpportunity | null>(null);

  const [deleteConfirmOpp, setDeleteConfirmOpp] = useState<DonationOpportunity | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const availableRegions = REGIONS;
  const availableBarangays = useMemo(() => {
    if (selectedRegion !== 'all' && BARANGAYS_BY_REGION[selectedRegion]) {
      return BARANGAYS_BY_REGION[selectedRegion];
    }
    const set = new Set<string>();
    Object.values(BARANGAYS_BY_REGION).forEach(list => list.forEach(b => set.add(b)));
    return Array.from(set);
  }, [selectedRegion]);

  const availableCountries = COUNTRIES;
  const availableProvinces = useMemo(() => {
    return selectedCountry === 'all' ? [] : PROVINCES_BY_COUNTRY[selectedCountry] || [];
  }, [selectedCountry]);

  const availableCities = useMemo(() => {
    return selectedProvince === 'all' ? [] : CITIES_BY_PROVINCE[selectedProvince] || [];
  }, [selectedProvince]);

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

  const handleDistanceChange = (dist: number | 'all') => {
    setMaxDistanceKm(dist);
    if (dist !== 'all' && !userLocation && 'geolocation' in navigator) {
      handleLocateMe();
    }
  };

  useEffect(() => {
    if (maxDistanceKm !== 'all') {
      const refCoords = userLocation || { lat: 9.3068, lng: 123.3054 };
      const zoomMap: Record<number, number> = {
        5: 14,
        10: 13,
        25: 11,
        50: 10,
        100: 9
      };
      const zoom = zoomMap[Number(maxDistanceKm)] || 11;
      setMapCenterTarget({
        lat: refCoords.lat,
        lng: refCoords.lng,
        zoom
      });
    }
  }, [maxDistanceKm, userLocation]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.map(opp => {
      let dist = opp.distance_km;
      const refLocation = userLocation || { lat: 9.3068, lng: 123.3054 };
      if (refLocation && typeof opp.latitude === 'number' && typeof opp.longitude === 'number') {
        dist = mapsService.calculateDistanceKm(refLocation.lat, refLocation.lng, opp.latitude, opp.longitude);
      }
      return { ...opp, calculatedDist: dist };
    }).filter(opp => {
      if (opp.name === 'd' || opp.name === 'Test Drive') return false;
      if (selectedRegion !== 'all') {
        const oppRegion = opp.region || 'Central Visayas';
        if (oppRegion.toLowerCase() !== selectedRegion.toLowerCase()) return false;
      }
      if (selectedBarangay !== 'all') {
        const oppBarangay = opp.barangay || '';
        if (oppBarangay.toLowerCase() !== selectedBarangay.toLowerCase()) return false;
      }
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
        const mName = (opp.name || '').toLowerCase().includes(q);
        const mAddr = (opp.address || '').toLowerCase().includes(q);
        const mTypes = (opp.accepted_types || '').toLowerCase().includes(q);
        const mOrg = (opp.organizer || '').toLowerCase().includes(q);
        const mCity = (opp.city || '').toLowerCase().includes(q);
        const mProv = (opp.province || '').toLowerCase().includes(q);
        const mRegion = (opp.region || '').toLowerCase().includes(q);
        const mBarangay = (opp.barangay || '').toLowerCase().includes(q);
        const mCountry = (opp.country || '').toLowerCase().includes(q);
        if (!mName && !mAddr && !mTypes && !mOrg && !mCity && !mProv && !mRegion && !mBarangay && !mCountry) return false;
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

      if (mapsService.isOpportunityExpired(opp)) {
        return false;
      }
      return true;
    });
  }, [opportunities, selectedRegion, selectedBarangay, selectedCountry, selectedProvince, selectedCity, searchQuery, selectedCategory, maxDistanceKm, onlyActiveDrives, userLocation]);

  const facebookPosts = useMemo(() => {
    return filteredOpportunities.filter(o => {
      const url = o.post_url?.trim().toLowerCase() || '';
      const platform = (o.post_platform || '').toLowerCase();
      const isFb = platform === 'facebook' || url.includes('facebook.com') || url.includes('fb.me') || (!platform && !url.includes('instagram'));
      return isFb && (o.is_live_drive || o.post_title || o.post_snippet || url || o.name);
    });
  }, [filteredOpportunities]);

  const instagramPosts = useMemo(() => {
    return filteredOpportunities.filter(o => {
      const url = o.post_url?.trim().toLowerCase() || '';
      const platform = (o.post_platform || '').toLowerCase();
      const isIg = platform === 'instagram' || url.includes('instagram.com');
      return isIg && platform !== 'facebook' && (o.is_live_drive || o.post_title || o.post_snippet || url);
    });
  }, [filteredOpportunities]);

  const otherPosts = useMemo(() => {
    return filteredOpportunities.filter(o => {
      const url = o.post_url?.trim().toLowerCase() || '';
      const platform = (o.post_platform || '').toLowerCase();
      const isFb = platform === 'facebook' || url.includes('facebook.com') || url.includes('fb.me') || (!platform && !url.includes('instagram'));
      const isIg = platform === 'instagram' || url.includes('instagram.com');
      return !isFb && !isIg && (platform === 'announcement' || platform === 'community' || o.post_snippet || url);
    });
  }, [filteredOpportunities]);

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

  const handleAddDriveSubmit = async (data: Omit<DonationOpportunity, 'donation_id'>) => {
    try {
      const created = await mapsService.addDonationOpportunity(data);
      await onRefreshData();
      setSelectedOpp(created);
      setHighlightId(created.donation_id);
      setMapCenterTarget({ lat: created.latitude, lng: created.longitude, zoom: 15 });
      toast(`"${created.name}" posted to the community donation map!`);
    } catch (err: any) {
      console.error('Error posting donation drive:', err);
      toast('Failed to post donation drive. Please try again.');
    }
  };

  const handleDeleteOpportunity = (opp: DonationOpportunity) => {
    const isCreator = Boolean(
      currentUser &&
      opp.created_by &&
      (opp.created_by === currentUser.user_id || opp.created_by === currentUser.email)
    );
    if (!isCreator) {
      toast('You can only delete donation opportunities that you uploaded.');
      return;
    }
    setDeleteConfirmOpp(opp);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmOpp) return;
    setIsDeleting(true);
    try {
      const success = await mapsService.deleteDonationOpportunity(
        deleteConfirmOpp.donation_id,
        currentUser?.user_id
      );
      if (success) {
        toast(`"${deleteConfirmOpp.name}" was successfully removed.`);
        if (selectedOpp?.donation_id === deleteConfirmOpp.donation_id) {
          setSelectedOpp(null);
          setHighlightId(null);
        }
        await onRefreshData();
      } else {
        toast('Failed to delete opportunity. Permission denied or item not found.');
      }
    } catch (err: any) {
      console.error('Error deleting donation opportunity:', err);
      toast(err?.message || 'Failed to delete donation opportunity.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpp(null);
    }
  };

  const selectedLocationLabel = maxDistanceKm !== 'all'
    ? `within ${maxDistanceKm}km of your area`
    : 'your area';

  return (
    <div style={{ marginTop: 8 }}>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
        marginBottom: 16,
        padding: '16px 20px',
        background: 'var(--surface)',
        borderRadius: 14,
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin style={{ width: 20, height: 20, color: 'var(--primary)' }} />
            Community Clothing Donation Drives
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Crowdsourced textile drop-offs, pre-loved garment bins, church collections, and disaster relief drives.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-p"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            padding: '9px 18px',
            fontWeight: 600,
            borderRadius: 8
          }}
          onClick={() => setIsAddDriveOpen(true)}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Post Donation Drive
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 24,
        alignItems: 'start'
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <CascadingFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
            selectedBarangay={selectedBarangay}
            setSelectedBarangay={setSelectedBarangay}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            maxDistanceKm={maxDistanceKm}
            setMaxDistanceKm={handleDistanceChange}
            onlyActiveDrives={onlyActiveDrives}
            setOnlyActiveDrives={setOnlyActiveDrives}
            onLocateMe={handleLocateMe}
            locatingUser={locatingUser}
            userLocation={userLocation}
            availableRegions={availableRegions}
            availableBarangays={availableBarangays}
            availableCountries={availableCountries}
            availableProvinces={availableProvinces}
            availableCities={availableCities}
          />

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
            selectedLocationLabel={selectedLocationLabel}
          />

          <OpportunityDrawer
            opportunity={selectedOpp}
            onClose={() => {
              setSelectedOpp(null);
              setHighlightId(null);
            }}
            onFlag={(opp) => setFlagModalOpp(opp)}
            currentUser={currentUser}
            onDelete={handleDeleteOpportunity}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 4px' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Drop-off Centers &amp; Community Drives ({filteredOpportunities.length})</h3>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Click card to center on map</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredOpportunities.map(opp => (
              <OpportunityCard
                key={opp.donation_id}
                opportunity={opp}
                isSelected={selectedOpp?.donation_id === opp.donation_id}
                onSelect={() => handleSelectOpp(opp)}
                onFlag={() => setFlagModalOpp(opp)}
                currentUser={currentUser}
                onDelete={handleDeleteOpportunity}
              />
            ))}

            {filteredOpportunities.length === 0 && (
              <div className="card text-center" style={{ padding: '36px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(46, 82, 52, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <MapPin style={{ width: 24, height: 24 }} />
                </div>
                <strong style={{ fontSize: 16, display: 'block', color: 'var(--text)', marginBottom: 6 }}>
                  No donation drives found for this area yet
                </strong>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 auto 16px', maxWidth: 480, lineHeight: 1.5 }}>
                  Know of an active church drive, NGO drop-off bin, disaster relief collection, or community clothes pantry in {selectedBarangay !== 'all' ? selectedBarangay : selectedRegion !== 'all' ? selectedRegion : selectedLocationLabel}?
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ fontSize: 12, padding: '7px 16px' }}
                    onClick={() => setIsAddDriveOpen(true)}
                  >
                    <Plus className="ico" style={{ width: 13, height: 13 }} /> Post a Donation Drive
                  </button>
                  {maxDistanceKm !== 'all' && (
                    <button
                      type="button"
                      className="btn btn-g"
                      style={{ fontSize: 12, padding: '7px 16px' }}
                      onClick={() => setMaxDistanceKm('all')}
                    >
                      Show All Distances
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, borderRadius: 14 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
              Social Media Posts
            </h3>

            {facebookPosts.length === 0 && instagramPosts.length === 0 && otherPosts.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  No active social posts
                </p>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Verified community collection callouts and donation posts will appear here when active drives are discovered.
                </p>
              </div>
            ) : (
              <>

                {facebookPosts.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                      Facebook
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {facebookPosts.map(post => (
                        <div
                          key={post.donation_id}
                          style={{
                            padding: 12,
                            background: 'var(--surface-2)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            fontSize: 12
                          }}
                        >
                          <strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4, color: 'var(--text)' }}>
                            {post.organizer || post.name}
                          </strong>
                          {getCleanSnippet(post.post_snippet) && (
                            <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              &ldquo;{getCleanSnippet(post.post_snippet)}&rdquo;
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600 }}>
                              {post.post_date || 'Active Drive'}
                            </span>
                            {post.post_url && (
                              <a
                                href={post.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'underline' }}
                              >
                                View post &rarr;
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {instagramPosts.length > 0 && (
                  <div style={{ marginBottom: otherPosts.length > 0 ? 20 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                      Instagram
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {instagramPosts.map(post => (
                        <div
                          key={post.donation_id}
                          style={{
                            padding: 12,
                            background: 'var(--surface-2)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            fontSize: 12
                          }}
                        >
                          <strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4, color: 'var(--text)' }}>
                            {post.organizer || post.name}
                          </strong>
                          {getCleanSnippet(post.post_snippet) && (
                            <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              &ldquo;{getCleanSnippet(post.post_snippet)}&rdquo;
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600 }}>
                              {post.post_date || 'Active Drive'}
                            </span>
                            {post.post_url && (
                              <a
                                href={post.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'underline' }}
                              >
                                View post &rarr;
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {otherPosts.length > 0 && (
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
                      Other Links
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {otherPosts.map(post => (
                        <div
                          key={post.donation_id}
                          style={{
                            padding: 12,
                            background: 'var(--surface-2)',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            fontSize: 12
                          }}
                        >
                          <strong style={{ display: 'block', fontSize: 12.5, marginBottom: 4, color: 'var(--text)' }}>
                            {post.organizer || post.name}
                          </strong>
                          {getCleanSnippet(post.post_snippet) && (
                            <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              &ldquo;{getCleanSnippet(post.post_snippet)}&rdquo;
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 600 }}>
                              {post.post_date || 'Active Drive'}
                            </span>
                            {post.post_url && (
                              <a
                                href={post.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'underline' }}
                              >
                                View post &rarr;
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

      </div>

      <FlagModal
        opportunity={flagModalOpp}
        isOpen={Boolean(flagModalOpp)}
        onClose={() => setFlagModalOpp(null)}
        onSubmitFlag={handleSubmitFlag}
      />

      <AddDonationModal
        isOpen={isAddDriveOpen}
        onClose={() => setIsAddDriveOpen(false)}
        onSubmit={handleAddDriveSubmit}
        userLocation={userLocation}
        currentUserId={currentUser?.user_id}
      />

      <ConfirmModal
        isOpen={Boolean(deleteConfirmOpp)}
        title="Delete Donation Opportunity"
        message={`Are you sure you want to delete "${deleteConfirmOpp?.name}"? It will be permanently removed from the donation map.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Drive'}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmOpp(null)}
      />
    </div>
  );
};
