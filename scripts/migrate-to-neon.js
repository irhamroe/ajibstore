/**
 * Script Migrasi Data dari SQLite Lokal (ajibstore.db) ke Neon Cloud PostgreSQL
 * 
 * Cara Penggunaan:
 * 1. Pastikan file `.env` sudah diisi dengan `DATABASE_URL` Neon Anda.
 * 2. Jalankan perintah: `node scripts/migrate-to-neon.js`
 */

require('dotenv').config();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: `DATABASE_URL` tidak ditemukan di file .env!');
  console.error('Silakan isi `DATABASE_URL=postgresql://...` di file .env terlebih dahulu.');
  process.exit(1);
}

const DB_PATH = path.join(__dirname, '..', 'ajibstore.db');

const sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Gagal membuka database SQLite lokal:', err.message);
    process.exit(1);
  }
});

const pgPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

function getSqliteRows(query) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function migrateData() {
  console.log('\n======================================================');
  console.log('🚀 MEMULAI MIGRASI DATA DARI SQLITE KE NEON POSTGRESQL');
  console.log('======================================================\n');

  try {
    // 1. Inisialisasi Skema di Neon
    console.log('📦 Menyiapkan skema tabel di Neon PostgreSQL...');

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'kasir',
        created_at VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        barcode VARCHAR(255) UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        cost_price NUMERIC DEFAULT 0,
        sell_price NUMERIC DEFAULT 0,
        stock INTEGER DEFAULT 0,
        image TEXT
      );

      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        bandwidth VARCHAR(100),
        monthly_amount NUMERIC DEFAULT 0,
        created_at VARCHAR(100)
      );

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
      );

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
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      );
    `);

    // 2. Migrasi Users
    const users = await getSqliteRows('SELECT * FROM users');
    for (const u of users) {
      await pgPool.query(
        `INSERT INTO users (id, name, username, password, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, username = EXCLUDED.username, password = EXCLUDED.password, role = EXCLUDED.role`,
        [u.id, u.name, u.username, u.password, u.role, u.created_at]
      );
    }
    console.log(`✅ Users       : ${users.length} baris ditransfer`);

    // 3. Migrasi Categories
    const categories = await getSqliteRows('SELECT * FROM categories');
    for (const c of categories) {
      await pgPool.query(
        `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [c.name]
      );
    }
    console.log(`✅ Categories  : ${categories.length} baris ditransfer`);

    // 4. Migrasi Products
    const products = await getSqliteRows('SELECT * FROM products');
    for (const p of products) {
      await pgPool.query(
        `INSERT INTO products (id, barcode, name, category, cost_price, sell_price, stock, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           barcode = EXCLUDED.barcode, name = EXCLUDED.name, category = EXCLUDED.category,
           cost_price = EXCLUDED.cost_price, sell_price = EXCLUDED.sell_price,
           stock = EXCLUDED.stock, image = EXCLUDED.image`,
        [p.id, p.barcode, p.name, p.category, p.cost_price, p.sell_price, p.stock, p.image]
      );
    }
    console.log(`✅ Products    : ${products.length} baris ditransfer`);

    // 5. Migrasi Customers
    const customers = await getSqliteRows('SELECT * FROM customers');
    for (const c of customers) {
      await pgPool.query(
        `INSERT INTO customers (id, name, address, bandwidth, monthly_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, address = EXCLUDED.address, bandwidth = EXCLUDED.bandwidth, monthly_amount = EXCLUDED.monthly_amount`,
        [c.id, c.name, c.address, c.bandwidth, c.monthly_amount, c.created_at]
      );
    }
    console.log(`✅ Customers   : ${customers.length} baris ditransfer`);

    // 6. Migrasi POS Transactions
    const posTx = await getSqliteRows('SELECT * FROM pos_transactions');
    for (const tx of posTx) {
      await pgPool.query(
        `INSERT INTO pos_transactions (id, receipt_no, timestamp, date_str, items_json, subtotal, total, cash, change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [tx.id, tx.receipt_no, tx.timestamp, tx.date_str, tx.items_json, tx.subtotal, tx.total, tx.cash, tx.change]
      );
    }
    console.log(`✅ POS Tx      : ${posTx.length} baris ditransfer`);

    // 7. Migrasi Wifi Transactions
    const wifiTx = await getSqliteRows('SELECT * FROM wifi_transactions');
    for (const tx of wifiTx) {
      await pgPool.query(
        `INSERT INTO wifi_transactions (id, receipt_no, timestamp, date_str, customer_id, customer_name, address, bandwidth, period_month, amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [tx.id, tx.receipt_no, tx.timestamp, tx.date_str, tx.customer_id, tx.customer_name, tx.address, tx.bandwidth, tx.period_month, tx.amount, tx.notes]
      );
    }
    console.log(`✅ Wifi Tx     : ${wifiTx.length} baris ditransfer`);

    // 8. Migrasi System Settings
    const settings = await getSqliteRows('SELECT * FROM system_settings');
    for (const s of settings) {
      await pgPool.query(
        `INSERT INTO system_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [s.key, s.value]
      );
    }
    console.log(`✅ Settings    : ${settings.length} baris ditransfer`);

    console.log('\n🎉 MIGRASI SUKSES! Seluruh data dari SQLite telah berhasil dipindahkan ke Neon Cloud PostgreSQL.\n');

  } catch (err) {
    console.error('\n❌ Terjadi kesalahan saat migrasi:', err);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

migrateData();
