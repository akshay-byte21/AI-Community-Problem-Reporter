import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const CameraScreen = ({ navigation }) => {
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Opening Camera...');
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      takePictureAndLocate();
    }
  }, []);

  const takePictureAndLocate = async () => {
    try {
      // 1. Ask for permissions
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      const locPerm = await Location.requestForegroundPermissionsAsync();
      
      if (camPerm.status !== 'granted' || locPerm.status !== 'granted') {
        alert('Camera and Location permissions are required.');
        navigation.goBack();
        return;
      }

      // 2. Open Native Camera UI (allows landscape, zoom, native features)
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });

      if (result.canceled) {
        navigation.goBack();
        return;
      }

      const imageUri = result.assets[0].uri;

      // 3. Ensure we get the GPS coordinates after they snap the picture
      setIsLocating(true);
      setStatusMessage('Fetching accurate GPS location...');
      
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      
      setStatusMessage('Resolving street address...');
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      
      let finalAddress = '';
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        finalAddress = [
          `${addr.name || addr.street || ''}, ${addr.city || ''}`,
          `${addr.region || ''}, ${addr.country || ''}`
        ].filter(Boolean).join('\n');
      }

      // 4. Navigate instantly to AI processing (No watermark overlay preview!)
      navigation.replace('AIProcessing', { 
        imageUri: imageUri,
        location: loc.coords,
        address: finalAddress
      });

    } catch (error) {
      console.error(error);
      alert('An error occurred. Please try again.');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B8C4A" />
        {isLocating && (
          <Text style={styles.loadingText}>{statusMessage}</Text>
        )}
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
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  }
});

export default CameraScreen;
