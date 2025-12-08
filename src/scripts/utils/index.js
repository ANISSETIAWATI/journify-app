// Import CSS agar Webpack dapat memprosesnya
import './styles/styles.css';

// Import kelas App utama
import App from './pages/app';

// Buat instance baru dari App, berikan elemen DOM yang dibutuhkan
const app = new App({
  drawerButton: document.querySelector('#drawer-button'),
  navigationDrawer: document.querySelector('#navigation-drawer'),
  content: document.querySelector('#main-content'),
});

// Jalankan renderPage saat halaman pertama kali dimuat
window.addEventListener('DOMContentLoaded', () => {
  app.renderPage();
});

// Jalankan renderPage setiap kali hash URL berubah (navigasi)
window.addEventListener('hashchange', () => {
  app.renderPage();
});