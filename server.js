/**
 * Ajib Store & Ajib.Net - Backend Server & SQLite Database
 * Mengakomodasi sinkronisasi multi-perangkat (Laptop & HP)
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
// Inisialisasi Database SQLite
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

    seedDefaultDataIfEmpty();
  });
}

function seedDefaultDataIfEmpty() {
  // Seed Users
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare('INSERT INTO users (id, name, username, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run('u1', 'Administrator', 'admin', 'admin123', 'admin', '2026-01-01');
      stmt.run('u2', 'Kasir Toko', 'kasir', 'kasir123', 'kasir', '2026-01-01');
      stmt.finalize();
      console.log('🌱 Seed data users berhasil ditambahkan');
    }
  });

  // Seed Categories
  db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
    if (!err && row.count === 0) {
      const defaultCategories = ['Aksesori HP & Laptop', 'Jaringan & Wifi', 'Elektronik Rumah', 'Komponen & Kabel'];
      const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
      defaultCategories.forEach(cat => stmt.run(cat));
      stmt.finalize();
      console.log('🌱 Seed data kategori berhasil ditambahkan');
    }
  });

  // Seed Products
  db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
    if (!err && row.count === 0) {
      const defaultProducts = [
        { id: 'p1', barcode: '899100100201', name: 'Router Wifi TP-Link Archer C6 AC1200', category: 'Jaringan & Wifi', costPrice: 320000, sellPrice: 395000, stock: 12 },
        { id: 'p2', barcode: '899100100202', name: 'Kabel UTP Cat6 Belden 10 Meter Ready', category: 'Komponen & Kabel', costPrice: 35000, sellPrice: 55000, stock: 25 },
        { id: 'p3', barcode: '899100100203', name: 'Tang Krimping RJ45 & RJ11 Heavy Duty', category: 'Jaringan & Wifi', costPrice: 45000, sellPrice: 70000, stock: 8 },
        { id: 'p4', barcode: '899100100204', name: 'Charger Fast Charging 65W GaN Type-C', category: 'Aksesori HP & Laptop', costPrice: 120000, sellPrice: 175000, stock: 18 },
        { id: 'p5', barcode: '899100100205', name: 'STB Android TV Box 4K Wireless', category: 'Elektronik Rumah', costPrice: 280000, sellPrice: 360000, stock: 4 },
        { id: 'p6', barcode: '899100100206', name: 'Headset Gaming Surround 7.1 RGB', category: 'Aksesori HP & Laptop', costPrice: 150000, sellPrice: 220000, stock: 9 },
        { id: 'p7', barcode: '899100100207', name: 'Stopkontak Smart Wifi Smart Plug 16A', category: 'Elektronik Rumah', costPrice: 75000, sellPrice: 110000, stock: 15 }
      ];

      const stmt = db.prepare('INSERT INTO products (id, barcode, name, category, cost_price, sell_price, stock, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      defaultProducts.forEach(p => stmt.run(p.id, p.barcode, p.name, p.category, p.costPrice, p.sellPrice, p.stock, ''));
      stmt.finalize();
      console.log('🌱 Seed data produk berhasil ditambahkan');
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
      console.log('🌱 Seed data pelanggan wifi berhasil ditambahkan');
    }
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

app.put('/api/categories', (req, res) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName) return res.status(400).json({ success: false, error: 'Nama kategori lama dan baru diperlukan' });

  db.serialize(() => {
    db.run('UPDATE categories SET name = ? WHERE name = ?', [newName.trim(), oldName.trim()]);
    db.run('UPDATE products SET category = ? WHERE category = ?', [newName.trim(), oldName.trim()]);
  });

  res.json({ success: true, message: 'Kategori dan barang terkait berhasil diperbarui' });
});

app.delete('/api/categories/:name', (req, res) => {
  const catName = req.params.name;
  db.serialize(() => {
    db.run('DELETE FROM categories WHERE name = ?', [catName]);
    db.run('UPDATE products SET category = "Umum" WHERE category = ?', [catName]);
  });
  res.json({ success: true, message: 'Kategori berhasil dihapus' });
});

// --- 3. Customers (Wifi) API ---
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

app.delete('/api/customers/:id', (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Pelanggan berhasil dihapus' });
  });
});

// --- 4. POS Transactions API ---
app.get('/api/pos-transactions', (req, res) => {
  db.all('SELECT * FROM pos_transactions ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const formatted = rows.map(r => ({
      id: r.id,
      receiptNo: r.receipt_no,
      timestamp: r.timestamp,
      dateStr: r.date_str,
      items: JSON.parse(r.items_json || '[]'),
      subtotal: r.subtotal,
      total: r.total,
      cash: r.cash,
      change: r.change
    }));
    res.json({ success: true, data: formatted });
  });
});

app.post('/api/pos-transactions', (req, res) => {
  const { id, receiptNo, timestamp, dateStr, items, subtotal, total, cash, change } = req.body;
  const txId = id || 'tx_' + Date.now();
  const txReceipt = receiptNo || ('INV/AJB/' + Date.now().toString().slice(-6));
  const txTime = timestamp || new Date().toISOString();
  const txDate = dateStr || txTime.split('T')[0];
  const itemsJson = JSON.stringify(items || []);

  db.serialize(() => {
    // Insert transaction
    db.run(
      `INSERT INTO pos_transactions (id, receipt_no, timestamp, date_str, items_json, subtotal, total, cash, change)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, txReceipt, txTime, txDate, itemsJson, subtotal, total, cash, change]
    );

    // Deduct stock for each sold item
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item.productId && item.qty) {
          db.run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [item.qty, item.productId]);
        }
      });
    }
  });

  res.json({
    success: true,
    data: { id: txId, receiptNo: txReceipt, timestamp: txTime, dateStr: txDate, items, subtotal, total, cash, change }
  });
});

app.delete('/api/pos-transactions/:id', (req, res) => {
  db.run('DELETE FROM pos_transactions WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Transaksi POS berhasil dihapus' });
  });
});

app.put('/api/pos-transactions/:id', (req, res) => {
  const { total, cash, change, items } = req.body;
  const itemsJson = items ? JSON.stringify(items) : null;
  let query = 'UPDATE pos_transactions SET total = ?, cash = ?, change = ?';
  const params = [total, cash, change];
  if (itemsJson) {
    query += ', items_json = ?';
    params.push(itemsJson);
  }
  query += ' WHERE id = ?';
  params.push(req.params.id);

  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Transaksi POS berhasil diperbarui' });
  });
});

// --- 5. Wifi Transactions API ---
app.get('/api/wifi-transactions', (req, res) => {
  db.all('SELECT * FROM wifi_transactions ORDER BY timestamp DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const formatted = rows.map(r => ({
      id: r.id,
      receiptNo: r.receipt_no,
      timestamp: r.timestamp,
      dateStr: r.date_str,
      customerId: r.customer_id,
      customerName: r.customer_name,
      address: r.address,
      bandwidth: r.bandwidth,
      periodMonth: r.period_month,
      amount: r.amount,
      notes: r.notes
    }));
    res.json({ success: true, data: formatted });
  });
});

app.post('/api/wifi-transactions', (req, res) => {
  const { id, receiptNo, timestamp, dateStr, customerId, customerName, address, bandwidth, periodMonth, amount, notes } = req.body;
  const txId = id || 'tx_wifi_' + Date.now();
  const txReceipt = receiptNo || ('WIFI/AJB/' + Date.now().toString().slice(-6));
  const txTime = timestamp || new Date().toISOString();
  const txDate = dateStr || txTime.split('T')[0];

  db.run(
    `INSERT INTO wifi_transactions (id, receipt_no, timestamp, date_str, customer_id, customer_name, address, bandwidth, period_month, amount, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [txId, txReceipt, txTime, txDate, customerId, customerName, address, bandwidth, periodMonth, amount, notes || 'Lunas'],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({
        success: true,
        data: { id: txId, receiptNo: txReceipt, timestamp: txTime, dateStr: txDate, customerId, customerName, address, bandwidth, periodMonth, amount, notes }
      });
    }
  );
});

app.delete('/api/wifi-transactions/:id', (req, res) => {
  db.run('DELETE FROM wifi_transactions WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Transaksi Wifi berhasil dihapus' });
  });
});

app.put('/api/wifi-transactions/:id', (req, res) => {
  const { customerId, customerName, bandwidth, periodMonth, amount, notes } = req.body;
  db.run(
    `UPDATE wifi_transactions SET customer_id = ?, customer_name = ?, bandwidth = ?, period_month = ?, amount = ?, notes = ? WHERE id = ?`,
    [customerId, customerName, bandwidth, periodMonth, amount, notes, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, message: 'Transaksi Wifi berhasil diperbarui' });
    }
  );
});

// --- 6. Users API ---
app.get('/api/users', (req, res) => {
  db.all('SELECT id, name, username, role, password, created_at as createdAt FROM users ORDER BY created_at ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: rows });
  });
});

app.post('/api/users', (req, res) => {
  const { id, name, username, password, role, createdAt } = req.body;
  const userId = id || 'u_' + Date.now();
  const createdDate = createdAt || new Date().toISOString().split('T')[0];

  const query = `
    INSERT INTO users (id, name, username, password, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      username=excluded.username,
      password=excluded.password,
      role=excluded.role
  `;

  db.run(query, [userId, name, username, password, role, createdDate], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: { id: userId, name, username, role, createdAt: createdDate } });
  });
});

app.delete('/api/users/:id', (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'User berhasil dihapus' });
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
  console.log('📂 Database SQLite  : ' + DB_PATH);
  console.log('======================================================\n');
});
