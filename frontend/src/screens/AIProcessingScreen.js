import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

// AIProcessingScreen: to handle client requests for AIProcessingScreen and it processes the request to interact with database/AI and returns a response
const AIProcessingScreen = ({ navigation, route }) => {
  const { imageUri, location, address } = route.params;
  const { userToken, API_URL } = useContext(AuthContext);
  
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [apiResult, setApiResult] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

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
    }, 400); // Speed up the fake animation massively

    return () => clearInterval(interval);
  }, []);

    const analyzeImage = async () => {
    setApiError(false);
    setApiResult(null);
    setStep(0);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('image', { uri: imageUri, name: 'photo.jpg', type: 'image/jpeg' });
      if (location) { formData.append('latitude', location.latitude); formData.append('longitude', location.longitude); }
      if (address) formData.append('address', address);

      const res = await axios.post(`${API_URL}/analyze-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userToken}` }
      });
      setApiResult(res.data);
    } catch (err) {
      console.error("AI Analysis error", err);
      setApiError(true);
    }
  };

  useEffect(() => { analyzeImage(); }, []);

  useEffect(() => {
    if (apiResult) {
      setStep(3); setProgress(1);
      setTimeout(() => {
        const validCategories = ['Road', 'Garbage', 'Water', 'Sanitary', 'Street Light', 'Electricity'];
        if (apiResult.category && validCategories.includes(apiResult.category)) {
          navigation.replace('ReviewComplaint', {
            imageUri,
            location,
            address,
            aiCategory: apiResult.category,
            aiDescription: apiResult.description,
            department: apiResult.department
          });
        } else {
          setIsInvalid(true);
        }
      }, 300);
    } else if (apiError) {
      setProgress(0);
    }
  }, [apiResult, apiError]);

  if (apiError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="wifi-outline" size={80} color="#EF4444" style={{ marginBottom: 20 }} />
          <Text style={styles.title}>Network Error</Text>
          <Text style={styles.subtitle}>
            We couldn't reach the AI servers. Please ensure you are connected to the internet and try again.
          </Text>
          <TouchableOpacity style={[styles.retakeButton, { backgroundColor: '#1B8C4A', marginTop: 30 }]} onPress={analyzeImage}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retakeButtonText}>Retry AI Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retakeButton, { marginTop: 15 }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.retakeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isInvalid) {
    const reason = apiResult?.rejection_reason || 'OTHER';
    const isNoDamage = reason === 'NO_DAMAGE_DETECTED';
    const isScreenOrBlurry = reason === 'SCREEN_OR_BLURRY';
    const isNonCivic = reason === 'NON_CIVIC_OBJECT';

    const iconName = isNoDamage 
      ? 'checkmark-circle-outline' 
      : isScreenOrBlurry 
        ? 'scan-outline' 
        : 'alert-circle';

    const iconColor = isNoDamage 
      ? '#059669' 
      : isScreenOrBlurry 
        ? '#D97706' 
        : '#EF4444';

    const defaultTitle = isNoDamage 
      ? 'No Damage Detected' 
      : isScreenOrBlurry 
        ? 'Unclear or Screen Photo' 
        : isNonCivic 
          ? 'Non-Civic Object Detected' 
          : 'Image Rejected';

    const titleText = apiResult?.title || defaultTitle;
    const detectedObj = apiResult?.detected_object;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.rejectionHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.rejectionHeaderTitle}>Verification Result</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.rejectionScroll} 
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconWrapper, { backgroundColor: isNoDamage ? '#ECFDF5' : isScreenOrBlurry ? '#FFFBEB' : '#FEF2F2' }]}>
            <Ionicons name={iconName} size={64} color={iconColor} />
          </View>

          <Text style={styles.rejectionTitle}>{titleText}</Text>

          {detectedObj && (
            <View style={[styles.detectedBadge, { backgroundColor: isNoDamage ? '#D1FAE5' : isScreenOrBlurry ? '#FEF3C7' : '#FEE2E2' }]}>
              <Ionicons 
                name={isNoDamage ? 'shield-checkmark' : 'information-circle'} 
                size={16} 
                color={isNoDamage ? '#065F46' : isScreenOrBlurry ? '#92400E' : '#991B1B'} 
              />
              <Text style={[styles.detectedBadgeText, { color: isNoDamage ? '#065F46' : isScreenOrBlurry ? '#92400E' : '#991B1B' }]}>
                {isNoDamage ? `Asset: ${detectedObj}` : `Identified: ${detectedObj}`}
              </Text>
            </View>
          )}

          <Text style={styles.rejectionDesc}>
            {apiResult?.description || "This image does not meet our civic reporting criteria."}
          </Text>

          {/* Context-Specific Guidance Cards */}
          {isNoDamage ? (
            <View style={[styles.infoCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#166534" />
                <Text style={[styles.infoCardTitle, { color: '#166534' }]}>Why was this rejected?</Text>
              </View>
              <Text style={[styles.infoCardBody, { color: '#15803D' }]}>
                The AI examined this public asset and confirmed it is currently in good, functional condition.
              </Text>
              <View style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={16} color="#166534" />
                <Text style={[styles.tipText, { color: '#166534' }]}>
                  If there is damaged infrastructure nearby, please move closer and photograph the exact affected area.
                </Text>
              </View>
            </View>
          ) : isScreenOrBlurry ? (
            <View style={[styles.infoCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <View style={styles.infoCardHeader}>
                <Ionicons name="camera-reverse-outline" size={20} color="#92400E" />
                <Text style={[styles.infoCardTitle, { color: '#92400E' }]}>Physical Site Photo Required</Text>
              </View>
              <Text style={[styles.infoCardBody, { color: '#B45309' }]}>
                Photos taken of computer monitors, phone screens, or unclear pictures cannot be authenticated.
              </Text>
              <View style={styles.tipRow}>
                <Ionicons name="sunny-outline" size={16} color="#92400E" />
                <Text style={[styles.tipText, { color: '#92400E' }]}>
                  Please capture an outdoor photo directly at the physical location with clear daylight.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.invalidInfoContainer}>
              <Text style={styles.invalidInfoText}>We only accept public community issues:</Text>
              <Text style={styles.invalidListText}>• Road & Potholes</Text>
              <Text style={styles.invalidListText}>• Electricity & Street Lights</Text>
              <Text style={styles.invalidListText}>• Sanitary & Sewage</Text>
              <Text style={styles.invalidListText}>• Water Leakage</Text>
              <Text style={styles.invalidListText}>• Garbage & Solid Waste</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.retakeButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.retakeButtonText}>Retake Picture</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel Report</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
  },
  invalidInfoContainer: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  invalidInfoText: {
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 8,
    fontSize: 15,
  },
  invalidListText: {
    color: '#7F1D1D',
    fontSize: 14,
    marginBottom: 4,
    marginLeft: 6,
  },
  retakeButton: {
    backgroundColor: '#1B8C4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#1B8C4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBackBtn: {
    padding: 6,
  },
  rejectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  rejectionScroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rejectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  detectedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  rejectionDesc: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  infoCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  infoCardBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  }
});

export default AIProcessingScreen;

