import TheStoryApiSource from '../../data/thestoryapi-source';
import IDB from '../../data/idb';

class MapPage {
  constructor(idb) {
    this._idb = idb;
    this._map = null;
    this._markers = {};
    this._allStories = [];
    this._currentPage = 1;
    this._storiesPerPage = 10;
  }

  async render() {
    return `
      <div class="container">
        <h1>Lokasi Cerita Pengguna</h1>
        <div id="loader" class="loader hidden">
          <div class="spinner"></div>
          <p>Memuat data...</p>
        </div>
        <div class="map-container">
          <div class="story-list">
            <div id="story-list-items"><div class="placeholder">Memuat data...</div></div>
            <div id="pagination-controls"></div>
          </div>
          <div id="map" class="map"></div>
        </div>
        <div id="story-details" class="story-details" style="display: none;">
          <h2 id="story-title"></h2>
          <img id="story-image" alt="" />
          <p id="story-description"></p>
          <small id="story-date"></small>
          <button id="close-story-details" class="close-btn">Tutup</button>
        </div>
        <div id="story-history" class="story-history" style="display: none;">
          <div class="history-header">
            <h2>Riwayat Cerita</h2>
            <button id="close-history" class="close-btn" aria-label="Tutup riwayat cerita">×</button>
          </div>
          <div id="history-list" class="history-list">
            <div class="placeholder">Memuat riwayat...</div>
          </div>
        </div>
      </div>
    `;
  }

  async afterRender() {
    this._initializeMap();
    await this._fetchAndDisplayStories();
    this._addHistoryButton();
    this._addCloseButtons();
  }

  _initializeMap() {
    this._map = L.map('map', {
      zoomControl: false // Disable default zoom control
    }).setView([-2.5489, 118.0149], 5);

    const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    });

    const stadiaAlidadeSmoothDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>',
      maxZoom: 20,
    });

    const baseMaps = {
      "Street": openStreetMap,
      "Dark Mode": stadiaAlidadeSmoothDark,
    };

    openStreetMap.addTo(this._map);

    // Add zoom control to bottom right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(this._map);

    // Add layers control to bottom right, below zoom
    L.control.layers(baseMaps, {}, {
      position: 'bottomright'
    }).addTo(this._map);
  }

  async _fetchAndDisplayStories() {
    const storyListContainer = document.querySelector('.story-list');
    const loader = document.getElementById('loader');

    loader.classList.remove('hidden');

    try {
      // Load API stories first
      let apiStories = [];
      try {
        apiStories = await TheStoryApiSource.storiesWithLocation();
      } catch (error) {
        console.warn('Failed to load API stories:', error.message);
        // Continue with offline stories only
      }

      // Load offline/saved stories from IndexedDB
      const savedStories = await this._idb.getAllSavedStories();

      // Combine API and offline stories, prioritizing API stories
      const apiStoryIds = new Set(apiStories.map(s => s.id));
      const combinedStories = [
        ...apiStories,
        ...savedStories.filter(story => !apiStoryIds.has(story.id))
      ];

      // Store stories for later use
      this._apiStories = apiStories;
      this._allStories = combinedStories;

    const storyListItems = document.getElementById('story-list-items');
    storyListItems.innerHTML = '';

      // get saved ids to mark saved stories
      const saved = await IDB.getAllSavedStories();
      const savedIds = new Set(saved.map(s => s.id));

      // get favorite ids
      const favorites = await IDB.getAllFavorites();
      const favoriteIds = new Set(favorites.map(f => f.id));

      combinedStories.forEach(story => {
        const isSaved = savedIds.has(story.id);
        const isFavorite = favoriteIds.has(story.id);
        const isOffline = story.isManual || story.id.startsWith('offline-');

        // Create story item element
        const storyItem = document.createElement('div');
        storyItem.className = `story-item ${isOffline ? 'offline' : ''}`;
        storyItem.setAttribute('data-story-id', story.id);
        storyItem.setAttribute('tabindex', '0');
        storyItem.innerHTML = `
          <img src="${story.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" alt="Foto dari ${story.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='" loading="lazy">
          <div class="story-info">
            <h3>${story.name}</h3>
            <p>${story.description ? story.description.substring(0, 60) : 'Tidak ada deskripsi'}...</p>
            <small>Dibuat pada: ${new Date(story.createdAt).toLocaleDateString()}</small>
            ${isOffline ? '<small class="offline-badge">Offline</small>' : ''}
          </div>
          <div class="story-actions">
            <button class="love-btn ${isFavorite ? 'loved' : ''}" data-id="${story.id}" aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
              ${isFavorite ? '❤️' : '🤍'}
            </button>
          </div>
        `;

        storyListContainer.appendChild(storyItem);

        if (story.lat && story.lon) {
          const marker = L.marker([story.lat, story.lon])
            .addTo(this._map)
            .bindPopup(`<b>${story.name}</b><br>${story.description ? story.description.substring(0, 40) : 'Tidak ada deskripsi'}...${isOffline ? '<br><small style="color:orange;">(Offline)</small>' : ''}`);

          this._markers[story.id] = marker;

          marker.on('click', () => {
            const storyItem = document.querySelector(`.story-item[data-story-id="${story.id}"]`);
            if (storyItem) {
              document.querySelectorAll('.story-item').forEach(item => item.classList.remove('active'));
              storyItem.classList.add('active');
            }
          });
        }
      });

      // PERUBAHAN 1: Kirim 'storyListContainer' sebagai argumen
      this._addListInteraction(storyListContainer);
      this._renderPagination();

    } catch (error) {
      console.error('Gagal memuat cerita:', error);
      if (storyListContainer) {
        if (error.message.includes('Sesi login telah berakhir')) {
          storyListContainer.innerHTML = '<div class="placeholder error">Sesi login telah berakhir. <a href="#/login">Login kembali</a> untuk melihat cerita.</div>';
        } else {
          storyListContainer.innerHTML = '<div class="placeholder error">Gagal memuat data. Silakan coba lagi.</div>';
        }
      }
    } finally {
      loader.classList.add('hidden');
    }
  }

  // PERUBAHAN 2: Terima 'container' sebagai parameter
  _addListInteraction(container) {
    if (!container) return; // Pengaman jika container null

    container.addEventListener('click', async (event) => {
      const loveBtn = event.target.closest('.love-btn');
      if (loveBtn) {
        const id = loveBtn.dataset.id;
        const isLoved = loveBtn.classList.contains('loved');
        try {
          if (isLoved) {
            await this._idb.removeFavorite(id);
            loveBtn.classList.remove('loved');
            loveBtn.textContent = '🤍';
            loveBtn.setAttribute('aria-label', 'Add to favorites');
            if (window.showFavoriteIndicator) window.showFavoriteIndicator('Removed from favorites');
          } else {
            await this._idb.addFavorite(id);
            loveBtn.classList.add('loved');
            loveBtn.textContent = '❤️';
            loveBtn.setAttribute('aria-label', 'Remove from favorites');
            if (window.showFavoriteIndicator) window.showFavoriteIndicator('Added to favorites');
          }
        } catch (error) {
          console.error('Error updating favorite:', error);
          if (window.showToast) window.showToast('Gagal memperbarui favorit', 'error');
        }
        return;
      }



      const storyItem = event.target.closest('.story-item');
      this._handleItemInteraction(storyItem);
    });

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const storyItem = event.target.closest('.story-item');
        this._handleItemInteraction(storyItem);
      }
    });
  }

  _handleItemInteraction(storyItem) {
    if (storyItem) {
      const storyId = storyItem.dataset.storyId;
      const marker = this._markers[storyId];

      if (marker) {
        this._map.flyTo(marker.getLatLng(), 15);
        marker.openPopup();

        document.querySelectorAll('.story-item').forEach(item => item.classList.remove('active'));
        storyItem.classList.add('active');

        // Show story details
        this._showStoryDetails(storyId);
      }
    }
  }

  async _showStoryDetails(storyId) {
    // Find story from API stories or saved stories (for offline/synced stories)
    let story = this._apiStories.find(s => s.id === storyId);

    if (!story) {
      story = await this._idb.getSavedStory(storyId);
    }

    if (story) {
      const detailsContainer = document.getElementById('story-details');
      const titleEl = document.getElementById('story-title');
      const imageEl = document.getElementById('story-image');
      const descriptionEl = document.getElementById('story-description');
      const dateEl = document.getElementById('story-date');

      titleEl.textContent = story.name;
      imageEl.src = story.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
      imageEl.loading = 'lazy';
      imageEl.alt = `Foto dari ${story.name}`;
      descriptionEl.textContent = story.description;
      dateEl.textContent = `Dibuat pada: ${new Date(story.createdAt).toLocaleDateString()}`;

      detailsContainer.style.display = 'block';
      detailsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }



  _renderPagination() {
    const paginationControls = document.getElementById('pagination-controls');
    if (!paginationControls) return;

    const totalPages = Math.ceil(this._allStories.length / this._storiesPerPage);
    if (totalPages <= 1) {
      paginationControls.innerHTML = '';
      return;
    }

    let paginationHTML = '<div class="pagination">';

    // Previous button
    if (this._currentPage > 1) {
      paginationHTML += `<button class="page-btn" data-page="${this._currentPage - 1}">« Previous</button>`;
    }

    // Page numbers
    const startPage = Math.max(1, this._currentPage - 2);
    const endPage = Math.min(totalPages, this._currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        paginationHTML += '<span class="pagination-dots">...</span>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `<button class="page-btn ${i === this._currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += '<span class="pagination-dots">...</span>';
      }
      paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next button
    if (this._currentPage < totalPages) {
      paginationHTML += `<button class="page-btn" data-page="${this._currentPage + 1}">Next »</button>`;
    }

    paginationHTML += '</div>';
    paginationControls.innerHTML = paginationHTML;

    // Add event listeners
    paginationControls.addEventListener('click', (event) => {
      const pageBtn = event.target.closest('.page-btn');
      if (pageBtn) {
        const page = parseInt(pageBtn.dataset.page);
        this._changePage(page);
      }
    });
  }

  _changePage(page) {
    this._currentPage = page;
    this._renderStoriesForPage();
    this._renderPagination();
  }

  async _renderStoriesForPage() {
    const storyListItems = document.getElementById('story-list-items');
    if (!storyListItems) return;

    const startIndex = (this._currentPage - 1) * this._storiesPerPage;
    const endIndex = startIndex + this._storiesPerPage;
    const storiesToShow = this._allStories.slice(startIndex, endIndex);

    storyListItems.innerHTML = '';

    // get saved ids to mark saved stories
    const saved = await IDB.getAllSavedStories();
    const savedIds = new Set(saved.map(s => s.id));

    // get favorite ids
    const favorites = await IDB.getAllFavorites();
    const favoriteIds = new Set(favorites.map(f => f.id));

    storiesToShow.forEach(story => {
      const isSaved = savedIds.has(story.id);
      const isFavorite = favoriteIds.has(story.id);
      const isOffline = story.isManual || story.id.startsWith('offline-');

      // Create story item element
      const storyItem = document.createElement('div');
      storyItem.className = `story-item ${isOffline ? 'offline' : ''}`;
      storyItem.setAttribute('data-story-id', story.id);
      storyItem.setAttribute('tabindex', '0');
      storyItem.innerHTML = `
        <img src="${story.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" alt="Foto dari ${story.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='" loading="lazy">
        <div class="story-info">
          <h3>${story.name}</h3>
            <p>${story.description ? story.description.substring(0, 60) : 'Tidak ada deskripsi'}...</p>
          <small>Dibuat pada: ${new Date(story.createdAt).toLocaleDateString()}</small>
          ${isOffline ? '<small class="offline-badge">Offline</small>' : ''}
        </div>
        <div class="story-actions">
          <button class="love-btn ${isFavorite ? 'loved' : ''}" data-id="${story.id}" aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
            ${isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      `;

      storyListItems.appendChild(storyItem);

      if (story.lat && story.lon) {
        const isOffline = story.isManual || story.id.startsWith('offline-');
        const marker = L.marker([story.lat, story.lon])
          .addTo(this._map)
          .bindPopup(`<b>${story.name}</b><br>${story.description ? story.description.substring(0, 40) : 'Tidak ada deskripsi'}...${isOffline ? '<br><small style="color:orange;">(Offline)</small>' : ''}`);

        this._markers[story.id] = marker;

        marker.on('click', () => {
          const storyItem = document.querySelector(`.story-item[data-story-id="${story.id}"]`);
          if (storyItem) {
            document.querySelectorAll('.story-item').forEach(item => item.classList.remove('active'));
            storyItem.classList.add('active');
          }
        });
      }
    });

    // Re-add list interaction for new items
    this._addListInteraction(storyListItems);
  }

  _addHistoryButton() {
    // Add history button to the page header or somewhere visible
    const container = document.querySelector('.container');
    if (!container) return;

    // Create history button
    const historyBtn = document.createElement('button');
    historyBtn.id = 'show-history-btn';
    historyBtn.className = 'history-btn';
    historyBtn.innerHTML = '📚 Riwayat Cerita';
    historyBtn.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background-color: var(--primary-color);
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      z-index: 1000;
      box-shadow: var(--shadow-md);
      transition: background-color var(--transition-speed) ease;
    `;

    historyBtn.addEventListener('mouseenter', () => {
      historyBtn.style.backgroundColor = 'var(--primary-hover)';
    });

    historyBtn.addEventListener('mouseleave', () => {
      historyBtn.style.backgroundColor = 'var(--primary-color)';
    });

    historyBtn.addEventListener('click', () => {
      this._showStoryHistory();
    });

    container.appendChild(historyBtn);
  }

  _addCloseButtons() {
    // Add event listeners for close buttons
    const closeDetailsBtn = document.getElementById('close-story-details');
    const closeHistoryBtn = document.getElementById('close-history');
    const historyContainer = document.getElementById('story-history');

    if (closeDetailsBtn) {
      closeDetailsBtn.addEventListener('click', () => {
        const detailsContainer = document.getElementById('story-details');
        if (detailsContainer) {
          detailsContainer.style.display = 'none';
        }
      });
    }

    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener('click', () => {
        if (historyContainer) {
          historyContainer.style.display = 'none';
        }
      });
    }

    // Add click outside to close modal
    if (historyContainer) {
      historyContainer.addEventListener('click', (event) => {
        if (event.target === historyContainer) {
          historyContainer.style.display = 'none';
        }
      });
    }
  }

  async _showStoryHistory() {
    const historyContainer = document.getElementById('story-history');
    const historyList = document.getElementById('history-list');

    if (!historyContainer || !historyList) return;

    // Show loading
    historyList.innerHTML = '<div class="placeholder">Memuat riwayat...</div>';
    historyContainer.style.display = 'block';

    try {
      // Get all saved stories from IDB
      const savedStories = await this._idb.getAllSavedStories();

      if (savedStories.length === 0) {
        historyList.innerHTML = '<div class="placeholder">Belum ada cerita yang disimpan.</div>';
        return;
      }

      // Get favorite ids
      const favorites = await this._idb.getAllFavorites();
      const favoriteIds = new Set(favorites.map(f => f.id));

      // Sort by created date (newest first)
      savedStories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      historyList.innerHTML = '';

      savedStories.forEach(story => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.setAttribute('data-story-id', story.id);
        historyItem.innerHTML = `
          <img src="${story.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" alt="Foto cerita ${story.name}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
          <div class="history-info">
            <h3>${story.name}</h3>
            <p>${story.description.substring(0, 100)}...</p>
            <small>Dibuat: ${new Date(story.createdAt).toLocaleDateString('id-ID')}</small>
            ${story.isManual || story.id.startsWith('offline-') ? '<small class="offline-badge">Offline</small>' : ''}
          </div>
          <div class="history-actions">
            <button class="love-btn ${favoriteIds.has(story.id) ? 'loved' : ''}" data-id="${story.id}" aria-label="${favoriteIds.has(story.id) ? 'Remove from favorites' : 'Add to favorites'}">
              ${favoriteIds.has(story.id) ? '❤️' : '🤍'}
            </button>
          </div>
        `;

        // Handle clicking on the history item (excluding love button)
        historyItem.addEventListener('click', (event) => {
          if (!event.target.closest('.love-btn')) {
            this._showStoryDetails(story.id);
            historyContainer.style.display = 'none';
          }
        });

        historyList.appendChild(historyItem);
      });

      // Add event listeners for love buttons in history
      historyList.addEventListener('click', async (event) => {
        const loveBtn = event.target.closest('.love-btn');
        if (loveBtn) {
          const id = loveBtn.dataset.id;
          const isLoved = loveBtn.classList.contains('loved');
          try {
            if (isLoved) {
              await this._idb.removeFavorite(id);
              loveBtn.classList.remove('loved');
              loveBtn.textContent = '🤍';
              loveBtn.setAttribute('aria-label', 'Add to favorites');
              if (window.showFavoriteIndicator) window.showFavoriteIndicator('Removed from favorites');
            } else {
              await this._idb.addFavorite(id);
              loveBtn.classList.add('loved');
              loveBtn.textContent = '❤️';
              loveBtn.setAttribute('aria-label', 'Remove from favorites');
              if (window.showFavoriteIndicator) window.showFavoriteIndicator('Added to favorites');
            }
          } catch (error) {
            console.error('Error updating favorite from history:', error);
            if (window.showToast) window.showToast('Gagal memperbarui favorit', 'error');
          }
        }
      });

    } catch (error) {
      console.error('Error loading story history:', error);
      historyList.innerHTML = '<div class="placeholder error">Gagal memuat riwayat cerita.</div>';
    }
  }
}

export default MapPage;
