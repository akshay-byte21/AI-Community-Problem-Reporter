import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Modal, Animated, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const { userToken, API_URL, logout } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [userName, setUserName] = useState('User');

  // Sidebar Menu State
  const [menuVisible, setMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-Dimensions.get('window').width));

  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(slideAnim, {
        toValue: -Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    fetchUser();
    fetchReports();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchReports();
    }, [userToken])
  );

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/user`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (res.data.name) {
        setUserName(res.data.name);
      }
    } catch (e) {
      console.log('Failed to fetch user', e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setAllReports(res.data.reports || []);
      setReports((res.data.reports || []).slice(0, 3));
    } catch (e) {
      console.error(e);
    }
  };

  const getCategoryCount = (catName) => {
    if (catName === 'Others') {
      return allReports.filter(r => !['Road', 'Garbage', 'Water', 'Street Light'].includes(r.category)).length;
    }
    return allReports.filter(r => r.category === catName).length;
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

  const categories = [
    { name: 'Road', icon: 'car-outline', bgColor: '#E8F0FE', iconColor: '#1A73E8' },
    { name: 'Garbage', icon: 'trash-outline', bgColor: '#FCE8E6', iconColor: '#EA4335' },
    { name: 'Water', icon: 'water-outline', bgColor: '#E0F7FA', iconColor: '#00ACC1' },
    { name: 'Street Light', icon: 'bulb-outline', bgColor: '#FFF9C4', iconColor: '#FBC02D' },
    { name: 'Others', icon: 'grid-outline', bgColor: '#F1F3F4', iconColor: '#5F6368' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleMenu}>
            <Ionicons name="menu-outline" size={32} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.greeting}>Hello, {userName}! 👋</Text>
            <Text style={styles.subGreeting}>Let's make our community better</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Report Banner */}
        <TouchableOpacity style={styles.reportBanner} onPress={() => navigation.navigate('Camera')}>
          <View style={styles.bannerIconWrapper}>
            <Ionicons name="camera" size={28} color="#1B8C4A" />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Report a Problem</Text>
            <Text style={styles.bannerSubtitle}>Capture an image and describe the issue</Text>
          </View>
          <View style={styles.bannerArrow}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {categories.map((cat, index) => {
            const count = getCategoryCount(cat.name);
            return (
              <TouchableOpacity key={index} style={styles.categoryItem} onPress={() => navigation.navigate('Reports', { filter: cat.name })}>
                <View style={[styles.categoryIconBg, { backgroundColor: cat.bgColor }]}>
                  <Ionicons name={cat.icon} size={28} color={cat.iconColor} />
                  {count > 0 && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{count}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recent Reports Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

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
                  <View style={[styles.statusDot, { backgroundColor: report.status === 'Solved' ? '#10B981' : '#F59E0B' }]} />
                  <Text style={[styles.statusText, { color: report.status === 'Solved' ? '#10B981' : '#F59E0B' }]}>
                    {report.status || 'In Progress'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>{formatDateTime(report.created_at)}</Text>
              </View>
            </TouchableOpacity>
          )) : (
            <Text style={styles.noReportsText}>No recent reports</Text>
          )}
        </View>
        
        {/* Padding for custom bottom tab bar */}
        <View style={{height: 100}} />
      </ScrollView>

      {/* Slide-out Sidebar Modal */}
      <Modal visible={menuVisible} transparent={true} animationType="none" onRequestClose={toggleMenu}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={toggleMenu} activeOpacity={1} />
          <Animated.View style={[styles.drawerMenu, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.drawerHeader}>
              <Ionicons name="person-circle-outline" size={64} color="#1B8C4A" />
              <Text style={styles.drawerTitle}>{userName}</Text>
              <Text style={styles.drawerSubtitle}>Welcome back!</Text>
            </View>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleMenu(); navigation.navigate('Profile'); }}>
              <Ionicons name="settings-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleMenu(); navigation.navigate('Reports'); }}>
              <Ionicons name="document-text-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>My Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleMenu(); import('react-native').then(rn => rn.Alert.alert('Help & Support', 'Help & Support section coming soon!')); }}>
              <Ionicons name="help-circle-outline" size={24} color="#333" />
              <Text style={styles.drawerItemText}>Help & Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={() => { toggleMenu(); logout && logout(); }}>
              <Ionicons name="log-out-outline" size={24} color="#E53E3E" />
              <Text style={[styles.drawerItemText, {color: '#E53E3E'}]}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  subGreeting: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  reportBanner: {
    backgroundColor: '#1B8C4A',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#1B8C4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bannerIconWrapper: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: '#E6F4EA',
    fontSize: 12,
    lineHeight: 16,
  },
  bannerArrow: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewAllText: {
    color: '#1B8C4A',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingBottom: 10,
    marginBottom: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  categoryIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  categoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCloseArea: {
    flex: 1,
  },
  drawerMenu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: Dimensions.get('window').width * 0.75,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  drawerHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  drawerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    fontWeight: '500',
  }
});

export default HomeScreen;

