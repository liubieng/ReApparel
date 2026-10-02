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
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedOpp.address)}&destination_place_id=&travelmode=driving&dir_action=navigate`}
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
        /* Fallback: Real OpenStreetMap iframe when no Google Maps API key */
        (() => {
          const pins = opportunities;
          let centerLat = 12.8797;
          let centerLng = 121.7740;
          let zoom = 6;

          if (pins.length === 1) {
            centerLat = pins[0].latitude;
            centerLng = pins[0].longitude;
            zoom = 15;
          } else if (pins.length > 1) {
            const avgLat = pins.reduce((s, o) => s + o.latitude, 0) / pins.length;
            const avgLng = pins.reduce((s, o) => s + o.longitude, 0) / pins.length;
            centerLat = avgLat;
            centerLng = avgLng;
            zoom = 12;
          } else if (userLocation) {
            centerLat = userLocation.lat;
            centerLng = userLocation.lng;
            zoom = 14;
          }

          // Build OSM embed URL — markers are shown via the marker= param (first one only supported natively)
          // For multiple pins we show a bounding-box view with the first pin marked
          const firstPin = pins[0];
          const markerParam = firstPin
            ? `&marker=${firstPin.latitude}%2C${firstPin.longitude}`
            : '';

          const osmSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.05}%2C${centerLat - 0.04}%2C${centerLng + 0.05}%2C${centerLat + 0.04}&layer=mapnik${markerParam}`;

          return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <iframe
                title="Donation Map"
                src={osmSrc}
                style={{ width: '100%', height: '100%', border: 'none' }}
                loading="lazy"
                allowFullScreen
              />

              {/* Overlay pin buttons so users can click into OSM for each location */}
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                zIndex: 5,
                maxHeight: 'calc(100% - 16px)',
                overflowY: 'auto'
              }}>
                {pins.map(opp => {
                  const isSelected = selectedOpp?.donation_id === opp.donation_id;
                  const hasFlags = (opp.flags_count || 0) > 0 || (opp.flags && opp.flags.length > 0);
                  return (
                    <button
                      key={opp.donation_id}
                      onClick={() => onSelectOpp(opp)}
                      title={`${opp.name} — ${opp.address}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 8px',
                        fontSize: 10.5,
                        fontWeight: 700,
                        background: isSelected ? '#2E5234' : 'rgba(255,255,255,0.93)',
                        color: isSelected ? '#ffffff' : (hasFlags ? '#d97706' : '#1B2A1D'),
                        border: isSelected ? '2px solid #2E5234' : '1px solid rgba(0,0,0,0.15)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                        maxWidth: 160,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{opp.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Info overlay when a pin is selected */}
              {selectedOpp && (
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  background: 'rgba(255,255,255,0.96)',
                  backdropFilter: 'blur(6px)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  zIndex: 6,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 12.5, display: 'block', color: '#1B2A1D', marginBottom: 2 }}>{selectedOpp.name}</strong>
                    <div style={{ fontSize: 11, color: '#5A6B57', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <MapPin style={{ width: 11, height: 11, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedOpp.address}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOpp.address + ', ' + (selectedOpp.city || '') + ', ' + (selectedOpp.province || ''))}&query_place_id=`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 10.5, padding: '3px 8px', background: '#3E6B45', color: '#ffffff', borderRadius: 5, textDecoration: 'none', fontWeight: 600 }}
                      >
                        Directions
                      </a>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${selectedOpp.latitude}&mlon=${selectedOpp.longitude}#map=17/${selectedOpp.latitude}/${selectedOpp.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 10.5, padding: '3px 8px', background: '#0078a8', color: '#ffffff', borderRadius: 5, textDecoration: 'none', fontWeight: 600 }}
                      >
                        Open in OSM
                      </a>
                      <button
                        type="button"
                        onClick={() => onFlagOpp(selectedOpp)}
                        style={{ fontSize: 10.5, padding: '3px 8px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Report
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseInfoWindow}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: 0, flexShrink: 0 }}
                  >✕</button>
                </div>
              )}

              {opportunities.length === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(255,255,255,0.95)',
                  color: '#1B2A1D',
                  padding: '12px 18px',
                  borderRadius: 10,
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  zIndex: 7,
                  maxWidth: 290
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <MapPin style={{ width: 14, height: 14, color: '#dc2626' }} />
                    <span>No On-Going Drives</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.4 }}>
                    No active clothing donation drives found in {selectedLocationLabel}.
                  </div>
                </div>
              )}
            </div>
          );
        })()
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
