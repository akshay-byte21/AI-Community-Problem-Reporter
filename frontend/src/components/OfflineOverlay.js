import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

// OfflineOverlay: to handle client requests for OfflineOverlay and it processes the request to interact with database/AI and returns a response
const OfflineOverlay = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected !== false); // Default to true if null
    });
    return () => unsubscribe();
  }, []);

  return (
    <Modal visible={!isConnected} transparent={true} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Icon name="cloud-offline" size={100} color="#E74C3C" />
          <Text style={styles.title}>You're Offline</Text>
          <Text style={styles.subtitle}>
            Please connect to the internet to continue using the app.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCC',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});

export default OfflineOverlay;
