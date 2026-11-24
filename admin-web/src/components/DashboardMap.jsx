import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { X, Maximize2, MapPin, Shield } from 'lucide-react';
import { AP_DISTRICTS, AP_STATE_CENTER } from '../data/apDistricts';
import DISTRICT_BOUNDARIES from '../data/ap_districts_boundaries.json';

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
  const bgColor = isPending ? '#ef4444' : '#f59e0b';
  const iconSymbol = isPending ? '!' : '⚙';

  return L.divIcon({
    className: 'civic-map-marker',
    html: `
      <div style="
        background: ${bgColor};
        color: #ffffff;
        border: 2px solid #ffffff;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.38);
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        ${iconSymbol}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

// Outer world polygon ring for inverted mask (covers surrounding regions)
const OUTER_WORLD_RING = [
  [38.0, 65.0],
  [38.0, 95.0],
  [6.0, 95.0],
  [6.0, 65.0],
  [38.0, 65.0]
];

// Helper to extract rings in [lat, lng] format from GeoJSON geometry
function extractLatLngRings(geometry) {
  if (!geometry) return [];
  const rings = [];
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => {
      rings.push(ring.map(pt => [pt[1], pt[0]]));
    });
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => {
      poly.forEach(ring => {
        rings.push(ring.map(pt => [pt[1], pt[0]]));
      });
    });
  }
  return rings;
}

// Helper to lookup official boundary for any of the 26 districts
function findDistrictBoundary(selectedDistrict) {
  if (!selectedDistrict || selectedDistrict === 'All Districts') return null;
  const clean = selectedDistrict.trim().toLowerCase();

  // 1. Direct match on boundary keys
  for (const [name, data] of Object.entries(DISTRICT_BOUNDARIES)) {
    if (
      name.toLowerCase() === clean ||
      name.toLowerCase().includes(clean) ||
      clean.includes(name.toLowerCase())
    ) {
      return data;
    }
  }

  // 2. Fallback check via AP_DISTRICTS
  const meta = AP_DISTRICTS.find(
    d => d.name.toLowerCase() === clean || d.code.toLowerCase() === clean || d.hq.toLowerCase() === clean
  );
  if (meta && DISTRICT_BOUNDARIES[meta.name]) {
    return DISTRICT_BOUNDARIES[meta.name];
  }

  return null;
}

// Controller component to smoothly fit the entire district into view and restrict zooming/panning
function MapViewController({ districtBoundary, isStatewide }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Small timeout to allow container DOM layout to settle
    const timer = setTimeout(() => {
      map.invalidateSize();

      if (!isStatewide && districtBoundary && districtBoundary.bbox) {
        const targetBounds = L.latLngBounds(districtBoundary.bbox);

        // 1. Clear constraints so fitBounds can calculate freely
        map.setMinZoom(4);
        map.setMaxZoom(18);
        map.setMaxBounds(null);

        // 2. Fit the entire district inside the container
        map.fitBounds(targetBounds, { padding: [25, 25], maxZoom: 13, animate: false });

        // 3. Lock minZoom to the fitted zoom so user cannot zoom out past this district
        const fittedZoom = map.getZoom();
        map.setMinZoom(fittedZoom);

        // 4. Lock maxBounds to prevent panning outside the district
        map.setMaxBounds(targetBounds.pad(0.20));
      } else {
        // Statewide view (All Districts)
        map.setMinZoom(4);
        map.setMaxZoom(18);
        map.setMaxBounds(null);

        const stateBounds = L.latLngBounds([[12.5, 76.5], [19.5, 85.0]]);
        map.fitBounds(stateBounds, { padding: [15, 15], animate: false });

        const fittedZoom = map.getZoom();
        map.setMinZoom(fittedZoom);
        map.setMaxBounds(stateBounds.pad(0.15));
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [map, districtBoundary, isStatewide]);

  return null;
}

const DashboardMap = ({ reports = [], selectedDistrict = 'All Districts' }) => {
  const [modalImage, setModalImage] = useState(null);
  const isStatewide = !selectedDistrict || selectedDistrict === 'All Districts';

  // Retrieve official GeoJSON polygon boundary for the selected district
  const districtBoundary = useMemo(
    () => findDistrictBoundary(selectedDistrict),
    [selectedDistrict]
  );

  // Extract Leaflet-compatible rings
  const districtRings = useMemo(
    () => (districtBoundary ? extractLatLngRings(districtBoundary.geometry) : []),
    [districtBoundary]
  );

  // Inverted mask: World rectangle with the district polygon cut out as a hole
  const invertedMaskPositions = useMemo(() => {
    if (!districtRings.length) return null;
    return [OUTER_WORLD_RING, ...districtRings];
  }, [districtRings]);

  // Initial center and zoom calculation
  let initialCenter = [AP_STATE_CENTER.lat, AP_STATE_CENTER.lng];
  let initialZoom = AP_STATE_CENTER.zoom;

  if (!isStatewide && districtBoundary && districtBoundary.bbox) {
    const rawBbox = districtBoundary.bbox;
    initialCenter = [
      (rawBbox[0][0] + rawBbox[1][0]) / 2,
      (rawBbox[0][1] + rawBbox[1][1]) / 2
    ];
    const maxSpan = Math.max(
      rawBbox[1][0] - rawBbox[0][0],
      rawBbox[1][1] - rawBbox[0][1]
    );
    initialZoom = maxSpan > 1.4 ? 8 : maxSpan > 0.8 ? 9 : 10;
  }

  // Filter for ACTIVE problems in this particular district only
  const cleanSel = (selectedDistrict || '').trim().toLowerCase();
  const activeReports = reports.filter((r) => {
    const isActive = r.status !== 'Solved' && r.status !== 'Completed';
    if (!isActive) return false;

    if (isStatewide) return true;
    const rDist = (r.district || '').trim().toLowerCase();
    return rDist === cleanSel || rDist.includes(cleanSel) || cleanSel.includes(rDist);
  });

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px' }}>
      <MapContainer 
        key={selectedDistrict}
        center={initialCenter} 
        zoom={initialZoom} 
        minZoom={5}
        maxZoom={18}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', borderRadius: '10px' }}
      >
        <MapViewController districtBoundary={districtBoundary} isStatewide={isStatewide} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
        />

        {/* 1. Inverted Mask: Dims and hides everything OUTSIDE the district boundary */}
        {invertedMaskPositions && (
          <Polygon 
            positions={invertedMaskPositions}
            pathOptions={{
              stroke: false,
              fillColor: '#f1f5f9',
              fillOpacity: 0.82
            }}
          />
        )}

        {/* 2. Official District Border Outline (Highlights the exact researched perimeter) */}
        {districtRings.length > 0 && (
          <Polygon 
            positions={districtRings}
            pathOptions={{
              color: '#15803d',
              weight: 3.5,
              opacity: 1,
              fillColor: '#16a34a',
              fillOpacity: 0.05
            }}
          />
        )}

        {/* 3. Markers for registered citizen complaints inside this district */}
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
