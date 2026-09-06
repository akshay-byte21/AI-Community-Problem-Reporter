import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, SafeAreaView, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const MapScreen = () => {
  const { API_URL } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
      
      const res = await axios.get(`${API_URL}/reports/public`);
      setReports(res.data);
    } catch (e) {
      console.warn('Error fetching map data:', e);
      Alert.alert('Notice', 'Could not load nearby issues.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B8C4A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Issues</Text>
      </View>
      <MapView 
        style={styles.map} 
        initialRegion={location || {
          latitude: 12.9716, // Default to generic fallback
          longitude: 77.5946,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        showsUserLocation={true}
      >
        {reports.map((report) => {
          let pinColor = '#EF4444'; // Red for pending/unassigned
          if (report.status === 'In Progress') pinColor = '#F59E0B'; // Orange
          if (report.status === 'Pending Verification') pinColor = '#3B82F6'; // Blue

          return (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.lat, longitude: report.lng }}
              pinColor={pinColor}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{report.category}</Text>
                  <Text style={styles.calloutDesc}>{report.department}</Text>
                  <Text style={[styles.calloutStatus, { color: pinColor }]}>{report.status}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  callout: {
    padding: 5,
    minWidth: 150,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutDesc: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: '600',
  }
});

export default MapScreen;
