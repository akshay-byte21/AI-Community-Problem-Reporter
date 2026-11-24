import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { 
  getPendingResolutions, 
  removeResolutionFromQueue, 
  cacheAssignedTasks 
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

// Sync all pending resolutions stored in SQLite
export const syncPendingResolutions = async (userToken, API_URL) => {
  if (isSyncing || !userToken || !API_URL) return;

  const net = await NetInfo.fetch();
  if (!net.isConnected) return;

  const pending = await getPendingResolutions();
  if (pending.length === 0) {
    notifyListeners({ isSyncing: false, pendingCount: 0 });
    return;
  }

  isSyncing = true;
  notifyListeners({ isSyncing: true, pendingCount: pending.length });

  let successCount = 0;

  for (const item of pending) {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: item.image_uri,
        name: 'resolution.jpg',
        type: 'image/jpeg'
      });
      formData.append('reportId', item.report_id);

      await axios.post(`${API_URL}/agent/resolve`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userToken}`
        },
        timeout: 25000
      });

      await removeResolutionFromQueue(item.id);
      successCount++;
    } catch (err) {
      console.warn(`Sync failed for report #${item.report_id}:`, err?.response?.data || err.message);
    }
  }

  // If at least one resolution succeeded, pull fresh reports to update SQLite cache
  if (successCount > 0) {
    try {
      const res = await axios.get(`${API_URL}/agent/reports`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 10000
      });
      if (res.data) {
        await cacheAssignedTasks(res.data);
      }
    } catch (e) {}
  }

  const remaining = await getPendingResolutions();
  isSyncing = false;
  notifyListeners({ isSyncing: false, pendingCount: remaining.length, justSyncedCount: successCount });
};

// Set up automatic network observer
export const initSyncManager = (userToken, API_URL) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingResolutions(userToken, API_URL);
    }
  });

  return unsubscribe;
};
