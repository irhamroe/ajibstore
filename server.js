/**
 * Ajib Store & Ajib.Net - Backend Server & SQLite Database
 * Mengakomodasi penggunaan lokal & sinkronisasi multi-perangkat via Firebase Cloud Database
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.VERCEL ? path.join('/tmp', 'ajibstore.db') : path.join(__dirname, 'ajibstore.db');

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' })); // Support base64 image upload
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static frontend files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// Inisialisasi Database SQLite Lokal
// ==========================================
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Gagal membuka database SQLite:', err.message);
  } else {
    console.log('✅ Berhasil terhubung ke database SQLite:', DB_PATH);
    initDatabaseSchema();
  }
});

function initDatabaseSchema() {
  db.serialize(() => {
    // 1. Table Users
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'kasir',
        created_at TEXT
      )
    `);

    // 2. Table Categories
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )
    `);

    // 3. Table Products
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        category TEXT,
        cost_price REAL DEFAULT 0,
        sell_price REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        image TEXT
      )
    `);

    // 4. Table Customers (Wifi)
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        bandwidth TEXT,
        monthly_amount REAL DEFAULT 0,
        created_at TEXT
      )
    `);

    // 5. Table POS Transactions
    db.run(`
      CREATE TABLE IF NOT EXISTS pos_transactions (
        id TEXT PRIMARY KEY,
        receipt_no TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        date_str TEXT NOT NULL,
        items_json TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        total REAL DEFAULT 0,
        cash REAL DEFAULT 0,
        change REAL DEFAULT 0
      )
    `);

    // 6. Table Wifi Transactions
    db.run(`
      CREATE TABLE IF NOT EXISTS wifi_transactions (
        id TEXT PRIMARY KEY,
        receipt_no TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        date_str TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        address TEXT,
        bandwidth TEXT,
        period_month TEXT,
        amount REAL DEFAULT 0,
        notes TEXT
      )
    `);

    // 7. Table System Settings
    db.run(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    seedDefaultDataIfEmpty();
  });
}

function seedDefaultDataIfEmpty() {
  db.get('SELECT value FROM system_settings WHERE key = ?', ['is_seeded'], (err, settingRow) => {
    if (settingRow && settingRow.value === 'true') {
      return;
    }

    // Seed Users
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (!err && row.count === 0) {
        const stmt = db.prepare('INSERT INTO users (id, name, username, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run('u1', 'Administrator', 'admin', 'admin123', 'admin', '2026-01-01');
        stmt.run('u2', 'Kasir Toko', 'kasir', 'kasir123', 'kasir', '2026-01-01');
        stmt.finalize();
      }
    });

    // Seed Categories
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
      if (!err && row.count === 0) {
        const defaultCategories = ['Aksesori HP & Laptop', 'Jaringan & Wifi', 'Elektronik Rumah', 'Komponen & Kabel'];
        const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
        defaultCategories.forEach(cat => stmt.run(cat));
        stmt.finalize();
      }
    });

    // Seed Customers
    db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
      if (!err && row.count === 0) {
        const defaultCustomers = [
          { id: 'c1', name: 'Budi Santoso', address: 'Jl. Pemuda No. 45, RT 01/03', bandwidth: '20 Mbps', monthlyAmount: 150000, createdAt: '2026-01-10' },
          { id: 'c2', name: 'Siti Rahmawati', address: 'Komp. Asri Indah Block C2', bandwidth: '30 Mbps', monthlyAmount: 200000, createdAt: '2026-02-01' },
          { id: 'c3', name: 'Ahmad Hidayat', address: 'Dusun Melati RT 04/02 Desa Sukamaju', bandwidth: '10 Mbps', monthlyAmount: 100000, createdAt: '2026-03-15' },
          { id: 'c4', name: 'Toko Kelontong Berkah', address: 'Jl. Pasar Anyar No. 88', bandwidth: '50 Mbps', monthlyAmount: 300000, createdAt: '2026-04-05' }
        ];

        const stmt = db.prepare('INSERT INTO customers (id, name, address, bandwidth, monthly_amount, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        defaultCustomers.forEach(c => stmt.run(c.id, c.name, c.address, c.bandwidth, c.monthlyAmount, c.createdAt));
        stmt.finalize();
      }
    });

    // Mark as seeded in database
    db.run(`INSERT OR REPLACE INTO system_settings (key, value) VALUES ('is_seeded', 'true')`);
  });
}

// ==========================================
// REST API Endpoints
// ==========================================

// --- Server Info API ---
app.get('/api/server-info', (req, res) => {
  const ips = getLocalIpAddresses();
  res.json({
    success: true,
    ips: ips,
    port: PORT,
    databaseType: 'SQLite Lokal / Firebase Cloud',
    serverTime: new Date().toISOString()
  });
});

// --- 1. Products API ---
app.get('/api/products', (req, res) => {
  db.all('SELECT id, barcode, name, category, cost_price as costPrice, sell_price as sellPrice, stock, image FROM products ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.post('/api/products', (req, res) => {
  const { id, barcode, name, category, costPrice, sellPrice, stock, image } = req.body;
  const prodId = id || 'p_' + Date.now();
  const prodBarcode = barcode || ('SKU' + Date.now().toString().slice(-6));

  const query = `
    INSERT INTO products (id, barcode, name, category, cost_price, sell_price, stock, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      barcode=excluded.barcode,
      name=excluded.name,
      category=excluded.category,
      cost_price=excluded.cost_price,
      sell_price=excluded.sell_price,
      stock=excluded.stock,
      image=excluded.image
  `;

  db.run(query, [prodId, prodBarcode, name, category, costPrice || 0, sellPrice || 0, stock || 0, image || ''], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: { id: prodId, barcode: prodBarcode, name, category, costPrice, sellPrice, stock, image } });
  });
});

app.delete('/api/products/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Barang berhasil dihapus' });
  });
});

// --- 2. Categories API ---
app.get('/api/categories', (req, res) => {
  db.all('SELECT name FROM categories ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows.map(r => r.name) });
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Nama kategori diperlukan' });

  db.run('INSERT INTO categories (name) VALUES (?)', [name.trim()], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Kategori berhasil ditambahkan' });
  });
});

// --- 3. Customers API ---
app.get('/api/customers', (req, res) => {
  db.all('SELECT id, name, address, bandwidth, monthly_amount as monthlyAmount, created_at as createdAt FROM customers ORDER BY name ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.post('/api/customers', (req, res) => {
  const { id, name, address, bandwidth, monthlyAmount, createdAt } = req.body;
  const custId = id || 'c_' + Date.now();
  const createdDate = createdAt || new Date().toISOString().split('T')[0];

  const query = `
    INSERT INTO customers (id, name, address, bandwidth, monthly_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      address=excluded.address,
      bandwidth=excluded.bandwidth,
      monthly_amount=excluded.monthly_amount
  `;

  db.run(query, [custId, name, address, bandwidth, monthlyAmount || 0, createdDate], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: { id: custId, name, address, bandwidth, monthlyAmount, createdAt: createdDate } });
  });
});

// Helper function to get Local LAN IP
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n======================================================');
  console.log('🚀 SERVER POS & BILLING AJIB STORE TELAH BERJALAN!');
  console.log('======================================================');
  console.log(`💻 Buka di Laptop   : http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach(ip => {
      console.log(`📱 Buka di HP/Tablet: http://${ip}:${PORT}`);
    });
  }
  console.log('📂 Database         : SQLite Lokal & Firebase Realtime Cloud');
  console.log('======================================================\n');
});
