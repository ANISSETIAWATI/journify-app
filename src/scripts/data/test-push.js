const webpush = require('web-push');

// 1. Menggunakan VAPID keys dari Dicoding
const vapidKeys = {
  publicKey: "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk",
  privateKey: "MASUKKAN_VAPID_PRIVATE_KEY_ANDA" // Private key tidak diperlukan untuk testing client-side
};

// Set VAPID details (hanya public key yang diperlukan untuk client-side testing)
webpush.setVapidDetails(
  'mailto:test@example.com', // Email dummy
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// 2. Ganti dengan objek 'subscription' dari konsol browser klien
// Objek ini berisi 'endpoint', 'keys.p256dh', dan 'keys.auth'
const subscription = {
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
};

// 3. Data yang ingin Anda kirim (payload)
const payload = JSON.stringify({
  title: 'Push dari Server API',
  body: 'Ini adalah notifikasi yang di-trigger oleh server!',
  icon: '/images/icon.png'
});

// 4. Kirim notifikasi
console.log('Mengirim notifikasi...');
webpush.sendNotification(subscription, payload)
  .then(result => {
    console.log('Notifikasi berhasil terkirim:', result.statusCode);
  })
  .catch(err => {
    console.error('Gagal mengirim notifikasi:', err);
  });