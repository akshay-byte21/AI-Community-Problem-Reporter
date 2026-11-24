import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AP_DISTRICTS, AP_STATE_CENTER } from '../data/apDistricts';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically pan and zoom map when selected district changes
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

const DashboardMap = ({ reports = [], selectedDistrict = 'All Districts' }) => {
  // Determine center & zoom based on selected district
  let center = [AP_STATE_CENTER.lat, AP_STATE_CENTER.lng];
  let zoom = AP_STATE_CENTER.zoom;

  if (selectedDistrict && selectedDistrict !== 'All Districts') {
    const dist = AP_DISTRICTS.find(d => d.name.toLowerCase() === selectedDistrict.toLowerCase());
    if (dist) {
      center = [dist.lat, dist.lng];
      zoom = dist.zoom || 12;
    }
  }

  // Filter for ACTIVE problems in this particular district only
  const activeReports = reports.filter(r => {
    const isActive = r.status !== 'Solved' && r.status !== 'Completed';
    if (!isActive) return false;

    if (!selectedDistrict || selectedDistrict === 'All Districts') {
      return true;
    }
    return (r.district || '').toLowerCase() === selectedDistrict.toLowerCase();
  });

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px' }}>
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '0.35rem 0.75rem',
        borderRadius: '6px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#15803d',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem'
      }}>
        <span>📍 Showing {activeReports.length} Active Problems ({selectedDistrict})</span>
      </div>

      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', borderRadius: '10px' }}
      >
        <MapViewController center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {activeReports.map((report) => (
          report.lat && report.lng ? (
            <Marker key={report.id} position={[report.lat, report.lng]}>
              <Popup>
                <div style={{ padding: '0.2rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.2rem' }}>
                    {report.category}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#4b5563', marginBottom: '0.35rem' }}>
                    <strong>District:</strong> {report.district || 'Unassigned District'}<br />
                    <strong>Location:</strong> {report.address || `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}<br />
                    <strong>Status:</strong> <span style={{ color: '#d97706', fontWeight: 600 }}>{report.status}</span><br />
                    {report.staff_name && (
                      <span><strong>Agent:</strong> {report.staff_name}</span>
                    )}
                  </div>
                  {report.image_url && (
                    <img 
                      src={report.image_url} 
                      alt="Complaint" 
                      style={{ width: '100%', maxHeight: '110px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} 
                    />
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
};

export default DashboardMap;
