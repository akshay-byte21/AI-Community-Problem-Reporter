import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const CameraScreen = ({ navigation }) => {
  const [loadingText, setLoadingText] = useState('Initializing camera...');

  useEffect(() => {
    (async () => {
      try {
        setLoadingText('Requesting permissions...');
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          navigation.goBack();
          return;
        }

        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to report civic issues.');
          navigation.goBack();
          return;
        }

        setLoadingText('Acquiring location...');
        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        
        let addressStr = '';
        try {
          let reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
          
          if (reverseGeocode.length > 0) {
            const addr = reverseGeocode[0];
            addressStr = `${addr.name || addr.street || ''}, ${addr.city || ''}\n${addr.region || ''}, ${addr.country || ''}`.trim();
          }
        } catch (e) {
          console.warn("Reverse geocode error:", e);
        }

        setLoadingText('Opening camera...');
        let result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.5,
        });

        if (result.canceled) {
          navigation.goBack();
        } else {
          navigation.replace('AIProcessing', { 
            imageUri: result.assets[0].uri,
            location: loc.coords,
            address: addressStr
          });
        }
      } catch (error) {
        console.error("Camera Error:", error);
        Alert.alert('Error', 'An error occurred while opening the camera.');
        navigation.goBack();
      }
    })();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1B8C4A" />
      <Text style={styles.text}>{loadingText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    color: '#333',
    fontSize: 16,
  }
});

export default CameraScreen;
