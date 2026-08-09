import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const CameraScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);
  const [location, setLocation] = useState(null);
  const [addressLines, setAddressLines] = useState(['Locating...', '']);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facing, setFacing] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
      
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationStatus === 'granted');

      if (locationStatus === 'granted') {
        try {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
      }
    })();
  }, [permission, requestPermission]);

  const toggleCameraType = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashMode(current => (current === 'off' ? 'on' : 'off'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedImage(photo.uri);
    }
  };

  const proceedToAI = () => {
    navigation.navigate('AIProcessing', { 
      imageUri: capturedImage,
      location: location?.coords,
      address: addressLines.join('\n')
    });
  };

  if (!permission || locationPermission === null) {
    return <View style={styles.container}><ActivityIndicator color="#fff" style={{marginTop: 50}} /></View>;
  }
  if (!permission.granted || !locationPermission) {
    return (
      <View style={styles.container}>
        <Text style={{color:'#fff', textAlign:'center', marginTop:100}}>We need your permission to show the camera and access location.</Text>
        <TouchableOpacity onPress={requestPermission} style={{marginTop: 20, alignSelf: 'center', padding: 10, backgroundColor: '#1B8C4A', borderRadius: 8}}>
            <Text style={{color: '#fff'}}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  return (
    <SafeAreaView style={styles.container}>
      {!capturedImage ? (
        <CameraView style={styles.camera} facing={facing} flash={flashMode} ref={cameraRef}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBg}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBg} onPress={toggleFlash}>
              <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off-outline'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <WatermarkOverlay />

          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.sideButton}>
              <Ionicons name="image-outline" size={28} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sideButton} onPress={toggleCameraType}>
              <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setCapturedImage(null)} style={styles.headerIconBg}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <WatermarkOverlay />
          
          <View style={styles.previewControls}>
            <TouchableOpacity style={styles.retakeButton} onPress={() => setCapturedImage(null)}>
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useButton} onPress={proceedToAI}>
              <Text style={styles.useText}>Use Photo</Text>
              <Ionicons name="checkmark" size={20} color="#fff" style={{marginLeft: 8}} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 20,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  watermarkIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  watermarkText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  sideButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  retakeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retakeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#1B8C4A',
    borderRadius: 12,
  },
  useText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default CameraScreen;

