import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

let db = null;
let useFallback = false;

// Initialize Citizen SQLite database and tables
export const initDatabase = async () => {
  try {
    if (SQLite.openDatabaseAsync) {
      db = await SQLite.openDatabaseAsync('citizen_offline.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cached_reports (
          id INTEGER PRIMARY KEY,
          category TEXT,
          description TEXT,
          address TEXT,
          lat REAL,
          lng REAL,
          status TEXT,
          image_url TEXT,
          resolution_image_url TEXT,
          created_at TEXT,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS offline_reports_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          image_uri TEXT,
          lat REAL,
          lng REAL,
          address TEXT,
          category TEXT,
          description TEXT,
          created_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          error_message TEXT
        );
      `);
      console.log('Citizen SQLite database initialized successfully.');
      return;
    }
  } catch (err) {
    console.warn('SQLite init failed in Citizen App, falling back to AsyncStorage:', err);
    useFallback = true;
  }
};

// Cache citizen's complaints in SQLite
export const cacheReports = async (reports) => {
  if (!reports || !Array.isArray(reports)) return;

  if (useFallback || !db) {
    try {
      await AsyncStorage.setItem('cached_citizen_reports', JSON.stringify(reports));
    } catch (e) {
      console.error('AsyncStorage cache error:', e);
    }
    return;
  }

  try {
    await db.execAsync('DELETE FROM cached_reports;');
    for (const r of reports) {
      await db.runAsync(
        `INSERT OR REPLACE INTO cached_reports 
         (id, category, description, address, lat, lng, status, image_url, resolution_image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          r.id,
          r.category || 'Civic Issue',
          r.description || '',
          r.address || '',
          r.lat || null,
          r.lng || null,
          r.status || 'Pending',
          r.image_url || '',
          r.resolution_image_url || '',
          r.created_at || '',
          new Date().toISOString()
        ]
      );
    }
  } catch (err) {
    console.error('Error caching reports in SQLite:', err);
  }
};

// Retrieve cached reports from SQLite
export const getCachedReports = async () => {
  if (useFallback || !db) {
    try {
      const data = await AsyncStorage.getItem('cached_citizen_reports');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  try {
    const rows = await db.getAllAsync('SELECT * FROM cached_reports ORDER BY id DESC;');
    return rows || [];
  } catch (err) {
    console.error('Error fetching cached reports from SQLite:', err);
    return [];
  }
};

// Queue a new civic report created while offline
export const queueOfflineReport = async ({ imageUri, location, address, category, description }) => {
  const timestamp = new Date().toISOString();
  const lat = location?.latitude || null;
  const lng = location?.longitude || null;

  if (useFallback || !db) {
    try {
      const existing = await AsyncStorage.getItem('offline_reports_queue');
      const list = existing ? JSON.parse(existing) : [];
      const newItem = {
        id: Date.now(),
        image_uri: imageUri,
        lat,
        lng,
        address: address || '',
        category: category || 'Pending AI Verification',
        description: description || 'Civic issue captured offline',
        created_at: timestamp,
        sync_status: 'pending'
      };
      list.push(newItem);
      await AsyncStorage.setItem('offline_reports_queue', JSON.stringify(list));
      return newItem;
    } catch (e) {
      console.error('AsyncStorage queue error:', e);
      return null;
    }
  }

  try {
    const res = await db.runAsync(
      `INSERT INTO offline_reports_queue 
       (image_uri, lat, lng, address, category, description, created_at, sync_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending');`,
      [imageUri, lat, lng, address || '', category || 'Pending AI Verification', description || 'Civic issue captured offline', timestamp]
    );
    return { id: res.lastInsertRowId, image_uri: imageUri, lat, lng, address };
  } catch (err) {
    console.error('Error queuing offline report in SQLite:', err);
    return null;
  }
};

// Get all pending reports in SQLite queue
export const getPendingReports = async () => {
  if (useFallback || !db) {
    try {
      const existing = await AsyncStorage.getItem('offline_reports_queue');
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      return [];
    }
  }

  try {
    const rows = await db.getAllAsync('SELECT * FROM offline_reports_queue WHERE sync_status = "pending" ORDER BY id ASC;');
    return rows || [];
  } catch (err) {
    console.error('Error fetching pending reports from SQLite:', err);
    return [];
  }
};

// Remove a report from queue after successful upload
export const removeReportFromQueue = async (id) => {
  if (useFallback || !db) {
    try {
      const existing = await AsyncStorage.getItem('offline_reports_queue');
      if (existing) {
        const list = JSON.parse(existing);
        const filtered = list.filter(item => item.id !== id);
        await AsyncStorage.setItem('offline_reports_queue', JSON.stringify(filtered));
      }
    } catch (e) {}
    return;
  }

  try {
    await db.runAsync('DELETE FROM offline_reports_queue WHERE id = ?;', [id]);
  } catch (err) {
    console.error('Error removing report from SQLite queue:', err);
  }
};
