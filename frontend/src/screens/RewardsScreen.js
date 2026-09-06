import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const REWARDS = [
  { id: 1, name: 'Free Bus Pass (1 Day)', cost: 100, icon: 'bus-outline', color: '#3B82F6' },
  { id: 2, name: 'Metro Ticket (1 Ride)', cost: 200, icon: 'train-outline', color: '#8B5CF6' },
  { id: 3, name: '5% Property Tax Discount', cost: 1000, icon: 'home-outline', color: '#10B981' },
  { id: 4, name: 'Civic Hero Certificate', cost: 2000, icon: 'ribbon-outline', color: '#F59E0B' },
];

const RewardsScreen = ({ navigation }) => {
  const { userToken, API_URL } = useContext(AuthContext);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    try {
      const res = await axios.get(`${API_URL}/user`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setPoints(res.data.points || 0);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load points.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (reward) => {
    if (points < reward.cost) {
      Alert.alert('Not Enough Points', `You need ${reward.cost - points} more points to claim this reward!`);
      return;
    }

    Alert.alert(
      'Confirm Claim',
      `Are you sure you want to spend ${reward.cost} points for "${reward.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Claim', 
          onPress: async () => {
            setClaiming(true);
            try {
              const res = await axios.post(`${API_URL}/user/claim-reward`, {
                cost: reward.cost,
                rewardName: reward.name
              }, {
                headers: { Authorization: `Bearer ${userToken}` }
              });
              Alert.alert('🎉 Success!', res.data.message);
              fetchPoints(); // Refresh points
            } catch (e) {
              console.error(e);
              Alert.alert('Error', e.response?.data?.error || 'Failed to claim reward.');
            } finally {
              setClaiming(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rewards Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.pointsHeader}>
        <Text style={styles.pointsLabel}>Your Civic Points</Text>
        <View style={styles.pointsBadge}>
          <Ionicons name="star" size={28} color="#F59E0B" style={{marginRight: 8}} />
          <Text style={styles.pointsText}>{points}</Text>
        </View>
        <Text style={styles.pointsSubtitle}>Earn +50 points for every reported issue that gets verified and solved!</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Available Rewards</Text>
        
        {REWARDS.map(reward => (
          <View key={reward.id} style={styles.rewardCard}>
            <View style={[styles.rewardIcon, { backgroundColor: reward.color + '20' }]}>
              <Ionicons name={reward.icon} size={28} color={reward.color} />
            </View>
            
            <View style={styles.rewardDetails}>
              <Text style={styles.rewardName}>{reward.name}</Text>
              <Text style={styles.rewardCost}>{reward.cost} Points</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.claimButton, points < reward.cost && styles.claimButtonDisabled]}
              onPress={() => handleClaim(reward)}
              disabled={claiming || points < reward.cost}
            >
              <Text style={styles.claimButtonText}>Claim</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  iconButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  pointsHeader: {
    backgroundColor: '#fff', padding: 24, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 16
  },
  pointsLabel: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pointsText: { fontSize: 42, fontWeight: 'bold', color: '#D97706' },
  pointsSubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  rewardCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 16,
    marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  rewardIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rewardDetails: { flex: 1 },
  rewardName: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  rewardCost: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },
  claimButton: { backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  claimButtonDisabled: { backgroundColor: '#E5E7EB' },
  claimButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});

export default RewardsScreen;
