import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const SubmitScreen = ({ navigation, route }) => {
  const { imageUri, location, address, aiCategory, aiDescription, department } = route.params;
  const { userToken, API_URL } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('category', aiCategory);
      formData.append('description', aiDescription);
      formData.append('address', address);
      formData.append('department', department || 'General Administration');
      formData.append('lat', location?.latitude || 0);
      formData.append('lng', location?.longitude || 0);
      
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('image', { uri: imageUri, name: filename, type });

      await axios.post(`${API_URL}/reports`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      setIsSubmitting(false);
      Alert.alert('Success', 'Complaint submitted successfully', [
        { text: 'OK', onPress: () => navigation.popToTop() }
      ]);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit complaint');
    }
  };

  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeString = currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' (IST)';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Issue</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Summary</Text>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>{aiCategory}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{address}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{aiDescription}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.label}>Reported on</Text>
            <Text style={styles.value}>{dateString} at {timeString}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Recommended Department</Text>
        <TouchableOpacity style={styles.departmentCard} activeOpacity={0.8}>
          <View style={styles.deptIconBg}>
            <Ionicons name="business" size={24} color="#1B8C4A" />
          </View>
          <View style={styles.deptInfo}>
            <Text style={styles.deptName}>{department || 'General Administration'}</Text>
            <Text style={styles.deptSub}>(Auto-assigned)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Submit Issue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    padding: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  value: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  departmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deptIconBg: {
    width: 48,
    height: 48,
    backgroundColor: '#ECFDF5',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deptInfo: {
    flex: 1,
    marginLeft: 16,
  },
  deptName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  deptSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  primaryButton: {
    backgroundColor: '#1B8C4A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#1B8C4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default SubmitScreen;

