/**
 * Ajib Store & Ajib.Net - Core Application JavaScript
 * POS Toko Elektronik & Sistem Manajemen/Pembayaran Wifi
 */

(function () {
  'use strict';

  // ==========================================
  // 1. Initial State & Seed Data
  // ==========================================
  const STORAGE_KEYS = {
    PRODUCTS: 'ajib_store_products_v1',
    CUSTOMERS: 'ajib_store_wifi_customers_v1',
    POS_TX: 'ajib_store_pos_transactions_v1',
    WIFI_TX: 'ajib_store_wifi_transactions_v1',
    AUTH_USER: 'ajib_store_auth_user_v1',
    USERS_LIST: 'ajib_store_users_list_v2',
    CATEGORIES: 'ajib_store_categories_v1'
  };

  const DEFAULT_CATEGORIES = [
    'Aksesori HP & Laptop',
    'Jaringan & Wifi',
    'Elektronik Rumah',
    'Komponen & Kabel'
  ];

  const DEFAULT_USERS = [
    { id: 'u1', name: 'Administrator', username: 'admin', password: 'admin123', role: 'admin', createdAt: '2026-01-01' },
    { id: 'u2', name: 'Kasir Toko', username: 'kasir', password: 'kasir123', role: 'kasir', createdAt: '2026-01-01' }
  ];

  const KASIR_ALLOWED_TABS = ['kasir-pos', 'rekap-pos', 'bayar-wifi', 'rekap-wifi'];

  const DEFAULT_PRODUCTS = [
    { id: 'p1', barcode: '899100100201', name: 'Router Wifi TP-Link Archer C6 AC1200', category: 'Jaringan & Wifi', costPrice: 320000, sellPrice: 395000, stock: 12 },
    { id: 'p2', barcode: '899100100202', name: 'Kabel UTP Cat6 Belden 10 Meter Ready', category: 'Komponen & Kabel', costPrice: 35000, sellPrice: 55000, stock: 25 },
    { id: 'p3', barcode: '899100100203', name: 'Tang Krimping RJ45 & RJ11 Heavy Duty', category: 'Jaringan & Wifi', costPrice: 45000, sellPrice: 70000, stock: 8 },
    { id: 'p4', barcode: '899100100204', name: 'Charger Fast Charging 65W GaN Type-C', category: 'Aksesori HP & Laptop', costPrice: 120000, sellPrice: 175000, stock: 18 },
    { id: 'p5', barcode: '899100100205', name: 'STB Android TV Box 4K Wireless', category: 'Elektronik Rumah', costPrice: 280000, sellPrice: 360000, stock: 4 },
    { id: 'p6', barcode: '899100100206', name: 'Headset Gaming Surround 7.1 RGB', category: 'Aksesori HP & Laptop', costPrice: 150000, sellPrice: 220000, stock: 9 },
    { id: 'p7', barcode: '899100100207', name: 'Stopkontak Smart Wifi Smart Plug 16A', category: 'Elektronik Rumah', costPrice: 75000, sellPrice: 110000, stock: 15 }
  ];

  const DEFAULT_CUSTOMERS = [
    { id: 'c1', name: 'Budi Santoso', address: 'Jl. Pemuda No. 45, RT 01/03', bandwidth: '20 Mbps', monthlyAmount: 150000, createdAt: '2026-01-10' },
    { id: 'c2', name: 'Siti Rahmawati', address: 'Komp. Asri Indah Block C2', bandwidth: '30 Mbps', monthlyAmount: 200000, createdAt: '2026-02-01' },
    { id: 'c3', name: 'Ahmad Hidayat', address: 'Dusun Melati RT 04/02 Desa Sukamaju', bandwidth: '10 Mbps', monthlyAmount: 100000, createdAt: '2026-03-15' },
    { id: 'c4', name: 'Toko Kelontong Berkah', address: 'Jl. Pasar Anyar No. 88', bandwidth: '50 Mbps', monthlyAmount: 300000, createdAt: '2026-04-05' }
  ];

  let state = {
    products: [],
    customers: [],
    posTx: [],
    wifiTx: [],
    users: [],
    categories: [],
    cart: [],
    activeTab: 'dashboard',
    posCategoryFilter: 'all',
    html5QrcodeScanner: null,
    currentUser: null
  };

  // ==========================================
  // 1B. API Client for SQLite Synchronization
  // ==========================================
  const API = {
    isServer: window.location.protocol.startsWith('http'),

    async fetchAll() {
      if (!this.isServer) return null;
      try {
        const [prods, cats, custs, posTx, wifiTx, users] = await Promise.all([
          fetch('/api/products').then(r => r.json()),
          fetch('/api/categories').then(r => r.json()),
          fetch('/api/customers').then(r => r.json()),
          fetch('/api/pos-transactions').then(r => r.json()),
          fetch('/api/wifi-transactions').then(r => r.json()),
          fetch('/api/users').then(r => r.json())
        ]);
        return {
          products: prods.success ? prods.data : null,
          categories: cats.success ? cats.data : null,
          customers: custs.success ? custs.data : null,
          posTx: posTx.success ? posTx.data : null,
          wifiTx: wifiTx.success ? wifiTx.data : null,
          users: users.success ? users.data : null
        };
      } catch (err) {
        return null;
      }
    },

    async saveProduct(product) {
      if (!this.isServer) return;
      try {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });
      } catch (e) { console.error('API saveProduct error:', e); }
    },

    async deleteProduct(id) {
      if (!this.isServer) return;
      try {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteProduct error:', e); }
    },

    async addCategory(name) {
      if (!this.isServer) return;
      try {
        await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      } catch (e) { console.error('API addCategory error:', e); }
    },

    async updateCategory(oldName, newName) {
      if (!this.isServer) return;
      try {
        await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName, newName })
        });
      } catch (e) { console.error('API updateCategory error:', e); }
    },

    async deleteCategory(name) {
      if (!this.isServer) return;
      try {
        await fetch(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteCategory error:', e); }
    },

    async saveCustomer(customer) {
      if (!this.isServer) return;
      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer)
        });
      } catch (e) { console.error('API saveCustomer error:', e); }
    },

    async deleteCustomer(id) {
      if (!this.isServer) return;
      try {
        await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteCustomer error:', e); }
    },

    async savePosTransaction(tx) {
      if (!this.isServer) return;
      try {
        await fetch('/api/pos-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      } catch (e) { console.error('API savePosTransaction error:', e); }
    },

    async saveWifiTransaction(tx) {
      if (!this.isServer) return;
      try {
        await fetch('/api/wifi-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      } catch (e) { console.error('API saveWifiTransaction error:', e); }
    },

    async saveUser(user) {
      if (!this.isServer) return;
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
      } catch (e) { console.error('API saveUser error:', e); }
    },

    async deleteUser(id) {
      if (!this.isServer) return;
      try {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteUser error:', e); }
    }
  };

  // Helper Functions
  function loadData() {
    state.products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || DEFAULT_PRODUCTS;
    state.categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES)) || DEFAULT_CATEGORIES;
    state.customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) || DEFAULT_CUSTOMERS;
    state.posTx = JSON.parse(localStorage.getItem(STORAGE_KEYS.POS_TX)) || [];
    state.wifiTx = JSON.parse(localStorage.getItem(STORAGE_KEYS.WIFI_TX)) || [];
    state.users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_LIST)) || DEFAULT_USERS;
    state.currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_USER)) || null;

    if (state.currentUser) {
      const syncedUser = state.users.find(u => u.id === state.currentUser.id || u.username.toLowerCase() === state.currentUser.username.toLowerCase());
      if (syncedUser) {
        state.currentUser = syncedUser;
        saveData(STORAGE_KEYS.AUTH_USER);
      }
    }

    // Seed dummy transactions if empty for demonstration
    if (state.posTx.length === 0) {
      seedDemoTransactions();
    }
  }

  async function syncWithServer(renderAfter = true) {
    const data = await API.fetchAll();
    if (data) {
      let changed = false;
      if (data.products) { state.products = data.products; changed = true; }
      if (data.categories) { state.categories = data.categories; changed = true; }
      if (data.customers) { state.customers = data.customers; changed = true; }
      if (data.posTx) { state.posTx = data.posTx; changed = true; }
      if (data.wifiTx) { state.wifiTx = data.wifiTx; changed = true; }
      if (data.users) { state.users = data.users; changed = true; }

      if (changed) {
        saveData(STORAGE_KEYS.PRODUCTS);
        saveData(STORAGE_KEYS.CATEGORIES);
        saveData(STORAGE_KEYS.CUSTOMERS);
        saveData(STORAGE_KEYS.POS_TX);
        saveData(STORAGE_KEYS.WIFI_TX);
        saveData(STORAGE_KEYS.USERS_LIST);

        if (renderAfter) {
          renderCategoryDropdowns();
          renderTabViews(state.activeTab);
        }
      }
    }
  }

  function saveData(key) {
    if (key === STORAGE_KEYS.PRODUCTS) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(state.products));
    if (key === STORAGE_KEYS.CATEGORIES) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories));
    if (key === STORAGE_KEYS.CUSTOMERS) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(state.customers));
    if (key === STORAGE_KEYS.POS_TX) localStorage.setItem(STORAGE_KEYS.POS_TX, JSON.stringify(state.posTx));
    if (key === STORAGE_KEYS.WIFI_TX) localStorage.setItem(STORAGE_KEYS.WIFI_TX, JSON.stringify(state.wifiTx));
    if (key === STORAGE_KEYS.USERS_LIST) localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(state.users));
    if (key === STORAGE_KEYS.AUTH_USER) localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(state.currentUser));
  }

  // Auth & Role Enforcement
  function initAuth() {
    const loginScreen = document.getElementById('loginScreen');
    const formLogin = document.getElementById('formLogin');
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const btnLogout = document.getElementById('btnLogout');
    const btnEditProfile = document.getElementById('btnEditProfile');

    // Handle Login Form Submit
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const uname = usernameInput.value.trim().toLowerCase();
      const pwd = passwordInput.value.trim();

      const matchedUser = state.users.find(u => u.username.toLowerCase() === uname && u.password === pwd);

      if (matchedUser) {
        state.currentUser = matchedUser;
        saveData(STORAGE_KEYS.AUTH_USER);
        loginScreen.classList.add('hidden');
        applyUserRolePermissions();
        usernameInput.value = '';
        passwordInput.value = '';
      } else {
        alert('Username atau password yang Anda masukkan tidak sesuai!');
      }
    });

    // Handle Edit Profile Header Button
    if (btnEditProfile) {
      btnEditProfile.addEventListener('click', () => {
        if (!state.currentUser) return;
        openEditUserModal(state.currentUser.id);
      });
    }

    // Handle Logout
    btnLogout.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin keluar/logout?')) {
        state.currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        loginScreen.classList.remove('hidden');
      }
    });

    // Check existing session
    if (state.currentUser) {
      loginScreen.classList.add('hidden');
      applyUserRolePermissions();
    } else {
      loginScreen.classList.remove('hidden');
    }
  }

  function applyUserRolePermissions() {
    if (!state.currentUser) return;

    const user = state.currentUser;
    const userNameEl = document.getElementById('userNameText');
    if (userNameEl) userNameEl.textContent = user.name;
    const userAvatarEl = document.getElementById('userAvatarText');
    if (userAvatarEl) userAvatarEl.textContent = user.role === 'admin' ? 'A' : 'K';

    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');

    navItems.forEach(item => {
      const tab = item.getAttribute('data-tab');
      if (user.role === 'kasir') {
        if (KASIR_ALLOWED_TABS.includes(tab)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      } else {
        // Admin gets all menus
        item.style.display = 'flex';
      }
    });

    // If Kasir is logged in and activeTab is not allowed, switch to Kasir POS automatically
    if (user.role === 'kasir' && !KASIR_ALLOWED_TABS.includes(state.activeTab)) {
      switchTab('kasir-pos');
    } else {
      switchTab(state.activeTab);
    }
  }

  function formatRupiah(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  }

  function formatDateIso(dateObj) {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDateTimeReadable(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function playBeepSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1000;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio context not available');
    }
  }

  function seedDemoTransactions() {
    const today = new Date();
    const todayStr = formatDateIso(today);

    state.posTx = [
      {
        id: 'tx_pos_101',
        receiptNo: 'INV/AJB/' + Date.now().toString().slice(-6),
        timestamp: new Date().toISOString(),
        dateStr: todayStr,
        items: [
          { productId: 'p2', name: 'Kabel UTP Cat6 Belden 10 Meter Ready', qty: 2, price: 55000, costPrice: 35000 },
          { productId: 'p3', name: 'Tang Krimping RJ45 & RJ11 Heavy Duty', qty: 1, price: 70000, costPrice: 45000 }
        ],
        subtotal: 180000,
        total: 180000,
        cash: 200000,
        change: 20000
      }
    ];

    state.wifiTx = [
      {
        id: 'tx_wifi_201',
        receiptNo: 'WIFI/AJB/' + Date.now().toString().slice(-6),
        timestamp: new Date().toISOString(),
        dateStr: todayStr,
        customerId: 'c1',
        customerName: 'Budi Santoso',
        address: 'Jl. Pemuda No. 45, RT 01/03',
        bandwidth: '20 Mbps',
        periodMonth: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
        amount: 150000,
        notes: 'Lunas via Kasir'
      }
    ];

    saveData(STORAGE_KEYS.POS_TX);
    saveData(STORAGE_KEYS.WIFI_TX);
  }

  // ==========================================
  // 2. Navigation & UI Router
  // ==========================================
  function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Toggle sidebar open/close
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      sidebarOverlay.classList.toggle('visible');
    });

    // Close sidebar by tapping overlay
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('visible');
      });
    }

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabTarget = item.getAttribute('data-tab');
        switchTab(tabTarget);

        // Always close sidebar on mobile after navigation
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('mobile-open');
          sidebarOverlay.classList.remove('visible');
        }
      });
    });

    // View All Tx from Dashboard
    const btnDashViewAll = document.getElementById('btnDashViewAllTx');
    if (btnDashViewAll) {
      btnDashViewAll.addEventListener('click', () => {
        switchTab('rekap-pos');
      });
    }

    // Modal Close Triggers
    document.querySelectorAll('.closeModalBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal');
        closeModal(modalId);
      });
    });
    // Beep Audio Feedback on successful scan
    function playBeepSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1200;
        gain.gain.value = 0.25;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 120);
      } catch (e) {
        // AudioContext not allowed or supported
      }
    }

    // Helper function for camera barcode scanner
    function launchScanner(onScanSuccess) {
      openModal('modalCameraScanner');

      // Explicitly define 1D Barcode + 2D Formats for maximum scanner accuracy
      let formatsToSupport = undefined;
      if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
        formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ];
      }

      if (!state.html5QrcodeScanner) {
        state.html5QrcodeScanner = new Html5Qrcode('reader', {
          formatsToSupport: formatsToSupport,
          verbose: false
        });
      }

      // Rectangular scanning region tailored for 1D barcodes (EAN-13, CODE128)
      const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
        const width = Math.min(viewfinderWidth * 0.88, 340);
        const height = Math.min(viewfinderHeight * 0.45, 170);
        return { width: Math.max(width, 220), height: Math.max(height, 100) };
      };

      const config = {
        fps: 15,
        qrbox: qrboxFunction,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      const handleSuccess = decodedText => {
        playBeepSound();
        onScanSuccess(decodedText);
        if (state.html5QrcodeScanner) {
          state.html5QrcodeScanner.stop().then(() => {
            closeModal('modalCameraScanner');
          }).catch(err => {
            console.error('Stop scanner error:', err);
            closeModal('modalCameraScanner');
          });
        } else {
          closeModal('modalCameraScanner');
        }
      };

      // Try camera with optimal resolution & environment facing mode
      state.html5QrcodeScanner.start(
        { facingMode: 'environment' },
        config,
        handleSuccess,
        () => {}
      ).catch(err => {
        console.warn('First start attempt failed, retrying with fallback camera options:', err);
        // Fallback try without specific constraints if environment facing fails
        state.html5QrcodeScanner.start(
          { facingMode: 'user' },
          config,
          handleSuccess,
          () => {}
        ).catch(err2 => {
          alert('Tidak dapat mengakses kamera: ' + (err2.message || err2) + '\nPastikan izin akses kamera sudah diberikan pada browser Anda.');
          closeModal('modalCameraScanner');
        });
      });
    }

    // Barcode Scanner Button (Product Modal - Tambah Barang)
    const btnScanBarcode = document.getElementById('btnScanBarcode');
    if (btnScanBarcode) {
      btnScanBarcode.addEventListener('click', () => {
        launchScanner(decodedText => {
          const barcodeInput = document.getElementById('prodBarcode');
          if (barcodeInput) barcodeInput.value = decodedText;
        });
      });
    }

    // Barcode Scanner Button (Kasir POS)
    const btnScanBarcodeCamera = document.getElementById('btnScanBarcodeCamera');
    if (btnScanBarcodeCamera) {
      btnScanBarcodeCamera.addEventListener('click', () => {
        launchScanner(decodedText => {
          const posSearch = document.getElementById('posSearchProduct');
          if (posSearch) {
            posSearch.value = decodedText;
            posSearch.dispatchEvent(new Event('input'));
          }
        });
      });
    }
    // Live Clock
    setInterval(updateClock, 1000);
    updateClock();
  }

  function switchTab(tabId) {
    // Role Security Guard for Kasir
    if (state.currentUser && state.currentUser.role === 'kasir' && !KASIR_ALLOWED_TABS.includes(tabId)) {
      alert('Akses Ditolak: User Kasir hanya diperbolehkan mengakses menu Kasir, Rekap Transaksi, Bayar Wifi, dan Rekap Wifi.');
      tabId = 'kasir-pos';
    }

    state.activeTab = tabId;

    // Update Nav Active state
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Tab Pane visibility
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const targetPane = document.getElementById(`tab-${tabId}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    // Update Title
    const titleMap = {
      'dashboard': 'Dashboard',
      'stok-barang': 'Stok Barang',
      'kasir-pos': 'Kasir Toko',
      'rekap-pos': 'Rekap Transaksi Toko',
      'manajemen-user': 'Manajemen Pengguna Aplikasi',
      'pelanggan-wifi': 'Kelola Pelanggan Wifi Ajib.Net',
      'bayar-wifi': 'Pembayaran Tagihan Ajib.Net',
      'rekap-wifi': 'Rekap Pembayaran Wifi Ajib.Net'
    };
    document.getElementById('currentPageTitle').textContent = titleMap[tabId] || 'Ajib Store';

    // Refresh Data for view
    renderTabViews(tabId);
  }

  function renderTabViews(tabId) {
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'stok-barang') renderProductTable();
    if (tabId === 'kasir-pos') renderPosProducts();
    if (tabId === 'rekap-pos') renderRekapPos();
    if (tabId === 'manajemen-user') renderUserTable();
    if (tabId === 'pelanggan-wifi') renderWifiCustomers();
    if (tabId === 'bayar-wifi') renderBayarWifiForm();
    if (tabId === 'rekap-wifi') renderRekapWifi();
  }

  function updateClock() {
    const now = new Date();
    document.getElementById('liveClock').textContent = now.toLocaleTimeString('id-ID');
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');

    if (modalId === 'modalCameraScanner' && state.html5QrcodeScanner) {
      try {
        if (state.html5QrcodeScanner.getState && state.html5QrcodeScanner.getState() === 2) {
          state.html5QrcodeScanner.stop().then(() => {
            state.html5QrcodeScanner.clear().catch(e => console.log(e));
          }).catch(e => {
            state.html5QrcodeScanner.clear().catch(err => console.log(err));
          });
        } else {
          state.html5QrcodeScanner.clear().catch(err => console.log(err));
        }
      } catch (e) {
        state.html5QrcodeScanner.clear().catch(err => console.log(err));
      }
    }
  }

  // ==========================================
  // 3. Dashboard Functionality
  // ==========================================
  function renderDashboard() {
    const todayStr = formatDateIso(new Date());
    
    // Today POS Stats
    const todayPos = state.posTx.filter(t => t.dateStr === todayStr);
    const todayPosRevenue = todayPos.reduce((sum, t) => sum + (t.total || 0), 0);
    document.getElementById('dashTodayPosRevenue').textContent = formatRupiah(todayPosRevenue);
    document.getElementById('dashTodayPosCount').textContent = todayPos.length + ' Tx';

    // Wifi Stats
    document.getElementById('dashWifiCustomerCount').textContent = state.customers.length + ' User';
    
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const monthlyWifi = state.wifiTx.filter(t => t.periodMonth === currentMonth);
    const monthlyWifiRevenue = monthlyWifi.reduce((sum, t) => sum + (t.amount || 0), 0);
    document.getElementById('dashWifiMonthlyRevenue').textContent = formatRupiah(monthlyWifiRevenue);

    // Low Stock Alert
    const lowStockContainer = document.getElementById('lowStockList');
    const lowStockItems = state.products.filter(p => p.stock <= 5);

    if (lowStockItems.length === 0) {
      lowStockContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Semua stok barang aman (>5)</div>`;
    } else {
      lowStockContainer.innerHTML = lowStockItems.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--accent-danger-light); border: 1px solid #fca5a5; padding: 10px 14px; border-radius: var(--radius-md);">
          <div>
            <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-main);">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Barcode: ${p.barcode}</div>
          </div>
          <div class="badge badge-danger">Stok: ${p.stock} Pcs</div>
        </div>
      `).join('');
    }

    // Render Recent Transactions
    renderDashboardRecentTx();
  }

  function renderDashboardRecentTx() {
    const tbody = document.getElementById('dashRecentTxTableBody');
    if (!tbody) return;

    // Combine POS and Wifi transactions
    const combinedTx = [
      ...state.posTx.map(t => ({
        id: t.id,
        receiptNo: t.receiptNo,
        timestamp: t.timestamp,
        type: 'pos',
        typeLabel: 'Toko',
        amount: t.total
      })),
      ...state.wifiTx.map(t => ({
        id: t.id,
        receiptNo: t.receiptNo,
        timestamp: t.timestamp,
        type: 'wifi',
        typeLabel: 'Wifi',
        amount: t.amount
      }))
    ];

    combinedTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recents = combinedTx.slice(0, 6);

    if (recents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 25px;">Belum ada riwayat transaksi.</td></tr>`;
      return;
    }

    tbody.innerHTML = recents.map(t => `
      <tr>
        <td style="font-family: monospace; color: var(--accent-pos); font-weight: 600;">${t.receiptNo}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${formatDateTimeReadable(t.timestamp)}</td>
        <td>
          <span class="badge ${t.type === 'wifi' ? 'badge-success' : 'badge-info'}">
            ${t.type === 'wifi' ? '<i class="fa-solid fa-wifi"></i>' : '<i class="fa-solid fa-store"></i>'} ${t.typeLabel}
          </span>
        </td>
        <td style="font-weight: 700; color: ${t.type === 'wifi' ? 'var(--accent-wifi)' : 'var(--accent-pos)'};">
          ${formatRupiah(t.amount)}
        </td>
      </tr>
    `).join('');
  }

  // ==========================================
  // 3B. Manajemen Kategori Dinamis
  // ==========================================
  function initCategoryManagement() {
    const btnOpen = document.getElementById('btnOpenManageCategories');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        resetCategoryForm();
        renderCategoryTable();
        openModal('modalCategory');
      });
    }

    const form = document.getElementById('formCategory');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('inputCategoryName');
        const oldName = document.getElementById('editCategoryOldName').value.trim();
        const newName = input.value.trim();

        if (!newName) return;

        if (oldName) {
          // Edit Kategori
          const exists = state.categories.some(c => c.toLowerCase() === newName.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase());
          if (exists) {
            alert(`Kategori "${newName}" sudah ada!`);
            return;
          }

          const idx = state.categories.indexOf(oldName);
          if (idx !== -1) {
            state.categories[idx] = newName;
          }

          // Sinkronisasi kategori pada semua barang terkait
          state.products.forEach(p => {
            if (p.category === oldName) {
              p.category = newName;
            }
          });
          saveData(STORAGE_KEYS.PRODUCTS);
          saveData(STORAGE_KEYS.CATEGORIES);
          API.updateCategory(oldName, newName);

          alert(`Kategori "${oldName}" berhasil diubah menjadi "${newName}".`);
        } else {
          // Tambah Kategori Baru
          const exists = state.categories.some(c => c.toLowerCase() === newName.toLowerCase());
          if (exists) {
            alert(`Kategori "${newName}" sudah ada!`);
            return;
          }

          state.categories.push(newName);
          saveData(STORAGE_KEYS.CATEGORIES);
          API.addCategory(newName);
        }

        resetCategoryForm();
        renderCategoryTable();
        renderCategoryDropdowns();
        renderProductTable();
        renderPosProducts();
      });
    }

    const btnCancel = document.getElementById('btnCancelEditCat');
    if (btnCancel) {
      btnCancel.addEventListener('click', resetCategoryForm);
    }
  }

  function resetCategoryForm() {
    const form = document.getElementById('formCategory');
    if (form) form.reset();
    document.getElementById('editCategoryOldName').value = '';
    document.getElementById('lblCatFormTitle').textContent = 'Tambah Kategori Baru';
    document.getElementById('btnSaveCategory').innerHTML = '<i class="fa-solid fa-plus"></i> Simpan';
    const btnCancel = document.getElementById('btnCancelEditCat');
    if (btnCancel) btnCancel.style.display = 'none';
  }

  function renderCategoryTable() {
    const tbody = document.getElementById('categoryTableBody');
    if (!tbody) return;

    if (state.categories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada kategori.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.categories.map((cat, i) => `
      <tr>
        <td style="font-weight: 600; color: var(--text-muted);">${i + 1}</td>
        <td style="font-weight: 600;">${cat}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn btn-sm btn-secondary btn-edit-cat" data-name="${cat}" title="Edit Kategori"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger btn-del-cat" data-name="${cat}" title="Hapus Kategori"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-edit-cat').forEach(b => {
      b.addEventListener('click', () => {
        const catName = b.getAttribute('data-name');
        document.getElementById('inputCategoryName').value = catName;
        document.getElementById('editCategoryOldName').value = catName;
        document.getElementById('lblCatFormTitle').textContent = `Edit Kategori "${catName}"`;
        document.getElementById('btnSaveCategory').innerHTML = '<i class="fa-solid fa-check"></i> Simpan';
        const btnCancel = document.getElementById('btnCancelEditCat');
        if (btnCancel) btnCancel.style.display = 'inline-flex';
        document.getElementById('inputCategoryName').focus();
      });
    });

    tbody.querySelectorAll('.btn-del-cat').forEach(b => {
      b.addEventListener('click', () => {
        const catName = b.getAttribute('data-name');
        const count = state.products.filter(p => p.category === catName).length;

        const confirmMsg = count > 0 
          ? `Terdapat ${count} barang dengan kategori "${catName}". Yakin ingin menghapus kategori ini? (Barang akan dipindahkan ke kategori "Umum")`
          : `Yakin ingin menghapus kategori "${catName}"?`;

        if (confirm(confirmMsg)) {
          state.categories = state.categories.filter(c => c !== catName);
          if (count > 0) {
            state.products.forEach(p => {
              if (p.category === catName) p.category = 'Umum';
            });
            if (!state.categories.includes('Umum')) state.categories.push('Umum');
            saveData(STORAGE_KEYS.PRODUCTS);
          }
          saveData(STORAGE_KEYS.CATEGORIES);
          API.deleteCategory(catName);

          renderCategoryTable();
          renderCategoryDropdowns();
          renderProductTable();
          renderPosProducts();
        }
      });
    });
  }

  function renderCategoryDropdowns() {
    // 1. Filter dropdown in Stok Barang
    const filterCat = document.getElementById('filterProductCategory');
    if (filterCat) {
      const currVal = filterCat.value;
      filterCat.innerHTML = `<option value="">Semua Kategori</option>` + 
        state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
      filterCat.value = currVal;
    }

    // 2. Select in Product Add/Edit Modal
    const prodCat = document.getElementById('prodCategory');
    if (prodCat) {
      const currVal = prodCat.value;
      prodCat.innerHTML = state.categories.map(c => `<option value="${c}">${c}</option>`).join('');
      if (currVal && state.categories.includes(currVal)) {
        prodCat.value = currVal;
      }
    }

    // 3. Category Pills in Kasir POS
    const pillsContainer = document.getElementById('posCategoryPills');
    if (pillsContainer) {
      pillsContainer.innerHTML = `
        <button class="btn btn-sm btn-secondary ${state.posCategoryFilter === 'all' ? 'active-pill' : ''}" data-cat="all">Semua</button>
      ` + state.categories.map(c => `
        <button class="btn btn-sm btn-secondary ${state.posCategoryFilter === c ? 'active-pill' : ''}" data-cat="${c}">${c}</button>
      `).join('');

      pillsContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          pillsContainer.querySelectorAll('button').forEach(b => b.classList.remove('active-pill'));
          btn.classList.add('active-pill');
          state.posCategoryFilter = btn.getAttribute('data-cat');
          renderPosProducts();
        });
      });
    }
  }

  // ==========================================
  // 4. Products Management (Stok Barang)
  // ==========================================
  function initProductManagement() {
    const prodImgInput = document.getElementById('prodImageInput');
    const prodImgPreview = document.getElementById('prodImagePreview');
    const prodImgPlaceholder = document.getElementById('prodImagePlaceholderIcon');
    const prodImgBase64 = document.getElementById('prodImageBase64');
    const btnRemoveImg = document.getElementById('btnRemoveProdImage');

    function resetProdImage() {
      if (prodImgInput) prodImgInput.value = '';
      if (prodImgBase64) prodImgBase64.value = '';
      if (prodImgPreview) {
        prodImgPreview.src = '';
        prodImgPreview.style.display = 'none';
      }
      if (prodImgPlaceholder) prodImgPlaceholder.style.display = 'block';
      if (btnRemoveImg) btnRemoveImg.style.display = 'none';
    }

    function setProdImagePreview(src) {
      if (src) {
        if (prodImgBase64) prodImgBase64.value = src;
        if (prodImgPreview) {
          prodImgPreview.src = src;
          prodImgPreview.style.display = 'block';
        }
        if (prodImgPlaceholder) prodImgPlaceholder.style.display = 'none';
        if (btnRemoveImg) btnRemoveImg.style.display = 'inline-flex';
      } else {
        resetProdImage();
      }
    }

    if (prodImgInput) {
      prodImgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran foto terlalu besar! Maksimal 2MB.');
            prodImgInput.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onload = function(evt) {
            setProdImagePreview(evt.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (btnRemoveImg) {
      btnRemoveImg.addEventListener('click', resetProdImage);
    }

    document.getElementById('btnOpenAddProduct').addEventListener('click', () => {
      document.getElementById('formProduct').reset();
      document.getElementById('prodId').value = '';
      document.getElementById('modalProductTitle').textContent = 'Tambah Barang';
      resetProdImage();
      renderCategoryDropdowns();
      openModal('modalProduct');
    });

    document.getElementById('btnGenBarcode').addEventListener('click', () => {
      document.getElementById('prodBarcode').value = 'SKU' + Math.floor(100000 + Math.random() * 900000);
    });

    document.getElementById('formProduct').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('prodId').value || 'p_' + Date.now();
      let barcode = document.getElementById('prodBarcode').value.trim();
      
      // Auto-generate SKU if left blank
      if (!barcode) {
        barcode = 'SKU' + Date.now().toString().slice(-6);
      }

      const name = document.getElementById('prodName').value.trim();
      const category = document.getElementById('prodCategory').value || (state.categories[0] || 'Umum');
      const costPrice = parseFloat(document.getElementById('prodCostPrice').value);
      const sellPrice = parseFloat(document.getElementById('prodSellPrice').value);
      const stock = parseInt(document.getElementById('prodStock').value);
      const image = prodImgBase64 ? prodImgBase64.value : '';

      const existingIndex = state.products.findIndex(p => p.id === id);
      const productObj = { id, barcode, name, category, costPrice, sellPrice, stock, image };

      if (existingIndex >= 0) {
        state.products[existingIndex] = productObj;
      } else {
        state.products.push(productObj);
      }

      saveData(STORAGE_KEYS.PRODUCTS);
      API.saveProduct(productObj);
      closeModal('modalProduct');
      renderProductTable();
      renderPosProducts();
    });

    document.getElementById('searchProductInput').addEventListener('input', renderProductTable);
    document.getElementById('filterProductCategory').addEventListener('change', renderProductTable);

    // Edit Product Click Handler
    window.setProductImageHelper = setProdImagePreview;
  }

  function renderProductTable() {
    const search = (document.getElementById('searchProductInput').value || '').toLowerCase();
    const catFilter = document.getElementById('filterProductCategory').value;
    const tbody = document.getElementById('productTableBody');

    const filtered = state.products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search) || p.barcode.toLowerCase().includes(search);
      const matchCat = !catFilter || p.category === catFilter;
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada data barang ditemukan.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td style="font-family: monospace; color: var(--accent-pos); font-weight: 600;">${p.barcode}</td>
        <td style="font-weight: 600;">${p.name}</td>
        <td><span class="badge badge-info">${p.category}</span></td>
        <td>${formatRupiah(p.costPrice)}</td>
        <td style="font-weight: 700; color: var(--accent-wifi);">${formatRupiah(p.sellPrice)}</td>
        <td style="font-weight: 700;">${p.stock}</td>
        <td>
          ${p.stock <= 5 
            ? `<span class="badge badge-danger">Menipis</span>` 
            : `<span class="badge badge-success">Tersedia</span>`}
        </td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-secondary btn-edit-prod" data-id="${p.id}" title="Edit Barang"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-danger btn-del-prod" data-id="${p.id}" title="Hapus Barang"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

    // Attach Event Handlers for Edit/Delete
    tbody.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const prod = state.products.find(p => p.id === id);
        if (prod) {
          renderCategoryDropdowns();
          document.getElementById('prodId').value = prod.id;
          document.getElementById('prodBarcode').value = prod.barcode;
          document.getElementById('prodName').value = prod.name;
          document.getElementById('prodCategory').value = prod.category;
          document.getElementById('prodCostPrice').value = prod.costPrice;
          document.getElementById('prodSellPrice').value = prod.sellPrice;
          document.getElementById('prodStock').value = prod.stock;
          document.getElementById('modalProductTitle').textContent = 'Edit Barang';
          if (window.setProductImageHelper) {
            window.setProductImageHelper(prod.image || '');
          }
          openModal('modalProduct');
        }
      });
    });

    tbody.querySelectorAll('.btn-del-prod').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Yakin ingin menghapus barang ini dari stok?')) {
          state.products = state.products.filter(p => p.id !== id);
          saveData(STORAGE_KEYS.PRODUCTS);
          API.deleteProduct(id);
          renderProductTable();
          renderPosProducts();
        }
      });
    });
  }

  // ==========================================
  // 5. Kasir POS & Barcode Camera Scanner
  // ==========================================
  function initPosCashier() {
    // POS Search Input & Camera Trigger
    const posSearch = document.getElementById('posSearchProduct');
    posSearch.addEventListener('input', () => {
      renderPosProducts();
      // If barcode exact match found, auto add to cart
      const val = posSearch.value.trim();
      const exactMatch = state.products.find(p => p.barcode === val);
      if (exactMatch && exactMatch.stock > 0) {
        addToCart(exactMatch);
        posSearch.value = '';
        renderPosProducts();
      }
    });

    // Category Filter Pills
    document.querySelectorAll('#posCategoryPills button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#posCategoryPills button').forEach(b => b.classList.remove('active-pill'));
        btn.classList.add('active-pill');
        state.posCategoryFilter = btn.getAttribute('data-cat');
        renderPosProducts();
      });
    });

    // Camera Barcode Scanner Trigger
    document.getElementById('btnScanBarcodeCamera').addEventListener('click', startCameraScanner);

    // Cart Actions
    document.getElementById('btnClearCart').addEventListener('click', () => {
      state.cart = [];
      renderCart();
    });

    // Open Checkout Modal
    document.getElementById('btnOpenCheckout').addEventListener('click', () => {
      if (state.cart.length === 0) {
        alert('Keranjang belanja masih kosong!');
        return;
      }
      const grandTotal = calculateCartGrandTotal();
      document.getElementById('checkoutTotalDisplay').textContent = formatRupiah(grandTotal);
      document.getElementById('checkoutCash').value = '';
      document.getElementById('checkoutChangeDisplay').textContent = formatRupiah(0);

      // Render Quick Cash buttons
      const quickCashContainer = document.getElementById('quickCashButtons');
      const amounts = [grandTotal, 20000, 50000, 100000, 200000, 500000].filter(a => a >= grandTotal);
      quickCashContainer.innerHTML = Array.from(new Set(amounts)).map(amt => `
        <button type="button" class="btn btn-sm btn-secondary quick-cash-btn" data-amt="${amt}">${formatRupiah(amt)}</button>
      `).join('');

      quickCashContainer.querySelectorAll('.quick-cash-btn').forEach(b => {
        b.addEventListener('click', () => {
          document.getElementById('checkoutCash').value = b.getAttribute('data-amt');
          updateCheckoutChange();
        });
      });

      openModal('modalCheckout');
    });

    // Realtime Change Calculator
    document.getElementById('checkoutCash').addEventListener('input', updateCheckoutChange);

    // Confirm Checkout Process
    document.getElementById('btnConfirmCheckout').addEventListener('click', executeCheckout);
  }

  function startCameraScanner() {
    openModal('modalCameraScanner');
    if (state.html5QrcodeScanner) {
      state.html5QrcodeScanner.clear().catch(e => console.log(e));
    }

    state.html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 150 } },
      /* verbose= */ false
    );

    state.html5QrcodeScanner.render((decodedText, decodedResult) => {
      playBeepSound();
      console.log(`Scan result: ${decodedText}`);

      // Search product by barcode
      const product = state.products.find(p => p.barcode === decodedText);
      if (product) {
        if (product.stock > 0) {
          addToCart(product);
          alert(`Berhasil di-scan: ${product.name} (Ditambahkan ke keranjang)`);
        } else {
          alert(`Barang ${product.name} ditemukan tetapi stok habis!`);
        }
      } else {
        alert(`Kode barcode ${decodedText} tidak ditemukan dalam stok barang.`);
      }

      closeModal('modalCameraScanner');
    }, (error) => {
      // Silent scan error
    });
  }

  function renderPosProducts() {
    const search = (document.getElementById('posSearchProduct').value || '').toLowerCase();
    const cat = state.posCategoryFilter;
    const grid = document.getElementById('posProductGrid');

    const filtered = state.products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search) || p.barcode.toLowerCase().includes(search);
      const matchCat = cat === 'all' || p.category === cat;
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Tidak ada produk yang cocok.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <div class="product-item-card" data-id="${p.id}">
        <div class="prod-img-box">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<i class="fa-solid fa-box-open"></i>`}
        </div>
        <div class="prod-title">${p.name}</div>
        <div class="prod-barcode-code"><i class="fa-solid fa-barcode"></i> ${p.barcode}</div>
        <div class="prod-footer">
          <div class="prod-price">${formatRupiah(p.sellPrice)}</div>
          <div class="prod-stock">Stok: <strong>${p.stock}</strong></div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.product-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const product = state.products.find(p => p.id === id);
        if (product) {
          if (product.stock <= 0) {
            alert('Stok barang ini telah habis!');
            return;
          }
          addToCart(product);
        }
      });
    });
  }

  function addToCart(product) {
    const existing = state.cart.find(c => c.product.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock) {
        alert(`Stok tidak mencukupi! Sisa stok: ${product.stock}`);
        return;
      }
      existing.qty += 1;
    } else {
      state.cart.push({ product: product, qty: 1 });
    }
    playBeepSound();
    renderCart();
  }

  function renderCart() {
    const cartList = document.getElementById('posCartList');

    if (state.cart.length === 0) {
      cartList.innerHTML = `
        <div style="text-align: center; color: var(--text-dim); padding: 50px 0;">
          <i class="fa-solid fa-cart-arrow-down" style="font-size: 2.5rem; margin-bottom: 10px;"></i>
          <p>Keranjang masih kosong</p>
        </div>
      `;
    } else {
      cartList.innerHTML = state.cart.map((item, index) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.product.name}</div>
            <div class="cart-item-price">${formatRupiah(item.product.sellPrice)}</div>
          </div>
          <div class="cart-qty-ctrl">
            <button class="cart-qty-btn btn-minus" data-index="${index}">-</button>
            <span class="cart-qty-num">${item.qty}</span>
            <button class="cart-qty-btn btn-plus" data-index="${index}">+</button>
          </div>
          <button class="btn btn-sm btn-danger btn-icon btn-remove-item" data-index="${index}">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `).join('');

      cartList.querySelectorAll('.btn-minus').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.getAttribute('data-index'));
          if (state.cart[idx].qty > 1) {
            state.cart[idx].qty -= 1;
          } else {
            state.cart.splice(idx, 1);
          }
          renderCart();
        });
      });

      cartList.querySelectorAll('.btn-plus').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.getAttribute('data-index'));
          if (state.cart[idx].qty + 1 > state.cart[idx].product.stock) {
            alert('Jumlah melebih stok ketersediaan!');
            return;
          }
          state.cart[idx].qty += 1;
          renderCart();
        });
      });

      cartList.querySelectorAll('.btn-remove-item').forEach(b => {
        b.addEventListener('click', () => {
          const idx = parseInt(b.getAttribute('data-index'));
          state.cart.splice(idx, 1);
          renderCart();
        });
      });
    }

    const totalQty = state.cart.reduce((sum, c) => sum + c.qty, 0);
    const grandTotal = calculateCartGrandTotal();

    document.getElementById('posTotalQty').textContent = totalQty + ' Pcs';
    document.getElementById('posSubtotal').textContent = formatRupiah(grandTotal);
    document.getElementById('posGrandTotal').textContent = formatRupiah(grandTotal);
  }

  function calculateCartGrandTotal() {
    return state.cart.reduce((sum, c) => sum + (c.product.sellPrice * c.qty), 0);
  }

  function updateCheckoutChange() {
    const grandTotal = calculateCartGrandTotal();
    const cash = parseFloat(document.getElementById('checkoutCash').value || 0);
    const change = cash - grandTotal;
    const changeDisplay = document.getElementById('checkoutChangeDisplay');
    changeDisplay.textContent = formatRupiah(change > 0 ? change : 0);
  }

  function executeCheckout() {
    const grandTotal = calculateCartGrandTotal();
    const cash = parseFloat(document.getElementById('checkoutCash').value || 0);

    if (cash < grandTotal) {
      alert('Nominal pembayaran kurang dari total tagihan!');
      return;
    }

    const change = cash - grandTotal;
    const now = new Date();
    const receiptNo = 'INV/AJB/' + Date.now().toString().slice(-6);

    const txItems = state.cart.map(c => ({
      productId: c.product.id,
      name: c.product.name,
      qty: c.qty,
      price: c.product.sellPrice,
      costPrice: c.product.costPrice
    }));

    // Deduct Product Stock
    state.cart.forEach(c => {
      const prod = state.products.find(p => p.id === c.product.id);
      if (prod) {
        prod.stock -= c.qty;
      }
    });
    saveData(STORAGE_KEYS.PRODUCTS);

    const transaction = {
      id: 'tx_' + Date.now(),
      receiptNo: receiptNo,
      timestamp: now.toISOString(),
      dateStr: formatDateIso(now),
      items: txItems,
      subtotal: grandTotal,
      total: grandTotal,
      cash: cash,
      change: change
    };

    state.posTx.unshift(transaction);
    saveData(STORAGE_KEYS.POS_TX);
    API.savePosTransaction(transaction);

    // Reset Cart & Close Modal
    state.cart = [];
    renderCart();
    renderPosProducts();
    closeModal('modalCheckout');

    // Display Printable Receipt
    renderPosReceipt(transaction);
    openModal('modalPosReceipt');
  }

  function renderPosReceipt(tx) {
    const area = document.getElementById('posReceiptArea');
    area.innerHTML = `
      <div class="receipt-header">
        <h2>AJIB STORE</h2>
        <div>Toko Elektronik & Wifi</div>
        <div>Jl. Utama Ajib Store No. 1</div>
        <div>Telp/WA: 0812-3456-7890</div>
      </div>
      <div class="receipt-row">
        <span>No. Nota:</span>
        <span>${tx.receiptNo}</span>
      </div>
      <div class="receipt-row">
        <span>Tanggal:</span>
        <span>${formatDateTimeReadable(tx.timestamp)}</span>
      </div>
      <div class="receipt-divider"></div>
      <table class="receipt-table">
        ${tx.items.map(item => `
          <tr>
            <td colspan="2"><strong>${item.name}</strong></td>
          </tr>
          <tr>
            <td>${item.qty} x ${formatRupiah(item.price)}</td>
            <td style="text-align: right;">${formatRupiah(item.qty * item.price)}</td>
          </tr>
        `).join('')}
      </table>
      <div class="receipt-divider"></div>
      <div class="receipt-totals">
        <div class="receipt-row">
          <span>TOTAL:</span>
          <strong>${formatRupiah(tx.total)}</strong>
        </div>
        <div class="receipt-row">
          <span>TUNAI:</span>
          <span>${formatRupiah(tx.cash)}</span>
        </div>
        <div class="receipt-row">
          <span>KEMBALI:</span>
          <span>${formatRupiah(tx.change)}</span>
        </div>
      </div>
      <div class="receipt-footer">
        <p>Terima kasih telah berbelanja di Ajib Store!</p>
        <p>Barang elektronik bergaransi resmi.</p>
      </div>
    `;
  }

  // ==========================================
  // 6. Rekap Transaksi POS (Daily & Date Range Filter)
  // ==========================================
  function initRekapPos() {
    const todayStr = formatDateIso(new Date());
    document.getElementById('rekapPosStartDate').value = todayStr;
    document.getElementById('rekapPosEndDate').value = todayStr;

    document.getElementById('btnFilterRekapPos').addEventListener('click', renderRekapPos);
    document.getElementById('btnResetFilterRekapPos').addEventListener('click', () => {
      document.getElementById('rekapPosStartDate').value = todayStr;
      document.getElementById('rekapPosEndDate').value = todayStr;
      renderRekapPos();
    });
  }

  function renderRekapPos() {
    const startDate = document.getElementById('rekapPosStartDate').value;
    const endDate = document.getElementById('rekapPosEndDate').value;
    const tbody = document.getElementById('rekapPosTableBody');

    const filtered = state.posTx.filter(t => {
      if (startDate && t.dateStr < startDate) return false;
      if (endDate && t.dateStr > endDate) return false;
      return true;
    });

    const totalOmset = filtered.reduce((sum, t) => sum + t.total, 0);
    const totalCost = filtered.reduce((sum, t) => {
      return sum + t.items.reduce((iSum, item) => iSum + (item.costPrice * item.qty), 0);
    }, 0);
    const totalProfit = totalOmset - totalCost;

    document.getElementById('rekapPosTotalOmset').textContent = formatRupiah(totalOmset);
    document.getElementById('rekapPosTotalProfit').textContent = formatRupiah(totalProfit);
    document.getElementById('rekapPosTotalTx').textContent = filtered.length + ' Transaksi';

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada transaksi POS pada rentang tanggal ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => {
      const itemCount = t.items.reduce((sum, i) => sum + i.qty, 0);
      return `
        <tr>
          <td style="font-family: monospace; color: #38bdf8;">${t.receiptNo}</td>
          <td>${formatDateTimeReadable(t.timestamp)}</td>
          <td>${itemCount} Pcs</td>
          <td style="font-weight: 700; color: #34d399;">${formatRupiah(t.total)}</td>
          <td><span class="badge badge-success">Tunai</span></td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-secondary btn-view-pos-receipt" data-id="${t.id}">
              <i class="fa-solid fa-print"></i> Struk
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-view-pos-receipt').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const tx = state.posTx.find(t => t.id === id);
        if (tx) {
          renderPosReceipt(tx);
          openModal('modalPosReceipt');
        }
      });
    });
  }

  // ==========================================
  // 6B. Manajemen User (Admin Only & User Edit)
  // ==========================================
  function openAddUserModal() {
    const formAdd = document.getElementById('formAddUser');
    if (formAdd) formAdd.reset();
    document.getElementById('userId').value = '';
    const titleEl = document.getElementById('modalUserTitle');
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-user-plus"></i> Tambah Pengguna Baru';
    const btnSave = document.getElementById('btnSaveUser');
    if (btnSave) btnSave.textContent = 'Simpan User';
    openModal('modalUser');
  }

  function openEditUserModal(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('userId').value = user.id;
    document.getElementById('addUserName').value = user.name;
    document.getElementById('addUserUsername').value = user.username;
    document.getElementById('addUserPassword').value = user.password;
    document.getElementById('addUserRole').value = user.role;

    const titleEl = document.getElementById('modalUserTitle');
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit Profil / Pengguna';
    const btnSave = document.getElementById('btnSaveUser');
    if (btnSave) btnSave.textContent = 'Simpan Perubahan';

    openModal('modalUser');
  }

  function initUserManagement() {
    const btnOpenAdd = document.getElementById('btnOpenAddUser');
    if (btnOpenAdd) {
      btnOpenAdd.addEventListener('click', () => {
        openAddUserModal();
      });
    }

    const formAdd = document.getElementById('formAddUser');
    if (formAdd) {
      formAdd.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = document.getElementById('userId').value;
        const name = document.getElementById('addUserName').value.trim();
        const username = document.getElementById('addUserUsername').value.trim();
        const password = document.getElementById('addUserPassword').value.trim();
        const role = document.getElementById('addUserRole').value;

        if (userId) {
          // Edit Mode
          const exists = state.users.some(u => u.id !== userId && u.username.toLowerCase() === username.toLowerCase());
          if (exists) {
            alert(`Username '${username}' sudah digunakan oleh user lain. Gunakan username lain!`);
            return;
          }

          const userIdx = state.users.findIndex(u => u.id === userId);
          if (userIdx !== -1) {
            state.users[userIdx].name = name;
            state.users[userIdx].username = username;
            state.users[userIdx].password = password;
            state.users[userIdx].role = role;

            if (state.currentUser && state.currentUser.id === userId) {
              state.currentUser = { ...state.users[userIdx] };
              saveData(STORAGE_KEYS.AUTH_USER);
              applyUserRolePermissions();
            }

            saveData(STORAGE_KEYS.USERS_LIST);
            API.saveUser(state.users[userIdx]);
            closeModal('modalUser');
            renderUserTable();
            alert(`Data user '${username}' berhasil diperbarui!`);
          }
        } else {
          // Add Mode
          const exists = state.users.some(u => u.username.toLowerCase() === username.toLowerCase());
          if (exists) {
            alert(`Username '${username}' sudah digunakan oleh user lain. Gunakan username lain!`);
            return;
          }

          const newUser = {
            id: 'u_' + Date.now(),
            name: name,
            username: username,
            password: password,
            role: role,
            createdAt: formatDateIso(new Date())
          };

          state.users.push(newUser);
          saveData(STORAGE_KEYS.USERS_LIST);
          API.saveUser(newUser);
          closeModal('modalUser');
          renderUserTable();
          alert(`User baru '${username}' dengan role ${role.toUpperCase()} berhasil ditambahkan!`);
        }
      });
    }
  }

  function renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;

    if (state.users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Belum ada user registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.users.map(u => {
      const isCurrentLoggedIn = state.currentUser && state.currentUser.id === u.id;
      
      return `
        <tr>
          <td style="font-family: monospace; color: #38bdf8;">USER-${u.id.slice(-4)}</td>
          <td style="font-weight: 600;">${u.name} ${isCurrentLoggedIn ? '<span class="badge badge-info">(Anda)</span>' : ''}</td>
          <td style="font-family: monospace;">${u.username}</td>
          <td>
            ${u.role === 'admin' 
              ? `<span class="badge badge-info"><i class="fa-solid fa-user-shield"></i> Admin</span>` 
              : `<span class="badge badge-success"><i class="fa-solid fa-cash-register"></i> Kasir</span>`}
          </td>
          <td>${u.createdAt || '-'}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
              <button class="btn btn-sm btn-primary btn-edit-user" data-id="${u.id}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
              ${isCurrentLoggedIn 
                ? ''
                : `<button class="btn btn-sm btn-danger btn-del-user" data-id="${u.id}"><i class="fa-solid fa-trash"></i> Hapus</button>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-edit-user').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        openEditUserModal(id);
      });
    });

    tbody.querySelectorAll('.btn-del-user').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const user = state.users.find(u => u.id === id);
        if (user) {
          if (confirm(`Yakin ingin menghapus user '${user.username}' (${user.name})?`)) {
            state.users = state.users.filter(u => u.id !== id);
            saveData(STORAGE_KEYS.USERS_LIST);
            API.deleteUser(id);
            renderUserTable();
          }
        }
      });
    });
  }

  // ==========================================
  // 7. Pelanggan Wifi Ajib.Net Management
  // ==========================================
  function initWifiCustomers() {
    document.getElementById('btnOpenAddCustomer').addEventListener('click', () => {
      document.getElementById('formCustomer').reset();
      document.getElementById('custId').value = '';
      document.getElementById('modalCustomerTitle').textContent = 'Tambah Pelanggan Ajib.Net';
      openModal('modalCustomer');
    });

    document.getElementById('formCustomer').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('custId').value || 'c_' + Date.now();
      const name = document.getElementById('custName').value.trim();
      const address = document.getElementById('custAddress').value.trim();
      const bandwidth = document.getElementById('custBandwidth').value;
      const monthlyAmount = parseFloat(document.getElementById('custMonthlyAmount').value);

      const existingIndex = state.customers.findIndex(c => c.id === id);
      const custObj = {
        id, name, address, bandwidth, monthlyAmount,
        createdAt: existingIndex >= 0 ? state.customers[existingIndex].createdAt : formatDateIso(new Date())
      };

      if (existingIndex >= 0) {
        state.customers[existingIndex] = custObj;
      } else {
        state.customers.push(custObj);
      }

      saveData(STORAGE_KEYS.CUSTOMERS);
      API.saveCustomer(custObj);
      closeModal('modalCustomer');
      renderWifiCustomers();
    });

    document.getElementById('searchWifiCustomer').addEventListener('input', renderWifiCustomers);
  }

  function renderWifiCustomers() {
    const search = (document.getElementById('searchWifiCustomer').value || '').toLowerCase();
    const tbody = document.getElementById('wifiCustomerTableBody');

    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const filtered = state.customers.filter(c => {
      return c.name.toLowerCase().includes(search) || 
             c.address.toLowerCase().includes(search) || 
             c.bandwidth.toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Belum ada pelanggan Ajib.Net.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      const isPaidCurrentMonth = state.wifiTx.some(t => t.customerId === c.id && t.periodMonth === currentMonth);
      return `
        <tr>
          <td style="font-family: monospace; color: #10b981;">CUST-${c.id.slice(-4)}</td>
          <td style="font-weight: 600;">${c.name}</td>
          <td>${c.address}</td>
          <td><span class="badge badge-info">${c.bandwidth}</span></td>
          <td style="font-weight: 700; color: #38bdf8;">${formatRupiah(c.monthlyAmount)}</td>
          <td>
            ${isPaidCurrentMonth 
              ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Lunas (${currentMonth})</span>` 
              : `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Belum Bayar</span>`}
          </td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-wifi btn-pay-cust" data-id="${c.id}"><i class="fa-solid fa-wallet"></i> Bayar</button>
            <button class="btn btn-sm btn-secondary btn-edit-cust" data-id="${c.id}"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger btn-del-cust" data-id="${c.id}"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-pay-cust').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        switchTab('bayar-wifi');
        document.getElementById('payWifiCustomerId').value = id;
        triggerCustomerSelectChange();
      });
    });

    tbody.querySelectorAll('.btn-edit-cust').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const c = state.customers.find(item => item.id === id);
        if (c) {
          document.getElementById('custId').value = c.id;
          document.getElementById('custName').value = c.name;
          document.getElementById('custAddress').value = c.address;
          document.getElementById('custBandwidth').value = c.bandwidth;
          document.getElementById('custMonthlyAmount').value = c.monthlyAmount;
          document.getElementById('modalCustomerTitle').textContent = 'Edit Pelanggan Ajib.Net';
          openModal('modalCustomer');
        }
      });
    });

    tbody.querySelectorAll('.btn-del-cust').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        if (confirm('Hapus pelanggan Ajib.Net ini?')) {
          state.customers = state.customers.filter(item => item.id !== id);
          saveData(STORAGE_KEYS.CUSTOMERS);
          API.deleteCustomer(id);
          renderWifiCustomers();
        }
      });
    });
  }

  // ==========================================
  // 8. Bayar Wifi Ajib.Net & Struk
  // ==========================================
  function initBayarWifi() {
    const selectCust = document.getElementById('payWifiCustomerId');
    selectCust.addEventListener('change', triggerCustomerSelectChange);

    // Set default month to current month YYYY-MM
    const today = new Date();
    const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('payWifiMonth').value = defaultMonth;

    document.getElementById('formPayWifi').addEventListener('submit', (e) => {
      e.preventDefault();
      const customerId = selectCust.value;
      const periodMonth = document.getElementById('payWifiMonth').value;
      const amount = parseFloat(document.getElementById('payWifiAmount').value);
      const notes = document.getElementById('payWifiNotes').value || 'Lunas';

      const customer = state.customers.find(c => c.id === customerId);
      if (!customer) {
        alert('Pilih pelanggan terlebih dahulu!');
        return;
      }

      const receiptNo = 'WIFI/AJB/' + Date.now().toString().slice(-6);
      const now = new Date();

      const tx = {
        id: 'tx_wifi_' + Date.now(),
        receiptNo: receiptNo,
        timestamp: now.toISOString(),
        dateStr: formatDateIso(now),
        customerId: customer.id,
        customerName: customer.name,
        address: customer.address,
        bandwidth: customer.bandwidth,
        periodMonth: periodMonth,
        amount: amount,
        notes: notes
      };

      state.wifiTx.unshift(tx);
      saveData(STORAGE_KEYS.WIFI_TX);
      API.saveWifiTransaction(tx);

      // Reset Form & Show Receipt
      document.getElementById('formPayWifi').reset();
      document.getElementById('wifiCustomerDetailCard').style.display = 'none';
      document.getElementById('payWifiMonth').value = defaultMonth;

      renderRecentWifiPayments();
      renderWifiCustomers();

      renderWifiReceipt(tx);
      openModal('modalWifiReceipt');
    });
  }

  function triggerCustomerSelectChange() {
    const selectCust = document.getElementById('payWifiCustomerId');
    const custId = selectCust.value;
    const detailCard = document.getElementById('wifiCustomerDetailCard');
    const c = state.customers.find(item => item.id === custId);

    if (c) {
      detailCard.style.display = 'block';
      document.getElementById('detailCustName').textContent = c.name;
      document.getElementById('detailCustAddress').textContent = c.address;
      document.getElementById('detailCustBw').textContent = c.bandwidth;
      document.getElementById('detailCustNominal').textContent = formatRupiah(c.monthlyAmount);

      document.getElementById('payWifiAmount').value = c.monthlyAmount;
    } else {
      detailCard.style.display = 'none';
    }
  }

  function renderBayarWifiForm() {
    const selectCust = document.getElementById('payWifiCustomerId');
    selectCust.innerHTML = `<option value="">-- Pilih Nama Pelanggan --</option>` +
      state.customers.map(c => `<option value="${c.id}">${c.name} (${c.bandwidth} - ${formatRupiah(c.monthlyAmount)})</option>`).join('');

    renderRecentWifiPayments();
  }

  function renderRecentWifiPayments() {
    const tbody = document.getElementById('recentWifiPayTableBody');
    const recents = state.wifiTx.slice(0, 5);

    if (recents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Belum ada transaksi wifi.</td></tr>`;
      return;
    }

    tbody.innerHTML = recents.map(t => `
      <tr>
        <td style="font-weight: 600;">${t.customerName}</td>
        <td><span class="badge badge-info">${t.periodMonth}</span></td>
        <td style="font-weight: 700; color: #34d399;">${formatRupiah(t.amount)}</td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-secondary btn-print-wifi" data-id="${t.id}">
            <i class="fa-solid fa-print"></i>
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-print-wifi').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const tx = state.wifiTx.find(t => t.id === id);
        if (tx) {
          renderWifiReceipt(tx);
          openModal('modalWifiReceipt');
        }
      });
    });
  }

  function renderWifiReceipt(tx) {
    const area = document.getElementById('wifiReceiptArea');
    area.innerHTML = `
      <div class="receipt-header">
        <h2>AJIB.NET</h2>
        <div>Layanan Wifi & Internet Cepat</div>
        <div>Customer Care: 0812-3456-7890</div>
      </div>
      <div class="receipt-row">
        <span>No. Kuitansi:</span>
        <span>${tx.receiptNo}</span>
      </div>
      <div class="receipt-row">
        <span>Tgl Bayar:</span>
        <span>${formatDateTimeReadable(tx.timestamp)}</span>
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-row">
        <span>Pelanggan:</span>
        <strong>${tx.customerName}</strong>
      </div>
      <div class="receipt-row">
        <span>Paket Wifi:</span>
        <span>${tx.bandwidth}</span>
      </div>
      <div class="receipt-row">
        <span>Periode Bulan:</span>
        <strong>${tx.periodMonth}</strong>
      </div>
      <div class="receipt-divider"></div>
      <div class="receipt-totals">
        <div class="receipt-row">
          <span>TOTAL BAYAR:</span>
          <strong>${formatRupiah(tx.amount)}</strong>
        </div>
        <div class="receipt-row">
          <span>STATUS:</span>
          <strong style="color: #000;">LUNAS</strong>
        </div>
      </div>
      <div class="receipt-footer">
        <p>Terima kasih telah berlangganan Ajib.Net!</p>
        <p>Simpan bukti pembayaran ini sebagai bukti sah.</p>
      </div>
    `;
  }

  // ==========================================
  // 9. Rekap Pembayaran Wifi (Daily & Date Range Filter)
  // ==========================================
  function initRekapWifi() {
    const todayStr = formatDateIso(new Date());
    document.getElementById('rekapWifiStartDate').value = '';
    document.getElementById('rekapWifiEndDate').value = '';

    document.getElementById('btnFilterRekapWifi').addEventListener('click', renderRekapWifi);
    document.getElementById('btnResetFilterRekapWifi').addEventListener('click', () => {
      document.getElementById('rekapWifiStartDate').value = '';
      document.getElementById('rekapWifiEndDate').value = '';
      renderRekapWifi();
    });
  }

  function renderRekapWifi() {
    const startDate = document.getElementById('rekapWifiStartDate').value;
    const endDate = document.getElementById('rekapWifiEndDate').value;
    const tbody = document.getElementById('rekapWifiTableBody');

    const filtered = state.wifiTx.filter(t => {
      if (startDate && t.dateStr < startDate) return false;
      if (endDate && t.dateStr > endDate) return false;
      return true;
    });

    const totalOmset = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);

    document.getElementById('rekapWifiTotalOmset').textContent = formatRupiah(totalOmset);
    document.getElementById('rekapWifiTotalTx').textContent = filtered.length + ' Tagihan';

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada transaksi pembayaran Wifi pada rentang tanggal ini.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td style="font-family: monospace; color: #10b981;">${t.receiptNo}</td>
        <td>${formatDateTimeReadable(t.timestamp)}</td>
        <td style="font-weight: 600;">${t.customerName}</td>
        <td><span class="badge badge-info">${t.bandwidth}</span></td>
        <td><span class="badge badge-success">${t.periodMonth}</span></td>
        <td style="font-weight: 700; color: #34d399;">${formatRupiah(t.amount)}</td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-secondary btn-view-wifi-receipt" data-id="${t.id}">
            <i class="fa-solid fa-print"></i> Struk
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-view-wifi-receipt').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.getAttribute('data-id');
        const tx = state.wifiTx.find(t => t.id === id);
        if (tx) {
          renderWifiReceipt(tx);
          openModal('modalWifiReceipt');
        }
      });
    });
  }

  // ==========================================
  // 10. Application Initialization
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initAuth();
    initNavigation();
    initCategoryManagement();
    renderCategoryDropdowns();
    initProductManagement();
    initPosCashier();
    initRekapPos();
    initUserManagement();
    initWifiCustomers();
    initBayarWifi();
    initRekapWifi();

    // Default Render Dashboard
    renderDashboard();

    // Sync with SQLite backend
    syncWithServer(true);

    // Auto-sync polling every 3.5 seconds
    setInterval(() => {
      syncWithServer(true);
    }, 3500);

    window.addEventListener('focus', () => {
      syncWithServer(true);
    });
  });

})();
