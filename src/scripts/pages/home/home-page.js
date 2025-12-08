import TheStoryApiSource from '../../data/thestoryapi-source.js';
import lazyLoad from '../../utils/lazy-load.js';
import IDB from '../../data/idb.js';

export default class HomePage {
  constructor(idb) {
    this.idb = idb;
  }

  async render() {
    return `
      <section class="container">
        <h1>Selamat Datang di Beranda</h1>
        <p>Aplikasi ini menampilkan data cerita pengguna pada sebuah peta interaktif. Silakan login atau register untuk memulai.</p>

        <section class="news-section">
          <h2>Berita Terkini Indonesia</h2>
          <div id="news-timestamp" class="news-timestamp">Memuat...</div>
          <div id="news-container" class="news-container">
            <p>Loading berita...</p>
          </div>
        </section>
      </section>
    `;
  }

  async afterRender() {
    const newsContainer = document.getElementById('news-container');

    // Function to load and display news
    const loadNews = async () => {
      try {
        const news = await TheStoryApiSource.getIndonesiaNews();

        if (news && news.length > 0) {
          const newsHTML = news.slice(0, 10).map(article => {
            const imageUrl = article.image || (article._raw && (article._raw.image || article._raw.urlToImage)) || '';
            const isDummy = article._raw && (article._raw.dummy || article._raw.note === 'dummy');

            return `
            <article class="news-item">
              <div class="news-image" style="flex: 0 0 150px;">
                ${imageUrl ? `<img src="${imageUrl}" alt="${article.title}" style="width:150px;height:100px;object-fit:cover;border-radius:6px;">` : ''}
              </div>
              <div class="news-content" style="flex:1;">
                <h3 class="news-title"><a href="${article.url}" target="_blank" rel="noopener">${article.title}</a> ${isDummy ? '<span class="dummy-badge" style="font-size:12px;color:#aaa;margin-left:8px;">(Contoh)</span>' : ''}</h3>
                <p class="news-description">${article.description || 'Deskripsi tidak tersedia'}</p>
                <small class="news-meta">Sumber: ${article.source.name} | Tanggal: ${new Date(article.publishedAt).toLocaleDateString('id-ID')} ${new Date(article.publishedAt).toLocaleTimeString('id-ID')}</small>
              </div>
            </article>
          `;
          }).join('');

          newsContainer.innerHTML = newsHTML;
        } else {
          newsContainer.innerHTML = '<p>Tidak ada berita tersedia saat ini.</p>';

          // Tambah tombol debug untuk menampilkan response mentah jika tersedia
          const debugBtn = document.createElement('button');
          debugBtn.textContent = 'Tampilkan debug response';
          debugBtn.style.marginTop = '12px';
          debugBtn.addEventListener('click', () => {
            try {
              const raw = TheStoryApiSource.lastNewsRaw;
              console.log('Raw news response:', raw);
              let pre = document.getElementById('news-raw');
              if (!pre) {
                pre = document.createElement('pre');
                pre.id = 'news-raw';
                pre.style.whiteSpace = 'pre-wrap';
                pre.style.maxHeight = '300px';
                pre.style.overflow = 'auto';
                pre.style.background = '#f6f6f6';
                pre.style.padding = '12px';
                pre.style.marginTop = '12px';
              }
              pre.textContent = JSON.stringify(raw, null, 2);
              newsContainer.appendChild(pre);
            } catch (e) {
              console.error('Gagal menampilkan debug response:', e);
            }
          });

          newsContainer.appendChild(debugBtn);
        }
      } catch (error) {
        console.error('Error loading news:', error);
        newsContainer.innerHTML = '<p>Gagal memuat berita. Silakan coba lagi nanti.</p>';
      }
    };

    // Load news immediately
    await loadNews();

    // Set up auto-refresh every 5 seconds for frequent updates
    this.newsInterval = setInterval(loadNews, 5000);

    // Initialize timestamp
    const timestampElement = document.getElementById('news-timestamp');
    if (timestampElement) {
      timestampElement.textContent = `Terakhir diperbarui: ${new Date().toLocaleTimeString('id-ID')}`;
    }

    // Update timestamp every second
    setInterval(() => {
      if (timestampElement) {
        timestampElement.textContent = `Terakhir diperbarui: ${new Date().toLocaleTimeString('id-ID')}`;
      }
    }, 1000);
  }

  // Cleanup method to clear interval when page is destroyed
  destroy() {
    if (this.newsInterval) {
      clearInterval(this.newsInterval);
      this.newsInterval = null;
    }
  }
}
