// Sync Manager for handling offline-to-online data synchronization
import TheStoryApiSource from './thestoryapi-source';
import IDB from './idb';

class SyncManager {
  constructor(idb) {
    this.idb = idb;
    this.isOnline = navigator.onLine;
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[SyncManager] Connection restored, starting sync...');
      this.isOnline = true;
      this.syncPendingData();
      this.showOfflineNotifications();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncManager] Connection lost');
      this.isOnline = false;
    });

    // Also listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'sync-stories') {
          this.syncPendingData();
        }
      });
    }

    // Initial sync check
    if (this.isOnline) {
      this.syncPendingData();
      this.showOfflineNotifications();
    }
  }

  async syncPendingData() {
    if (!this.isOnline) {
      console.log('[SyncManager] Skipping sync - offline');
      return;
    }

    try {
      const pendingItems = await this.idb.getPendingSync();

      if (pendingItems.length === 0) {
        console.log('[SyncManager] No pending sync items');
        return;
      }

      console.log(`[SyncManager] Found ${pendingItems.length} pending sync items`);

      let successCount = 0;
      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item);
          await this.idb.updatePendingSyncStatus(item.id, 'completed');
          await this.idb.removePendingSync(item.id);
          console.log(`[SyncManager] Successfully synced item ${item.id}`);
          successCount++;
        } catch (error) {
          console.error(`[SyncManager] Failed to sync item ${item.id}:`, error);
          await this.idb.updatePendingSyncStatus(item.id, 'failed');

          // Remove failed items to prevent infinite retries
          await this.idb.removePendingSync(item.id);
          console.log(`[SyncManager] Removed failed sync item ${item.id} to prevent infinite retries`);
        }
      }

      // Show success notification with push notification
      if (successCount > 0) {
        window.showToast && window.showToast(`${successCount} cerita berhasil disinkronkan!`, 'success');

        // Send push notification for successful sync
        if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('Sinkronisasi Berhasil', {
              body: `${successCount} cerita offline telah dikirim ke server.`,
              icon: '/images/logo.png',
              badge: '/images/logo.png',
              tag: 'sync-success',
              vibrate: [200, 100, 200],
              actions: [
                { action: 'view', title: 'Lihat Cerita' }
              ]
            });
          });
        }

        // Push notification via API removed to prevent duplicates
        // Notifications are now handled only through service worker
      }

    } catch (error) {
      console.error('[SyncManager] Error during sync:', error);
    }
  }

  async processSyncItem(item) {
    switch (item.type) {
      case 'add-story':
        await this.syncAddStory(item);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  async syncAddStory(item) {
    const { data, offlineId } = item;

    // Create FormData for API submission
    const formData = new FormData();
    formData.append('description', data.description);
    formData.append('lat', data.lat);
    formData.append('lon', data.lon);

    if (data.photo) {
      formData.append('photo', data.photo);
    }

    // Send to API
    const response = await TheStoryApiSource.addNewStory(formData);

    // Update the offline story to mark it as synced (don't delete, keep in history)
    if (response && response.story) {
      await this.idb.updateStorySyncStatus(offlineId, true);
      console.log(`Story ${offlineId} marked as synced and kept in history`);
    }

    return response;
  }

  // Manual sync trigger
  async forceSync() {
    console.log('[SyncManager] Manual sync triggered');
    await this.syncPendingData();
  }

  // Show offline notifications when coming back online
  async showOfflineNotifications() {
    if (!this.isOnline) {
      console.log('[SyncManager] Skipping offline notifications - offline');
      return;
    }

    try {
      const unshownNotifications = await this.idb.getUnshownOfflineNotifications();

      if (unshownNotifications.length === 0) {
        console.log('[SyncManager] No unshown offline notifications');
        return;
      }

      console.log(`[SyncManager] Found ${unshownNotifications.length} unshown offline notifications`);

      for (const notification of unshownNotifications) {
        try {
          // Show notification using service worker
          if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(registration => {
              registration.showNotification(notification.title || 'Notifikasi Offline', {
                body: notification.body || 'Ada notifikasi yang diterima saat offline.',
                icon: notification.icon || '/images/logo.png',
                badge: notification.badge || '/images/logo.png',
                data: notification.data || {},
                tag: notification.tag || 'offline-notification',
                vibrate: notification.vibrate || [100, 50, 100],
                actions: notification.actions || [
                  { action: 'view', title: 'Lihat' }
                ]
              });
            });
          }

          // Mark as shown
          await this.idb.markOfflineNotificationAsShown(notification.id);
          console.log(`[SyncManager] Shown offline notification ${notification.id}`);

        } catch (error) {
          console.error(`[SyncManager] Failed to show offline notification ${notification.id}:`, error);
          // Remove failed notifications to prevent infinite retries
          await this.idb.removeOfflineNotification(notification.id);
        }
      }

    } catch (error) {
      console.error('[SyncManager] Error showing offline notifications:', error);
    }
  }

  // Add offline notification (called when receiving push while offline)
  async addOfflineNotification(notificationData) {
    try {
      await this.idb.addOfflineNotification(notificationData);
      console.log('[SyncManager] Offline notification stored for later display');
    } catch (error) {
      console.error('[SyncManager] Failed to store offline notification:', error);
    }
  }

  // Get sync status
  async getSyncStatus() {
    const pendingItems = await this.idb.getPendingSync();
    return {
      isOnline: this.isOnline,
      pendingCount: pendingItems.length,
      pendingItems: pendingItems
    };
  }
}

export default SyncManager;
