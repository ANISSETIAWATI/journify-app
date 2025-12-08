import TheStoryApiSource from '../../data/thestoryapi-source';

export default class AddStoryPage {
  #idb = null;

  constructor(idb) {
    this.#idb = idb;
  }

  async render() {
    return `
      <section class="container">
        <h1>Tambah Cerita Baru</h1>
        <form id="add-story-form" novalidate>
          <div>
            <label for="title">Judul Cerita</label>
            <input type="text" id="title" name="title" placeholder="Masukkan judul cerita Anda..." required />
            <span id="title-error" class="error-message" aria-live="polite"></span>
          </div>
          <div>
            <label for="photo-upload">Unggah Foto</label>
            <input type="file" id="photo-upload" name="photo" accept="image/*" />
            <button type="button" id="camera-btn">Ambil Foto dari Kamera</button>
            <div id="camera-container" style="display: none;">
              <video id="camera-feed" autoplay></video>
              <div class="camera-controls">
                <button type="button" id="capture-btn">Ambil Foto</button>
                <button type="button" id="close-camera-btn">Tutup Kamera</button>
              </div>
            </div>
            <img id="photo-preview" alt="Pratinjau foto yang dipilih" loading="lazy" />
          </div>
          <div>
            <label for="description">Deskripsi</label>
            <textarea id="description" name="description" rows="5" placeholder="Tuliskan deskripsi cerita Anda di sini..." required></textarea>
            <span id="description-error" class="error-message" aria-live="polite"></span>
          </div>
          <div>
          <label id="location-label">Lokasi</label>
          <p style="font-size:0.9rem; color:#666;">Klik pada peta untuk memilih lokasi cerita Anda.</p>

          <div id="location-map"
              style="height: 300px; width: 100%;"
              role="application"
              aria-labelledby="location-label">
          </div>

          <input type="hidden" id="latitude" />
          <input type="hidden" id="longitude" />
          <span id="location-error" class="error-message" aria-live="polite"></span>
          </div>
          <div>
            <button type="submit" id="submit-btn">Kirim Cerita</button>
            <div id="submit-status" class="submit-status" style="display: none; margin-top: 10px; font-weight: bold; color: green;"></div>
            <div id="form-feedback" class="feedback" role="alert" aria-live="assertive"></div>
        </form>
      </section>
    `;
  }

  async _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Method untuk mengirim notifikasi push
  async sendPushNotification(title, body) {
    try {
      // Cek apakah service worker tersedia dan permission diberikan
      if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;

        // Kirim notifikasi melalui service worker
        await registration.showNotification('Cerita Baru', {
          body: body,
          icon: '/images/logo.png',
          badge: '/images/logo.png',
          tag: 'new-story',
          vibrate: [200, 100, 200],
          data: { url: '#/map' },
          actions: [
            { action: 'view', title: 'Lihat Cerita' }
          ]
        });

        console.log('Push notification sent for new story');
      } else {
        console.log('Push notifications not available or not permitted');
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  async afterRender() {
    // Initialize map
    const mapElement = document.getElementById('location-map');
    if (mapElement) {
      const map = L.map('location-map').setView([-2.5489, 118.0149], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      let marker = null;
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;

        if (marker) {
          map.removeLayer(marker);
        }
        marker = L.marker([lat, lng]).addTo(map);
        document.getElementById('location-error').textContent = '';
      });
    }

    // Form validation
    const titleInput = document.getElementById('title');
    const titleError = document.getElementById('title-error');
    const descriptionInput = document.getElementById('description');
    const descriptionError = document.getElementById('description-error');
    const locationError = document.getElementById('location-error');
    const submitBtn = document.getElementById('submit-btn');

    titleInput.addEventListener('input', () => {
      if (titleInput.value.trim().length < 3) {
        titleError.textContent = 'Judul minimal 3 karakter.';
        submitBtn.disabled = true;
      } else {
        titleError.textContent = '';
        submitBtn.disabled = false;
      }
    });

    descriptionInput.addEventListener('input', () => {
      if (descriptionInput.value.trim().length < 10) {
        descriptionError.textContent = 'Deskripsi minimal 10 karakter.';
        submitBtn.disabled = true;
      } else {
        descriptionError.textContent = '';
        submitBtn.disabled = false;
      }
    });

    // Camera functionality
    const cameraBtn = document.getElementById('camera-btn');
    const cameraContainer = document.getElementById('camera-container');
    const cameraFeed = document.getElementById('camera-feed');
    const captureBtn = document.getElementById('capture-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');
    const photoPreview = document.getElementById('photo-preview');
    const photoInput = document.getElementById('photo-upload');

    let stream = null;

    cameraBtn.addEventListener('click', async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraFeed.srcObject = stream;
        cameraContainer.style.display = 'block';
        cameraBtn.style.display = 'none';
      } catch (error) {
        alert('Tidak dapat mengakses kamera: ' + error.message);
      }
    });

    captureBtn.addEventListener('click', () => {
      const canvas = document.createElement('canvas');
      canvas.width = cameraFeed.videoWidth;
      canvas.height = cameraFeed.videoHeight;
      canvas.getContext('2d').drawImage(cameraFeed, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      photoPreview.src = dataUrl;
      photoPreview.style.display = 'block';

      // Set to file input
      canvas.toBlob((blob) => {
        const file = new File([blob], 'captured.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        photoInput.files = dataTransfer.files;
      });

      // Stop camera
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      cameraContainer.style.display = 'none';
      cameraBtn.style.display = 'inline-block';
    });

    closeCameraBtn.addEventListener('click', () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      cameraContainer.style.display = 'none';
      cameraBtn.style.display = 'inline-block';
    });

    // Photo upload preview
    photoInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          photoPreview.src = e.target.result;
          photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    const form = document.getElementById('add-story-form');
    const feedback = document.getElementById('form-feedback');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submitBtn.disabled = true; // Nonaktifkan tombol saat memproses

      const title = titleInput.value.trim();
      const description = descriptionInput.value.trim();
      const lat = document.getElementById('latitude').value;
      const lon = document.getElementById('longitude').value;
      const photoFile = photoInput.files.length > 0 ? photoInput.files[0] : null;

      let isValid = true;

      if (!title || title.length < 3) {
        titleError.textContent = 'Judul minimal 3 karakter.';
        isValid = false;
      }

      if (!description || description.length < 10) {
        descriptionError.textContent = 'Deskripsi minimal 10 karakter.';
        isValid = false;
      }

      if (!lat || !lon) {
        locationError.textContent = 'Silakan pilih lokasi di peta.';
        isValid = false;
      }

      if (!isValid) {
        submitBtn.disabled = false; // Aktifkan kembali jika tidak valid
        return;
      }

      const submitStatus = document.getElementById('submit-status');
      submitStatus.style.display = 'block';
      submitStatus.textContent = 'Menyimpan cerita...';
      submitStatus.style.color = 'orange';

      try {
        const offlineId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 1. Simpan data ke IndexedDB terlebih dahulu (Offline-First)
        const storyData = {
          id: offlineId,
          name: title,
          description: description,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          createdAt: new Date().toISOString(),
          isManual: true,
          isSynced: false,
          photoUrl: photoFile ? await this._fileToBase64(photoFile) : null,
          photoFile: photoFile // Simpan file untuk sinkronisasi nanti
        };

        await this.#idb.putStory(storyData);

        // 2. Tambahkan ke antrian sinkronisasi
        await this.#idb.addPendingSync({
          id: offlineId,
          type: 'add-story',
          data: {
            description: description,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            photo: photoFile
          },
          timestamp: Date.now()
        });

        // 3. Coba sinkronisasi jika online
        if (navigator.onLine) {
          submitStatus.textContent = 'Mengirim cerita ke halaman...';

          try {
            // Buat FormData untuk API
            const formData = new FormData();
            formData.append('description', description);
            if (photoFile) {
              formData.append('photo', photoFile);
            }
            formData.append('lat', parseFloat(lat));
            formData.append('lon', parseFloat(lon));

            await TheStoryApiSource.addNewStory(formData);

            // SUKSES KIRIM ONLINE
            await this.#idb.updateStorySyncStatus(offlineId, true);
            await this.#idb.removePendingSync(offlineId); // Hapus dari antrian

            submitStatus.textContent = 'Cerita berhasil dikirim!';
            submitStatus.style.color = 'green';
            feedback.className = 'feedback success show';
            feedback.textContent = 'CERITA BERHASIL DIKIRIM';

            // Kirim notifikasi push hanya untuk pengiriman langsung ke server
            this.sendPushNotification(title, 'Cerita baru berhasil dikirim ke server');

          } catch (syncError) {
            // GAGAL KIRIM (ONLINE), TAPI SUDAH TERSIMPAN
            console.log('Gagal sinkronisasi, tapi cerita disimpan offline:', syncError.message);

            submitStatus.textContent = 'Cerita berhasil dikirim!';
            submitStatus.style.color = 'green';
          }

        } else {
          // SUKSES SIMPAN (MODE OFFLINE)
          submitStatus.textContent = 'Cerita disimpan offline';
          submitStatus.style.color = 'green';
        }

        // Redirect setelah 1.5 detik
        setTimeout(() => {
          window.location.hash = '#/map';
        }, 1500);

      } catch (error) {
        // Gagal menyimpan ke IndexedDB (Error Kritis)
        submitStatus.textContent = 'Error menyimpan cerita';
        submitStatus.style.color = 'red';
        feedback.className = 'feedback error show';
        feedback.textContent = `Error menyimpan cerita secara lokal: ${error.message}`;
        submitBtn.disabled = false; // Aktifkan kembali tombol jika gagal
      }
    });
  }
}
