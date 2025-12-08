// api.js

// Tentukan BASE_URL berdasarkan lingkungan.
// Jika NODE_ENV adalah 'production' (saat build final) ATAU protokolnya adalah HTTPS,
// gunakan URL Dicoding lengkap. Jika tidak, gunakan proxy lokal '/api'.

const getBaseUrl = () => {
  // Dalam lingkungan browser (setelah deployment), ini akan mengembalikan 'production'
  // Dalam lingkungan dev Webpack, ini akan mengembalikan 'development'
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return 'https://story-api.dicoding.dev/v1';
  }

  // Untuk pengembangan lokal (localhost), gunakan proxy /api untuk menghindari CORS
  return '/api';
};

const CONFIG = {
  BASE_URL: getBaseUrl(),
};

const API_ENDPOINT = {
  // Semua endpoint kini menggunakan BASE_URL yang sudah disesuaikan.
  STORIES_WITH_LOCATION: `${CONFIG.BASE_URL}/stories`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  NOTIFICATIONS_SUBSCRIBE: `${CONFIG.BASE_URL}/notifications/subscribe`,
  // Gunakan endpoint publik sementara untuk menampilkan berita tanpa API key
  INDONESIA_NEWS: 'https://api-berita-indonesia.vercel.app/antara/terbaru',
};


export default API_ENDPOINT;