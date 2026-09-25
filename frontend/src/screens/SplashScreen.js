import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// SplashScreen: to handle client requests for SplashScreen and it processes the request to interact with database/AI and returns a response
const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    if (navigation) {
      const timer = setTimeout(() => {
        navigation.replace('Login');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [navigation, fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.topSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoContainer}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Ionicons name="person" size={40} color="#0B4C82" />
            </View>
          </View>
        </View>
        
        <Text style={styles.titleBlue}>Community</Text>
        <Text style={styles.titleLightBlue}>Problem Reporter</Text>
        
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Report Problems.</Text>
          <Text style={styles.tagline}>Get Solutions.</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.bottomSection, { opacity: fadeAnim }]}>
        <Image 
          source={require('../../assets/splash_bg.jpg')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Building a better</Text>
          <Text style={styles.footerText}>community together...</Text>
          <View style={styles.progressLine} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#1B8C4A',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0B4C82',
  },
  titleLightBlue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4E9FD1',
    marginBottom: 20,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    lineHeight: 24,
  },
  bottomSection: {
    height: height * 0.45,
    width: '100%',
    justifyContent: 'flex-end',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  footerContainer: {
    padding: 30,
    paddingBottom: 50,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  footerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressLine: {
    width: 40,
    height: 4,
    backgroundColor: '#1B8C4A',
    borderRadius: 2,
    marginTop: 15,
  }
});

export default SplashScreen;
