import TheStoryApiSource from '../../data/thestoryapi-source';
import IDB from '../../data/idb';

export default class FavoritePage {
    #idb = null;
    #originalFavorites = [];

    constructor(idb) {
        this.#idb = idb;
    }

    async render() {
        return `
            <section class="container">
                <h1>Cerita Favorit</h1>

                <div class="favorite-controls">
                    <input type="text" id="search-favorites" placeholder="Cari cerita favorit...">
                    <select id="sort-favorites">
                        <option value="">Urutkan</option>
                        <option value="name-asc">Nama A-Z</option>
                        <option value="name-desc">Nama Z-A</option>
                        <option value="date-new">Terbaru</option>
                        <option value="date-old">Terlama</option>
                    </select>
                    <select id="category-filter">
                        <option value="all">Semua</option>
                        <option value="recent">Baru-baru ini</option>
                        <option value="old">Lama</option>
                        <option value="with-location">Dengan Lokasi</option>
                    </select>
                    <button id="filter-favorites-btn">Filter</button>
                </div>

                <div id="favorites-list"></div>
            </section>
        `;
    }

    async afterRender() {
        const favoritesList = document.getElementById('favorites-list');
        if (!favoritesList) return;

        // Memanggil fungsi baru yang menangani loading stories
        await this._fetchAndDisplayFavorites(favoritesList);

        // Add event listeners for search, sort, and filter
        const searchInput = document.getElementById('search-favorites');
        const sortSelect = document.getElementById('sort-favorites');
        const categoryFilter = document.getElementById('category-filter');
        const filterButton = document.getElementById('filter-favorites-btn');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this._applyFiltersAndSort(favoritesList);
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this._applyFiltersAndSort(favoritesList);
            });
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this._applyFiltersAndSort(favoritesList);
            });
        }

        if (filterButton) {
            filterButton.addEventListener('click', () => {
                this._applyFiltersAndSort(favoritesList);
            });
        }
    }

    // Fungsi baru untuk memuat dan menampilkan favorit
    async _fetchAndDisplayFavorites(container) {
        try {
            await this._loadFavorites(container);
        } catch (error) {
            // Menampilkan pesan otentikasi jika diperlukan
            if (error.message && error.message.includes('login terlebih dahulu')) {
                container.innerHTML = `<p class="error-message">Anda harus <a href="#/login">login</a> untuk memuat cerita dari API.</p>
                                        <p>Menampilkan cerita favorit yang tersimpan secara lokal.</p>`;
                
                // Coba muat ulang hanya dari IDB (lokal)
                await this._loadFavoritesFromIDBOnly(container);

            } else {
                console.error('Error loading favorites:', error);
                container.innerHTML = `<p class="error-message">Gagal memuat cerita favorit: ${error.message}</p>`;
            }
        }
    }


    async _loadFavorites(container) {
        const favorites = await this.#idb.getAllFavorites();

        // 1. Load API stories
        let apiStories = [];
        try {
            // Try to get stories from API first
            apiStories = await TheStoryApiSource.stories();
        } catch (apiError) {
            // If API fails (network error, token invalid, etc.), continue with local stories only
            console.log('API unavailable for favorites, using local stories only:', apiError.message);
        }

        // 2. Load manual stories (Lokal) - always available
        const manualStories = await this.#idb.getAllStories();

        // 3. Gabungkan cerita API dan lokal
        const allStories = [
            ...(Array.isArray(apiStories) ? apiStories : []), // Pencegahan TypeError: stories is not iterable
            ...(Array.isArray(manualStories) ? manualStories : [])
        ];

        // 4. Filter cerita yang difavoritkan
        const favoriteStories = allStories.filter(story => favorites.some(fav => fav.id === story.id));

        // Store the original favorites for filtering/sorting
        this.#originalFavorites = favoriteStories;

        container.innerHTML = '';
        if (favoriteStories.length === 0) {
            container.innerHTML = '<p>Belum ada cerita favorit.</p>';
        } else {
            this._renderFavorites(container, favoriteStories);
        }
    }
    
    // Fungsi fallback jika API gagal (mengatasi kasus otentikasi)
    async _loadFavoritesFromIDBOnly(container) {
        try {
            const favorites = await this.#idb.getAllFavorites();
            const manualStories = await this.#idb.getAllStories();
            
            const favoriteStories = manualStories.filter(story => favorites.some(fav => fav.id === story.id));
            
            this.#originalFavorites = favoriteStories;
            
            if (favoriteStories.length === 0) {
                container.innerHTML += '<p>Tidak ada cerita favorit yang tersimpan secara lokal.</p>';
            } else {
                this._renderFavorites(container, favoriteStories);
            }
        } catch (error) {
            console.error('Error loading local favorites:', error);
            container.innerHTML += '<p class="error-message">Gagal memuat cerita favorit lokal.</p>';
        }
    }


    _renderFavorites(container, stories) {
        container.innerHTML = '';
        if (stories.length === 0) {
            container.innerHTML = '<p>Tidak ada cerita favorit yang sesuai dengan filter.</p>';
            return;
        }

        stories.forEach(story => {
            const storyElement = document.createElement('div');
            storyElement.className = 'story-item favorite-item';
            storyElement.innerHTML = `
                <img src="${story.photoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" alt="Foto dari ${story.name}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                <div class="story-info">
                    <h2>${story.name}</h2>
                    <p>${story.description}</p>
                    <div class="story-meta">
                        <small>Dibuat: ${new Date(story.createdAt).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}</small>
                        ${story.lat && story.lon ? '<span class="location-indicator">📍</span>' : ''}
                    </div>
                </div>
                <button class="remove-favorite-btn" data-id="${story.id}" aria-label="Hapus dari favorit">
                    💔 Hapus
                </button>
            `;
            container.appendChild(storyElement);
        });

        document.querySelectorAll('.remove-favorite-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const idToRemove = event.target.closest('.remove-favorite-btn').dataset.id;
                await this.#idb.removeFavorite(idToRemove);
                if (window.showFavoriteIndicator) window.showFavoriteIndicator('Removed from favorites');
                event.target.closest('.favorite-item').remove(); // Remove from UI
                // Update the original favorites list
                this.#originalFavorites = this.#originalFavorites.filter(story => story.id !== idToRemove);
                if (container.children.length === 0) {
                    container.innerHTML = '<p>Belum ada cerita favorit.</p>';
                }
            });
        });
    }

    _applyFiltersAndSort(container) {
        if (!this.#originalFavorites) return;

        const searchQuery = document.getElementById('search-favorites').value.toLowerCase();
        const sortOption = document.getElementById('sort-favorites').value;
        const categoryFilter = document.getElementById('category-filter').value;

        let filteredStories = this.#originalFavorites.filter(story => {
            // Search filter
            const matchesSearch = story.name.toLowerCase().includes(searchQuery) ||
                                 story.description.toLowerCase().includes(searchQuery);

            // Category filter
            let matchesCategory = true;
            const now = new Date();
            const storyDate = new Date(story.createdAt);
            const daysDiff = Math.floor((now - storyDate) / (1000 * 60 * 60 * 24));

            switch (categoryFilter) {
                case 'recent':
                    matchesCategory = daysDiff <= 7;
                    break;
                case 'old':
                    matchesCategory = daysDiff > 30;
                    break;
                case 'with-location':
                    matchesCategory = story.lat && story.lon;
                    break;
                case 'all':
                default:
                    matchesCategory = true;
                    break;
            }

            return matchesSearch && matchesCategory;
        });

        // Apply sorting
        filteredStories.sort((a, b) => {
            switch (sortOption) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'date-new':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'date-old':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                default:
                    return 0;
            }
        });

        this._renderFavorites(container, filteredStories);
    }
}