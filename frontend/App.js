import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import AppNav from './src/navigation/AppNav';
import OfflineOverlay from './src/components/OfflineOverlay';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />
      <AppNav />
      <OfflineOverlay />
    </AuthProvider>
  );
}
