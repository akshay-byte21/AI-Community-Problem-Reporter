import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { addSyncListener, syncPendingReports } from '../services/syncManager';
import { getPendingReports } from '../services/sqliteService';

const OfflineOverlay = () => {
  const { userToken, API_URL } = useContext(AuthContext) || {};
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = async () => {
    try {
      const items = await getPendingReports();
      setPendingCount(items.length);
    } catch (e) {}
  };

  useEffect(() => {
    checkPending();

    const unsubNet = NetInfo.addEventListener(state => {
      const connected = state.isConnected !== false;
      setIsConnected(connected);
      if (connected) {
        checkPending();
      }
    });

    const unsubSync = addSyncListener(state => {
      setIsSyncing(state.isSyncing);
      if (typeof state.pendingCount === 'number') {
        setPendingCount(state.pendingCount);
      }
    });

    return () => {
      unsubNet();
      unsubSync();
    };
  }, []);

  const handleManualSync = () => {
    if (userToken && API_URL && isConnected) {
      syncPendingReports(userToken, API_URL);
    }
  };

  // If online and nothing is syncing and no pending items, hide banner completely
  if (isConnected && !isSyncing && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[
      styles.banner, 
      !isConnected ? styles.offlineBanner : (isSyncing ? styles.syncingBanner : styles.pendingBanner)
    ]}>
      <View style={styles.left}>
        {!isConnected ? (
          <Ionicons name="cloud-offline" size={16} color="#fff" />
        ) : isSyncing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="cloud-upload" size={16} color="#fff" />
        )}
        <Text style={styles.bannerText}>
          {!isConnected 
            ? `Offline Mode • Viewing SQLite cache ${pendingCount > 0 ? `(${pendingCount} queued)` : ''}`
            : isSyncing
            ? `Syncing ${pendingCount} offline report(s)...`
            : `${pendingCount} report(s) saved offline`
          }
        </Text>
      </View>

      {isConnected && !isSyncing && pendingCount > 0 && (
        <TouchableOpacity style={styles.syncBtn} onPress={handleManualSync}>
          <Text style={styles.syncBtnText}>Sync Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 36,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  offlineBanner: {
    backgroundColor: '#b91c1c', // Solid red
  },
  syncingBanner: {
    backgroundColor: '#1B8C4A', // Project theme green
  },
  pendingBanner: {
    backgroundColor: '#d97706', // Amber/orange
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  syncBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  }
});

export default OfflineOverlay;
