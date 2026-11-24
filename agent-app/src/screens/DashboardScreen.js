import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, Platform, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { initDatabase, cacheAssignedTasks, getCachedTasks, getPendingResolutions } from '../services/sqliteService';
import { initSyncManager, syncPendingResolutions, addSyncListener } from '../services/syncManager';

// DashboardScreen: to handle client requests for DashboardScreen and it processes the request to interact with database/AI and returns a response
const DashboardScreen = ({ navigation }) => {
  const { userToken, agent, logout, API_URL } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isOfflineLoaded, setIsOfflineLoaded] = useState(false);
  const [pendingSyncIds, setPendingSyncIds] = useState(new Set());

  // Initialize SQLite and background sync manager
  useEffect(() => {
    initDatabase();
    if (userToken && API_URL) {
      const unsub = initSyncManager(userToken, API_URL);
      // Trigger immediate sync of any pending resolutions on dashboard open
      syncPendingResolutions(userToken, API_URL);
      return unsub;
    }
  }, [userToken, API_URL]);

  // Listen to sync changes to refresh list and badge
  useEffect(() => {
    const unsub = addSyncListener(async () => {
      const pending = await getPendingResolutions();
      setPendingSyncIds(new Set(pending.map(p => p.report_id)));
    });
    return unsub;
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setRefreshing(true);
      // 1. First load from local SQLite cache instantly
      const cached = await getCachedTasks();
      if (cached && cached.length > 0) {
        setReports(cached);
      }

      // Check pending sync queue
      const pending = await getPendingResolutions();
      setPendingSyncIds(new Set(pending.map(p => p.report_id)));

      // 2. Fetch fresh data from network
      const res = await axios.get(`${API_URL}/agent/reports`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 8000
      });

      if (res.data) {
        setReports(res.data);
        setIsOfflineLoaded(false);
        // 3. Cache into SQLite for offline access
        await cacheAssignedTasks(res.data);
      }
    } catch (e) {
      console.warn('Network fetch failed, serving from SQLite cache:', e.message);
      setIsOfflineLoaded(true);
      const cached = await getCachedTasks();
      if (cached && cached.length > 0) {
        setReports(cached);
      }
    } finally {
      setRefreshing(false);
    }
  }, [userToken, API_URL]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchReports);
    return unsubscribe;
  }, [navigation, fetchReports]);

  const renderItem = ({ item }) => {
    const isQueued = pendingSyncIds.has(item.id);

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('Resolution', { report: item })}
      >
        <View style={styles.header}>
          <Text style={styles.category}>{item.category}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isQueued && (
              <Text style={styles.queuedBadge}>⏳ Syncing...</Text>
            )}
            <Text style={[styles.status, item.status === 'Solved' || item.status === 'Pending Verification' ? styles.statusGreen : styles.statusOrange]}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.address}>📍 {item.address || 'Location provided'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>My Assigned Tasks</Text>
          {isOfflineLoaded && (
            <Text style={styles.offlineNotice}>⚡ Showing SQLite cached tasks</Text>
          )}
        </View>
        <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>
      <Text style={styles.welcome}>Welcome, Agent {agent?.name}</Text>
      
      <FlatList
        data={reports}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchReports} />}
        ListEmptyComponent={<Text style={styles.empty}>No assigned tasks currently.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  offlineNotice: { fontSize: 11, color: '#d97706', fontWeight: '600', marginTop: 2 },
  logout: { color: '#ef4444', fontWeight: 'bold' },
  welcome: { paddingHorizontal: 20, fontSize: 16, color: '#666', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  category: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
  status: { fontWeight: 'bold', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  statusOrange: { backgroundColor: '#fef3c7', color: '#d97706' },
  statusGreen: { backgroundColor: '#d1fae5', color: '#059669' },
  queuedBadge: { backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  desc: { color: '#4b5563', marginBottom: 10 },
  address: { color: '#6b7280', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#9ca3af' }
});

export default DashboardScreen;
