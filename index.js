const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Koneksi ke MySQL (buat database manual di MySQL: CREATE DATABASE apikey_db;)
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'faqihMysql',
  database: 'api-key',
  port: 3307 // 💥 tambahkan baris ini
});


// Buat tabel otomatis kalau belum ada
db.query(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    api_key VARCHAR(255)
  )
`);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Route generate API key
app.post('/generate', (req, res) => {
  const name = req.body.name || 'Tanpa Nama';
  const apiKey = crypto.randomBytes(16).toString('hex'); // 32 karakter random

  db.query('INSERT INTO api_keys (name, api_key) VALUES (?, ?)', [name, apiKey], (err) => {
    if (err) return res.status(500).send('Gagal menyimpan ke database.');
    res.json({ name, apiKey });
  });
});

// Validasi API key
app.post('/data', (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(400).json({ error: 'API key tidak ditemukan di header (x-api-key).' });
  }

  db.query('SELECT * FROM api_keys WHERE api_key = ?', [apiKey], (err, result) => {
    if (err) return res.status(500).json({ error: 'Terjadi kesalahan server.' });

    if (result.length === 0) {
      return res.status(403).json({ error: 'API key tidak valid.' });
    }

    res.json({ message: 'API key valid! Akses diizinkan.' });
  });
});



// Kirim file index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});