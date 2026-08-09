import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DashboardMap = ({ reports }) => {
  // Default to a central location (e.g., Visakhapatnam based on mock data)
  const defaultCenter = [17.7292, 83.3323];

  return (
    <div className="map-container">
      <MapContainer 
        center={reports.length > 0 && reports[0].lat ? [reports[0].lat, reports[0].lng] : defaultCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((report) => (
          report.lat && report.lng ? (
            <Marker key={report.id} position={[report.lat, report.lng]}>
              <Popup>
                <strong>{report.category}</strong><br />
                {report.address || 'Location'}<br />
                Status: {report.status}
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
};

export default DashboardMap;
