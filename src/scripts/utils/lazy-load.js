/**
 * Lazy loading utility using IntersectionObserver
 * Replaces native lazy loading to avoid Chrome's intervention on load events
 */

class LazyLoad {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      this.loadAllImages();
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '50px 0px', // Start loading 50px before entering viewport
      threshold: 0.01
    });
  }

  observe(image) {
    if (!this.observer) return;
    this.observer.observe(image);
  }

  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Set the src to trigger loading
    img.src = src;

    // Remove data-src to prevent re-loading
    delete img.dataset.src;

    // Handle load/error events if needed
    img.addEventListener('load', () => {
      img.classList.add('loaded');
    });

    img.addEventListener('error', () => {
      // Fallback to placeholder if image fails to load
      if (!img.src.includes('data:image')) {
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMDAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
      }
    });
  }

  loadAllImages() {
    // Fallback: load all images immediately
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => this.loadImage(img));
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Create a singleton instance
const lazyLoad = new LazyLoad();

// Export for use in other modules
export default lazyLoad;
