// Official 26 Districts of Andhra Pradesh (Reorganized)
// Each district has its official name, code, headquarters, and central geographic coordinates.

const AP_DISTRICTS = [
  { id: 1, name: 'Alluri Sitharama Raju', code: 'asr', hq: 'Paderu', lat: 18.0667, lng: 82.5333, zoom: 11 },
  { id: 2, name: 'Anakapalli', code: 'anakapalli', hq: 'Anakapalli', lat: 17.6897, lng: 83.0037, zoom: 12 },
  { id: 3, name: 'Ananthapuramu', code: 'ananthapuramu', hq: 'Anantapur', lat: 14.6819, lng: 77.6006, zoom: 11 },
  { id: 4, name: 'Annamayya', code: 'annamayya', hq: 'Rayachoti', lat: 14.1950, lng: 78.9639, zoom: 11 },
  { id: 5, name: 'Bapatla', code: 'bapatla', hq: 'Bapatla', lat: 15.9042, lng: 80.4674, zoom: 11 },
  { id: 6, name: 'Chittoor', code: 'chittoor', hq: 'Chittoor', lat: 13.2172, lng: 79.1003, zoom: 11 },
  { id: 7, name: 'Dr. B.R. Ambedkar Konaseema', code: 'konaseema', hq: 'Amalapuram', lat: 16.5700, lng: 81.9900, zoom: 11 },
  { id: 8, name: 'East Godavari', code: 'east_godavari', hq: 'Rajahmundry', lat: 17.0005, lng: 81.8040, zoom: 11 },
  { id: 9, name: 'Eluru', code: 'eluru', hq: 'Eluru', lat: 16.7107, lng: 81.0952, zoom: 11 },
  { id: 10, name: 'Guntur', code: 'guntur', hq: 'Guntur', lat: 16.3067, lng: 80.4365, zoom: 12 },
  { id: 11, name: 'Kakinada', code: 'kakinada', hq: 'Kakinada', lat: 16.9891, lng: 82.2475, zoom: 12 },
  { id: 12, name: 'Krishna', code: 'krishna', hq: 'Machilipatnam', lat: 16.1809, lng: 81.1303, zoom: 11 },
  { id: 13, name: 'Kurnool', code: 'kurnool', hq: 'Kurnool', lat: 15.8281, lng: 78.0373, zoom: 11 },
  { id: 14, name: 'Nandyal', code: 'nandyal', hq: 'Nandyal', lat: 15.4886, lng: 78.4836, zoom: 11 },
  { id: 15, name: 'NTR', code: 'ntr', hq: 'Vijayawada', lat: 16.5062, lng: 80.6480, zoom: 12 },
  { id: 16, name: 'Palnadu', code: 'palnadu', hq: 'Narasaraopet', lat: 16.2300, lng: 80.0500, zoom: 11 },
  { id: 17, name: 'Parvathipuram Manyam', code: 'manyam', hq: 'Parvathipuram', lat: 18.7800, lng: 83.4300, zoom: 11 },
  { id: 18, name: 'Prakasam', code: 'prakasam', hq: 'Ongole', lat: 15.5057, lng: 80.0499, zoom: 11 },
  { id: 19, name: 'Sri Potti Sriramulu Nellore', code: 'sps_nellore', hq: 'Nellore', lat: 14.4426, lng: 79.9865, zoom: 11 },
  { id: 20, name: 'Sri Sathya Sai', code: 'sri_sathya_sai', hq: 'Puttaparthi', lat: 14.1667, lng: 77.8167, zoom: 11 },
  { id: 21, name: 'Srikakulam', code: 'srikakulam', hq: 'Srikakulam', lat: 18.2949, lng: 83.8938, zoom: 11 },
  { id: 22, name: 'Tirupati', code: 'tirupati', hq: 'Tirupati', lat: 13.6288, lng: 79.4192, zoom: 12 },
  { id: 23, name: 'Visakhapatnam', code: 'visakhapatnam', hq: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, zoom: 12 },
  { id: 24, name: 'Vizianagaram', code: 'vizianagaram', hq: 'Vizianagaram', lat: 18.1124, lng: 83.3956, zoom: 12 },
  { id: 25, name: 'West Godavari', code: 'west_godavari', hq: 'Bhimavaram', lat: 16.5449, lng: 81.5212, zoom: 11 },
  { id: 26, name: 'YSR Kadapa', code: 'ysr_kadapa', hq: 'Kadapa', lat: 14.4673, lng: 78.8242, zoom: 11 }
];

// Helper: Match district from address text or coordinates
function detectDistrict(address = '', lat = null, lng = null) {
  const cleanAddr = address.toLowerCase();

  // 1. Text keyword search
  for (const d of AP_DISTRICTS) {
    const dLower = d.name.toLowerCase();
    const hqLower = d.hq.toLowerCase();
    if (cleanAddr.includes(dLower) || cleanAddr.includes(hqLower)) {
      return d.name;
    }
  }

  // Common aliases
  if (cleanAddr.includes('vizag') || cleanAddr.includes('waltair')) return 'Visakhapatnam';
  if (cleanAddr.includes('vijayawada')) return 'NTR';
  if (cleanAddr.includes('rajahmundry')) return 'East Godavari';
  if (cleanAddr.includes('nellore')) return 'Sri Potti Sriramulu Nellore';
  if (cleanAddr.includes('kadapa')) return 'YSR Kadapa';
  if (cleanAddr.includes('anantapur')) return 'Ananthapuramu';

  // 2. Proximity to centroid (if lat & lng provided)
  if (lat && lng) {
    let closestDist = Infinity;
    let closestDistrict = 'Visakhapatnam';

    for (const d of AP_DISTRICTS) {
      const dist = Math.hypot(lat - d.lat, lng - d.lng);
      if (dist < closestDist) {
        closestDist = dist;
        closestDistrict = d.name;
      }
    }
    return closestDistrict;
  }

  return 'Visakhapatnam'; // Sensible default
}

module.exports = {
  AP_DISTRICTS,
  detectDistrict
};
