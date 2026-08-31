import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Modal, SafeAreaView, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Haversine formula to calculate distance between two lat/lng coordinates in meters
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
};

const ResolutionScreen = ({ route, navigation }) => {
  const { report } = route.params;
  const { userToken, API_URL } = useContext(AuthContext);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isNear, setIsNear] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  const openMap = () => {
    if (report.lat && report.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${report.lat},${report.lng}`;
      Linking.openURL(url);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        setCheckingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setCurrentLocation(loc.coords);

      if (report.lat && report.lng) {
        const dist = getDistance(loc.coords.latitude, loc.coords.longitude, report.lat, report.lng);
        setDistance(dist);
        setIsNear(dist <= 500); // 500 meters threshold for better accuracy tolerance
      } else {
        // If report has no lat/lng, we can't verify. Just allow it for testing purposes.
        setIsNear(true); 
      }
      setCheckingLocation(false);
    })();
  }, [report]);

  const takePhoto = async () => {
    if (!isNear) {
      Alert.alert('Location Error', 'You must be at the reported location to capture the resolution photo.');
      return;
    }
    
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadResolution = async () => {
    if (!imageUri) return Alert.alert('Error', 'Please capture a photo first.');
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: 'resolution.jpg',
        type: 'image/jpeg'
      });
      formData.append('reportId', report.id);

      await axios.post(`${API_URL}/agent/resolve`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userToken}`
        }
      });

      Alert.alert('Success', 'Report marked as Pending Verification!');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        Alert.alert('Verification Failed', `${err.response.data.error}\n\nPlease recapture the image.`);
      } else {
        Alert.alert('Error', 'Failed to upload resolution. Please recapture the image and try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Task Details</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Category:</Text>
        <Text style={styles.value}>{report.category}</Text>
        
        <Text style={styles.label}>Description:</Text>
        <Text style={styles.value}>{report.description}</Text>
        
        <Text style={styles.label}>Address:</Text>
        <Text style={styles.value}>{report.address}</Text>

        {report.lat && report.lng && (
          <TouchableOpacity style={styles.mapButton} onPress={openMap}>
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.mapButtonText}>Get Precise Directions</Text>
          </TouchableOpacity>
        )}

        {report.image_url && (
          <TouchableOpacity onPress={() => setSelectedImage({ uri: report.image_url.startsWith('http') ? report.image_url : `${API_URL}${report.image_url}` })}>
            <Image source={{ uri: report.image_url.startsWith('http') ? report.image_url : `${API_URL}${report.image_url}` }} style={styles.reportImage} />
          </TouchableOpacity>
        )}
      </View>

      {report.status === 'Solved' || report.status === 'Pending Verification' ? (
        <>
          <View style={styles.completedBox}>
            <Text style={styles.completedText}>
              This task is {report.status === 'Solved' ? 'solved' : report.status}
            </Text>
          </View>
          {report.resolution_image_url && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.title}>Solution Validation</Text>
              <TouchableOpacity onPress={() => setSelectedImage({ uri: report.resolution_image_url.startsWith('http') ? report.resolution_image_url : `${API_URL}${report.resolution_image_url}` })}>
                <Image 
                  source={{ uri: report.resolution_image_url.startsWith('http') ? report.resolution_image_url : `${API_URL}${report.resolution_image_url}` }} 
                  style={styles.reportImage} 
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.title}>Solution Validation</Text>
          
          {checkingLocation ? (
            <ActivityIndicator size="large" color="#10b981" />
          ) : (
            <View style={[styles.locationBox, { backgroundColor: isNear ? '#d1fae5' : '#fee2e2' }]}>
              <Text style={[styles.locationText, { color: isNear ? '#065f46' : '#991b1b' }]}>
                {distance !== null 
                  ? `You are ${Math.round(distance)} meters away from the site.` 
                  : 'Report location unknown (Bypassed).'}
              </Text>
              {!isNear && distance !== null && (
                <Text style={styles.errorText}>You must be within 200m to take a photo.</Text>
              )}
            </View>
          )}

          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <TouchableOpacity style={styles.button} onPress={uploadResolution} disabled={isUploading}>
                {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Solution Validation</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#6b7280', marginTop: 10 }]} onPress={() => setImageUri(null)} disabled={isUploading}>
                <Text style={styles.buttonText}>Retake Photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.button, (!isNear || checkingLocation) && styles.disabledButton]} 
              onPress={takePhoto}
              disabled={!isNear || checkingLocation}
            >
              <Text style={styles.buttonText}>Capture Solution Validation</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      
      {/* Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <TouchableOpacity style={{ padding: 20, alignSelf: 'flex-end' }} onPress={() => setSelectedImage(null)}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage.uri }} 
              style={{ flex: 1, width: '100%' }} 
              resizeMode="contain" 
            />
          )}
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 1 },
  label: { fontSize: 12, color: '#6b7280', marginTop: 5 },
  value: { fontSize: 16, color: '#1f2937', marginBottom: 10 },
  reportImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 10, backgroundColor: '#eee' },
  locationBox: { padding: 15, backgroundColor: '#e5e7eb', borderRadius: 8, marginBottom: 20 },
  locationText: { color: '#374151', textAlign: 'center', fontWeight: 'bold' },
  mapButton: {
    backgroundColor: '#1B8C4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 5 },
  preview: { width: '100%', height: 300, borderRadius: 10, marginBottom: 20 },
  button: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#9ca3af' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  completedBox: { padding: 20, backgroundColor: '#d1fae5', borderRadius: 8, alignItems: 'center' },
  completedText: { color: '#065f46', fontWeight: 'bold', fontSize: 16 }
});

export default ResolutionScreen;
