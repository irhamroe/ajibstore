/**
 * Ajib Store & Ajib.Net - Backend Server & Database Handler
 * Mengakomodasi sinkronisasi multi-perangkat (Laptop & HP)
 * Memiliki dukungan Hybrid Database (Neon Cloud PostgreSQL & SQLite Lokal)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const usePostgres = !!DATABASE_URL;

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
// Inisialisasi Connection Database (Hybrid)
// ==========================================
let pgPool = null;
let sqliteDb = null;

if (usePostgres) {
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  console.log('⚡ Menggunakan Database Cloud: Neon PostgreSQL');
  initDatabaseSchema();
} else {
  sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Gagal membuka database SQLite:', err.message);
    } else {
      console.log('✅ Terhubung ke database SQLite lokal:', DB_PATH);
      initDatabaseSchema();
    }
  });
}

// Helper untuk mengonversi query parameter SQLite (?) ke PostgreSQL ($1, $2, ...)
function formatPgQuery(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Abstraksi Query Database (Async/Await)
async function dbQuery(sql, params = []) {
  if (usePostgres) {
    const pgSql = formatPgQuery(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }
}

async function dbGet(sql, params = []) {
  if (usePostgres) {
    const pgSql = formatPgQuery(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
}

async function dbRun(sql, params = []) {
  if (usePostgres) {
    const pgSql = formatPgQuery(sql);
    const res = await pgPool.query(pgSql, params);
    return { rowCount: res.rowCount };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

// ==========================================
// Inisialisasi Skema Tabel Database
// ==========================================
async function initDatabaseSchema() {
  try {
    if (usePostgres) {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'kasir',
          created_at VARCHAR(100)
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(100) PRIMARY KEY,
          barcode VARCHAR(255) UNIQUE,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(255),
          cost_price NUMERIC DEFAULT 0,
          sell_price NUMERIC DEFAULT 0,
          stock INTEGER DEFAULT 0,
          image TEXT
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          bandwidth VARCHAR(100),
          monthly_amount NUMERIC DEFAULT 0,
          created_at VARCHAR(100)
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS pos_transactions (
          id VARCHAR(100) PRIMARY KEY,
          receipt_no VARCHAR(255) NOT NULL,
          timestamp VARCHAR(100) NOT NULL,
          date_str VARCHAR(100) NOT NULL,
          items_json TEXT NOT NULL,
          subtotal NUMERIC DEFAULT 0,
          total NUMERIC DEFAULT 0,
          cash NUMERIC DEFAULT 0,
          change NUMERIC DEFAULT 0
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS wifi_transactions (
          id VARCHAR(100) PRIMARY KEY,
          receipt_no VARCHAR(255) NOT NULL,
          timestamp VARCHAR(100) NOT NULL,
          date_str VARCHAR(100) NOT NULL,
          customer_id VARCHAR(100),
          customer_name VARCHAR(255),
          address TEXT,
          bandwidth VARCHAR(100),
          period_month VARCHAR(100),
          amount NUMERIC DEFAULT 0,
          notes TEXT
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT
        )
      `);
    } else {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'kasir',
          created_at TEXT
        )
      `);

      await dbRun(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
        )
      `);

      await dbRun(`
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

      await dbRun(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          bandwidth TEXT,
          monthly_amount REAL DEFAULT 0,
          created_at TEXT
        )
      `);

      await dbRun(`
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

      await dbRun(`
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

      await dbRun(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);
    }

    await seedDefaultDataIfEmpty();
  } catch (err) {
    console.error('❌ Gagal inisialisasi skema database:', err.message);
  }
}

async function seedDefaultDataIfEmpty() {
  try {
    const settingRow = await dbGet('SELECT value FROM system_settings WHERE key = ?', ['is_seeded']);
    if (settingRow && settingRow.value === 'true') {
      return;
    }

    // Seed Users
    const userCount = await dbGet('SELECT COUNT(*) as count FROM users');
    if (userCount && parseInt(userCount.count, 10) === 0) {
      await dbRun(
        'INSERT INTO users (id, name, username, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
        ['u1', 'Administrator', 'admin', 'admin123', 'admin', '2026-01-01']
      );
      await dbRun(
        'INSERT INTO users (id, name, username, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
        ['u2', 'Kasir Toko', 'kasir', 'kasir123', 'kasir', '2026-01-01']
      );
      console.log('🌱 Seed data users berhasil ditambahkan');
    }

    // Seed Categories
    const catCount = await dbGet('SELECT COUNT(*) as count FROM categories');
    if (catCount && parseInt(catCount.count, 10) === 0) {
      const defaultCategories = ['Aksesori HP & Laptop', 'Jaringan & Wifi', 'Elektronik Rumah', 'Komponen & Kabel'];
      for (const cat of defaultCategories) {
        await dbRun('INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING', [cat]);
      }
      console.log('🌱 Seed data kategori berhasil ditambahkan');
    }

    // Seed Customers
    const custCount = await dbGet('SELECT COUNT(*) as count FROM customers');
    if (custCount && parseInt(custCount.count, 10) === 0) {
      const defaultCustomers = [
        { id: 'c1', name: 'Budi Santoso', address: 'Jl. Pemuda No. 45, RT 01/03', bandwidth: '20 Mbps', monthlyAmount: 150000, createdAt: '2026-01-10' },
        { id: 'c2', name: 'Siti Rahmawati', address: 'Komp. Asri Indah Block C2', bandwidth: '30 Mbps', monthlyAmount: 200000, createdAt: '2026-02-01' },
        { id: 'c3', name: 'Ahmad Hidayat', address: 'Dusun Melati RT 04/02 Desa Sukamaju', bandwidth: '10 Mbps', monthlyAmount: 100000, createdAt: '2026-03-15' },
        { id: 'c4', name: 'Toko Kelontong Berkah', address: 'Jl. Pasar Anyar No. 88', bandwidth: '50 Mbps', monthlyAmount: 300000, createdAt: '2026-04-05' }
      ];

      for (const c of defaultCustomers) {
        await dbRun(
          'INSERT INTO customers (id, name, address, bandwidth, monthly_amount, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
          [c.id, c.name, c.address, c.bandwidth, c.monthlyAmount, c.createdAt]
        );
      }
      console.log('🌱 Seed data pelanggan wifi berhasil ditambahkan');
    }

    // Mark as seeded in database
    await dbRun(
      `INSERT INTO system_settings (key, value) VALUES ('is_seeded', 'true') ON CONFLICT(key) DO UPDATE SET value='true'`
    );
  } catch (err) {
    console.error('❌ Gagal melakukan seeding default data:', err.message);
  }
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
    databaseType: usePostgres ? 'Neon Cloud PostgreSQL' : 'SQLite Lokal',
    serverTime: new Date().toISOString()
  });
});

// --- 1. Products API ---
app.get('/api/products', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT id, barcode, name, category, cost_price as "costPrice", sell_price as "sellPrice", stock, image FROM products ORDER BY name ASC');
    const formatted = rows.map(r => ({
      id: r.id,
      barcode: r.barcode,
      name: r.name,
      category: r.category,
      costPrice: parseFloat(r.costPrice || 0),
      sellPrice: parseFloat(r.sellPrice || 0),
      stock: parseInt(r.stock || 0, 10),
      image: r.image || ''
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { id, barcode, name, category, costPrice, sellPrice, stock, image } = req.body;
    const prodId = id || 'p_' + Date.now();
    const prodBarcode = barcode || ('SKU' + Date.now().toString().slice(-6));

    const query = `
      INSERT INTO products (id, barcode, name, category, cost_price, sell_price, stock, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        barcode=EXCLUDED.barcode,
        name=EXCLUDED.name,
        category=EXCLUDED.category,
        cost_price=EXCLUDED.cost_price,
        sell_price=EXCLUDED.sell_price,
        stock=EXCLUDED.stock,
        image=EXCLUDED.image
    `;

    await dbRun(query, [prodId, prodBarcode, name, category, costPrice || 0, sellPrice || 0, stock || 0, image || '']);
    res.json({ success: true, data: { id: prodId, barcode: prodBarcode, name, category, costPrice, sellPrice, stock, image } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Barang berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/products', async (req, res) => {
  try {
    await dbRun('DELETE FROM products');
    res.json({ success: true, message: 'Semua barang berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 2. Categories API ---
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT name FROM categories ORDER BY name ASC');
    res.json({ success: true, data: rows.map(r => r.name) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nama kategori diperlukan' });

    await dbRun('INSERT INTO categories (name) VALUES (?) ON CONFLICT(name) DO NOTHING', [name.trim()]);
    res.json({ success: true, message: 'Kategori berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/categories', async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ success: false, error: 'Nama kategori lama dan baru diperlukan' });

    await dbRun('UPDATE categories SET name = ? WHERE name = ?', [newName.trim(), oldName.trim()]);
    await dbRun('UPDATE products SET category = ? WHERE category = ?', [newName.trim(), oldName.trim()]);
    res.json({ success: true, message: 'Kategori dan barang terkait berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/categories/:name', async (req, res) => {
  try {
    const catName = req.params.name;
    await dbRun('DELETE FROM categories WHERE name = ?', [catName]);
    await dbRun('UPDATE products SET category = \'Umum\' WHERE category = ?', [catName]);
    res.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 3. Customers (Wifi) API ---
app.get('/api/customers', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT id, name, address, bandwidth, monthly_amount as "monthlyAmount", created_at as "createdAt" FROM customers ORDER BY name ASC');
    const formatted = rows.map(r => ({
      id: r.id,
      name: r.name,
      address: r.address,
      bandwidth: r.bandwidth,
      monthlyAmount: parseFloat(r.monthlyAmount || 0),
      createdAt: r.createdAt
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { id, name, address, bandwidth, monthlyAmount, createdAt } = req.body;
    const custId = id || 'c_' + Date.now();
    const createdDate = createdAt || new Date().toISOString().split('T')[0];

    const query = `
      INSERT INTO customers (id, name, address, bandwidth, monthly_amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=EXCLUDED.name,
        address=EXCLUDED.address,
        bandwidth=EXCLUDED.bandwidth,
        monthly_amount=EXCLUDED.monthly_amount
    `;

    await dbRun(query, [custId, name, address, bandwidth, monthlyAmount || 0, createdDate]);
    res.json({ success: true, data: { id: custId, name, address, bandwidth, monthlyAmount, createdAt: createdDate } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Pelanggan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 4. POS Transactions API ---
app.get('/api/pos-transactions', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM pos_transactions ORDER BY timestamp DESC');
    const formatted = rows.map(r => ({
      id: r.id,
      receiptNo: r.receipt_no,
      timestamp: r.timestamp,
      dateStr: r.date_str,
      items: typeof r.items_json === 'string' ? JSON.parse(r.items_json || '[]') : (r.items_json || []),
      subtotal: parseFloat(r.subtotal || 0),
      total: parseFloat(r.total || 0),
      cash: parseFloat(r.cash || 0),
      change: parseFloat(r.change || 0)
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pos-transactions', async (req, res) => {
  try {
    const { id, receiptNo, timestamp, dateStr, items, subtotal, total, cash, change } = req.body;
    const txId = id || 'tx_' + Date.now();
    const txReceipt = receiptNo || ('INV/AJB/' + Date.now().toString().slice(-6));
    const txTime = timestamp || new Date().toISOString();
    const txDate = dateStr || txTime.split('T')[0];
    const itemsJson = JSON.stringify(items || []);

    await dbRun(
      `INSERT INTO pos_transactions (id, receipt_no, timestamp, date_str, items_json, subtotal, total, cash, change)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, txReceipt, txTime, txDate, itemsJson, subtotal || 0, total || 0, cash || 0, change || 0]
    );

    // Deduct stock for each sold item
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.productId && item.qty) {
          await dbRun('UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.qty, item.productId]).catch(() => {
            // Fallback for SQLite GREATEST syntax
            return dbRun('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [item.qty, item.productId]);
          });
        }
      }
    }

    res.json({
      success: true,
      data: { id: txId, receiptNo: txReceipt, timestamp: txTime, dateStr: txDate, items, subtotal, total, cash, change }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/pos-transactions/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM pos_transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Transaksi POS berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/pos-transactions/:id', async (req, res) => {
  try {
    const { total, cash, change, items } = req.body;
    const itemsJson = items ? JSON.stringify(items) : null;
    let query = 'UPDATE pos_transactions SET total = ?, cash = ?, change = ?';
    const params = [total || 0, cash || 0, change || 0];
    if (itemsJson) {
      query += ', items_json = ?';
      params.push(itemsJson);
    }
    query += ' WHERE id = ?';
    params.push(req.params.id);

    await dbRun(query, params);
    res.json({ success: true, message: 'Transaksi POS berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 5. Wifi Transactions API ---
app.get('/api/wifi-transactions', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT * FROM wifi_transactions ORDER BY timestamp DESC');
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
      amount: parseFloat(r.amount || 0),
      notes: r.notes
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/wifi-transactions', async (req, res) => {
  try {
    const { id, receiptNo, timestamp, dateStr, customerId, customerName, address, bandwidth, periodMonth, amount, notes } = req.body;
    const txId = id || 'tx_wifi_' + Date.now();
    const txReceipt = receiptNo || ('WIFI/AJB/' + Date.now().toString().slice(-6));
    const txTime = timestamp || new Date().toISOString();
    const txDate = dateStr || txTime.split('T')[0];

    await dbRun(
      `INSERT INTO wifi_transactions (id, receipt_no, timestamp, date_str, customer_id, customer_name, address, bandwidth, period_month, amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, txReceipt, txTime, txDate, customerId, customerName, address, bandwidth, periodMonth, amount || 0, notes || 'Lunas']
    );

    res.json({
      success: true,
      data: { id: txId, receiptNo: txReceipt, timestamp: txTime, dateStr: txDate, customerId, customerName, address, bandwidth, periodMonth, amount, notes }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/wifi-transactions/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM wifi_transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Transaksi Wifi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/wifi-transactions/:id', async (req, res) => {
  try {
    const { customerId, customerName, bandwidth, periodMonth, amount, notes } = req.body;
    await dbRun(
      `UPDATE wifi_transactions SET customer_id = ?, customer_name = ?, bandwidth = ?, period_month = ?, amount = ?, notes = ? WHERE id = ?`,
      [customerId, customerName, bandwidth, periodMonth, amount || 0, notes, req.params.id]
    );
    res.json({ success: true, message: 'Transaksi Wifi berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 6. Users API ---
app.get('/api/users', async (req, res) => {
  try {
    const rows = await dbQuery('SELECT id, name, username, role, password, created_at as "createdAt" FROM users ORDER BY created_at ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, name, username, password, role, createdAt } = req.body;
    const userId = id || 'u_' + Date.now();
    const createdDate = createdAt || new Date().toISOString().split('T')[0];

    const query = `
      INSERT INTO users (id, name, username, password, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=EXCLUDED.name,
        username=EXCLUDED.username,
        password=EXCLUDED.password,
        role=EXCLUDED.role
    `;

    await dbRun(query, [userId, name, username, password, role, createdDate]);
    res.json({ success: true, data: { id: userId, name, username, role, createdAt: createdDate } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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

// Export Express app for Vercel Serverless Function environment
module.exports = app;

// Start Server locally if not running on Vercel
if (!process.env.VERCEL) {
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
    console.log('📂 Database Mode    : ' + (usePostgres ? '⚡ Neon Cloud PostgreSQL' : '📂 SQLite Lokal (' + DB_PATH + ')'));
    console.log('======================================================\n');
  });
}

