import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const TrackScreen = ({ navigation }) => {
  const { userToken, API_URL } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('Active');
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      // Sort by newest first
      const sorted = res.data.reports.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      setReports(sorted);
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReports();
    }, [userToken])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const filteredReports = reports.filter(r => {
    if (activeTab === 'Active') {
      return r.status !== 'Completed' && r.status !== 'Solved';
    } else {
      return r.status === 'Completed' || r.status === 'Solved';
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Complaints</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Active' && styles.activeTab]}
          onPress={() => setActiveTab('Active')}
        >
          <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Solved' && styles.activeTab]}
          onPress={() => setActiveTab('Solved')}
        >
          <Text style={[styles.tabText, activeTab === 'Solved' && styles.activeTabText]}>Solved</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1B8C4A" />}
      >
        {filteredReports.map((report, idx) => {
          // Simulate alternating card styles if needed, or based on status
          // In mockup: first is green bg, second is white bg. Let's make "Pending" green, others white for distinction.
          const isPending = report.status === 'Pending' || report.status === 'Under Review';
          const cardStyle = isPending ? styles.cardGreen : styles.cardWhite;
          const textPrimary = isPending ? '#fff' : '#111827';
          const textSecondary = isPending ? 'rgba(255,255,255,0.8)' : '#6B7280';
          const iconBg = isPending ? 'rgba(255,255,255,0.2)' : '#F3F4F6';
          const iconColor = isPending ? '#fff' : '#1B8C4A';
          const badgeBg = isPending ? '#fff' : '#1B8C4A';
          const badgeColor = isPending ? '#1B8C4A' : '#fff';

          // Extract date correctly
          const dateObj = new Date(report.created_at);
          const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const fakeId = `CPR${dateObj.getTime().toString().substring(5, 10)}`;

          return (
            <TouchableOpacity 
              key={report.id || idx} 
              style={[styles.card, cardStyle]}
              onPress={() => navigation.navigate('StatusDetails', { report })}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  <Ionicons name="document-text" size={24} color={iconColor} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.complaintIdLabel, { color: textSecondary }]}>Complaint ID</Text>
                  <Text style={[styles.idText, { color: textPrimary }]}>{fakeId}</Text>
                  <Text style={[styles.dateText, { color: textSecondary }]}>Submitted on {dateStr}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.statusText, { color: badgeColor }]}>{report.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )
        })}

        {filteredReports.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} complaints found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1B8C4A',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#1B8C4A',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardGreen: {
    backgroundColor: '#1B8C4A',
    borderColor: '#1B8C4A',
    shadowColor: '#1B8C4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardWhite: {
    backgroundColor: '#fff',
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    marginLeft: 16,
    flex: 1,
  },
  complaintIdLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  idText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#9CA3AF',
    fontSize: 16,
  }
});

export default TrackScreen;
