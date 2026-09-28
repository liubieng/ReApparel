import React, { useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';
import { DonationOpportunity } from '../../types/database';

function MapRecenterHandler({
  centerTarget
}: {
  centerTarget: { lat: number; lng: number; zoom?: number } | null;
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

interface MapContainerProps {
  apiKey: string;
  opportunities: (DonationOpportunity & { calculatedDist?: number })[];
  selectedOpp: DonationOpportunity | null;
  userLocation: { lat: number; lng: number } | null;
  mapCenterTarget: { lat: number; lng: number; zoom?: number } | null;
  onSelectOpp: (opp: DonationOpportunity) => void;
  onCloseInfoWindow: () => void;
  onFlagOpp: (opp: DonationOpportunity) => void;
  isScraping: boolean;
  selectedLocationLabel: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  apiKey,
  opportunities,
  selectedOpp,
  userLocation,
  mapCenterTarget,
  onSelectOpp,
  onCloseInfoWindow,
  onFlagOpp,
  isScraping,
  selectedLocationLabel
}) => {
  return (
    <div style={{ position: 'relative', height: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 14 }}>
      {apiKey ? (
        <APIProvider apiKey={apiKey}>
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

            {/* Custom pins and warning badges */}
            {opportunities.map(opp => {
              const hasFlags = (opp.flags_count || 0) > 0 || (opp.flags && opp.flags.length > 0);
              const isSelected = selectedOpp?.donation_id === opp.donation_id;

              return (
                <AdvancedMarker
                  key={opp.donation_id}
                  position={{ lat: opp.latitude, lng: opp.longitude }}
                  onClick={() => onSelectOpp(opp)}
                  title={opp.name}
                >
                  <div style={{ position: 'relative', cursor: 'pointer', transition: 'transform 0.15s' }}>
                    <Pin
                      background={hasFlags ? '#d97706' : '#2E5234'}
                      borderColor={isSelected ? '#ffffff' : '#2A3B2E'}
                      glyphColor="#ffffff"
                      scale={isSelected ? 1.25 : 1.0}
                    />

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

            {/* InfoWindow */}
            {selectedOpp && (
              <InfoWindow
                position={{ lat: selectedOpp.latitude, lng: selectedOpp.longitude }}
                onCloseClick={onCloseInfoWindow}
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
                      Directions
                    </a>
                    <button
                      type="button"
                      onClick={() => onFlagOpp(selectedOpp)}
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
                      Report
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      ) : (
        /* Fallback Vector Coordinate Map when API key is not provided */
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 50%, var(--surface-2) 0%, var(--surface) 100%)',
          overflow: 'hidden'
        }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
            <defs>
              <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mapgrid)" />
          </svg>

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
            🗺️ Interactive GPS Donation Map ({opportunities.length} locations)
          </div>

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

          {opportunities.length === 0 && !isScraping && (
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
                No active clothing donation drives found in {selectedLocationLabel}.
              </div>
            </div>
          )}

          {(() => {
            if (opportunities.length === 0) return null;
            const lats = opportunities.map(o => o.latitude);
            const lngs = opportunities.map(o => o.longitude);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const latSpan = maxLat - minLat || 0.05;
            const lngSpan = maxLng - minLng || 0.05;

            return opportunities.map(opp => {
              const xPct = 12 + (((opp.longitude - minLng) / lngSpan) * 76);
              const yPct = 12 + (((maxLat - opp.latitude) / latSpan) * 76);
              const hasFlags = (opp.flags_count || 0) > 0 || (opp.flags && opp.flags.length > 0);
              const isSelected = selectedOpp?.donation_id === opp.donation_id;

              return (
                <div
                  key={opp.donation_id}
                  onClick={() => onSelectOpp(opp)}
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
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

                    <div style={{
                      width: 0,
                      height: 0,
                      borderLeft: '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop: `6px solid ${hasFlags ? '#d97706' : '#2E5234'}`
                    }} />

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
  );
};
