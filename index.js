const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const crypto = require('crypto');
const app = express();
const port = 3000; // Port untuk server Node.js Anda

// --- 🛠️ 1. KONEKSI DATABASE (Port 3307) ---
// Disesuaikan dengan port MySQL Anda (3307)
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'faqihMysql', // Ganti jika password Anda berbeda
  database: 'api-key',     // Pastikan database ini sudah dibuat di MySQL
  port: 3307               // 🔑 KUNCI PERBAIKAN: Menggunakan port 3307
});

// Cek Koneksi dan tangani error
db.connect(err => {
    if (err) {
        // Tampilkan error jika gagal koneksi
        console.error('Koneksi MySQL GAGAL. Cek port (3307), user, password, dan status server MySQL.', err);
        return;
    }
    console.log('Koneksi MySQL Berhasil di Port 3307!');
});

// --- 🛠️ 2. SKEMA TABEL: Menggunakan 'users' (sesuai gambar Workbench) ---
// Membuat tabel 'users' jika belum ada, dengan kolom: id, username, api_key
db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) NOT NULL UNIQUE
    )
`, (err) => {
    if (err) {
        console.error('Gagal membuat tabel users:', err);
    } else {
        console.log('Tabel "users" siap digunakan.');
    }
});


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 📦 Route generate API key (POST /generate)
app.post('/generate', (req, res) => {
    const username = req.body.name || 'Tanpa Nama';
    const apiKey = crypto.randomBytes(16).toString('hex'); // 32 karakter hex

    // INSERT ke tabel 'users'
    db.query('INSERT INTO users (username, api_key) VALUES (?, ?)', [username, apiKey], (err) => {
        if (err) {
             console.error('Error saat INSERT:', err);
             // Error 500 jika ada masalah DB (misalnya duplikat key)
             return res.status(500).send('Gagal menyimpan ke database. Coba lagi atau cek log server.');
        }
        // Sukses
        res.json({ name: username, apiKey });
    });
});

// 🔒 Validasi API key (POST /data)
app.post('/data', (req, res) => {
    // Ambil API key dari header 'x-api-key'
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(400).json({ error: 'API key tidak ditemukan di header (x-api-key).' });
    }

    // SELECT dari tabel 'users' untuk validasi
    db.query('SELECT username FROM users WHERE api_key = ?', [apiKey], (err, result) => {
        if (err) return res.status(500).json({ error: 'Terjadi kesalahan server.' });

        if (result.length === 0) {
            return res.status(403).json({ error: 'API key tidak valid.' });
        }

        const username = result[0].username;
        res.json({ message: `API key valid! Akses diizinkan untuk user: ${username}.` });
    });
});


// 📄 Kirim file index.html
app.get('/', (req, res) => {
    // Asumsi file HTML Anda bernama index.html
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});