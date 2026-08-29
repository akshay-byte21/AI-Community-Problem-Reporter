import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, Platform, StatusBar } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const DashboardScreen = ({ navigation }) => {
  const { userToken, agent, logout, API_URL } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await axios.get(`${API_URL}/agent/reports`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setReports(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, [userToken, API_URL]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchReports);
    return unsubscribe;
  }, [navigation, fetchReports]);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('Resolution', { report: item })}
    >
      <View style={styles.header}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={[styles.status, item.status === 'Solved' || item.status === 'Pending Verification' ? styles.statusGreen : styles.statusOrange]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.address}>📍 {item.address || 'Location provided'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>My Assigned Tasks</Text>
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logout: { color: '#ef4444', fontWeight: 'bold' },
  welcome: { paddingHorizontal: 20, fontSize: 16, color: '#666', marginBottom: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  category: { fontWeight: 'bold', fontSize: 16, color: '#1f2937' },
  status: { fontWeight: 'bold', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  statusOrange: { backgroundColor: '#fef3c7', color: '#d97706' },
  statusGreen: { backgroundColor: '#d1fae5', color: '#059669' },
  desc: { color: '#4b5563', marginBottom: 10 },
  address: { color: '#6b7280', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#9ca3af' }
});

export default DashboardScreen;
