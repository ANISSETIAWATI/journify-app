import '../styles/styles.css';
// Import TheStoryApiSource
import TheStoryApiSource from './data/thestoryapi-source'; 
import AddStoryPage from './pages/add-story/add-story-page';
import FavoritePage from './pages/favorite/favorite-page';
import HomePage from './pages/home/home-page';
import MapPage from './pages/map/map-page';
import idb from './data/idb';
import SyncManager from './data/sync-manager';

// =================================================================
// MVP: VIEW CLASSES (Dihilangkan untuk keringkasan, tidak diubah)
// =================================================================
// ... (Kelas AddStoryView, MapView, dan Presenter Classes) ...
class AddStoryView {
    constructor(appInstance) {
        this.app = appInstance;
        this.form = document.getElementById('add-story-form');
        
        if (!this.form) return;

        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.titleInput = document.getElementById('title'); 
        this.photoInput = document.getElementById('photo-upload'); 
        this.preview = document.getElementById('photo-preview');
        this.removePhotoBtn = document.getElementById('remove-photo-btn');
        this.feedbackEl = document.getElementById('form-feedback');
        this.latInput = document.getElementById('latitude');
        this.lonInput = document.getElementById('longitude');
        this.descriptionInput = document.getElementById('description');
        this.cameraContainer = document.getElementById('camera-container');
        this.video = document.getElementById('camera-feed');
        this.canvas = document.getElementById('photo-canvas');
        this.map = null;
        this.locationMarker = null;
        this.capturedBlob = null;
    }
    
    initMap(onMapClick) {
        const mapElement = document.getElementById('location-map');
        if (mapElement) {
            if (this.map) this.map.remove(); 
            
            this.map = L.map('location-map').setView([-2.5489, 118.0149], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
            this.map.on('click', onMapClick);
        }
    }

    updateLocationMarker(latlng) {
        if (this.latInput && this.lonInput) {
            this.latInput.value = latlng.lat;
            this.lonInput.value = latlng.lng;
        }

        if (this.map) {
             if (!this.locationMarker) {
                 this.locationMarker = L.marker(latlng).addTo(this.map);
             } else {
                 this.locationMarker.setLatLng(latlng);
             }
        }
    }

    showCamera(stream) {
        this.app.stream = stream;
        if (this.video && this.cameraContainer){
            this.video.srcObject = stream;
            this.cameraContainer.style.display = 'block';
        }
    }

    hideCamera() {
        if (this.app.stream) {
            this.app.stream.getTracks().forEach(track => track.stop());
            this.app.stream = null;
        }
        if (this.cameraContainer) {
            this.cameraContainer.style.display = 'none';
        }
    }

    showPhotoPreview(url, blob = null) {
    this.capturedBlob = blob;

    // Pastikan elemen ada dulu sebelum diakses
    if (this.preview && this.removePhotoBtn) {
        this.preview.src = url;
        this.preview.style.display = 'block';
        this.removePhotoBtn.style.display = 'block';
    }

    if (blob && this.photoInput) {
        this.photoInput.value = '';
    }
}

    
    resetPhotoSelection() {
        this.preview.src = '#';
        this.preview.style.display = 'none';
        this.removePhotoBtn.style.display = 'none';
        this.photoInput.value = '';
        this.capturedBlob = null;
    }

    setFormState(isDisabled, buttonText) {
        this.submitButton.disabled = isDisabled;
        this.submitButton.textContent = buttonText;
    }

    displayFeedback(message, type) {
        if (this.feedbackEl){
        this.feedbackEl.className = `feedback ${type} show`;
        this.feedbackEl.textContent = message;
        }
    }

    clearForm() {
        this.form.reset();
        this.resetPhotoSelection();
        if (this.map && this.locationMarker) {
            this.map.removeLayer(this.locationMarker);
            this.locationMarker = null;
        }
        if (this.latInput) this.latInput.value = '';
        if (this.lonInput) this.lonInput.value = '';
    }
    
    getFormData() {
        const titleValue = this.titleInput?.value.trim() || '';
        const descValue = this.descriptionInput?.value.trim() || '';
        const photoFileValue = this.photoInput?.files?.[0] || null;
        const latValue = this.latInput?.value || '';
        const lonValue = this.lonInput?.value || '';

        return {
            title: titleValue,
            description: descValue,
            photoFile: photoFileValue,
            capturedBlob: this.capturedBlob,
            latitude: latValue,
            longitude: lonValue,
        };
    }
    
    bindSubmit(handler) {
        this.form.addEventListener('submit', handler);
    }

    bindCameraControls(openHandler, captureHandler, closeHandler) {
        document.getElementById('open-camera-btn')?.addEventListener('click', openHandler);
        document.getElementById('capture-btn')?.addEventListener('click', captureHandler);
        document.getElementById('close-camera-btn')?.addEventListener('click', closeHandler);
    }

    bindPhotoInput(changeHandler) {
        if (this.photoInput) {
            this.photoInput.addEventListener('change', changeHandler);
        }
        if (this.removePhotoBtn) {
             this.removePhotoBtn.addEventListener('click', () => {
                 this.resetPhotoSelection();
                 this.displayFeedback('', '');
             });
        }
    }
}

class MapView {
    constructor(appInstance) {
        this.app = appInstance;
        this.storyListItemsContainer = document.querySelector('#story-list-items');
        this.paginationContainer = document.getElementById('pagination-controls');
        this.map = null;
        this.markers = {};
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.allStories = [];
        this.mapLayers = {}; 
    }

    initMap(onLayerChange) {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        if (this.app.map) {
            this.app.map.remove();
            this.app.map = null;
        }
        this.app.map = L.map('map').setView([-2.5489, 118.0149], 5);
        this.map = this.app.map;

        const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OSM'
        });
        const stadiaDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            attribution: '&copy; Stadia Maps'
        });

        this.mapLayers = {
            "Street": openStreetMap,
            "Dark": stadiaDark
        };

        openStreetMap.addTo(this.map);

        const layerControl = L.control.layers(this.mapLayers);
        layerControl.addTo(this.map);
        
        if (onLayerChange) this.map.on('baselayerchange', onLayerChange);
        
        document.getElementById('loader')?.classList.add('hidden');
    }

    renderStoriesOnMap(stories) {
        if (this.map) {
            Object.values(this.markers).forEach(marker => this.map.removeLayer(marker));
        }
        
        this.markers = {};
        stories.forEach(story => {
            if (story.lat && story.lon) {
                this.markers[story.id] = L.marker([story.lat, story.lon]).addTo(this.map).bindPopup(`<b>${story.name}</b>`);
            }
        });
        this.allStories = stories;
    }

    renderStoryList(stories, currentPage, totalPages, onPageChange, onItemInteraction) {
        if (!this.storyListItemsContainer) return;

        this.currentPage = currentPage;
        this.storyListItemsContainer.innerHTML = '';

        stories.forEach(story => {
            this.storyListItemsContainer.innerHTML += `
                <div class="story-item" data-story-id="${story.id}" tabindex="0">
                    <img src="${story.photoUrl}" alt="Foto cerita dari ${story.name || 'Pengguna'}" loading="lazy">
                    <div class="story-info">
                        <h3>${story.name || 'Anonim'}</h3>
                        <p>${story.description.substring(0,60)}...</p>
                        <small>Dibuat: ${new Date(story.createdAt).toLocaleDateString()}</small>
                    </div>
                </div>`;
        });

        this.storyListItemsContainer.addEventListener('click', (event) => {
            const item = event.target.closest('.story-item');
            if (item) onItemInteraction(item.dataset.storyId, item);
        });
       if (this.storyListItemsContainer) {
        this.storyListItemsContainer.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const item = event.target.closest('.story-item');
            if (item) onItemInteraction(item.dataset.storyId, item);
            }
        });
}


        this.renderPaginationControls(totalPages, onPageChange);
    }

    renderPaginationControls(totalPages, onPageChange) {
        if (!this.paginationContainer) return;
        
        this.paginationContainer.innerHTML = `
            <button id="prev-page" title="Halaman Sebelumnya" ${this.currentPage === 1 ? 'disabled' : ''}>&laquo; Sebelumnya</button>
            <span>Halaman ${this.currentPage} dari ${totalPages}</span>
            <button id="next-page" title="Halaman Berikutnya" ${this.currentPage >= totalPages ? 'disabled' : ''}>Berikutnya &raquo;</button>`;
        
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) onPageChange(this.currentPage - 1);
        });
        document.getElementById('next-page')?.addEventListener('click', () => {
            if (this.currentPage < totalPages) onPageChange(this.currentPage + 1);
        });
    }
    
    updateActiveItem(item) {
        document.querySelectorAll('.story-item').forEach(el => el.classList.remove('active'));
        if (item) item.classList.add('active');
    }

    flyToMarker(storyId) {
        const marker = this.markers[storyId];
        if (marker) {
            this.map.flyTo(marker.getLatLng(), 15);
            marker.openPopup();
        }
    }

        showError(message) {
    const storyList = document.querySelector('.story-list');
    if (storyList) {
        storyList.innerHTML = `<div class="placeholder error">
        Gagal memuat data: ${message}. <br>
        <a href="#/login">Login ulang</a>
        </div>`;
    }
    }
}


// =================================================================
// MVP: PRESENTER CLASSES (Menghubungkan Model dan View)
// =================================================================

class AddStoryPresenter {
  constructor(view, apiSource) {
    this.view = view;
    this.apiSource = apiSource;

    if (!this.view || !this.view.form) return;

    if (this.view.initMap) {
      this.view.initMap(this.onMapClick.bind(this));
    }

    if (this.view.bindSubmit) {
      this.view.bindSubmit(this.handleSubmit.bind(this));
    }

    if (this.view.bindCameraControls && this.view.hideCamera) {
      this.view.bindCameraControls(
        this.handleOpenCamera.bind(this),
        this.handleCapturePhoto.bind(this),
        this.view.hideCamera.bind(this.view)
      );
    }

    if (this.view.bindPhotoInput) {
      this.view.bindPhotoInput(this.handlePhotoChange.bind(this));
    }
  }

  // ===== METHOD UNTUK MAP =====
  onMapClick(e) {
    if (this.view && this.view.updateLocationMarker) {
      this.view.updateLocationMarker(e.latlng);
    }
  }

  // ===== METHOD UNTUK PHOTO INPUT =====
  handlePhotoChange() {
    const input = this.view.photoInput;
    const file = input && input.files && input.files[0];
    if (file) {
      this.view.showPhotoPreview(URL.createObjectURL(file), null);
    } else {
      this.view.resetPhotoSelection();
    }
  }

  // ===== METHOD UNTUK CAMERA =====
  async handleOpenCamera() {
    try {
      this.view.hideCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.view.showCamera(stream);
    } catch (err) {
      this.view.displayFeedback(
        'Gagal mengakses kamera. Pastikan Anda memberikan izin.',
        'error'
      );
    }
  }

  handleCapturePhoto() {
    const video = this.view.video;
    const canvas = this.view.canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        console.log('✅ BLOB DARI KAMERA BERHASIL DIBUAT DAN DISIMPAN.');
        this.view.showPhotoPreview(URL.createObjectURL(blob), blob);
      } else {
        console.error(
          '❌ GAGAL MEMBUAT BLOB DARI CANVAS. Cek izin/akses kamera.'
        );
      }
    }, 'image/jpeg');

    this.view.hideCamera();
  }

  // ===== METHOD UNTUK SUBMIT =====
  async handleSubmit(event) {
    event.preventDefault();
    this.view.displayFeedback('', '');
    const data = this.view.getFormData();

    const isDescriptionValid = data.description && data.description.trim().length > 0;
    const isPhotoValid = !!data.photoFile || !!data.capturedBlob;
    const isLocationValid = !!data.latitude && !!data.longitude;

    if (!isDescriptionValid || !isPhotoValid || !isLocationValid) {
      const errors = [];
      if (!isDescriptionValid) errors.push('Deskripsi');
      if (!isPhotoValid) errors.push('Foto');
      if (!isLocationValid) errors.push('Lokasi peta');

      this.view.displayFeedback('Harap lengkapi: ' + errors.join(', '), 'error');
      return;
    }

    this.view.setFormState(true, 'Mengirim...');

    try {
      const formData = new FormData();
      formData.append('description', data.description.trim());

      if (data.capturedBlob) {
        formData.append('photo', data.capturedBlob, 'captured-photo.jpg');
      } else if (data.photoFile) {
        formData.append('photo', data.photoFile);
      }

      formData.append('lat', parseFloat(data.latitude));
      formData.append('lon', parseFloat(data.longitude));

      await this.apiSource.addNewStory(formData);

      this.view.displayFeedback(
        'Cerita berhasil dikirim! Mengarahkan ke peta...',
        'success'
      );
      this.view.clearForm();

      setTimeout(() => {
        window.location.hash = '#/map';
      }, 2000);
    } catch (error) {
      console.error('Error submitting story:', error);
      this.view.displayFeedback(`Gagal mengirim cerita: ${error.message}`, 'error');
    } finally {
      this.view.setFormState(false, 'Kirim Cerita');
    }
  }
}

class MapPresenter {
    constructor(view, apiSource, idb) {
        this.view = view;
        this.apiSource = apiSource;
        this.idb = idb;
        this.allStories = [];
        this.view.initMap();
        this.loadStories();
    }

    async loadStories() {
        try {
            // Mengganti ApiSource.getStoriesWithLocation() dengan TheStoryApiSource.storiesWithLocation()
            const stories = await this.apiSource.storiesWithLocation();
            this.allStories = stories;
            this.view.renderStoriesOnMap(stories);
            this.displayStoriesByPage(1); 
        } catch (error) {
            this.view.showError(error.message);
        }
    }

    displayStoriesByPage(page) {
        const { itemsPerPage } = this.view;
        const totalPages = Math.ceil(this.allStories.length / itemsPerPage);
        const paginatedItems = this.allStories.slice((page - 1) * itemsPerPage, page * itemsPerPage);

        this.view.renderStoryList(
            paginatedItems, 
            page, 
            totalPages,
            this.displayStoriesByPage.bind(this),
            this.handleItemInteraction.bind(this)
        );
    }

    handleItemInteraction(storyId, item) {
        this.view.updateActiveItem(item);
        this.view.flyToMarker(storyId);
    }
}

// =================================================================
// SPA CORE
// =================================================================
const App = {
    map: null,
    markers: {},
    stream: null,
    _isInitialized: false, 
    
    init() {
        window.addEventListener('hashchange', this.router.bind(this));
        this.router();
    },
    
    initializeCommon() {
        this.initDrawer();
        this.initSkipLink();
    },

    async router() {
        if (!this._isInitialized) {
            this.initializeCommon();
            this._isInitialized = true;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        const mainContent = document.getElementById('main-content');
        let path = window.location.hash.substring(2).split('?')[0] || 'home';

        const protectedRoutes = ['map', 'add-story'];
        if (protectedRoutes.includes(path) && !Auth.isLoggedIn()) {
            if (navigator.onLine) {
                path = 'login';
                window.location.hash = '#/login';
            } else {
                // Allow access to map and add-story even when offline if user was previously logged in
                // This allows offline functionality
                path = path; // Keep the original path
            }
        }

        const page = Routes[path] || Routes.notFound;
        const pageContent = await page.render();

        const renderDOM = () => {
            mainContent.innerHTML = pageContent;
            this.updateNav();
            if (page.afterRender) page.afterRender(this);
        };

        if (document.startViewTransition) {
            document.startViewTransition(renderDOM);
        } else {
            renderDOM();
        }
    },
    
    initDrawer() {
        const drawerButton = document.getElementById('drawer-button');
        const navigationDrawer = document.getElementById('navigation-drawer');
        const navLinks = document.querySelectorAll('.nav-list a');
        
        if (drawerButton && navigationDrawer) { 
            const toggleDrawer = () => navigationDrawer.classList.toggle('open');
            const closeDrawer = () => navigationDrawer.classList.remove('open');
            
            drawerButton.addEventListener('click', toggleDrawer);
            navLinks.forEach(link => {
                link.addEventListener('click', closeDrawer);
            });
        }
    },
    
    initSkipLink() {
        const skipLink = document.querySelector('.skip-link');
        const mainContent = document.getElementById('main-content');
        
        if (skipLink && mainContent) {
            skipLink.addEventListener('click', (event) => {
                event.preventDefault();
                mainContent.focus();
            });
        }
    },
    
    updateNav() {
        const isLoggedIn = Auth.isLoggedIn();
        const mapNavItem = document.getElementById('map-nav-item');
        if (mapNavItem) mapNavItem.style.display = isLoggedIn ? 'block' : 'none';
        const favoriteNavItem = document.getElementById('favorite-nav-item');
        if (favoriteNavItem) favoriteNavItem.style.display = isLoggedIn ? 'block' : 'none';
        const addStoryNavItem = document.getElementById('add-story-nav-item');
        if (addStoryNavItem) addStoryNavItem.style.display = isLoggedIn ? 'block' : 'none';
        const loginNavItem = document.getElementById('login-nav-item');
        if (loginNavItem) loginNavItem.style.display = isLoggedIn ? 'none' : 'block';
        const registerNavItem = document.getElementById('register-nav-item');
        if (registerNavItem) registerNavItem.style.display = isLoggedIn ? 'none' : 'block';
        const logoutNavItem = document.getElementById('logout-nav-item');
        if (logoutNavItem) logoutNavItem.style.display = isLoggedIn ? 'block' : 'none';

        // Update login indicator
        const loginIndicator = document.getElementById('login-indicator');
        if (loginIndicator) {
            if (isLoggedIn) {
                loginIndicator.classList.add('show');
                // Auto-hide after 3 seconds
                setTimeout(() => {
                    loginIndicator.classList.remove('show');
                }, 3000);
            } else {
                loginIndicator.classList.remove('show');
            }
        }

        const currentHash = window.location.hash.split('?')[0] || '#/home';
        document.querySelectorAll('.nav-list a').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === currentHash);
        });
    }
};

const Auth = {
    isLoggedIn() {
        return !!localStorage.getItem('token');
    },
    getToken() {
        return localStorage.getItem('token');
    },
    saveToken(token) {
        localStorage.setItem('token', token);
    },
    clearToken() {
        localStorage.removeItem('token');
    },
};

// ... (ApiSource yang dikomentari) ...


const Routes = {
    home: {
        async render() {
            const page = new HomePage(idb);
            return await page.render();
        },
        async afterRender() {
            const page = new HomePage(idb);
            await page.afterRender();
        }
    },
    offline: {
        async render() {
            return `
                <div class="container">
                    <h1>Mode Offline</h1>
                    <p>Anda sedang offline. Aplikasi shell tetap dapat diakses, namun fitur yang memerlukan koneksi internet tidak tersedia.</p>
                    <p>Silakan periksa koneksi internet Anda dan coba lagi.</p>
                    <button onclick="window.location.reload()">Coba Lagi</button>
                </div>
            `;
        }
    },
    about: {
        async render() {
            return `
                <div class="container about-page">
                    <h1 class="about-title">Tentang Aplikasi Peta Cerita</h1>
                    <p class="about-subtitle">Membagikan dan menemukan cerita dari seluruh penjuru dunia melalui peta interaktif.</p>
                    <h2>Fitur Utama</h2>
                    <div class="features-grid">
                        <div class="feature-card"><div class="feature-icon">📍</div><h3>Peta Interaktif</h3><p>Visualisasikan semua cerita dalam sebuah peta yang dinamis.</p></div>
                        <div class="feature-card"><div class="feature-icon">➕</div><h3>Tambah Cerita</h3><p>Bagikan pengalaman Anda lengkap dengan foto dan lokasi.</p></div>
                        <div class="feature-card"><div class="feature-icon">📱</div><h3>Desain Responsif</h3><p>Akses dengan nyaman dari perangkat apa pun.</p></div>
                    </div>
                    <h2>Tentang Pengembang</h2>
                    <div class="developer-profile">
                        <img src="images/anis.jpg" alt="Foto Pengembang" class="developer-avatar">
                        <div class="developer-info">
                            <h3><span class="developer-name">Anis Setiawati</span></h3>
                            <p>Seorang mahasiswi Teknik Elektro dengan minat pada pengembangan web dan IoT.</p>
                        </div>
                    </div>
                </div>`;
        }
    },
    map: {
        async render() {
            const page = new MapPage(idb);
            return await page.render();
        },
        async afterRender(app) {
            const page = new MapPage(idb);
            await page.afterRender();

            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            if (urlParams.get('login') === 'success') {
                history.replaceState(null, '', window.location.pathname + window.location.search + '#/map');
                const toast = document.createElement('div');
                toast.className = 'toast-notification';
                toast.innerHTML = `<p>Selamat datang kembali! Anda berhasil login.</p><button class="close-btn" aria-label="Tutup">&times;</button>`;
                document.body.appendChild(toast);
                const removeToast = () => {
                    toast.classList.remove('active');
                    toast.addEventListener('transitionend', () => toast.remove());
                };
                setTimeout(() => toast.classList.add('active'), 100);
                setTimeout(removeToast, 4000);
                toast.querySelector('.close-btn').addEventListener('click', removeToast);
            }
        }
    },
    'add-story': {
        async render() {
            const page = new AddStoryPage(idb);
            return await page.render();
        },
        async afterRender(app) {
            const page = new AddStoryPage(idb);
            await page.afterRender();

            // Trigger sync when coming back online
            if (navigator.onLine && window.syncManager) {
                window.syncManager.forceSync();
            }
        }
    },
    favorite: {
        async render() {
            const page = new FavoritePage(idb);
            return await page.render();
        },
        async afterRender(app) {
            const page = new FavoritePage(idb);
            await page.afterRender();
        }
    },
    // --- PERBAIKAN LOGIN MENGGUNAKAN TheStoryApiSource ---
    login: {
        async render() {
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            const registered = urlParams.get('registered');
            return `
                <div class="container">
                    ${registered ? '<p class="feedback success show">Registrasi berhasil! Silakan login.</p>' : ''}
                    <h1>Silakan Login</h1>
                    <form id="login-form">
                        <div><label for="email">Email</label><input type="email" id="email" required></div>
                        <div><label for="password">Password</label><input type="password" id="password" required></div>
                        <button type="submit">Login</button>
                        <p id="login-error" class="feedback error"></p>
                    </form>
                    <p style="margin-top:1rem;">Belum punya akun? <a href="#/register">Daftar di sini</a></p>
                </div>`;
        },
        async afterRender() {
            document.getElementById('login-form')?.addEventListener('submit', async (event) => {
                event.preventDefault();

                const loader = document.getElementById('loader');
                if (loader) {
                    loader.classList.remove('hidden');
                }
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');
                const errorElement = document.getElementById('login-error');
                if (errorElement) {
                    errorElement.textContent = '';
                    errorElement.classList.remove('show');
                }
                try {
                    // MENGGANTI FETCH LANGSUNG DENGAN TheStoryApiSource.login
                    const loginResult = await TheStoryApiSource.login({ email: emailInput ? emailInput.value : '', password: passwordInput ? passwordInput.value : '' });
                    Auth.saveToken(loginResult.token);

                    // Redirect immediately without success message
                    window.location.hash = '#/map?login=success';

                } catch (error) {
                    if (errorElement) {
                        errorElement.textContent = `Login Gagal: ${error.message}`;
                        errorElement.classList.add('show');
                    }
                } finally {
                    if (loader) {
                        loader.classList.add('hidden');
                    }
                }
            });
        }
    },
    // --- PERBAIKAN REGISTER MENGGUNAKAN TheStoryApiSource ---
    register: {
        async render() {
            return `
                <div class="container">
                    <h1>Buat Akun Baru</h1>
                    <form id="register-form">
                        <div><label for="register-name">Nama</label><input type="text" id="register-name" required></div>
                        <div><label for="register-email">Email</label><input type="email" id="register-email" required></div>
                        <div><label for="register-password">Password</label><input type="password" id="register-password" required minlength="8"></div>
                        <button type="submit">Register</button>
                        <p id="register-error" class="feedback error"></p>
                    </form>
                    <p style="margin-top:1rem;">Sudah punya akun? <a href="#/login">Login di sini</a></p>
                </div>`;
        },
        async afterRender() {
            document.getElementById('register-form')?.addEventListener('submit', async (event) => {
                event.preventDefault();
                const nameInput = document.getElementById('register-name');
                const emailInput = document.getElementById('register-email');
                const passwordInput = document.getElementById('register-password');
                const errorElement = document.getElementById('register-error');
                if (errorElement) {
                    errorElement.textContent = '';
                    errorElement.classList.remove('show');
                }
                try {
                    // MENGGANTI FETCH LANGSUNG DENGAN TheStoryApiSource.register
                    await TheStoryApiSource.register({ name: nameInput ? nameInput.value : '', email: emailInput ? emailInput.value : '', password: passwordInput ? passwordInput.value : '' });
                    window.location.hash = '#/login?registered=true';
                } catch (error) {
                    if (errorElement) {
                        errorElement.textContent = `Registrasi Gagal: ${error.message}`;
                        errorElement.classList.add('show');
                    }
                }
            });
        }
    },
    logout: {
        async render() {
            Auth.clearToken();
            window.location.hash = '#/login';
            return `<div class="container"><p>Anda telah logout...</p></div>`;
        }
    },
    notFound: {
        async render() {
            return `<div class="container"><h1>404</h1><p>Halaman tidak ditemukan. Kembali ke <a href="#/home">beranda</a>.</p></div>`;
        }
    }
};

// =================================================================
// MEMASTIKAN INISIALISASI SETELAH DOM SIAP
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize sync manager
    const syncManager = new SyncManager(idb);
    window.syncManager = syncManager; // Make globally available for debugging

    App.init();
});

// Listen for service worker messages (background sync request and toast notifications)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'sync-stories') {
            // Check if user is logged in before attempting sync
            if (!Auth.isLoggedIn()) {
                console.warn('Sync stories skipped: User not logged in');
                return;
            }
            try {
                // Trigger a fresh fetch (TheStoryApiSource will update cache)
                await TheStoryApiSource.storiesWithLocation();
                showToast('Stories disinkronkan', 'success');
            } catch (err) {
                console.warn('Sinkronisasi stories gagal:', err);
                // Only show error toast if not already shown recently
                if (!localStorage.getItem('sync-error-shown')) {
                    showToast('Sinkronisasi stories gagal', 'error');
                    localStorage.setItem('sync-error-shown', Date.now().toString());
                    // Reset after 5 minutes
                    setTimeout(() => localStorage.removeItem('sync-error-shown'), 5 * 60 * 1000);
                }
            }
        } else if (event.data && event.data.type === 'show-toast') {
            showToast(event.data.message, event.data.type || 'default');
        } else if (event.data && event.data.type === 'store-offline-notification') {
            // Store offline notification when app is closed/background
            if (window.syncManager && event.data.notification) {
                await window.syncManager.addOfflineNotification(event.data.notification);
                console.log('[App] Offline notification stored for later display');
            }
        }
    });
}

// VAPID KEY dari Dicoding: BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk
const DICODING_VAPID_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
let VAPID_PUBLIC_KEY = null; 

const SAVE_SUBSCRIPTION_URL = '/notifications/subscribe';
const SEND_NOTIFICATION_URL = '/sendNotification'; 

function urlB64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// FUNGSI DIGANTI: Sekarang hanya menetapkan kunci hardcode
async function fetchVapidPublicKey() {
    VAPID_PUBLIC_KEY = DICODING_VAPID_KEY;
    console.log('✅ VAPID public key diatur secara hardcode:', VAPID_PUBLIC_KEY);
    // Tidak ada fetch, tidak ada error jaringan.
}

// FUNGSI INI SUDAH MEMILIKI PEMERIKSAAN API YANG BENAR
async function initializePushToggle() {
    // 1. Pemeriksaan dukungan Push Messaging
    if (!('serviceWorker' in navigator)) {
        // Service Worker not supported, skip silently

        const toggleBtn = document.getElementById('push-toggle-btn');
        if (toggleBtn) {
            toggleBtn.disabled = true;
            toggleBtn.textContent = 'Notif Disabled (No SW)';
        }
        return;
    }

    if (!('PushManager' in window)) {
        console.warn('Push Messaging tidak didukung di browser ini, namun Service Worker tersedia.');

        // Allow basic functionality without push notifications
        const toggleBtn = document.getElementById('push-toggle-btn');
        if (toggleBtn) {
            toggleBtn.disabled = true;
            toggleBtn.textContent = 'Notif Disabled (No Push API)';
        }
        return;
    }

    // 2. Fetch VAPID public key (sekarang hardcode)
    await fetchVapidPublicKey();

    // 3. Pemeriksaan VAPID Key
    if (!VAPID_PUBLIC_KEY) { 
        console.warn('Inisialisasi Push dibatalkan: VAPID key tidak tersedia.');
        
        const toggleBtn = document.getElementById('push-toggle-btn');
        if (toggleBtn) {
            toggleBtn.disabled = true;
            toggleBtn.textContent = 'Notif Disabled (Key Missing)';
        }
        return;
    }

    // 4. Lanjutkan inisialisasi hanya jika VAPID_PUBLIC_KEY berhasil
    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker berhasil didaftarkan untuk push:', registration);

        const subscription = await registration.pushManager.getSubscription();
        const isSubscribed = !!subscription;
        updatePushToggleUI(isSubscribed);

        const toggleBtn = document.getElementById('push-toggle-btn');
        if (toggleBtn) {
            // Memastikan tombol terlihat dan diikat, karena VAPID Key sudah ada
            toggleBtn.style.display = 'block'; // Pastikan terlihat (jika disembunyikan CSS awal)
            toggleBtn.addEventListener('click', async () => {
                toggleBtn.disabled = true;
                try {
                    const currentSub = await registration.pushManager.getSubscription();
                    if (currentSub) {
                        await unsubscribeUser(registration, currentSub);
                        updatePushToggleUI(false);
                    } else {
                        // ask for permission first
                        const permission = await Notification.requestPermission();
                        if (permission !== 'granted') {
                           alert('Izin notifikasi ditolak. Tidak dapat melakukan subscribe.');
                           showToast('Izin notifikasi ditolak', 'error');
                           updatePushToggleUI(false);
                        } else {
                            await subscribeUserToPush(registration);
                            updatePushToggleUI(true);
                        }
                    }
                } catch (err) {
                    console.error('Error toggling push subscription:', err);
                        alert('Terjadi kesalahan saat mengubah status notifikasi. Lihat konsol.');
                        showToast('Gagal mengubah status notifikasi: ' + (err.message || ''), 'error');
                } finally {
                    if (toggleBtn) toggleBtn.disabled = false;
                }
            });
        }

    } catch (err) {
        console.error('Registrasi service worker / inisialisasi push gagal:', err);
    }
}

function updatePushToggleUI(isSubscribed) {
    const btn = document.getElementById('push-toggle-btn');
    if (btn) {
        btn.classList.toggle('subscribed', isSubscribed);
        btn.textContent = isSubscribed ? 'Disable Notifications' : 'Enable Notifications';

        // Add dynamic effect for state change
        btn.style.animation = 'none';
        setTimeout(() => {
            btn.style.animation = isSubscribed ? 'pulse-success 0.6s ease-out' : '';
        }, 10);
    }
}

// Toast helper: show short messages to the user
function showToast(message, type = 'default', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (container) {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'success' : type === 'error' ? 'error' : ''}`;
        toast.textContent = message;
        container.appendChild(toast);
        // allow CSS transition
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, duration);
    }
}

// Expose for other modules/pages that are not bundled together
window.showToast = showToast;

// Favorite indicator helper
window.showFavoriteIndicator = function(message = 'Favorited') {
    const indicator = document.getElementById('favorite-indicator');
    if (indicator) {
        const span = indicator.querySelector('span');
        if (span) span.textContent = message;
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }
};

async function subscribeUserToPush(registration) {
    try {
        // PENTING: Cek lagi VAPID_PUBLIC_KEY
        if (!VAPID_PUBLIC_KEY) throw new Error('VAPID key hilang, tidak bisa subscribe.');

        // Use the provided VAPID public key directly
        const convertedVapidKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        console.log('Pengguna berhasil subscribe:', subscription);
        // Store locally so developer can access it for testing (DevTools or test script)
        localStorage.setItem('push_subscription', JSON.stringify(subscription));

        // Kirim subscription ke API Story
        try {
            await TheStoryApiSource.subscribeNotification({
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
                    auth: arrayBufferToBase64(subscription.getKey('auth'))
                }
            });
            console.log('Subscription berhasil dikirim ke API Story');
        } catch (apiError) {
            console.error('Gagal mengirim subscription ke API:', apiError);
            // Tetap lanjutkan karena subscription lokal berhasil
        }

        showToast('Langganan notifikasi aktif', 'success');
        return subscription;
    } catch (error) {
        console.error('Gagal melakukan subscribe:', error);
        throw error;
    }
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function unsubscribeUser(registration, subscriptionObj) {
    try {
        const subscription = subscriptionObj || await registration.pushManager.getSubscription();
        if (!subscription) return;

        // Kirim unsubscribe ke API Story
        try {
            await TheStoryApiSource.unsubscribeNotification({
                endpoint: subscription.endpoint
            });
            console.log('Unsubscription berhasil dikirim ke API Story');
        } catch (apiError) {
            console.error('Gagal mengirim unsubscription ke API:', apiError);
            // Tetap lanjutkan karena unsubscribe lokal berhasil
        }

        const success = await subscription.unsubscribe();
        console.log('Unsubscribe sukses:', success);
        localStorage.removeItem('push_subscription');
        showToast('Langganan notifikasi dimatikan', 'success');
        return success;
    } catch (err) {
        console.error('Gagal unsubscribe:', err);
        throw err;
    }
}

async function sendNotification(payload) {
    try {
        const response = await fetch(SEND_NOTIFICATION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        console.log('Notification sent:', result);
    } catch (err) {
        console.warn('Failed to send notification:', err);
    }
}

// Inisialisasi PWA install prompt handling
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent automatic prompt
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
        installBtn.style.display = 'inline-block';
        installBtn.addEventListener('click', async (event) => {
            // Ensure this is triggered by user gesture
            if (event.isTrusted && deferredInstallPrompt) {
                installBtn.disabled = true;
                deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                if (choice.outcome === 'accepted') {
                    showToast('Aplikasi siap diinstal', 'success');
                } else {
                    showToast('Instalasi dibatalkan', 'error');
                }
                deferredInstallPrompt = null;
                installBtn.style.display = 'none';
                installBtn.disabled = false;
            }
        });
    }
});

window.addEventListener('appinstalled', () => {
    showToast('Aplikasi telah diinstal', 'success');
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
});

// Register Service Worker for push notifications and caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker berhasil didaftarkan:', registration);
            })
            .catch(error => {
                console.error('❌ Gagal mendaftarkan Service Worker:', error);
            });
    });
}
// Inisialisasi Push Toggle pada DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializePushToggle(); // Pastikan ini dipanggil
});