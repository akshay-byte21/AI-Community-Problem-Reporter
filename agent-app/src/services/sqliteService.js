import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

let db = null;
let useFallback = false;

// Initialize SQLite database and tables
export const initDatabase = async () => {
  try {
    if (SQLite.openDatabaseAsync) {
      db = await SQLite.openDatabaseAsync('agent_offline.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS assigned_tasks (
          id INTEGER PRIMARY KEY,
          category TEXT,
          description TEXT,
          address TEXT,
          lat REAL,
          lng REAL,
          status TEXT,
          image_url TEXT,
          resolution_image_url TEXT,
          assigned_staff_id INTEGER,
          completed_at TEXT,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS resolution_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id INTEGER,
          image_uri TEXT,
          created_at TEXT,
          sync_status TEXT DEFAULT 'pending',
          error_message TEXT
        );
      `);
      console.log('Agent SQLite database initialized successfully.');
      return;
    }
  } catch (err) {
    console.warn('SQLite init failed, falling back to AsyncStorage storage engine:', err);
    useFallback = true;
  }
};

// Cache tasks list in SQLite
export const cacheAssignedTasks = async (tasks) => {
  if (!tasks || !Array.isArray(tasks)) return;

  if (useFallback || !db) {
    try {
      await AsyncStorage.setItem('cached_assigned_tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('AsyncStorage cache error:', e);
    }
    return;
  }

  try {
    await db.execAsync('DELETE FROM assigned_tasks;');
    for (const t of tasks) {
      await db.runAsync(
        `INSERT OR REPLACE INTO assigned_tasks 
         (id, category, description, address, lat, lng, status, image_url, resolution_image_url, assigned_staff_id, completed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          t.id,
          t.category || '',
          t.description || '',
          t.address || '',
          t.lat || null,
          t.lng || null,
          t.status || 'Assigned',
          t.image_url || '',
          t.resolution_image_url || '',
          t.assigned_staff_id || null,
          t.completed_at || '',
          new Date().toISOString()
        ]
      );
    }
  } catch (err) {
    console.error('Error caching assigned tasks in SQLite:', err);
  }
};

// Retrieve cached tasks from SQLite
export const getCachedTasks = async () => {
  if (useFallback || !db) {
    try {
      const data = await AsyncStorage.getItem('cached_assigned_tasks');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  try {
    const rows = await db.getAllAsync('SELECT * FROM assigned_tasks ORDER BY id DESC;');
    return rows || [];
  } catch (err) {
    console.error('Error fetching cached tasks from SQLite:', err);
    return [];
  }
};

// Queue a completed resolution locally when offline
export const queueResolution = async (reportId, imageUri) => {
  const timestamp = new Date().toISOString();

  if (useFallback || !db) {
    try {
      const existing = await AsyncStorage.getItem('resolution_queue');
      const list = existing ? JSON.parse(existing) : [];
      const newItem = {
        id: Date.now(),
        report_id: reportId,
        image_uri: imageUri,
        created_at: timestamp,
        sync_status: 'pending'
      };
      list.push(newItem);
      await AsyncStorage.setItem('resolution_queue', JSON.stringify(list));
      await markTaskLocallyResolved(reportId, imageUri);
      return newItem;
    } catch (e) {
      console.error('AsyncStorage queue error:', e);
      return null;
    }
  }

  try {
    const res = await db.runAsync(
      `INSERT INTO resolution_queue (report_id, image_uri, created_at, sync_status) VALUES (?, ?, ?, 'pending');`,
      [reportId, imageUri, timestamp]
    );
    await markTaskLocallyResolved(reportId, imageUri);
    return { id: res.lastInsertRowId, report_id: reportId, image_uri: imageUri };
  } catch (err) {
    console.error('Error queuing resolution in SQLite:', err);
    return null;
  }
};

// Mark task locally as resolved / pending sync
export const markTaskLocallyResolved = async (reportId, resolutionImageUri) => {
  if (useFallback || !db) {
    try {
      const data = await AsyncStorage.getItem('cached_assigned_tasks');
      if (data) {
        const tasks = JSON.parse(data);
        const updated = tasks.map(t => t.id === reportId ? { ...t, status: 'Pending Verification', resolution_image_url: resolutionImageUri } : t);
        await AsyncStorage.setItem('cached_assigned_tasks', JSON.stringify(updated));
      }
    } catch (e) {}
    return;
  }

  try {
    await db.runAsync(
      `UPDATE assigned_tasks SET status = 'Pending Verification', resolution_image_url = ? WHERE id = ?;`,
      [resolutionImageUri, reportId]
    );
  } catch (err) {
    console.error('Error marking task locally resolved in SQLite:', err);
  }
};

// Get all pending resolutions queued for sync
export const getPendingResolutions = async () => {
  if (useFallback || !db) {
    try {
      const existing = await AsyncStorage.getItem('resolution_queue');
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      return [];
    }
  }

  try {
    const rows = await db.getAllAsync('SELECT * FROM resolution_queue WHERE sync_status = "pending" ORDER BY id ASC;');
    return rows || [];
  } catch (err) {
    console.error('Error fetching pending resolutions from SQLite:', err);
    return [];
  }
};

// Remove a resolution from the queue after successful upload
export const removeResolutionFromQueue = async (id) => {
  if (useFallback || !db) {
    try {
      const existing = await AsyncStorage.getItem('resolution_queue');
      if (existing) {
        const list = JSON.parse(existing);
        const filtered = list.filter(item => item.id !== id);
        await AsyncStorage.setItem('resolution_queue', JSON.stringify(filtered));
      }
    } catch (e) {}
    return;
  }

  try {
    await db.runAsync('DELETE FROM resolution_queue WHERE id = ?;', [id]);
  } catch (err) {
    console.error('Error removing resolution from SQLite queue:', err);
  }
};
