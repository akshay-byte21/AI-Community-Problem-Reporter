import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { 
  getPendingReports, 
  removeReportFromQueue, 
  cacheReports 
} from './sqliteService';

let isSyncing = false;
let syncListeners = new Set();

export const addSyncListener = (callback) => {
  syncListeners.add(callback);
  return () => syncListeners.delete(callback);
};

const notifyListeners = (state) => {
  syncListeners.forEach(cb => {
    try {
      cb(state);
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
};

// Sync all pending offline reports stored in SQLite
export const syncPendingReports = async (userToken, API_URL) => {
  if (isSyncing || !userToken || !API_URL) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const pending = await getPendingReports();
  if (pending.length === 0) {
    notifyListeners({ isSyncing: false, pendingCount: 0 });
    return;
  }

  isSyncing = true;
  notifyListeners({ isSyncing: true, pendingCount: pending.length });

  let successCount = 0;

  for (const item of pending) {
    try {
      let finalCategory = item.category;
      let finalDescription = item.description;

      // 1. If the item was saved offline before AI classification could run:
      if (!finalCategory || finalCategory === 'Pending AI Verification') {
        try {
          const aiFormData = new FormData();
          aiFormData.append('image', { uri: item.image_uri, name: 'photo.jpg', type: 'image/jpeg' });
          if (item.lat && item.lng) {
            aiFormData.append('latitude', item.lat);
            aiFormData.append('longitude', item.lng);
          }
          if (item.address) aiFormData.append('address', item.address);

          const aiRes = await axios.post(`${API_URL}/analyze-image`, aiFormData, {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userToken}` },
            timeout: 20000
          });

          if (aiRes.data && aiRes.data.category) {
            finalCategory = aiRes.data.category;
            finalDescription = aiRes.data.description || item.description;
          }
        } catch (aiErr) {
          console.warn('AI analysis failed during background sync, proceeding with default category:', aiErr.message);
          finalCategory = 'Road'; // Sensible fallback
        }
      }

      // 2. Submit report to backend
      const reportFormData = new FormData();
      reportFormData.append('image', { uri: item.image_uri, name: 'report.jpg', type: 'image/jpeg' });
      reportFormData.append('category', finalCategory || 'Civic Issue');
      reportFormData.append('description', finalDescription || 'Community issue reported via offline sync');
      if (item.address) reportFormData.append('address', item.address);
      if (item.lat) reportFormData.append('latitude', item.lat);
      if (item.lng) reportFormData.append('longitude', item.lng);

      await axios.post(`${API_URL}/reports`, reportFormData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userToken}` },
        timeout: 30000
      });

      await removeReportFromQueue(item.id);
      successCount++;
    } catch (err) {
      console.warn(`Sync failed for report #${item.id}:`, err?.response?.data || err.message);
    }
  }

  // If reports succeeded, pull fresh reports to update local SQLite cache
  if (successCount > 0) {
    try {
      const res = await axios.get(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 10000
      });
      if (res.data && res.data.reports) {
        await cacheReports(res.data.reports);
      }
    } catch (e) {}
  }

  const remaining = await getPendingReports();
  isSyncing = false;
  notifyListeners({ isSyncing: false, pendingCount: remaining.length, justSyncedCount: successCount });
};

// Set up automatic network observer
export const initSyncManager = (userToken, API_URL) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingReports(userToken, API_URL);
    }
  });

  return unsubscribe;
};
