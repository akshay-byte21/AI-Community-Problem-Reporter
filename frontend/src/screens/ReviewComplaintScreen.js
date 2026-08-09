import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ReviewComplaintScreen = ({ navigation, route }) => {
  const { imageUri, location, address, aiCategory, aiDescription, department } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Issue</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.imageContainer}>
          <Image source={{uri: imageUri}} style={styles.image} resizeMode="cover" />
          <TouchableOpacity style={styles.editImageBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="pencil" size={14} color="#1B8C4A" />
            <Text style={styles.editImageText}>Edit Image</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Detected Category (AI)</Text>
        <View style={styles.badgeWrapper}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{aiCategory}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>AI Generated Description</Text>
        <Text style={styles.descriptionText}>{aiDescription}</Text>

        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.locationContainer}>
          <View style={styles.locationIconBg}>
            <Ionicons name="location" size={20} color="#1B8C4A" />
          </View>
          <Text style={styles.locationText}>{address}</Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => navigation.navigate('Submit', route.params)}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  editImageBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editImageText: {
    color: '#1B8C4A',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeWrapper: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  categoryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  categoryText: {
    color: '#1B8C4A',
    fontWeight: 'bold',
    fontSize: 15,
  },
  descriptionText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
    marginBottom: 28,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  locationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    lineHeight: 22,
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
    flexDirection: 'row',
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
    marginRight: 8,
  }
});

export default ReviewComplaintScreen;
