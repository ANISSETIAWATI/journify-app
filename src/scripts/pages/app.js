import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import idb from '../data/idb';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      })
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    // Perubahan ada di 2 baris berikut
    const PageClass = routes[url] || routes['/notFound']; // Mengambil Class halaman dengan fallback 404
    const page = new PageClass(idb);                         // Membuat instance baru dari Class tersebut, passing idb

    this.#content.innerHTML = await page.render();
    await page.afterRender();
  }
}

export default App;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
      console.log('Service Worker terdaftar:', registration);
    })
    .catch(error => {
      console.error('Gagal mendaftar Service Worker:', error);
    });
}
// Di dalam file: ./pages/app.js

class App {
  constructor({ /* ... */ }) {
    // ... (kode konstruktor Anda)
  }