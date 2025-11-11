const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory storage untuk API keys (dalam production, gunakan database)
let apiKeys = new Map();

// Generate API Key menggunakan crypto
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Generate API Secret (untuk keamanan tambahan)
function generateApiSecret() {
    return crypto.randomBytes(64).toString('base64');
}

// Hash API Key untuk validasi
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Generate random ID
function generateId() {
    return crypto.randomUUID();
}

// Endpoint untuk generate API key baru
app.post('/api/generate-key', (req, res) => {
    const { username, apiName } = req.body;
    
    if (!username) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username diperlukan' 
        });
    }

    if (!apiName) {
        return res.status(400).json({ 
            success: false, 
            message: 'Nama API diperlukan' 
        });
    }

    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();
    const apiId = generateId();
    const timestamp = new Date().toISOString();
    
    apiKeys.set(apiKey, {
        id: apiId,
        username,
        apiName,
        secret: apiSecret,
        hash: hashApiKey(apiKey),
        createdAt: timestamp,
        lastUsed: null
    });

    res.json({
        success: true,
        apiId: apiId,
        apiKey: apiKey,
        apiSecret: apiSecret,
        username: username,
        apiName: apiName,
        createdAt: timestamp,
        note: 'Simpan API Key dan Secret dengan aman. Secret tidak dapat dilihat kembali.'
    });
});

// Endpoint untuk validasi API key
app.post('/api/validate-key', (req, res) => {
    const { apiKey } = req.body;
    
    if (!apiKey) {
        return res.status(400).json({ 
            success: false, 
            message: 'API Key diperlukan' 
        });
    }

    const keyData = apiKeys.get(apiKey);
    
    if (keyData) {
        // Update last used
        keyData.lastUsed = new Date().toISOString();
        apiKeys.set(apiKey, keyData);
        
        return res.json({
            success: true,
            message: 'API Key valid',
            data: keyData
        });
    } else {
        return res.status(401).json({
            success: false,
            message: 'API Key tidak valid'
        });
    }
});

// Endpoint untuk mendapatkan semua API keys
app.get('/api/keys', (req, res) => {
    const keysArray = Array.from(apiKeys.entries()).map(([key, data]) => ({
        apiKey: key,
        ...data
    }));
    
    res.json({
        success: true,
        count: keysArray.length,
        keys: keysArray
    });
});

// Endpoint untuk regenerate API key (ganti key, nama tetap)
app.post('/api/regenerate-key', (req, res) => {
    const { oldApiKey } = req.body;
    
    if (!oldApiKey) {
        return res.status(400).json({ 
            success: false, 
            message: 'API Key lama diperlukan' 
        });
    }

    const oldKeyData = apiKeys.get(oldApiKey);
    
    if (!oldKeyData) {
        return res.status(404).json({
            success: false,
            message: 'API Key tidak ditemukan'
        });
    }

    // Generate new key
    const newApiKey = generateApiKey();
    const newApiSecret = generateApiSecret();
    const newApiId = generateId();
    const timestamp = new Date().toISOString();
    
    // Delete old key
    apiKeys.delete(oldApiKey);
    
    // Create new key with same username and apiName
    apiKeys.set(newApiKey, {
        id: newApiId,
        username: oldKeyData.username,
        apiName: oldKeyData.apiName,
        secret: newApiSecret,
        hash: hashApiKey(newApiKey),
        createdAt: timestamp,
        lastUsed: null
    });

    res.json({
        success: true,
        oldApiKey: oldApiKey,
        newApiKey: newApiKey,
        newApiSecret: newApiSecret,
        username: oldKeyData.username,
        apiName: oldKeyData.apiName,
        createdAt: timestamp,
        note: 'API Key berhasil di-regenerate. Simpan Key dan Secret yang baru.'
    });
});

// Endpoint untuk delete API key
app.delete('/api/delete-key', (req, res) => {
    const { apiKey } = req.body;
    
    if (!apiKey) {
        return res.status(400).json({ 
            success: false, 
            message: 'API Key diperlukan' 
        });
    }

    if (apiKeys.has(apiKey)) {
        apiKeys.delete(apiKey);
        return res.json({
            success: true,
            message: 'API Key berhasil dihapus'
        });
    } else {
        return res.status(404).json({
            success: false,
            message: 'API Key tidak ditemukan'
        });
    }
});

// Protected endpoint example
app.get('/api/protected-data', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API Key tidak ditemukan di header'
        });
    }

    const keyData = apiKeys.get(apiKey);
    
    if (keyData) {
        keyData.lastUsed = new Date().toISOString();
        apiKeys.set(apiKey, keyData);
        
        return res.json({
            success: true,
            message: 'Akses diberikan',
            data: {
                message: 'Ini adalah data yang dilindungi',
                user: keyData.username,
                timestamp: new Date().toISOString()
            }
        });
    } else {
        return res.status(401).json({
            success: false,
            message: 'API Key tidak valid'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
