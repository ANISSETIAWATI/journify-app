import TheStoryApiSource from '../../data/thestoryapi-source';

export default class StoryDetailPage {
  constructor(idb) {
    this.idb = idb;
  }

  async render() {
    return `
      <section class="container story-detail">
        <div id="story-content">
          <div class="loader">Memuat detail cerita...</div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    console.log('afterRender called for story detail page');
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const urlParams = new URLSearchParams(queryString);
    const storyId = urlParams.get('id');
    console.log('storyId from URL:', storyId);

    if (!storyId) {
      console.log('No storyId found in URL');
      document.getElementById('story-content').innerHTML = '<p class="error">ID cerita tidak ditemukan.</p>';
      return;
    }

    try {
      console.log('Fetching stories with location...');
      // Fetch stories and find the one with matching ID
      const stories = await TheStoryApiSource.storiesWithLocation();
      console.log('Fetched stories:', stories.length);
      const story = stories.find(s => s.id === storyId);
      console.log('Found story:', story);

      if (!story) {
        console.log('Story not found for id:', storyId);
        document.getElementById('story-content').innerHTML = '<p class="error">Cerita tidak ditemukan.</p>';
        return;
      }

      // Safer property access
      const name = story.name || 'Anonim';
      const photoUrl = story.photoUrl || '';
      const description = story.description || '';
      const lat = story.lat || 'N/A';
      const lon = story.lon || 'N/A';
      const createdAt = story.createdAt ? new Date(story.createdAt).toLocaleDateString() : 'N/A';

      console.log('Rendering story details for:', name);

      // Check if story is favorite
      const isFav = await this.idb.isFavorite(storyId);
      const buttonText = isFav ? '💔 Hapus dari Favorit' : '❤️ Tambah ke Favorit';

      // Render story details
      document.getElementById('story-content').innerHTML = `
        <h1>${name}</h1>
        ${photoUrl ? `<img src="${photoUrl}" alt="Foto cerita" loading="lazy" />` : '<p>No image available</p>'}
        <p class="description">${description}</p>
        <p class="location">Lokasi: ${lat}, ${lon}</p>
        <p class="date">Dibuat: ${createdAt}</p>
        <button id="love-btn" class="love-btn">${buttonText}</button>
        <button onclick="window.location.hash='#/map'">Kembali ke Peta</button>
      `;

      // Add event listener for love button
      const loveBtn = document.getElementById('love-btn');
      loveBtn.addEventListener('click', async () => {
        const isCurrentlyFav = await this.idb.isFavorite(storyId);
        if (isCurrentlyFav) {
          await this.idb.removeFavorite(storyId);
          loveBtn.textContent = '❤️ Tambah ke Favorit';
          if (window.showFavoriteIndicator) window.showFavoriteIndicator('Removed from favorites');
        } else {
          await this.idb.addFavorite(storyId);
          loveBtn.textContent = '💔 Hapus dari Favorit';
          if (window.showFavoriteIndicator) window.showFavoriteIndicator('Added to favorites');
        }
      });
      console.log('Story details rendered successfully');
    } catch (error) {
      console.error('Error loading story detail:', error);
      console.error('Error stack:', error.stack);
      document.getElementById('story-content').innerHTML = `<p class="error">Gagal memuat detail cerita: ${error.message}</p>`;
    }
  }
}
