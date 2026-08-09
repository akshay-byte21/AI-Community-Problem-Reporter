import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const ReportsScreen = ({ navigation, route }) => {
  const { userToken, API_URL } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const filterCategory = route.params?.filter || null;

  useEffect(() => {
    fetchReports();
  }, [filterCategory]);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      let fetchedReports = res.data.reports || [];
      
      if (filterCategory) {
        if (filterCategory === 'Others') {
          fetchedReports = fetchedReports.filter(r => !['Road', 'Garbage', 'Water', 'Street Light'].includes(r.category));
        } else {
          fetchedReports = fetchedReports.filter(r => r.category === filterCategory);
        }
      }
      
      setReports(fetchedReports);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
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

  if (loading) {
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
        <Text style={styles.headerTitle}>{filterCategory ? `${filterCategory} Reports` : 'All Reports'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.noReportsText}>No reports found.</Text>
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
  content: {
    padding: 20,
  },
  reportsContainer: {
    marginBottom: 20,
  },
  reportCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reportImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  reportImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reportDetails: {
    flex: 1,
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
    marginBottom: 8,
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  noReportsText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 20,
  }
});

export default ReportsScreen;
