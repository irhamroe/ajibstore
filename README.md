# ⚡ Ajib Store & Ajib.Net - POS Toko Elektronik & Wifi Billing System

Aplikasi Point of Sale (POS) Toko Elektronik dan Sistem Manajemen & Pembayaran Wifi berlangganan **Ajib.Net** berbasis Web Client-side SPA (Single Page Application) modern dengan desain **Dark Glassmorphism**.

---

## 🌟 Fitur Utama

### 🏬 1. Point of Sales (POS Toko Elektronik)
- **Manajemen Stok Barang**: Input, edit, hapus, dan kelola stok barang elektronik (Nama, Kategori, Harga Beli, Harga Jual, Stok, & Kode Barcode).
- **Auto Barcode Generator**: Penjanaan kode barcode otomatis (EAN Style).
- **Peringatan Stok Menipis**: Notifikasi otomatis untuk stok barang <= 5 Pcs.
- **Scan Barcode Kamera**: Integrasi kamera HP/Webcam real-time menggunakan `html5-qrcode`.
- **Kasir & Keranjang Belanja**: Pengaturan jumlah item, kalkulasi kembalian, & opsi nominal uang pas/cepat.
- **Cetak Struk Thermal 80mm**: Nota belanja toko elektronik siap cetak fisik atau simpan PDF.
- **Rekap POS Harian & Rentang Tanggal**: Filter rekap penjualan, omset, estimasi profit, dan jumlah transaksi per periode tanggal.

### 📶 2. Layanan Ajib.Net (Wifi Billing System)
- **Kelola Pelanggan Wifi**: Form input pelanggan (**Nama**, **Alamat**, **Bandwidth** 10-100 Mbps, & **Nominal Pembayaran Bulanan**).
- **Bayar Wifi Bulanan**: Pilihan pelanggan -> Auto-fill paket & nominal -> Pilih periode bulan -> Cetak Kuitansi Bukti Pembayaran.
- **Status Langganan**: Status otomatis Lunas / Belum Bayar bulan berjalan.
- **Rekap Pembayaran Wifi**: Filter rekap iuran Wifi harian atau rentang tanggal tertentu.

### 🔑 3. Multi-User & Hak Akses (RBAC)
- **Administrator (`admin` / `admin123`)**: Akses 100% semua menu termasuk **Manajemen User** (tambah & hapus user).
- **Kasir (`kasir` / `kasir123`)**: Akses khusus transaksi (*Kasir POS, Rekap POS, Bayar Wifi, Rekap Wifi*).

---

## 🛠️ Teknologi yang Digunakan

- **HTML5 & CSS3**: Custom Dark Glassmorphism Design System.
- **JavaScript (ES6+)**: LocalStorage State Management & Modular Architecture.
- **FontAwesome 6**: Modern UI Iconography.
- **Chart.js**: Visualisasi Grafik Penjualan POS.
- **HTML5-QRCode**: Library Web Camera Barcode Scanning.

---

## 🚀 Cara Menjalankan

1. Clone / Download repository ini.
2. Buka berkas `index.html` langsung pada browser (Google Chrome, Microsoft Edge, Mozilla Firefox, dll.).
3. Login menggunakan akun default:
   - **Admin**: Username: `admin` | Password: `admin123`
   - **Kasir**: Username: `kasir` | Password: `kasir123`

---

## 📝 Lisensi
MIT License &copy; 2026 **Ajib Store & Ajib.Net**.
