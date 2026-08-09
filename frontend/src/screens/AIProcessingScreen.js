import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const AIProcessingScreen = ({ navigation, route }) => {
  const { imageUri, location, address } = route.params;
  const { userToken, API_URL } = useContext(AuthContext);
  
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState(false);

  const steps = [
    'Image received',
    'Detecting problem',
    'Identifying category',
    'Generating description'
  ];

  useEffect(() => {
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep <= steps.length - 1) {
        setStep(currentStep);
        setProgress(currentStep / (steps.length - 1));
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const analyzeImage = async () => {
      try {
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          name: 'photo.jpg',
          type: 'image/jpeg'
        });
        if (location) {
          formData.append('latitude', location.latitude);
          formData.append('longitude', location.longitude);
        }
        if (address) {
          formData.append('address', address);
        }

        const res = await axios.post(`${API_URL}/analyze-image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${userToken}`
          }
        });
        
        setApiResult(res.data);
      } catch (err) {
        console.error("AI Analysis error", err);
        setApiError(true);
      }
    };
    
    analyzeImage();
  }, []);

  useEffect(() => {
    // When both visual steps are done (step === 3) AND API result is ready
    if (step === 3 && (apiResult || apiError)) {
      setTimeout(() => {
        if (apiResult?.category === 'Invalid') {
          // If the image was flagged as invalid by the AI
          import('react-native').then(({ Alert }) => {
            Alert.alert(
              "Invalid Image Detected",
              "The image does not appear to be related to road, garbage, water, sanitary, or electricity issues. Please capture a valid civic issue.",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          });
        } else {
          navigation.replace('ReviewComplaint', {
            imageUri,
            location,
            address,
            aiCategory: apiResult?.category || 'Unknown Problem',
            aiDescription: apiResult?.description || 'Could not generate description. Please proceed manually.',
            department: apiResult?.department || 'General Administration'
          });
        }
      }, 1000);
    }
  }, [step, apiResult, apiError]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <Progress.Circle 
            size={140} 
            progress={progress} 
            thickness={6} 
            color="#1B8C4A" 
            unfilledColor="#E5E7EB"
            borderWidth={0}
            strokeCap="round"
          />
          <View style={styles.iconCenter}>
            <Ionicons name="hardware-chip-outline" size={56} color="#1B8C4A" />
          </View>
        </View>

        <Text style={styles.title}>Analyzing the image...</Text>
        <Text style={styles.subtitle}>Please wait while we detect the issue</Text>

        <View style={styles.stepsContainer}>
          {steps.map((s, idx) => {
            const isCompleted = idx <= step;
            return (
              <View key={idx} style={styles.stepRow}>
                {isCompleted ? (
                  <Ionicons name="checkmark-circle" size={24} color="#1B8C4A" />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="#D1D5DB" />
                )}
                <Text style={[styles.stepText, { color: isCompleted ? '#1B8C4A' : '#6B7280', fontWeight: isCompleted ? '600' : '400' }]}>
                  {s}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footerInfo}>
          <Ionicons name="time-outline" size={20} color="#1B8C4A" />
          <Text style={styles.footerText}>This may take a few seconds</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCenter: {
    position: 'absolute',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  stepsContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepText: {
    marginLeft: 16,
    fontSize: 16,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  footerText: {
    color: '#1B8C4A',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14,
  }
});

export default AIProcessingScreen;

