import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const CameraScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [addressLines, setAddressLines] = useState(['Locating...', '']);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      openNativeCamera();
      fetchLocationInBackground();
    }
  }, []);

  const fetchLocationInBackground = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
      
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        setAddressLines([
          `${addr.name || addr.street || ''}, ${addr.city || ''}`,
          `${addr.region || ''}, ${addr.country || ''}`
        ].filter(Boolean));
      }
    } catch (e) {
      console.warn("Location error:", e);
    }
  };

  const openNativeCamera = async () => {
    setIsPickerActive(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera permission is required');
        navigation.goBack();
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (result.canceled) {
        navigation.goBack();
      } else {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error(error);
      navigation.goBack();
    } finally {
      setIsPickerActive(false);
    }
  };

  const proceedToAI = () => {
    navigation.replace('AIProcessing', { 
      imageUri: capturedImage,
      location: location?.coords,
      address: addressLines.join('\n')
    });
  };

  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeString = currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) + ' (IST)';
  
  const WatermarkOverlay = () => (
    <View style={styles.watermarkContainer}>
       <View style={styles.watermarkRow}>
         <Ionicons name="calendar-outline" size={16} color="#E5E7EB" style={styles.watermarkIcon} />
         <Text style={styles.watermarkText}>{dateString}</Text>
       </View>
       <View style={styles.watermarkRow}>
         <Ionicons name="time-outline" size={16} color="#E5E7EB" style={styles.watermarkIcon} />
         <Text style={styles.watermarkText}>{timeString}</Text>
       </View>
       <View style={[styles.watermarkRow, {alignItems: 'flex-start'}]}>
         <Ionicons name="location-outline" size={16} color="#E5E7EB" style={styles.watermarkIcon} />
         <View>
           <Text style={styles.watermarkText}>{addressLines[0]}</Text>
           {addressLines[1] ? <Text style={styles.watermarkText}>{addressLines[1]}</Text> : null}
         </View>
       </View>
       <View style={styles.watermarkRow}>
         <Ionicons name="navigate-outline" size={16} color="#E5E7EB" style={styles.watermarkIcon} />
         <Text style={styles.watermarkText}>
           {location ? `${location.coords.latitude.toFixed(4)}° N, ${location.coords.longitude.toFixed(4)}° E` : 'Fetching coords...'}
         </Text>
       </View>
    </View>
  );

  if (isPickerActive || !capturedImage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B8C4A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBg}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <WatermarkOverlay />
          
          <View style={styles.previewControls}>
            <TouchableOpacity style={styles.retakeButton} onPress={openNativeCamera}>
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useButton} onPress={proceedToAI}>
              <Text style={styles.useText}>Use Photo</Text>
              <Ionicons name="checkmark" size={20} color="#fff" style={{marginLeft: 8}} />
            </TouchableOpacity>
          </View>
        </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 16,
    maxWidth: '85%',
    zIndex: 10,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  watermarkIcon: {
    marginRight: 10,
  },
  watermarkText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewControls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  retakeButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  retakeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  useButton: {
    backgroundColor: '#1B8C4A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  useText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default CameraScreen;
