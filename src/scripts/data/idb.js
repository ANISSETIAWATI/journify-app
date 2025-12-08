// Simple IndexedDB helper for saved stories
const DB_NAME = 'journify-db';
const DB_VERSION = 4; // Increment version for offline push notifications
const STORE_NAME = 'saved-stories';
const FAVORITES_STORE = 'favorites';
const PENDING_SYNC_STORE = 'pending-sync';
const OFFLINE_NOTIFICATIONS_STORE = 'offline-notifications';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-date', 'createdAt');
      }
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        db.createObjectStore(FAVORITES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_SYNC_STORE)) {
        const syncStore = db.createObjectStore(PENDING_SYNC_STORE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('by-type', 'type');
        syncStore.createIndex('by-timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains(OFFLINE_NOTIFICATIONS_STORE)) {
        const notificationStore = db.createObjectStore(OFFLINE_NOTIFICATIONS_STORE, { keyPath: 'id', autoIncrement: true });
        notificationStore.createIndex('by-timestamp', 'timestamp');
        notificationStore.createIndex('by-type', 'type');
      }
    };
  });
}

async function putStory(story) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(story);
    req.onsuccess = () => resolve(story);
    req.onerror = () => reject(req.error);
  });
}

async function getAllSavedStories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteSavedStory(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function getSavedStory(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllStories() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function addFavorite(storyId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_STORE, 'readwrite');
    const store = tx.objectStore(FAVORITES_STORE);
    const req = store.put({ id: storyId });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function removeFavorite(storyId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_STORE, 'readwrite');
    const store = tx.objectStore(FAVORITES_STORE);
    const req = store.delete(storyId);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function isFavorite(storyId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_STORE, 'readonly');
    const store = tx.objectStore(FAVORITES_STORE);
    const req = store.get(storyId);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFavorites() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FAVORITES_STORE, 'readonly');
    const store = tx.objectStore(FAVORITES_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// Pending sync functions
async function addPendingSync(syncData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_SYNC_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_SYNC_STORE);
    const req = store.add({
      ...syncData,
      timestamp: Date.now(),
      status: 'pending'
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getPendingSync() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_SYNC_STORE, 'readonly');
    const store = tx.objectStore(PENDING_SYNC_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removePendingSync(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_SYNC_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_SYNC_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function updatePendingSyncStatus(id, status) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_SYNC_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_SYNC_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const item = req.result;
      if (item) {
        item.status = status;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve(false);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function updateStorySyncStatus(storyId, isSynced) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(storyId);
    req.onsuccess = () => {
      const story = req.result;
      if (story) {
        story.isSynced = isSynced;
        story.syncedAt = new Date().toISOString();
        const putReq = store.put(story);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve(false);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// Offline notifications functions
async function addOfflineNotification(notificationData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_NOTIFICATIONS_STORE);
    const req = store.add({
      ...notificationData,
      timestamp: Date.now(),
      shown: false
    });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOfflineNotifications() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_NOTIFICATIONS_STORE, 'readonly');
    const store = tx.objectStore(OFFLINE_NOTIFICATIONS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function getUnshownOfflineNotifications() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_NOTIFICATIONS_STORE, 'readonly');
    const store = tx.objectStore(OFFLINE_NOTIFICATIONS_STORE);
    const index = store.index('by-timestamp');
    const req = index.openCursor();
    const results = [];
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (!cursor.value.shown) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function markOfflineNotificationAsShown(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_NOTIFICATIONS_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const notification = req.result;
      if (notification) {
        notification.shown = true;
        const putReq = store.put(notification);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve(false);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function removeOfflineNotification(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_NOTIFICATIONS_STORE, 'readwrite');
    const store = tx.objectStore(OFFLINE_NOTIFICATIONS_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export default {
  openDB,
  putStory,
  getAllSavedStories,
  deleteSavedStory,
  getSavedStory,
  getAllStories,
  addFavorite,
  removeFavorite,
  isFavorite,
  getAllFavorites,
  addPendingSync,
  getPendingSync,
  removePendingSync,
  updatePendingSyncStatus,
  addOfflineNotification,
  getOfflineNotifications,
  getUnshownOfflineNotifications,
  markOfflineNotificationAsShown,
  removeOfflineNotification,
};
