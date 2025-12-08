// File: /service-worker.js

// -------------------------------------------------------------------
// BAGIAN TAMBAHAN: Event Listener 'fetch' (Untuk Fix Error 404)
// -------------------------------------------------------------------
// Listener ini mencegat SEMUA permintaan jaringan (seperti POST, GET)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Periksa apakah ini permintaan API (ke /subscriptions) 
  // atau permintaan ke server yang berbeda (misal: API eksternal)
  if (url.pathname.startsWith('/subscriptions') || url.origin !== self.origin) {
    
    // JIKA YA: Jangan gunakan cache. 
    // Langsung teruskan permintaan ke server (jaringan).
    event.respondWith(fetch(event.request));
    return; // Hentikan eksekusi di sini
  }

  // JIKA TIDAK (ini adalah aset biasa seperti HTML, CSS, JS):
  // Lanjutkan dengan strategi caching normal Anda.
  // (Contoh: Cache first, then network)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Ambil dari cache jika ada
      }
      return fetch(event.request); // Ambil dari jaringan jika tidak ada di cache
    })
  );
});

// -------------------------------------------------------------------
// Kode Anda yang sudah ada (Push Event)
// -------------------------------------------------------------------
self.addEventListener('push', event => {
    console.log('Push event diterima:', event);

    let data;
    try {
        // Coba parse data sebagai JSON (sesuai standar Web Push)
        data = event.data.json();
    } catch (e) {
        // Jika gagal, tampilkan sebagai teks biasa
        data = {
            title: 'Notifikasi Baru',
            body: event.data.text(),
        };
    }

    const title = data.title || 'Judul Default';
    const options = {
        body: data.body || 'Isi notifikasi default.',
        icon: data.icon || '/images/icon.png', // Sediakan path ke ikon Anda
        badge: data.badge || '/images/badge.png', // Ikon untuk taskbar
    };

    // Tampilkan notifikasi
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// -------------------------------------------------------------------
// Kode Anda yang sudah ada (Notification Click Event)
// -------------------------------------------------------------------
self.addEventListener('notificationclick', event => {
    console.log('Notifikasi diklik:', event.notification);

    // Tutup notifikasi setelah diklik
    event.notification.close();

    // Arahkan pengguna ke URL tertentu saat notifikasi diklik
    // Ganti 'URL_TUJUAN_SAAT_KLIK' dengan URL yang relevan
    event.waitUntil(
        clients.openWindow('URL_TUJUAN_SAAT_KLIK' || '/')
    );
});