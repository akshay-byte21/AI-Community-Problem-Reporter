import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { X, Maximize2 } from 'lucide-react';
import { AP_DISTRICTS, AP_STATE_CENTER } from '../data/apDistricts';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom distinct markers for Pending vs In-Progress complaints
const getMarkerIcon = (status) => {
  const isPending = status === 'Pending';
  const bgColor = isPending ? '#ef4444' : '#f59e0b'; // Red for Pending, Amber for In Progress
  const iconSymbol = isPending ? '!' : '⚙';

  return L.divIcon({
    className: 'civic-map-marker',
    html: `
      <div style="
        background: ${bgColor};
        color: #ffffff;
        border: 2px solid #ffffff;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        ${iconSymbol}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Component to dynamically enforce bounds, minZoom, and pan when district changes
function MapViewController({ center, zoom, bounds, minZoom }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    // Enforce strict minimum zoom to forbid zooming out to state or whole world
    map.setMinZoom(minZoom || 11);
    map.setMaxZoom(18);

    // Enforce strict bounding box
    if (bounds) {
      map.setMaxBounds(bounds);
    }

    if (center && zoom) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, bounds, minZoom, map]);

  return null;
}

const DashboardMap = ({ reports = [], selectedDistrict = 'All Districts' }) => {
  const [modalImage, setModalImage] = useState(null);
  const isStatewide = !selectedDistrict || selectedDistrict === 'All Districts';

  // Determine center, zoom, minZoom, and bounding box
  let center = [AP_STATE_CENTER.lat, AP_STATE_CENTER.lng];
  let zoom = AP_STATE_CENTER.zoom;
  let minZoom = 7; // Statewide minZoom (Andhra Pradesh overview only)
  let maxBounds = [
    [12.5, 76.5],
    [19.5, 85.0]
  ]; // Strict AP state borders (forbids dragging outside AP)

  if (!isStatewide) {
    const cleanSel = (selectedDistrict || '').trim().toLowerCase();
    const dist = AP_DISTRICTS.find(
      (d) =>
        d.name.toLowerCase() === cleanSel ||
        d.code.toLowerCase() === cleanSel ||
        d.hq.toLowerCase() === cleanSel ||
        d.name.toLowerCase().includes(cleanSel) ||
        cleanSel.includes(d.name.toLowerCase())
    );

    if (dist) {
      center = [dist.lat, dist.lng];
      zoom = dist.zoom || 12;
      // STRICT: User cannot zoom out past level 11 (keeps map strictly within district limits for ALL 26 districts)
      minZoom = 11;

      // Base district bounding box (~25-35 km radius around district headquarters)
      let minLat = dist.lat - 0.22;
      let maxLat = dist.lat + 0.22;
      let minLng = dist.lng - 0.25;
      let maxLng = dist.lng + 0.25;

      // Filter active reports in this district
      const distActive = reports.filter((r) => {
        const isActive = r.status !== 'Solved' && r.status !== 'Completed';
        if (!isActive) return false;
        const rDist = (r.district || '').trim().toLowerCase();
        return rDist === cleanSel || rDist.includes(cleanSel) || cleanSel.includes(rDist);
      });

      // Center and expand bounding box around the citizen's actual filed complaints
      if (distActive.length > 0) {
        const lats = distActive.map((r) => Number(r.lat)).filter((n) => !isNaN(n) && n > 0);
        const lngs = distActive.map((r) => Number(r.lng)).filter((n) => !isNaN(n) && n > 0);
        if (lats.length > 0 && lngs.length > 0) {
          // Center directly on the user's filed complaints
          const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
          const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
          center = [avgLat, avgLng];

          minLat = Math.min(minLat, Math.min(...lats) - 0.03);
          maxLat = Math.max(maxLat, Math.max(...lats) + 0.03);
          minLng = Math.min(minLng, Math.min(...lngs) - 0.03);
          maxLng = Math.max(maxLng, Math.max(...lngs) + 0.03);
        }
      }

      maxBounds = [
        [Number(minLat.toFixed(4)), Number(minLng.toFixed(4))],
        [Number(maxLat.toFixed(4)), Number(maxLng.toFixed(4))]
      ];
    }
  }

  // Filter for ACTIVE problems in this particular district only
  const activeReports = reports.filter((r) => {
    const isActive = r.status !== 'Solved' && r.status !== 'Completed';
    if (!isActive) return false;

    if (isStatewide) return true;
    const cleanSel = selectedDistrict.trim().toLowerCase();
    const rDist = (r.district || '').trim().toLowerCase();
    return rDist === cleanSel || rDist.includes(cleanSel) || cleanSel.includes(rDist);
  });

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px' }}>
      {/* Top Floating District Status Badge */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        padding: '0.4rem 0.8rem',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        border: '1px solid #e2e8f0'
      }}>
        <span style={{ color: activeReports.length > 0 ? '#ea580c' : '#16a34a' }}>●</span>
        <span>{selectedDistrict}</span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <span style={{ color: '#ea580c' }}>{activeReports.length} Active Problems</span>
        <span style={{
          backgroundColor: '#f1f5f9',
          color: '#475569',
          padding: '0.12rem 0.4rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 700
        }}>
          🔒 District Locked
        </span>
      </div>

      <MapContainer 
        key={`${selectedDistrict}_${center[0].toFixed(2)}_${center[1].toFixed(2)}`}
        center={center} 
        zoom={zoom} 
        minZoom={minZoom}
        maxZoom={18}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', borderRadius: '10px' }}
      >
        <MapViewController center={center} zoom={zoom} bounds={maxBounds} minZoom={minZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />
        {activeReports.map((report) => (
          report.lat && report.lng ? (
            <Marker 
              key={report.id} 
              position={[Number(report.lat), Number(report.lng)]}
              icon={getMarkerIcon(report.status)}
            >
              <Popup>
                <div style={{ padding: '0.3rem', minWidth: '220px', maxWidth: '280px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                      #{report.id} {report.category}
                    </span>
                  </div>
                  <div style={{ marginBottom: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: report.status === 'Pending' ? '#fee2e2' : '#fef3c7',
                      color: report.status === 'Pending' ? '#dc2626' : '#d97706'
                    }}>
                      ● {report.status}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#f1f5f9',
                      color: '#475569'
                    }}>
                      {report.district || 'District'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}>
                    <div><strong>Exact Location:</strong> {report.address || `${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)}`}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      📍 GPS: {Number(report.lat).toFixed(5)}, {Number(report.lng).toFixed(5)}
                    </div>
                    {report.department && (
                      <div style={{ marginTop: '2px' }}><strong>Department:</strong> {report.department}</div>
                    )}
                    {report.staff_name && (
                      <div style={{ color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                        <strong>Assigned Agent:</strong> {report.staff_name}
                      </div>
                    )}
                  </div>

                  {report.image_url && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                          📷 Original Uploaded Photo
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600 }}>
                          (Click to expand)
                        </span>
                      </div>
                      <div 
                        onClick={() => setModalImage(report)}
                        style={{
                          cursor: 'pointer',
                          position: 'relative',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '2px solid #cbd5e1',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                        }}
                        title="Click to view original full size"
                      >
                        <img 
                          src={report.image_url} 
                          alt="Citizen Uploaded Photo" 
                          style={{ 
                            width: '100%', 
                            maxHeight: '135px', 
                            objectFit: 'cover', 
                            display: 'block'
                          }} 
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem'
                        }}>
                          <Maximize2 size={12} /> View original full size
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>

      {/* Full-Screen Original Image Modal */}
      {modalImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
            backdropFilter: 'blur(5px)'
          }}
          onClick={() => setModalImage(null)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff',
              marginBottom: '0.75rem',
              padding: '0 0.5rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  #{modalImage.id} {modalImage.category} - Original Citizen Upload
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                  📍 Exact Location: {modalImage.address || `${Number(modalImage.lat).toFixed(5)}, ${Number(modalImage.lng).toFixed(5)}`}
                </p>
              </div>
              <button
                onClick={() => setModalImage(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Images Display */}
            <div style={{
              display: 'flex',
              gap: '1.5rem',
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: '78vh',
              flexWrap: 'wrap'
            }}>
              {/* Citizen Original Photo */}
              {modalImage.image_url && (
                <div style={{ textAlign: 'center', maxHeight: '78vh' }}>
                  <div style={{ color: '#f87171', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    ● Reported Problem (Citizen Camera Upload)
                  </div>
                  <img 
                    src={modalImage.image_url} 
                    alt="Citizen Original Photo"
                    style={{
                      maxWidth: modalImage.resolution_image_url ? '45vw' : '88vw',
                      maxHeight: '72vh',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '2px solid #ef4444',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
                    }}
                  />
                </div>
              )}

              {/* Field Agent Resolved Photo (if solved) */}
              {modalImage.resolution_image_url && (
                <div style={{ textAlign: 'center', maxHeight: '78vh' }}>
                  <div style={{ color: '#4ade80', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    ● Resolution Proof (Agent Fixed)
                  </div>
                  <img 
                    src={modalImage.resolution_image_url} 
                    alt="Agent Resolution Photo"
                    style={{
                      maxWidth: '45vw',
                      maxHeight: '72vh',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '2px solid #10b981',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardMap;
