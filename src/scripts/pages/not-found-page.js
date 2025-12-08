class NotFoundPage {
  async render() {
    return `
      <div class="container" style="text-align: center; padding: 4rem 1rem;">
        <h1>404 - Halaman Tidak Ditemukan</h1>
        <p>Maaf, halaman yang Anda cari tidak ada. Silakan kembali ke beranda.</p>
        <a href="#/home" class="button">Kembali ke Beranda</a>
      </div>
    `;
  }

  async afterRender() {
    // Tidak ada logika tambahan yang diperlukan untuk halaman ini
  }
}

export default NotFoundPage;