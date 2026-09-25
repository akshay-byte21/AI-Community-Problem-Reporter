import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// SplashScreen: to handle client requests for SplashScreen and it processes the request to interact with database/AI and returns a response
const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 10,
        useNativeDriver: true,
      }),
    ]).start();

    if (navigation) {
      const timer = setTimeout(() => {
        navigation.replace('Login');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Ionicons name="shield-checkmark" size={50} color="#F59E0B" />
            </View>
          </View>
        </View>
        
        <Text style={styles.titleBlue}>Agent Portal</Text>
        <Text style={styles.titleLightBlue}>Civic Problem Reporter</Text>
        
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Resolve Issues.</Text>
          <Text style={styles.tagline}>Improve Communities.</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.footerContainer, { opacity: fadeAnim }]}>
        <Text style={styles.footerText}>Agent Verification System</Text>
        <View style={styles.progressLine} />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B', // Dark slate background for agent app
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: height * 0.1,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  logoInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 5,
  },
  titleLightBlue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 20,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#CBD5E1',
    fontWeight: '500',
    lineHeight: 24,
  },
  footerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  progressLine: {
    width: 60,
    height: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    marginTop: 15,
  }
});

export default SplashScreen;
