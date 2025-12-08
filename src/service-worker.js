// Service Worker: precache, runtime caching, and push notification handling

const CACHE_VERSION = 'v1';
const PRECACHE = `journify-precache-${CACHE_VERSION}`;
const RUNTIME = `journify-runtime-${CACHE_VERSION}`;

// Assets to precache. Keep this minimal and include the core shell.
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/app.bundle.js',
    '/styles/styles.css',
    '/images/logo.png',
    '/manifest.json'
];

// Install event: precache app shell
self.addEventListener('install', event => {
    console.log('[SW] Install event');
    self.skipWaiting();
    event.waitUntil(
        (async () => {
            const cache = await caches.open(PRECACHE);

            // Helper to fetch with timeout so a single slow resource doesn't block install.
            const fetchWithTimeout = (req, ms = 7000) => new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('fetch-timeout')), ms);
                fetch(req).then(res => {
                    clearTimeout(timer);
                    resolve(res);
                }).catch(err => {
                    clearTimeout(timer);
                    reject(err);
                });
            });

            // Try to fetch and cache each asset individually. Use Promise.allSettled so
            // install won't fail entirely if some resources 404 or time out.
            const results = await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
                try {
                    const req = new Request(url, { cache: 'reload' });
                    const res = await fetchWithTimeout(req, 7000);
                    if (res && res.ok) {
                        await cache.put(req, res.clone());
                        return { url, ok: true };
                    }
                    return { url, ok: false, status: res && res.status };
                } catch (err) {
                    return { url, ok: false, error: err && err.message ? err.message : err };
                }
            }));

            const failed = results.filter(r => r.status === 'rejected' || (r.value && !r.value.ok));
            if (failed.length) {
                console.warn('[SW] Precache some items failed:', failed);
            } else {
                console.log('[SW] Precache completed successfully');
            }
        })().catch(err => console.warn('[SW] Precache failed:', err))
    );
});

// Activate event: cleanup old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter(key => key !== PRECACHE && key !== RUNTIME)
                    .map(key => caches.delete(key))
            );
            await self.clients.claim();
        })()
    );
});

// Fetch handler: navigation -> network-first, static assets -> cache-first, API -> network-first
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Network-first for navigation requests (HTML)
    if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
        event.respondWith((async () => {
            try {
                const networkResponse = await fetch(request);
                const cache = await caches.open(RUNTIME);
                try {
                    await cache.put(request, networkResponse.clone());
                } catch (err) {
                    // ignore cache put errors (opaque responses, CORS issues, etc.)
                    console.warn('[SW] cache.put failed (navigation):', err);
                }
                return networkResponse;
            } catch (err) {
                const cached = await caches.match(request);
                return cached || caches.match('/index.html');
            }
        })());
        return;
    }

    // API calls (e.g., story-api) - network first with cache fallback
    if (url.origin !== location.origin) {
        // treat cross-origin API calls as network-first
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                // Only cache successful responses and avoid caching images/other assets
                if (response.ok && !request.url.includes('.jpg') && !request.url.includes('.png') && !request.url.includes('.jpeg') && !request.url.includes('.gif')) {
                    const cache = await caches.open(RUNTIME);
                    try {
                        await cache.put(request, response.clone());
                    } catch (err) {
                        console.warn('[SW] cache.put failed (cross-origin):', err);
                    }
                }
                return response;
            } catch (err) {
                const cached = await caches.match(request);
                return cached || new Response(null, { status: 504, statusText: 'Gateway Timeout' });
            }
        })());
        return;
    }

    // Same-origin static assets -> cache-first
    event.respondWith(
        caches.match(request).then(cachedResponse => cachedResponse || fetch(request).then(response => {
            return caches.open(RUNTIME).then(cache => {
                // Put a copy in the runtime cache for later
                cache.put(request, response.clone()).catch(() => {});
                return response;
            });
        }).catch(() => {
            // If request is for an image, return a placeholder
            if (request.destination === 'image') {
                return caches.match('/images/logo.png');
            }
        }))
    );

});

// --- Push notification handling ---
self.addEventListener('push', event => {
    console.log('[SW] Push event diterima');

    let payload = { title: 'Notifikasi Baru', body: 'Anda menerima notifikasi.' };
    try {
        if (event.data) {
            payload = event.data.json();
        }
    } catch (err) {
        // Jika tidak JSON, gunakan text
        try {
            payload = { title: 'Notifikasi', body: event.data.text() };
        } catch (e) {
            // biarkan payload default
        }
    }

    const title = payload.title || 'Notifikasi Baru';
    const options = {
        body: payload.body || '',
        icon: payload.icon || '/images/logo.png',
        badge: payload.badge || '/images/logo.png',
        image: payload.image || undefined,
        data: payload.data || { url: payload.url || '/' },
        actions: payload.actions || [
            { action: 'open', title: 'Buka', icon: '/images/logo.png' }
        ],
        vibrate: payload.vibrate || [100, 50, 100],
        tag: payload.tag || undefined,
    };

    event.waitUntil(
        (async () => {
            // Check if we have active clients (app is open)
            const allClients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });

            if (allClients.length > 0) {
                // App is open, show notification normally
                await self.registration.showNotification(title, options);

                // Send message to main thread for toast
                allClients.forEach(client => {
                    client.postMessage({
                        type: 'show-toast',
                        message: payload.body || `Notifikasi push diterima: ${title}`,
                        type: 'info'
                    });
                });
            } else {
                // App is closed/background, store notification for later
                try {
                    // Send message to main thread to store offline notification
                    // Since no clients are open, we'll store it when app opens
                    const offlineNotification = {
                        title: title,
                        body: payload.body,
                        icon: payload.icon,
                        badge: payload.badge,
                        data: payload.data,
                        tag: payload.tag,
                        vibrate: payload.vibrate,
                        actions: payload.actions,
                        timestamp: Date.now()
                    };

                    // Store in IndexedDB via message to main thread when it opens
                    // For now, we'll show the notification and also prepare data for storage
                    await self.registration.showNotification(title, options);

                    // Send message to be picked up when app opens
                    self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                type: 'store-offline-notification',
                                notification: offlineNotification
                            });
                        });
                    });

                } catch (error) {
                    console.error('[SW] Error storing offline notification:', error);
                    // Fallback: just show the notification
                    await self.registration.showNotification(title, options);
                }
            }
        })()
    );
});

self.addEventListener('notificationclick', event => {
    console.log('[SW] notificationclick:', event);
    event.notification.close();

    const clickedAction = event.action;
    const notificationData = event.notification.data || {};
    const urlToOpen = (notificationData && notificationData.url) || '/';

    event.waitUntil((async () => {
        // Jika action tersedia, bisa diproses berbeda
        if (clickedAction) {
            // contoh: action 'open' membuka URL spesifik
            if (clickedAction === 'open' || clickedAction === 'view') {
                const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                for (const client of allClients) {
                    // jika sudah ada tab yang terbuka, fokuskan
                    if (client.url === urlToOpen || client.url.includes(urlToOpen)) {
                        client.focus();
                        return;
                    }
                }
                // jika tidak ada, buka tab baru
                return self.clients.openWindow(urlToOpen);
            }
            // tambahkan handler action lain di sini bila perlu
        }

        // Default klik notifikasi, buka URL yang disertakan
        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of allClients) {
            if (client.url === urlToOpen || client.url.includes(urlToOpen)) {
                client.focus();
                return;
            }
        }
        return self.clients.openWindow(urlToOpen);

        // Kirim pesan ke main thread untuk menampilkan toast
        const allClientsToast = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of allClientsToast) {
            client.postMessage({
                type: 'show-toast',
                message: 'Notifikasi diklik! Mengarahkan ke halaman utama.',
                type: 'success'
            });
        }
    })());
});

// Optional: handle notificationclose
self.addEventListener('notificationclose', event => {
    console.log('[SW] notificationclose', event.notification);
});

// Background Sync: ask clients to refresh stories when connectivity returns
self.addEventListener('sync', event => {
    if (event.tag === 'sync-stories') {
        event.waitUntil((async () => {
            const allClients = await self.clients.matchAll({ includeUncontrolled: true });
            for (const client of allClients) {
                client.postMessage({ type: 'sync-stories' });
            }
        })());
    }
});
