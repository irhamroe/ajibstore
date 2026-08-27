# ⚡ Ajib Store & Ajib.Net - POS Toko Elektronik & Wifi Billing System

Aplikasi Point of Sale (POS) Toko Elektronik dan Sistem Manajemen & Pembayaran Wifi berlangganan **Ajib.Net** dengan tema modern, responsif untuk smartphone, dan terintegrasi dengan **Database Terpusat SQLite**.

---

## 🌟 Fitur Utama

### 🏬 1. Point of Sales (POS Toko Elektronik)
- **Manajemen Stok Barang**: Input, edit, hapus, dan kelola stok barang (Nama, Kategori dinamis, Foto Produk, Harga Modal, Harga Jual, Stok, & Kode Barcode / SKU).
- **Auto SKU / Barcode Generator**: Pembuatan kode unik otomatis untuk barang tanpa barcode fisik.
- **Upload Foto Produk**: Mendukung unggah foto produk dengan preview langsung yang tampil di menu kasir.
- **Kelola Kategori Dinamis**: Tambah, edit, dan hapus kategori barang secara fleksibel.
- **Peringatan Stok Menipis**: Notifikasi otomatis untuk stok barang <= 5 Pcs.
- **Scan Barcode Kamera**: Integrasi kamera HP/Webcam real-time menggunakan `html5-qrcode`.
- **Kasir & Keranjang Belanja**: Pengaturan jumlah item, kalkulasi kembalian, & opsi nominal uang pas/cepat.
- **Cetak Struk Thermal 80mm**: Nota belanja toko elektronik siap cetak fisik atau simpan PDF.
- **Rekap Transaksi Harian & Rentang Tanggal**: Filter rekap penjualan, omset, estimasi profit, dan jumlah transaksi per periode tanggal.

### 📶 2. Layanan Ajib.Net (Wifi Billing System)
- **Kelola Pelanggan Wifi**: Form input pelanggan (**Nama**, **Alamat**, **Bandwidth** 10-100 Mbps, & **Nominal Pembayaran Bulanan**).
- **Bayar Wifi Bulanan**: Pilihan pelanggan -> Auto-fill paket & nominal -> Pilih periode bulan -> Cetak Kuitansi Bukti Pembayaran.
- **Status Langganan**: Status otomatis Lunas / Belum Bayar bulan berjalan.
- **Rekap Pembayaran Wifi**: Filter rekap iuran Wifi harian atau rentang tanggal tertentu.

### 🔄 3. Database Terpusat SQLite & Sinkronisasi Multi-Device
- **Database Terpusat (`ajibstore.db`)**: Data tersimpan aman di satu file database SQLite pada server/laptop.
- **Sinkronisasi Otomatis**: Input barang atau transaksi dari **HP/Smartphone** akan langsung terupdate di **Laptop** secara real-time.

### 🔑 4. Multi-User & Hak Akses (RBAC)
- **Administrator (`admin` / `admin123`)**: Akses 100% semua menu termasuk **Manajemen User** (tambah & hapus user).
- **Kasir (`kasir` / `kasir123`)**: Akses khusus transaksi (*Kasir, Rekap Transaksi, Bayar Wifi, Rekap Wifi*).

---

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js, SQLite (`sqlite3`)
- **Frontend**: HTML5, CSS3 Modern Light SaaS Theme, JavaScript (ES6+ REST API Client)
- **Iconography**: FontAwesome 6
- **Scanner**: HTML5-QRCode (Barcode Scanning via Smartphone Camera)

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Install Dependensi (Pertama Kali)
Buka terminal di folder aplikasi lalu jalankan:
```bash
npm install
```

### 2. Jalankan Server
```bash
npm start
```
Terminal akan menampilkan informasi URL akses:
- **Akses di Laptop**: `http://localhost:3000`
- **Akses di HP / Tablet**: `http://[IP-Lokal-Anda]:3000` *(Contoh: `http://192.168.1.15:3000`)*

> **Catatan**: Pastikan Laptop dan HP terhubung ke jaringan Wi-Fi yang sama untuk mengakses dari HP.

---

## 🔑 Akun Login Default
- **Admin**: Username: `admin` | Password: `admin123`
- **Kasir**: Username: `kasir` | Password: `kasir123`

---

## 📝 Lisensi
MIT License &copy; 2026 **Ajib Store & Ajib.Net**.
