import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const MapScreen = () => {
  const { API_URL } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to see your area.');
        // Set default location to avoid infinite loading
        setLocation({ latitude: 12.9716, longitude: 77.5946 }); 
      } else {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc.coords);
      }

      const res = await axios.get(`${API_URL}/reports/public`);
      setReports(res.data.reports || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load map data');
      // Fallback location so it doesn't stay stuck
      setLocation({ latitude: 12.9716, longitude: 77.5946 });
      if (!reports.length) setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location && reports) {
      generateMapHtml();
    }
  }, [location, reports]);

  const generateMapHtml = () => {
    const lat = location.latitude;
    const lng = location.longitude;

    const markersHtml = reports.map(r => {
      if (!r.lat || !r.lng) return '';
      let color = 'blue';
      if (r.status === 'Completed' || r.status === 'Solved') color = 'green';
      if (r.status === 'In Progress') color = 'orange';

      // Use raw text for popup
      const popupText = `<b>${r.category}</b><br/>${r.address || ''}<br/><i>${r.status || 'Pending'}</i>`;
      return `
        L.circleMarker([${r.lat}, ${r.lng}], {
          color: '${color}',
          fillColor: '${color}',
          fillOpacity: 0.8,
          radius: 8
        }).bindPopup('${popupText}').addTo(map);
      `;
    }).join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
              body { padding: 0; margin: 0; }
              html, body, #map { height: 100%; width: 100%; }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
              var map = L.map('map').setView([${lat}, ${lng}], 14);
              L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                  attribution: '&copy; OpenStreetMap contributors'
              }).addTo(map);
              
              // Add user location
              L.circleMarker([${lat}, ${lng}], {
                color: 'dodgerblue',
                fillColor: 'dodgerblue',
                fillOpacity: 1,
                radius: 6,
                weight: 2
              }).bindPopup('<b>You are here</b>').addTo(map);

              ${markersHtml}
          </script>
      </body>
      </html>
    `;
    setHtmlContent(html);
  };

  if (loading || !htmlContent) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1B8C4A" />
        <Text style={{marginTop: 10}}>Loading Map...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Civic Issues Map</Text>
      </View>
      <View collapsable={false} style={{flex: 1}}>
        <WebView 
          source={{ html: htmlContent }} 
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          androidLayerType="software"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  header: {
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  map: {
    flex: 1
  }
});

export default MapScreen;
