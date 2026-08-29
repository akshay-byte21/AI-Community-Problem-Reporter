import React, {useContext, useState} from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Alert, Platform, StatusBar, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const StatusDetailsScreen = ({ navigation, route }) => {
  const { report } = route.params;
  const { API_URL, userToken } = useContext(AuthContext);
  const [currentStatus, setCurrentStatus] = useState(report.status || 'Pending');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Parse date and calculate future expected dates
  const dateObj = new Date(report.created_at);
  
  const formatDate = (date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const submittedDateStr = `${formatDate(dateObj)}, ${formatTime(dateObj)}`;
  
  const reviewDate = new Date(dateObj.getTime() + 1 * 24 * 60 * 60 * 1000); // +1 day
  const progressDate = new Date(dateObj.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
  const completedDate = new Date(dateObj.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days

  const getStepStatus = (stepName) => {
    const mappedStatus = currentStatus === 'Pending Verification' ? 'Completed' : currentStatus;
    const order = ['Pending', 'Under Review', 'In Progress', 'Completed', 'Solved'];
    const currentIndex = order.indexOf(mappedStatus);
    const stepIndex = order.indexOf(stepName);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getActualOrExpected = (dbDate, fallbackDate, stepName) => {
    const status = getStepStatus(stepName);
    if (status === 'completed' || status === 'current') {
      return dbDate ? `${formatDate(new Date(dbDate))}, ${formatTime(new Date(dbDate))}` : formatDate(fallbackDate);
    }
    return `Expected: ${formatDate(fallbackDate)}`;
  };

  const steps = [
    { title: 'Complaint Submitted', date: submittedDateStr, statusName: 'Pending' },
    { title: 'Under Review', date: getActualOrExpected(report.reviewed_at, reviewDate, 'Under Review'), statusName: 'Under Review' },
    { title: 'In Progress', date: getActualOrExpected(report.progress_at, progressDate, 'In Progress'), statusName: 'In Progress' },
    { title: 'Completed', date: getActualOrExpected(report.completed_at, completedDate, 'Completed'), statusName: 'Completed' },
    { title: 'Solved', date: currentStatus === 'Solved' ? (report.solved_at ? `${formatDate(new Date(report.solved_at))}, ${formatTime(new Date(report.solved_at))}` : 'Confirmed by you') : 'Awaiting Confirmation', statusName: 'Solved' }
  ];

  const handleMarkCompleted = async () => {
    setIsUpdating(true);
    try {
      await axios.put(`${API_URL}/reports/${report.id}/complete`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setCurrentStatus('Solved');
      Alert.alert('Success', 'Thank you for confirming the resolution!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to mark as solved.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReopen = async () => {
    setIsUpdating(true);
    try {
      await axios.put(`${API_URL}/reports/${report.id}/reopen`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      setCurrentStatus('Pending');
      Alert.alert('Report Reopened', 'The department has been notified that the issue is still pending.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to reopen report.');
    } finally {
      setIsUpdating(false);
    }
  };

  const TimelineItem = ({ item, isLast, status }) => {
    let iconName = 'checkmark';
    let iconColor = '#fff';
    let circleColor = '#1B8C4A';
    let circleBorder = '#1B8C4A';
    
    if (status === 'pending') {
      iconName = 'ellipse';
      iconColor = '#fff';
      circleColor = '#fff';
      circleBorder = '#D1D5DB';
    } else if (status === 'current') {
      iconName = 'radio-button-on';
      iconColor = '#1B8C4A';
      circleColor = '#ECFDF5';
      circleBorder = '#1B8C4A';
    }

    return (
      <View style={styles.timelineItem}>
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineCircle, { backgroundColor: circleColor, borderColor: circleBorder }]}>
             <Ionicons name={iconName} size={14} color={iconColor} />
          </View>
          {!isLast && <View style={[styles.timelineLine, status === 'completed' ? styles.timelineLineActive : styles.timelineLineInactive]} />}
        </View>
        <View style={styles.timelineContent}>
          <Text style={[styles.timelineTitle, status === 'pending' && styles.timelineTitlePending]}>{item.title}</Text>
          <Text style={styles.timelineDate}>{item.date}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Status</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {report.image_url && (
          <View style={styles.uploadedImageContainer}>
            <TouchableOpacity onPress={() => setSelectedImage({ uri: report.image_url.startsWith('http') ? report.image_url : `${API_URL}${report.image_url}` })}>
              <Image 
                source={{ uri: report.image_url.startsWith('http') ? report.image_url : `${API_URL}${report.image_url}` }} 
                style={styles.uploadedImage} 
                resizeMode="cover" 
              />
            </TouchableOpacity>
          </View>
        )}

        {report.resolution_image_url && (
          <View style={[styles.uploadedImageContainer, { borderColor: '#10B981', borderWidth: 2, height: 'auto', paddingBottom: 10 }]}>
            <Text style={{ textAlign: 'center', padding: 10, fontWeight: 'bold', color: '#10B981' }}>Solution validation</Text>
            <TouchableOpacity onPress={() => setSelectedImage({ uri: report.resolution_image_url.startsWith('http') ? report.resolution_image_url : `${API_URL}${report.resolution_image_url}` })}>
              <Image 
                source={{ uri: report.resolution_image_url.startsWith('http') ? report.resolution_image_url : `${API_URL}${report.resolution_image_url}` }} 
                style={[styles.uploadedImage, {height: 200}]} 
                resizeMode="cover" 
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.timelineContainer}>
          {steps.map((step, idx) => (
            <TimelineItem 
              key={idx} 
              item={step} 
              isLast={idx === steps.length - 1} 
              status={getStepStatus(step.statusName)} 
            />
          ))}
        </View>

        <View style={styles.banner}>
          <Image 
             source={require('../../assets/status_banner.jpg')} 
             style={styles.bannerImage} 
             resizeMode="cover"
          />
          <View style={styles.bannerTextContainer}>
             {currentStatus === 'Completed' || currentStatus === 'Pending Verification' ? (
               <>
                 <Text style={styles.bannerTitle}>Did we fix it?</Text>
                 <Text style={styles.bannerSubtitle}>The administration has marked this as completed. Please confirm.</Text>
                 <View style={styles.actionRow}>
                   <TouchableOpacity 
                      style={[styles.actionBtn, styles.solvedBtn]} 
                      onPress={handleMarkCompleted}
                      disabled={isUpdating}
                    >
                     <Text style={styles.actionBtnText}>{isUpdating ? 'Wait...' : 'Yes, Solved'}</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                      style={[styles.actionBtn, styles.pendingBtn]} 
                      onPress={handleReopen}
                      disabled={isUpdating}
                    >
                     <Text style={[styles.actionBtnText, styles.pendingBtnText]}>{isUpdating ? 'Wait...' : 'No, Still Pending'}</Text>
                   </TouchableOpacity>
                 </View>
               </>
             ) : currentStatus === 'Solved' ? (
               <>
                 <Text style={styles.bannerTitle}>Issue Solved</Text>
                 <Text style={styles.bannerSubtitle}>Thank you for helping keep our community safe!</Text>
               </>
             ) : (
               <>
                 <Text style={styles.bannerTitle}>Your issue is being reviewed</Text>
                 <Text style={styles.bannerSubtitle}>The concerned department has been notified.</Text>
               </>
             )}
          </View>
        </View>

      </ScrollView>

      {/* Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <TouchableOpacity style={{ padding: 20, alignSelf: 'flex-end' }} onPress={() => setSelectedImage(null)}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage.uri }} 
              style={{ flex: 1, width: '100%' }} 
              resizeMode="contain" 
            />
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  uploadedImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  timelineContainer: {
    marginBottom: 40,
    marginTop: 10,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 30,
    marginRight: 16,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: -2,
    zIndex: 1,
  },
  timelineLineActive: {
    backgroundColor: '#1B8C4A',
  },
  timelineLineInactive: {
    backgroundColor: '#E5E7EB',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 32,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  timelineTitlePending: {
    color: '#6B7280',
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  banner: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    paddingBottom: 24,
  },
  bannerImage: {
    width: '100%',
    height: 180,
  },
  bannerTextContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  solvedBtn: {
    backgroundColor: '#1B8C4A',
  },
  pendingBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  pendingBtnText: {
    color: '#374151',
  }
});

export default StatusDetailsScreen;
