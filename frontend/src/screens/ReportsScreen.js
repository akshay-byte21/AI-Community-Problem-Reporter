import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { initDatabase, cacheReports, getCachedReports, getPendingReports } from '../services/sqliteService';
import { initSyncManager, syncPendingReports, addSyncListener } from '../services/syncManager';

// ReportsScreen: to handle client requests for ReportsScreen and it processes the request to interact with database/AI and returns a response
const ReportsScreen = ({ navigation, route }) => {
  const { userToken, API_URL } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [pendingReports, setPendingReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const filterCategory = route.params?.filter || null;

  // Initialize SQLite and background sync manager
  useEffect(() => {
    initDatabase();
    if (userToken && API_URL) {
      const unsub = initSyncManager(userToken, API_URL);
      syncPendingReports(userToken, API_URL);
      return unsub;
    }
  }, [userToken, API_URL]);

  // Listen to sync changes to refresh list
  useEffect(() => {
    const unsub = addSyncListener(async () => {
      const pending = await getPendingReports();
      setPendingReports(pending);
      const cached = await getCachedReports();
      if (cached && cached.length > 0) {
        setReports(cached);
      }
    });
    return unsub;
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [filterCategory])
  );

  // fetchReports: to handle client requests for fetchReports and it processes the request to interact with database/AI and returns a response
  const fetchReports = async () => {
    try {
      // 1. Immediately read from local SQLite cache for instant load
      const cached = await getCachedReports();
      if (cached && cached.length > 0) {
        let list = cached;
        if (filterCategory) {
          if (filterCategory === 'Others') {
            list = list.filter(r => !['Road', 'Garbage', 'Water', 'Street Light'].includes(r.category));
          } else {
            list = list.filter(r => r.category === filterCategory);
          }
        }
        setReports(list);
        setLoading(false);
      }

      // 2. Fetch pending offline reports
      const pending = await getPendingReports();
      setPendingReports(pending);

      // 3. Fetch fresh data from network
      const res = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 8000
      });
      let fetchedReports = res.data.reports || [];
      setIsOfflineMode(false);
      
      // Cache fresh reports into SQLite
      await cacheReports(fetchedReports);

      if (filterCategory) {
        if (filterCategory === 'Others') {
          fetchedReports = fetchedReports.filter(r => !['Road', 'Garbage', 'Water', 'Street Light'].includes(r.category));
        } else {
          fetchedReports = fetchedReports.filter(r => r.category === filterCategory);
        }
      }
      
      setReports(fetchedReports);
    } catch (e) {
      console.warn('Network error, serving from SQLite cache:', e.message);
      setIsOfflineMode(true);
      const cached = await getCachedReports();
      if (cached && cached.length > 0) {
        let list = cached;
        if (filterCategory) {
          if (filterCategory === 'Others') {
            list = list.filter(r => !['Road', 'Garbage', 'Water', 'Street Light'].includes(r.category));
          } else {
            list = list.filter(r => r.category === filterCategory);
          }
        }
        setReports(list);
      }
    } finally {
      setLoading(false);
    }
  };

  // formatDateTime: to handle client requests for formatDateTime and it processes the request to interact with database/AI and returns a response
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const reportDate = new Date(dateStr);
    return reportDate.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading && reports.length === 0 && pendingReports.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1B8C4A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{filterCategory ? `${filterCategory} Reports` : 'All Reports'}</Text>
          {isOfflineMode && (
            <Text style={styles.offlineSubtitle}>⚡ SQLite Offline Mode</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pending Offline Reports Section */}
        {pendingReports.length > 0 && !filterCategory && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Queued for Auto-Sync ({pendingReports.length})</Text>
            {pendingReports.map((item, idx) => (
              <View key={`pending-${idx}`} style={[styles.reportCard, styles.pendingCard]}>
                <View style={styles.reportImageContainer}>
                  {item.image_uri ? (
                    <Image source={{ uri: item.image_uri }} style={styles.reportImage} />
                  ) : (
                    <Ionicons name="image-outline" size={30} color="#9CA3AF" />
                  )}
                </View>
                <View style={styles.reportDetails}>
                  <Text style={styles.reportTitle}>{item.category || 'Civic Issue'}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={14} color="#6B7280" />
                    <Text style={styles.reportLocation} numberOfLines={1}>{item.address || 'GPS Tagged'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="cloud-upload-outline" size={12} color="#D97706" style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: '#D97706' }]}>Saved Offline (Syncing)</Text>
                  </View>
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>{formatDateTime(item.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Regular / Cached Reports Section */}
        <View style={styles.reportsContainer}>
          {reports.length > 0 ? reports.map((report, idx) => (
            <TouchableOpacity key={idx} style={styles.reportCard} onPress={() => navigation.navigate('StatusDetails', { report })}>
              <View style={styles.reportImageContainer}>
                {report.image_url ? (
                  <Image source={{uri: report.image_url.startsWith('http') ? report.image_url : `${API_URL}${report.image_url}`}} style={styles.reportImage} />
                ) : (
                  <Ionicons name="image-outline" size={30} color="#9CA3AF" />
                )}
              </View>
              
              <View style={styles.reportDetails}>
                <Text style={styles.reportTitle}>{report.category || 'Unknown Category'}</Text>
                
                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={14} color="#6B7280" />
                  <Text style={styles.reportLocation} numberOfLines={1}>{report.address || 'Unknown Location'}</Text>
                </View>

                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, { backgroundColor: (report.status === 'Completed' || report.status === 'Solved') ? '#10B981' : '#F59E0B' }]} />
                  <Text style={[styles.statusText, { color: (report.status === 'Completed' || report.status === 'Solved') ? '#10B981' : '#F59E0B' }]}>
                    {report.status || 'Pending'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatDateTime(report.created_at)}</Text>
              </View>
            </TouchableOpacity>
          )) : (
            pendingReports.length === 0 && (
              <Text style={styles.noReportsText}>No reports found.</Text>
            )
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  offlineSubtitle: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 1,
  },
  content: {
    padding: 16,
  },
  pendingSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFDF9',
  },
  reportsContainer: {
    flex: 1,
  },
  reportCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  reportImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  reportImage: {
    width: '100%',
    height: '100%',
  },
  reportDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  reportLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  noReportsText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#6B7280',
    fontSize: 16,
  },
});

export default ReportsScreen;
