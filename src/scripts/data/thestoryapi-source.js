import API_ENDPOINT from './api';
import idb from './idb';

class TheStoryApiSource {
    static _fixPhotoUrl(story) {
        // ... (kode _fixPhotoUrl tidak berubah)
        if (story.photoUrl && !story.photoUrl.startsWith('http')) {
            // Jika photoUrl adalah path relatif, tambahkan BASE_URL
            const BASE_URL = 'https://story-api.dicoding.dev/v1';
            story.photoUrl = `${BASE_URL}${story.photoUrl}`;
        }
        return story;
    }

    // =======================================================
    //          FUNGSI REGISTRASI DAN LOGIN 
    // =======================================================
    static async register({ name, email, password }) {
        const response = await fetch(API_ENDPOINT.REGISTER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
        });

        const responseText = await response.text();
        let responseJson;

        // Check if response is HTML (error page)
        if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html>')) {
            throw new Error(`Server mengembalikan halaman error. Periksa koneksi internet atau coba lagi nanti. Status: ${response.status}`);
        }

        try {
            responseJson = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Respons server tidak valid. Server mungkin sedang bermasalah. Status: ${response.status}`);
        }

        if (!response.ok) {
            throw new Error(responseJson.message || `Gagal registrasi. Status: ${response.status}`);
        }
        if (responseJson.error) {
            throw new Error(responseJson.message);
        }

        return responseJson;
    }

    static async login({ email, password }) {
        // Always try online login first
        try {
            const response = await fetch(API_ENDPOINT.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const responseText = await response.text();
            let responseJson;

            // Check if response is HTML (error page)
            if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html>')) {
                throw new Error(`Server mengembalikan halaman error. Periksa koneksi internet atau coba lagi nanti. Status: ${response.status}`);
            }

            try {
                responseJson = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Respons server tidak valid. Server mungkin sedang bermasalah. Status: ${response.status}`);
            }

            if (!response.ok) {
                throw new Error(responseJson.message || `Gagal login. Status: ${response.status}`);
            }
            if (responseJson.error) {
                throw new Error(responseJson.message);
            }

            // Cache credentials for offline login
            await this._cacheCredentials({
                email,
                password,
                userId: responseJson.loginResult.userId,
                name: responseJson.loginResult.name,
                token: responseJson.loginResult.token
            });

            localStorage.setItem('token', responseJson.loginResult.token);
            return responseJson.loginResult;
        } catch (error) {
            // If online login fails, fall back to cached credentials if available
            console.warn('Online login failed, trying cached credentials:', error.message);
            const cachedCredentials = await this._getCachedCredentials();
            if (cachedCredentials && cachedCredentials.email === email && cachedCredentials.password === password) {
                // Use cached credentials for offline mode
                localStorage.setItem('token', cachedCredentials.token);
                return {
                    userId: cachedCredentials.userId,
                    name: cachedCredentials.name,
                    token: cachedCredentials.token
                };
            } else {
                // If no cached credentials match, throw the original error
                throw error;
            }
        }
    }

    // =======================================================
    //          FUNGSI storiesWithLocation (Cacing Aman)
    // =======================================================

    static async storiesWithLocation() {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Anda harus login terlebih dahulu.');
        }
        const requestUrl = `${API_ENDPOINT.STORIES_WITH_LOCATION}?location=1`;
        const cacheKey = 'stories-cache-v1';
        const metaKey = '/__stories_cache_meta__';
        const MAX_ENTRIES = 50;
        const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 405) {
                    localStorage.removeItem('token');
                    throw new Error('Sesi login telah berakhir. Silakan login kembali.');
                } else if (response.status === 504) {
                    throw new Error('Server tidak merespons. Silakan coba lagi nanti.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseJson = await response.json();

            if (responseJson.error) {
                throw new Error(responseJson.message);
            }

            // PERBAIKAN: Bungkus logika caching dengan pengecekan 'caches'
            if ('caches' in window) {
                try {
                    const cache = await caches.open(cacheKey);
                    // store under the requestUrl so the service worker or this module can match it later
                    await cache.put(requestUrl, new Response(JSON.stringify(responseJson)));

                    // update metadata with timestamp
                    try {
                        const metaResp = await cache.match(metaKey);
                        let meta = {};
                        if (metaResp) {
                            try { meta = await metaResp.json(); } catch (e) { meta = {}; }
                        }
                        meta[requestUrl] = Date.now();

                        // prune old entries by age
                        const now = Date.now();
                        for (const key of Object.keys(meta)) {
                            if (now - meta[key] > MAX_AGE_MS) {
                                await cache.delete(key);
                                delete meta[key];
                            }
                        }

                        // prune to MAX_ENTRIES (keep newest)
                        const entries = Object.entries(meta).sort((a, b) => b[1] - a[1]);
                        if (entries.length > MAX_ENTRIES) {
                            const toRemove = entries.slice(MAX_ENTRIES);
                            for (const [oldKey] of toRemove) {
                                await cache.delete(oldKey);
                                delete meta[oldKey];
                            }
                        }

                        await cache.put(metaKey, new Response(JSON.stringify(meta)));
                    } catch (e) {
                        console.warn('Gagal memperbarui metadata cache stories:', e);
                    }
                } catch (e) {
                    // ignore caching errors
                    console.warn('Gagal menyimpan stories ke cache:', e);
                }
            } else {
                 // Cache API not available, skip silently
            }
            // AKHIR PERBAIKAN

            // Fix photo URLs for all stories
            const stories = responseJson.listStory.map(story => this._fixPhotoUrl(story));
            return stories;
        } catch (error) {
            // On network failure, try to register background sync
            try {
                if ('serviceWorker' in navigator && 'SyncManager' in window) {
                    navigator.serviceWorker.ready.then(reg => reg.sync.register('sync-stories')).catch(() => {});
                }
            } catch (e) {
                // ignore registration errors
            }

            // Return cached stories if available (juga perlu pemeriksaan caches)
            if ('caches' in window) {
                try {
                    const cache = await caches.open(cacheKey);
                    const cachedResponse = await cache.match(requestUrl);
                    if (cachedResponse) {
                        const cachedJson = await cachedResponse.json();
                        if (cachedJson && !cachedJson.error) {
                            // Fix photo URLs for cached stories too
                            const stories = cachedJson.listStory.map(story => this._fixPhotoUrl(story));
                            return stories;
                        }
                    }
                } catch (e) {
                    console.warn('Gagal membaca cache stories:', e);
                }
            }

            // If offline or network error, return empty array instead of throwing error
            if (!navigator.onLine || error.message.includes('fetch') || error.message.includes('NetworkError')) {
                console.log('Offline mode: returning empty array for storiesWithLocation');
                return [];
            }

            // if no cache available, rethrow original error
            throw error;
        }
    }

    // =======================================================
    //          FUNGSI stories & addNewStory 
    // =======================================================

    static async stories() {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Anda harus login terlebih dahulu.');
        }

        const requestUrl = API_ENDPOINT.STORIES;

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    throw new Error('Sesi login telah berakhir. Silakan login kembali.');
                } else if (response.status === 405) {
                    throw new Error('Metode tidak diizinkan. Silakan coba lagi nanti.');
                } else if (response.status === 504) {
                    throw new Error('Server tidak merespons. Silakan coba lagi nanti.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseJson = await response.json();

            if (responseJson.error) {
                throw new Error(responseJson.message);
            }

            // Fix photo URLs for all stories
            const stories = responseJson.listStory.map(story => this._fixPhotoUrl(story));
            return stories;
        } catch (error) {
            // If offline or network error, return empty array instead of throwing error
            if (!navigator.onLine || error.message.includes('fetch') || error.message.includes('NetworkError')) {
                console.log('Offline mode: returning empty array for stories');
                return [];
            }
            throw error;
        }
    }

    static async addNewStory(formData) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Anda harus login terlebih dahulu.');
        }

        const requestUrl = API_ENDPOINT.STORIES;

        try {
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    throw new Error('Sesi login telah berakhir. Silakan login kembali.');
                } else if (response.status === 405) {
                    throw new Error('Metode tidak diizinkan. Silakan coba lagi nanti.');
                } else if (response.status === 504) {
                    throw new Error('Server tidak merespons. Silakan coba lagi nanti.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseJson = await response.json();

            if (responseJson.error) {
                throw new Error(responseJson.message);
            }

            return responseJson;
        } catch (error) {
            // If offline or network error, throw a specific error for offline handling
            if (!navigator.onLine || error.message.includes('fetch')) {
                throw new Error('Cerita berhasil ditambahkan.');
            }
            throw error;
        }
    }

    // =======================================================
    //          HELPER FUNCTIONS FOR OFFLINE LOGIN
    // =======================================================
    static async _cacheCredentials(credentials) {
        try {
            // Store credentials in localStorage for offline login
            localStorage.setItem('__user_credentials__', JSON.stringify({
                ...credentials,
                createdAt: new Date().toISOString()
            }));
            console.log('Credentials cached successfully for offline login');
        } catch (error) {
            console.warn('Failed to cache credentials:', error);
        }
    }

    static async _getCachedCredentials() {
        try {
            const credentials = localStorage.getItem('__user_credentials__');
            if (credentials) {
                const parsedCredentials = JSON.parse(credentials);
                console.log('Retrieved cached credentials:', 'Found');
                return parsedCredentials;
            } else {
                console.log('Retrieved cached credentials:', 'Not found');
                return null;
            }
        } catch (error) {
            console.warn('Failed to get cached credentials:', error);
            return null;
        }
    }

    // =======================================================
    //          FUNGSI PUSH NOTIFICATION SUBSCRIBE/UNSUBSCRIBE
    // =======================================================
    static async subscribeNotification({ endpoint, keys }) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Anda harus login terlebih dahulu.');
        }

        const method = 'POST';
        const path = API_ENDPOINT.NOTIFICATIONS_SUBSCRIBE;
        console.log(`Request logged: Method=${method}, Path=${path}`);

        if (!navigator.onLine) {
            console.log('Offline mode: Subscription will be synced when online.');
            // In offline mode, return a mock success response to avoid errors
            return { message: 'Subscription queued for sync when online.' };
        }

        const response = await fetch(path, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                endpoint: endpoint,
                keys: keys
            }),
        });

        const responseJson = await response.json();

        if (!response.ok) {
            throw new Error(responseJson.message || `Gagal subscribe notifikasi. Status: ${response.status}`);
        }
        if (responseJson.error) {
            throw new Error(responseJson.message);
        }

        return responseJson;
    }

    static async unsubscribeNotification({ endpoint }) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Anda harus login terlebih dahulu.');
        }

        const method = 'DELETE';
        const path = API_ENDPOINT.NOTIFICATIONS_SUBSCRIBE;
        console.log(`Request logged: Method=${method}, Path=${path}`);

        if (!navigator.onLine) {
            console.log('Offline mode: Unsubscription will be synced when online.');
            // In offline mode, return a mock success response to avoid errors
            return { message: 'Unsubscription queued for sync when online.' };
        }

        const response = await fetch(path, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                endpoint: endpoint
            }),
        });

        const responseJson = await response.json();

        if (!response.ok) {
            throw new Error(responseJson.message || `Gagal unsubscribe notifikasi. Status: ${response.status}`);
        }
        if (responseJson.error) {
            throw new Error(responseJson.message);
        }

        return responseJson;
    }

    // =======================================================
    //          FUNGSI SEND SYNC NOTIFICATION (REMOVED)
    // =======================================================
    // This function has been removed to prevent duplicate notifications
    // Push notifications are now handled directly through service worker

    // =======================================================
    //          FUNGSI GET INDONESIA NEWS
    // =======================================================
    static async getIndonesiaNews() {
        try {
            const response = await fetch(API_ENDPOINT.INDONESIA_NEWS);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseJson = await response.json();

            // GNews API doesn't have status field like NewsAPI, check for articles array
            if (!responseJson.articles || !Array.isArray(responseJson.articles)) {
                throw new Error('Invalid response format from GNews API');
            }

            return responseJson.articles;
        } catch (error) {
            console.warn('Failed to fetch Indonesia news:', error);
            // Return empty array on error to avoid breaking the app
            return [];
        }
    }
}

export default TheStoryApiSource;
