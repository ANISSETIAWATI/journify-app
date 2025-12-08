// File: server/index.js

const express = require('express');
const app = express();
const port = 4000; // Sesuai dengan proxy Webpack Anda

// Middleware untuk mem-parsing body JSON dari permintaan (penting!)
app.use(express.json());

// ----------------------------------------------------
// Handler POST untuk /subscriptions (Memperbaiki 504)
// ----------------------------------------------------
app.post('/subscriptions', (req, res) => {
    // Di sini seharusnya ada logika untuk menyimpan PushSubscription ke database.
    console.log('LOG: Permintaan POST /subscriptions diterima.');
    
    // Mengirim respons sukses 201 untuk mengatasi 504 Timeout
    res.status(201).json({ message: 'Subscription diterima dan diproses.' });
});

// ----------------------------------------------------
// Handler DELETE untuk /subscriptions (Memperbaiki 504)
// ----------------------------------------------------
app.delete('/subscriptions', (req, res) => {
    // Di sini seharusnya ada logika untuk menghapus PushSubscription dari database.
    console.log('LOG: Permintaan DELETE /subscriptions diterima.');
    
    // Mengirim respons sukses 200 untuk mengatasi 504 Timeout
    res.status(200).json({ message: 'Unsubscription berhasil.' });
});


// Handler untuk /sendNotification
app.post('/sendNotification', (req, res) => {
    console.log('LOG: Permintaan POST /sendNotification diterima.');
    // Simulasi pengiriman notifikasi
    res.status(200).json({ message: 'Notification sent successfully.' });
});

// Handler umum jika ada route lain yang tidak ditemukan (bukan 404 dari Webpack)
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found.' });
});

app.listen(port, () => {
    console.log(`🚀 Server backend berjalan di http://localhost:${port}`);
});