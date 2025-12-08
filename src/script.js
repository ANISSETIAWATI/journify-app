// === 1️⃣ Buka atau Buat Database ===
let db;
const request = indexedDB.open("MyDatabase", 1);

request.onerror = (event) => {
  console.error("❌ Gagal membuka IndexedDB:", event.target.error);
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("✅ Database berhasil dibuka");
  tampilkanData();
};

// Buat object store saat pertama kali
request.onupgradeneeded = (event) => {
  db = event.target.result;
  const objectStore = db.createObjectStore("data", { keyPath: "id", autoIncrement: true });
  objectStore.createIndex("name", "name", { unique: false });
  console.log("📂 Object store 'data' dibuat");
};

// === 2️⃣ Tambah Data (CREATE) ===
document.getElementById("dataForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("nameInput");
  const name = nameInput.value.trim();

  if (!name) return alert("Nama tidak boleh kosong!");

  const transaction = db.transaction(["data"], "readwrite");
  const objectStore = transaction.objectStore("data");

  const requestAdd = objectStore.add({ name: name });

  requestAdd.onsuccess = () => {
    console.log("✅ Data berhasil ditambahkan:", name);
    nameInput.value = "";
    tampilkanData();
  };

  requestAdd.onerror = (e) => {
    console.error("❌ Gagal menambah data:", e.target.error);
  };
});

// === 3️⃣ Tampilkan Data (READ) ===
function tampilkanData() {
  const dataList = document.getElementById("dataList");
  dataList.innerHTML = "";

  const transaction = db.transaction(["data"], "readonly");
  const objectStore = transaction.objectStore("data");

  objectStore.openCursor().onsuccess = (event) => {
    const cursor = event.target.result;
    if (cursor) {
      const li = document.createElement("li");
      li.innerHTML = `
        ${cursor.value.name}
        <button class="delete-btn" data-id="${cursor.value.id}">Hapus</button>
      `;
      dataList.appendChild(li);
      cursor.continue();
    }
  };
}

// === 4️⃣ Hapus Data (DELETE) ===
document.getElementById("dataList").addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = Number(e.target.dataset.id);
    const transaction = db.transaction(["data"], "readwrite");
    const objectStore = transaction.objectStore("data");
    const requestDelete = objectStore.delete(id);

    requestDelete.onsuccess = () => {
      console.log("🗑️ Data berhasil dihapus, ID:", id);
      tampilkanData();
    };
  }
});
