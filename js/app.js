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

  const KASIR_ALLOWED_TABS = ['dashboard', 'kasir-pos', 'rekap-pos', 'bayar-wifi', 'rekap-wifi'];

  const DEFAULT_PRODUCTS = [];

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
    currentUser: null,
    isProcessingCheckout: false
  };

  // ==========================================
  // Modern Toast Notification Helper
  // ==========================================
  function showToast(message, type = 'success', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      alert(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    if (type === 'info') iconClass = 'fa-circle-info';

    toast.innerHTML = `
      <i class="fa-solid ${iconClass} toast-icon"></i>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, duration);
  }

  function showModernAlert(title, message, type = 'info') {
    const titleEl = document.getElementById('modernAlertTitle');
    const msgEl = document.getElementById('modernAlertMessage');
    const iconEl = document.getElementById('modernAlertIcon');
    const iconBox = document.getElementById('modernAlertIconBox');

    if (!titleEl || !msgEl) {
      showToast(`${title}: ${message}`, type === 'error' ? 'error' : 'info');
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;

    if (type === 'error') {
      iconEl.className = 'fa-solid fa-circle-xmark';
      iconEl.style.color = '#ef4444';
      iconBox.style.background = '#fef2f2';
    } else if (type === 'success') {
      iconEl.className = 'fa-solid fa-circle-check';
      iconEl.style.color = '#10b981';
      iconBox.style.background = '#ecfdf5';
    } else if (type === 'warning') {
      iconEl.className = 'fa-solid fa-triangle-exclamation';
      iconEl.style.color = '#f59e0b';
      iconBox.style.background = '#fffbeb';
    } else {
      iconEl.className = 'fa-solid fa-circle-info';
      iconEl.style.color = '#3b82f6';
      iconBox.style.background = '#eff6ff';
    }

    openModal('modalModernAlert');
  }

  function showModernConfirm(title, message, onConfirm) {
    const titleEl = document.getElementById('modernConfirmTitle');
    const msgEl = document.getElementById('modernConfirmMessage');
    const btnYes = document.getElementById('btnModernConfirmYes');

    if (!titleEl || !msgEl || !btnYes) {
      if (confirm(message)) onConfirm();
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;

    const newBtn = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtn, btnYes);

    newBtn.addEventListener('click', () => {
      closeModal('modalModernConfirm');
      if (typeof onConfirm === 'function') onConfirm();
    });

    openModal('modalModernConfirm');
  }

  // ==========================================
  // 1B. API Client for SQLite Synchronization
  // ==========================================
  // ==========================================
  // 1B-2. Firebase Realtime Database Live Sync
  // ==========================================
  const FIREBASE_DB_URL_KEY = 'ajib_store_firebase_db_url_v3';
  const DEFAULT_FIREBASE_DB_URL = 'https://ajibstore-a49eb-default-rtdb.asia-southeast1.firebasedatabase.app';
  let firebaseDbRef = null;
  let isFirebaseSyncActive = false;

  function getFirebaseDbUrl() {
    return localStorage.getItem(FIREBASE_DB_URL_KEY) || DEFAULT_FIREBASE_DB_URL;
  }

  function mergeArraysById(localArr, cloudArr) {
    const listA = Array.isArray(localArr) ? localArr : [];
    const listB = Array.isArray(cloudArr) ? cloudArr : [];

    const map = new Map();
    listA.forEach(item => {
      if (item && item.id) map.set(String(item.id), item);
    });
    listB.forEach(item => {
      if (item && item.id) map.set(String(item.id), item);
    });
    return Array.from(map.values());
  }

  function mergeUniqueCategories(localCats, cloudCats) {
    const listA = Array.isArray(localCats) ? localCats : [];
    const listB = Array.isArray(cloudCats) ? cloudCats : [];
    const set = new Set([...listA, ...listB]);
    return Array.from(set);
  }

  // BroadcastChannel for instant cross-tab sync on same device
  const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ajibstore_broadcast_sync') : null;

  if (syncChannel) {
    syncChannel.onmessage = (e) => {
      if (e.data === 'sync') {
        loadData();
        renderCategoryDropdowns();
        renderTabViews(state.activeTab);
      }
    };
  }

  const CUSTOM_BACKEND_URL_KEY = 'ajib_store_cloud_backend_url_v1';

  function getApiBaseUrl() {
    const custom = localStorage.getItem(CUSTOM_BACKEND_URL_KEY);
    if (custom) return custom.replace(/\/+$/, '');
    return '';
  }

  const API = {
    isServer: window.location.protocol.startsWith('http'),

    async getServerInfo() {
      if (!this.isServer && !getApiBaseUrl()) return null;
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/server-info`);
        return await res.json();
      } catch (e) {
        return null;
      }
    },

    async fetchAll() {
      if (!this.isServer && !getApiBaseUrl()) return null;
      const baseUrl = getApiBaseUrl();
      try {
        const [prods, cats, custs, posTx, wifiTx, users] = await Promise.all([
          fetch(`${baseUrl}/api/products`).then(r => r.json()),
          fetch(`${baseUrl}/api/categories`).then(r => r.json()),
          fetch(`${baseUrl}/api/customers`).then(r => r.json()),
          fetch(`${baseUrl}/api/pos-transactions`).then(r => r.json()),
          fetch(`${baseUrl}/api/wifi-transactions`).then(r => r.json()),
          fetch(`${baseUrl}/api/users`).then(r => r.json())
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
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });
      } catch (e) { console.error('API saveProduct error:', e); }
    },

    async deleteProduct(id) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/products/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteProduct error:', e); }
    },

    async clearAllProducts() {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/products`, { method: 'DELETE' });
      } catch (e) { console.error('API clearAllProducts error:', e); }
    },

    async addCategory(name) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
      } catch (e) { console.error('API addCategory error:', e); }
    },

    async updateCategory(oldName, newName) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/categories`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldName, newName })
        });
      } catch (e) { console.error('API updateCategory error:', e); }
    },

    async deleteCategory(name) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteCategory error:', e); }
    },

    async saveCustomer(customer) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer)
        });
      } catch (e) { console.error('API saveCustomer error:', e); }
    },

    async deleteCustomer(id) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/customers/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteCustomer error:', e); }
    },

    async savePosTransaction(tx) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/pos-transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      } catch (e) { console.error('API savePosTransaction error:', e); }
    },

    async saveWifiTransaction(tx) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/wifi-transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      } catch (e) { console.error('API saveWifiTransaction error:', e); }
    },

    async deletePosTransaction(id) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/pos-transactions/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deletePosTransaction error:', e); }
    },

    async deleteWifiTransaction(id) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/wifi-transactions/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteWifiTransaction error:', e); }
    },

    async updatePosTransaction(tx) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/pos-transactions/${tx.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      } catch (e) { console.error('API updatePosTransaction error:', e); }
    },

    async updateWifiTransaction(tx) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/wifi-transactions/${tx.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      } catch (e) { console.error('API updateWifiTransaction error:', e); }
    },

    async saveUser(user) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        });
      } catch (e) { console.error('API saveUser error:', e); }
    },

    async deleteUser(id) {
      if (!this.isServer && !getApiBaseUrl()) return;
      try {
        await fetch(`${getApiBaseUrl()}/api/users/${id}`, { method: 'DELETE' });
      } catch (e) { console.error('API deleteUser error:', e); }
    }
  };

  const HAS_SEEDED_KEY = 'ajib_store_has_seeded_v1';

  function loadData() {
    const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const hasSeeded = localStorage.getItem(HAS_SEEDED_KEY);

    if (savedProducts !== null) {
      try {
        state.products = JSON.parse(savedProducts);
      } catch (e) {
        state.products = DEFAULT_PRODUCTS;
      }
    } else if (!hasSeeded) {
      state.products = DEFAULT_PRODUCTS;
      localStorage.setItem(HAS_SEEDED_KEY, 'true');
    } else {
      state.products = [];
    }

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

  async function loadDataAndSyncInitial() {
    loadData();

    // Permanently purge any legacy demo products (Tang Krimping, Router Wifi, etc)
    state.products = state.products.filter(p => !['p1','p2','p3','p4','p5','p6','p7'].includes(p.id) && p.barcode !== '899100100203' && p.barcode !== '899100100201');
    saveDataLocally(STORAGE_KEYS.PRODUCTS);

    if (state.products.length === 0) {
      try {
        const res = await fetch('/data.json');
        if (res.ok) {
          const cloud = await res.json();
          if (cloud && cloud.products && cloud.products.length > 0) {
            state.products = cloud.products.filter(p => !['p1','p2','p3','p4','p5','p6','p7'].includes(p.id) && p.barcode !== '899100100203');
            if (cloud.categories) state.categories = cloud.categories;
            saveDataLocally(STORAGE_KEYS.PRODUCTS);
            saveDataLocally(STORAGE_KEYS.CATEGORIES);
            renderCategoryDropdowns();
            renderTabViews(state.activeTab);
          }
        }
      } catch (e) {}
    }
  }  let firebaseErrorMsg = '';

  function initFirebaseRealtimeSync() {
    if (typeof firebase === 'undefined') return;

    const dbUrl = getFirebaseDbUrl();
    if (!dbUrl) return;

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp({
          databaseURL: dbUrl
        });
      }
      firebaseDbRef = firebase.database().ref('ajibstore');
      isFirebaseSyncActive = true;
      firebaseErrorMsg = '';

      // Single Source of Truth: Listen for real-time changes across all devices via Firebase Realtime Cloud
      firebaseDbRef.on('value', (snapshot) => {
        const val = snapshot.val();
        firebaseErrorMsg = '';
        updateServerConnectionStatus();

        if (val) {
          state.products = Array.isArray(val.products) ? val.products : [];
          state.categories = Array.isArray(val.categories) ? val.categories : [];
          state.customers = Array.isArray(val.customers) ? val.customers : [];
          state.posTx = Array.isArray(val.posTx) ? val.posTx : [];
          state.wifiTx = Array.isArray(val.wifiTx) ? val.wifiTx : [];
          state.users = Array.isArray(val.users) ? val.users : [];

          saveDataLocally(STORAGE_KEYS.PRODUCTS);
          saveDataLocally(STORAGE_KEYS.CATEGORIES);
          saveDataLocally(STORAGE_KEYS.CUSTOMERS);
          saveDataLocally(STORAGE_KEYS.POS_TX);
          saveDataLocally(STORAGE_KEYS.WIFI_TX);
          saveDataLocally(STORAGE_KEYS.USERS_LIST);

          renderCategoryDropdowns();
          renderTabViews(state.activeTab);
        } else {
          // Push initial data if cloud database is completely empty
          pushToFirebase();
        }
      }, (err) => {
        console.error('Firebase sync error:', err);
        isFirebaseSyncActive = false;
        firebaseErrorMsg = err.message || 'Permission Denied / Rules Firebase Terkunci';
        updateServerConnectionStatus();
      });
    } catch (e) {
      console.warn('Firebase sync error:', e);
      isFirebaseSyncActive = false;
      firebaseErrorMsg = e.message;
      updateServerConnectionStatus();
    }
  }

  function pushToFirebase() {
    if (firebaseDbRef && isFirebaseSyncActive) {
      try {
        firebaseDbRef.set({
          products: state.products || [],
          categories: state.categories || [],
          customers: state.customers || [],
          posTx: state.posTx || [],
          wifiTx: state.wifiTx || [],
          users: state.users || []
        });
      } catch (e) {
        console.error('Firebase push error:', e);
      }
    }
  }

  let serverInfoData = null;

  async function updateServerConnectionStatus() {
    const badge = document.getElementById('connectionStatusBadge');
    const textEl = document.getElementById('syncStatusText');
    if (!badge || !textEl) return;

    if (isFirebaseSyncActive && !firebaseErrorMsg) {
      badge.className = 'connection-status-widget connected';
      textEl.textContent = 'Firebase Cloud';
      serverInfoData = { isFirebase: true };
      return;
    }

    if (firebaseErrorMsg) {
      badge.className = 'connection-status-widget offline';
      textEl.textContent = 'Firebase Terkunci';
      serverInfoData = { isFirebase: false, error: firebaseErrorMsg };
      return;
    }

    if (window.location.hostname.endsWith('.vercel.app') || window.location.hostname.endsWith('.github.io')) {
      badge.className = 'connection-status-widget connected';
      textEl.textContent = 'Vercel Online';
      serverInfoData = { isVercel: true };
    } else {
      badge.className = 'connection-status-widget offline';
      textEl.textContent = 'Terputus';
      serverInfoData = { isServer: false };
    }
  }

  function showServerInfoModal() {
    const content = document.getElementById('serverInfoModalContent');
    if (!content) return;

    const currentFirebaseUrl = getFirebaseDbUrl();

    let statusHeader = '';
    if (isFirebaseSyncActive && !firebaseErrorMsg) {
      statusHeader = `
        <div style="display: flex; align-items: center; gap: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px;">
          <i class="fa-solid fa-cloud-arrow-up" style="color: #059669; font-size: 1.5rem;"></i>
          <div>
            <div style="font-weight: 700; color: #065f46;">Firebase Realtime Cloud Database Aktif!</div>
            <div style="font-size: 0.8rem; color: #047857;">Situs tersambung ke Firebase Cloud. Seluruh data barang & transaksi tersinkronisasi otomatis secara real-time di semua HP & Laptop!</div>
          </div>
        </div>
      `;
    } else {
      statusHeader = `
        <div style="display: flex; align-items: center; gap: 12px; background: #fef2f2; border: 1px solid #fecaca; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px;">
          <i class="fa-solid fa-triangle-exclamation" style="color: #dc2626; font-size: 1.5rem;"></i>
          <div>
            <div style="font-weight: 700; color: #991b1b;">Firebase Cloud Belum Tersambung / Terkunci!</div>
            <div style="font-size: 0.8rem; color: #b91c1c;">${firebaseErrorMsg || 'Rules Firebase Realtime Database perlu diatur ke .read: true, .write: true.'}</div>
          </div>
        </div>
      `;
    }

    content.innerHTML = `
      ${statusHeader}

      <div class="form-group" style="margin-bottom: 14px;">
        <label class="form-label" style="font-size: 0.85rem; font-weight: 700;">URL Firebase Realtime Database Anda</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="inputFirebaseDbUrl" class="form-control" placeholder="https://xxx.asia-southeast1.firebasedatabase.app" value="${currentFirebaseUrl}">
          <button type="button" class="btn btn-primary" id="btnSaveFirebaseDbUrl" style="flex-shrink: 0;">Simpan URL</button>
        </div>
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
          Di Firebase Console ➔ <strong>Realtime Database</strong> ➔ <strong>Rules</strong>, pastikan rules bernilai <code>".read": true, ".write": true</code>
        </div>
      </div>

      <hr style="margin: 16px 0; border: none; border-top: 1px dashed #cbd5e1;">

      <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: #1e293b;">Transfer Instant Data HP & Laptop (1-Klik):</h4>
      <p style="font-size: 0.82rem; color: #475569; margin-bottom: 10px;">
        Salin kode data dari HP/Laptop Anda dan tempel di perangkat lain untuk memindahkan stok & transaksi secara instan:
      </p>

      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
        <button type="button" class="btn btn-secondary" id="btnExportSyncToken" style="flex: 1;">
          <i class="fa-solid fa-copy"></i> Salin Data Perangkat Ini
        </button>
        <button type="button" class="btn btn-primary" id="btnForceUploadCloud" style="flex: 1; background: #0284c7;">
          <i class="fa-solid fa-cloud-arrow-up"></i> Upload Ke Cloud
        </button>
      </div>

      <div class="form-group" style="margin-bottom: 8px;">
        <input type="text" id="inputImportSyncToken" class="form-control" placeholder="Tempel kode sync di sini...">
      </div>
      <button type="button" class="btn btn-primary" id="btnImportSyncToken" style="width: 100%;">
        <i class="fa-solid fa-download"></i> Terapkan Data ke Perangkat Ini
      </button>
    `;

    // Attach Save Firebase URL Button Handler
    const btnSaveFirebase = document.getElementById('btnSaveFirebaseDbUrl');
    if (btnSaveFirebase) {
      btnSaveFirebase.addEventListener('click', () => {
        const url = document.getElementById('inputFirebaseDbUrl').value.trim();
        if (url) {
          localStorage.setItem(FIREBASE_DB_URL_KEY, url);
          alert('URL Firebase Database disimpan! Aplikasi akan mencoba tersambung...');
          location.reload();
        } else {
          localStorage.removeItem(FIREBASE_DB_URL_KEY);
          alert('URL Firebase direset ke default.');
          location.reload();
        }
      });
    }

    // Attach Force Upload Cloud Button Handler
    const btnForceUpload = document.getElementById('btnForceUploadCloud');
    if (btnForceUpload) {
      btnForceUpload.addEventListener('click', () => {
        pushToFirebase();
        alert('Data dari perangkat ini telah diunggah ke Firebase Cloud Database!');
      });
    }

    // Attach Export Sync Token Handler
    const btnExport = document.getElementById('btnExportSyncToken');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const payload = {
          products: state.products,
          categories: state.categories,
          customers: state.customers,
          posTx: state.posTx,
          wifiTx: state.wifiTx,
          users: state.users,
          v: 1
        };
        const token = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        navigator.clipboard.writeText(token).then(() => {
          alert('Kode data sinkronisasi laptop berhasil disalin ke clipboard! Kirim kode ini ke WA/Chat HP Anda, lalu tempel pada HP.');
        }).catch(() => {
          prompt('Salin Kode Sync berikut dan tempelkan di HP:', token);
        });
      });
    }

    // Attach Import Sync Token Handler
    const btnImport = document.getElementById('btnImportSyncToken');
    if (btnImport) {
      btnImport.addEventListener('click', () => {
        const input = document.getElementById('inputImportSyncToken').value.trim();
        if (!input) {
          alert('Masukkan atau tempel kode data sync terlebih dahulu!');
          return;
        }
        try {
          const jsonStr = decodeURIComponent(escape(atob(input)));
          const payload = JSON.parse(jsonStr);

          if (payload && payload.products) {
            state.products = payload.products;
            if (payload.categories) state.categories = payload.categories;
            if (payload.customers) state.customers = payload.customers;
            if (payload.posTx) state.posTx = payload.posTx;
            if (payload.wifiTx) state.wifiTx = payload.wifiTx;
            if (payload.users) state.users = payload.users;

            saveData(STORAGE_KEYS.PRODUCTS);
            saveData(STORAGE_KEYS.CATEGORIES);
            saveData(STORAGE_KEYS.CUSTOMERS);
            saveData(STORAGE_KEYS.POS_TX);
            saveData(STORAGE_KEYS.WIFI_TX);
            saveData(STORAGE_KEYS.USERS_LIST);

            renderCategoryDropdowns();
            renderTabViews(state.activeTab);
            closeModal('modalServerInfo');
            alert('SELAMAT! Data barang di HP ini telah berhasil disinkronkan 100% sama dengan laptop!');
          } else {
            alert('Format kode sync tidak valid.');
          }
        } catch (e) {
          alert('Gagal mengimpor kode sync! Pastikan kode disalin secara utuh.');
        }
      });
    }

    // Attach Save Cloud URL Button Handler
    const btnSave = document.getElementById('btnSaveCloudUrl');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const val = document.getElementById('inputCloudBackendUrl').value.trim();
        if (val) {
          localStorage.setItem(CUSTOM_BACKEND_URL_KEY, val);
          alert('URL Cloud Server berhasil disimpan! Aplikasi akan mencoba tersambung...');
          closeModal('modalServerInfo');
          await updateServerConnectionStatus();
          await syncWithServer(true);
        } else {
          localStorage.removeItem(CUSTOM_BACKEND_URL_KEY);
          alert('URL Cloud Backend direset ke default.');
          closeModal('modalServerInfo');
          await updateServerConnectionStatus();
        }
      });
    }

    openModal('modalServerInfo');
  }

  async function syncWithServer(renderAfter = true) {
    if (typeof pullFromVercelSync === 'function') {
      await pullFromVercelSync(renderAfter);
    }
    const data = await API.fetchAll();
    if (data) {
      let changed = false;
      if (data.products && JSON.stringify(state.products) !== JSON.stringify(data.products)) { state.products = data.products; changed = true; }
      if (data.categories && JSON.stringify(state.categories) !== JSON.stringify(data.categories)) { state.categories = data.categories; changed = true; }
      if (data.customers && JSON.stringify(state.customers) !== JSON.stringify(data.customers)) { state.customers = data.customers; changed = true; }
      if (data.posTx && JSON.stringify(state.posTx) !== JSON.stringify(data.posTx)) { state.posTx = data.posTx; changed = true; }
      if (data.wifiTx && JSON.stringify(state.wifiTx) !== JSON.stringify(data.wifiTx)) { state.wifiTx = data.wifiTx; changed = true; }
      if (data.users && JSON.stringify(state.users) !== JSON.stringify(data.users)) { state.users = data.users; changed = true; }

      if (changed) {
        saveDataLocally(STORAGE_KEYS.PRODUCTS);
        saveDataLocally(STORAGE_KEYS.CATEGORIES);
        saveDataLocally(STORAGE_KEYS.CUSTOMERS);
        saveDataLocally(STORAGE_KEYS.POS_TX);
        saveDataLocally(STORAGE_KEYS.WIFI_TX);
        saveDataLocally(STORAGE_KEYS.USERS_LIST);

        if (renderAfter) {
          renderCategoryDropdowns();
          renderTabViews(state.activeTab);
        }
      }
    }
  }

  function notifyBroadcastSync() {
    if (typeof syncChannel !== 'undefined' && syncChannel) {
      try {
        syncChannel.postMessage('sync');
      } catch (e) {}
    }
  }

  function saveData(key) {
    saveDataLocally(key);
    pushToFirebase();
    notifyBroadcastSync();
  }

  function saveDataLocally(key) {
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
        showToast('Username atau password yang Anda masukkan tidak sesuai!', 'error');
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
      showModernConfirm(
        'Keluar Aplikasi',
        'Apakah Anda yakin ingin keluar/logout dari aplikasi Ajib Store?',
        () => {
          state.currentUser = null;
          localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
          loginScreen.classList.remove('hidden');
          showToast('Anda telah berhasil keluar/logout.', 'info');
        }
      );
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

  function checkKasirGuard() {
    if (state.currentUser && state.currentUser.role === 'kasir') {
      showToast('Akses Ditolak! Kasir tidak memiliki hak akses untuk edit/hapus data.', 'error');
      return true;
    }
    return false;
  }

  function deletePosTx(id) {
    if (checkKasirGuard()) return;
    const tx = state.posTx.find(t => String(t.id) === String(id));
    if (!tx) return;
    showModernConfirm(
      'Hapus Transaksi POS',
      `Apakah Anda yakin ingin menghapus transaksi toko (No. Nota: ${tx.receiptNo})?`,
      () => {
        state.posTx = state.posTx.filter(t => String(t.id) !== String(id));
        saveData(STORAGE_KEYS.POS_TX);
        API.deletePosTransaction(id);
        renderDashboard();
        if (state.activeTab === 'rekap-pos') renderRekapPos();
        showToast(`Transaksi POS ${tx.receiptNo} berhasil dihapus`, 'success');
      }
    );
  }

  function deleteWifiTx(id) {
    if (checkKasirGuard()) return;
    const tx = state.wifiTx.find(t => String(t.id) === String(id));
    if (!tx) return;
    showModernConfirm(
      'Hapus Pembayaran Wifi',
      `Apakah Anda yakin ingin menghapus pembayaran Wifi pelanggan "${tx.customerName}" (Periode ${tx.periodMonth})?`,
      () => {
        state.wifiTx = state.wifiTx.filter(t => String(t.id) !== String(id));
        saveData(STORAGE_KEYS.WIFI_TX);
        API.deleteWifiTransaction(id);
        renderDashboard();
        if (state.activeTab === 'rekap-wifi') renderRekapWifi();
        if (state.activeTab === 'pelanggan-wifi') renderWifiCustomers();
        if (state.activeTab === 'bayar-wifi') renderRecentWifiPayments();
        showToast(`Pembayaran Wifi "${tx.customerName}" berhasil dihapus`, 'success');
      }
    );
  }

  function openEditPosTxModal(id) {
    if (checkKasirGuard()) return;
    const tx = state.posTx.find(t => String(t.id) === String(id));
    if (!tx) return;

    document.getElementById('editPosTxId').value = tx.id;
    document.getElementById('editPosTxReceiptNo').value = tx.receiptNo;
    document.getElementById('editPosTxTotal').value = tx.total;
    document.getElementById('editPosTxCash').value = tx.cash;
    document.getElementById('editPosTxChange').value = tx.change || Math.max(0, tx.cash - tx.total);

    openModal('modalEditPosTx');
  }

  function initEditPosTx() {
    const form = document.getElementById('formEditPosTx');
    if (!form) return;

    const totalInput = document.getElementById('editPosTxTotal');
    const cashInput = document.getElementById('editPosTxCash');
    const changeInput = document.getElementById('editPosTxChange');

    const updateChange = () => {
      const tot = parseFloat(totalInput.value || 0);
      const csh = parseFloat(cashInput.value || 0);
      changeInput.value = Math.max(0, csh - tot);
    };

    totalInput.addEventListener('input', updateChange);
    cashInput.addEventListener('input', updateChange);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('editPosTxId').value;
      const total = parseFloat(totalInput.value);
      const cash = parseFloat(cashInput.value);
      const change = Math.max(0, cash - total);

      const idx = state.posTx.findIndex(t => String(t.id) === String(id));
      if (idx !== -1) {
        state.posTx[idx].total = total;
        state.posTx[idx].cash = cash;
        state.posTx[idx].change = change;
        state.posTx[idx].subtotal = total;

        saveData(STORAGE_KEYS.POS_TX);
        API.updatePosTransaction(state.posTx[idx]);

        closeModal('modalEditPosTx');
        renderDashboard();
        if (state.activeTab === 'rekap-pos') renderRekapPos();
        showToast(`Transaksi POS ${state.posTx[idx].receiptNo} berhasil diperbarui!`, 'success');
      }
    });
  }

  function openEditWifiTxModal(id) {
    if (checkKasirGuard()) return;
    const tx = state.wifiTx.find(t => String(t.id) === String(id));
    if (!tx) return;

    const selectCust = document.getElementById('editWifiTxCustomerId');
    selectCust.innerHTML = state.customers.map(c => `<option value="${c.id}">${c.name} (${c.bandwidth})</option>`).join('');
    selectCust.value = tx.customerId || (state.customers[0] ? state.customers[0].id : '');

    document.getElementById('editWifiTxId').value = tx.id;
    document.getElementById('editWifiTxMonth').value = tx.periodMonth || '';
    document.getElementById('editWifiTxAmount').value = tx.amount || 0;
    document.getElementById('editWifiTxNotes').value = tx.notes || '';

    openModal('modalEditWifiTx');
  }

  function initEditWifiTx() {
    const form = document.getElementById('formEditWifiTx');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('editWifiTxId').value;
      const customerId = document.getElementById('editWifiTxCustomerId').value;
      const periodMonth = document.getElementById('editWifiTxMonth').value;
      const amount = parseFloat(document.getElementById('editWifiTxAmount').value);
      const notes = document.getElementById('editWifiTxNotes').value || 'Lunas';

      const customer = state.customers.find(c => String(c.id) === String(customerId));

      const idx = state.wifiTx.findIndex(t => String(t.id) === String(id));
      if (idx !== -1) {
        state.wifiTx[idx].customerId = customer ? customer.id : customerId;
        state.wifiTx[idx].customerName = customer ? customer.name : state.wifiTx[idx].customerName;
        state.wifiTx[idx].bandwidth = customer ? customer.bandwidth : state.wifiTx[idx].bandwidth;
        state.wifiTx[idx].address = customer ? customer.address : state.wifiTx[idx].address;
        state.wifiTx[idx].periodMonth = periodMonth;
        state.wifiTx[idx].amount = amount;
        state.wifiTx[idx].notes = notes;

        saveData(STORAGE_KEYS.WIFI_TX);
        API.updateWifiTransaction(state.wifiTx[idx]);

        closeModal('modalEditWifiTx');
        renderDashboard();
        if (state.activeTab === 'rekap-wifi') renderRekapWifi();
        if (state.activeTab === 'pelanggan-wifi') renderWifiCustomers();
        if (state.activeTab === 'bayar-wifi') renderRecentWifiPayments();
        showToast(`Transaksi Wifi pelanggan "${state.wifiTx[idx].customerName}" berhasil diperbarui!`, 'success');
      }
    });
  }

  function renderDashboardRecentTx() {
    const tbody = document.getElementById('dashRecentTxTableBody');
    if (!tbody) return;

    // Attach event delegation once if not already attached
    if (!tbody.hasAttribute('data-delegated')) {
      tbody.setAttribute('data-delegated', 'true');
      tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-dash-tx');
        const printBtn = e.target.closest('.btn-print-dash-tx');
        const delBtn = e.target.closest('.btn-del-dash-tx');

        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          const type = editBtn.getAttribute('data-type');
          if (type === 'pos') {
            openEditPosTxModal(id);
          } else {
            openEditWifiTxModal(id);
          }
        }

        if (printBtn) {
          const id = printBtn.getAttribute('data-id');
          const type = printBtn.getAttribute('data-type');
          if (type === 'pos') {
            const tx = state.posTx.find(t => String(t.id) === String(id));
            if (tx) { renderPosReceipt(tx); openModal('modalPosReceipt'); }
          } else {
            const tx = state.wifiTx.find(t => String(t.id) === String(id));
            if (tx) { renderWifiReceipt(tx); openModal('modalWifiReceipt'); }
          }
        }

        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          const type = delBtn.getAttribute('data-type');
          if (type === 'pos') {
            deletePosTx(id);
          } else {
            deleteWifiTx(id);
          }
        }
      });
    }

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
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 25px;">Belum ada riwayat transaksi.</td></tr>`;
      return;
    }

    const isKasir = state.currentUser && state.currentUser.role === 'kasir';

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
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 4px;">
            ${isKasir ? '' : `
            <button class="btn btn-sm btn-primary btn-edit-dash-tx" data-id="${t.id}" data-type="${t.type}" title="Edit Transaksi">
              <i class="fa-solid fa-pen"></i>
            </button>`}
            <button class="btn btn-sm btn-secondary btn-print-dash-tx" data-id="${t.id}" data-type="${t.type}" title="Cetak Struk">
              <i class="fa-solid fa-print"></i>
            </button>
            ${isKasir ? '' : `
            <button class="btn btn-sm btn-danger btn-del-dash-tx" data-id="${t.id}" data-type="${t.type}" title="Hapus Transaksi">
              <i class="fa-solid fa-trash"></i>
            </button>`}
          </div>
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

      // Purge any remaining demo items
      state.products = state.products.filter(p => !['p1','p2','p3','p4','p5','p6','p7'].includes(p.id) && p.barcode !== '899100100203');

      // Close modal IMMEDIATELY first
      closeModal('modalProduct');

      saveData(STORAGE_KEYS.PRODUCTS);
      try { API.saveProduct(productObj); } catch (e) {}

      renderProductTable();
      renderPosProducts();
    });

    document.getElementById('searchProductInput').addEventListener('input', renderProductTable);
    document.getElementById('filterProductCategory').addEventListener('change', renderProductTable);

    // Event Delegation for Edit & Delete buttons on productTableBody
    const tbody = document.getElementById('productTableBody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-prod');
        const delBtn = e.target.closest('.btn-del-prod');

        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          const prod = state.products.find(p => String(p.id) === String(id));
          if (prod) {
            renderCategoryDropdowns();
            const prodCategoryEl = document.getElementById('prodCategory');
            if (prodCategoryEl && prod.category && !state.categories.includes(prod.category)) {
              const opt = document.createElement('option');
              opt.value = prod.category;
              opt.textContent = prod.category;
              prodCategoryEl.appendChild(opt);
            }
            document.getElementById('prodId').value = prod.id || '';
            document.getElementById('prodBarcode').value = prod.barcode || '';
            document.getElementById('prodName').value = prod.name || '';
            if (prodCategoryEl) prodCategoryEl.value = prod.category || '';
            document.getElementById('prodCostPrice').value = prod.costPrice || 0;
            document.getElementById('prodSellPrice').value = prod.sellPrice || 0;
            document.getElementById('prodStock').value = prod.stock || 0;
            document.getElementById('modalProductTitle').textContent = 'Edit Barang';
            if (window.setProductImageHelper) {
              window.setProductImageHelper(prod.image || '');
            }
            openModal('modalProduct');
          }
        }

        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          const prod = state.products.find(p => String(p.id) === String(id));
          const prodName = prod ? prod.name : 'barang ini';

          showModernConfirm(
            'Hapus Barang',
            `Yakin ingin menghapus "${prodName}" dari stok barang?`,
            async () => {
              state.products = state.products.filter(p => String(p.id) !== String(id));
              saveData(STORAGE_KEYS.PRODUCTS);
              renderProductTable();
              renderPosProducts();
              showToast(`Barang "${prodName}" berhasil dihapus`, 'success');
              try { await API.deleteProduct(id); } catch (err) {}
            }
          );
        }
      });
    }

    // Edit Product Click Handler Helper
    window.setProductImageHelper = setProdImagePreview;
  }

  function renderProductTable() {
    const searchInput = document.getElementById('searchProductInput');
    const catFilterInput = document.getElementById('filterProductCategory');
    const search = searchInput ? (searchInput.value || '').toLowerCase() : '';
    const catFilter = catFilterInput ? catFilterInput.value : '';
    const tbody = document.getElementById('productTableBody');
    if (!tbody) return;

    const filtered = state.products.filter(p => {
      const pName = (p.name || '').toLowerCase();
      const pBarcode = (p.barcode || '').toLowerCase();
      const matchSearch = pName.includes(search) || pBarcode.includes(search);
      const matchCat = !catFilter || p.category === catFilter;
      return matchSearch && matchCat;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada data barang ditemukan.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td style="font-family: monospace; color: var(--accent-pos); font-weight: 600;">${p.barcode || '-'}</td>
        <td style="font-weight: 600;">${p.name || '-'}</td>
        <td><span class="badge badge-info">${p.category || '-'}</span></td>
        <td>${formatRupiah(p.costPrice || 0)}</td>
        <td style="font-weight: 700; color: var(--accent-wifi);">${formatRupiah(p.sellPrice || 0)}</td>
        <td style="font-weight: 700;">${p.stock !== undefined ? p.stock : 0}</td>
        <td>
          ${(p.stock || 0) <= 5 
            ? `<span class="badge badge-danger">Menipis</span>` 
            : `<span class="badge badge-success">Tersedia</span>`}
        </td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-secondary btn-edit-prod" data-id="${p.id}" title="Edit Barang"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn btn-sm btn-danger btn-del-prod" data-id="${p.id}" title="Hapus Barang"><i class="fa-solid fa-trash"></i> Hapus</button>
        </td>
      </tr>
    `).join('');
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
        showToast('Keranjang belanja masih kosong!', 'warning');
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
    const cashInput = document.getElementById('checkoutCash');
    if (cashInput) cashInput.addEventListener('input', updateCheckoutChange);

    // Confirm Checkout Process
    const btnConfirmCheckout = document.getElementById('btnConfirmCheckout');
    if (btnConfirmCheckout) {
      btnConfirmCheckout.addEventListener('click', executeCheckout);
    }
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
    if (state.isProcessingCheckout) return;
    state.isProcessingCheckout = true;

    try {
      if (!state.cart || state.cart.length === 0) {
        showToast('Keranjang belanja kosong!', 'warning');
        state.isProcessingCheckout = false;
        return;
      }

      const grandTotal = calculateCartGrandTotal();
      const cashInput = document.getElementById('checkoutCash');
      const cash = parseFloat(cashInput ? cashInput.value : 0) || 0;

      if (cash < grandTotal) {
        showToast('Nominal pembayaran kurang dari total tagihan!', 'error');
        state.isProcessingCheckout = false;
        return;
      }

      const change = cash - grandTotal;
      const now = new Date();
      const receiptNo = 'INV/AJB/' + Date.now().toString().slice(-6);

      const txItems = state.cart.map(c => {
        const prod = c && c.product ? c.product : {};
        return {
          productId: prod.id || ('prod_' + Date.now()),
          name: prod.name || 'Barang',
          qty: c ? (c.qty || 1) : 1,
          price: parseFloat(prod.sellPrice || 0) || 0,
          costPrice: parseFloat(prod.costPrice || 0) || 0
        };
      });

      // 1. Deduct Product Stock ONCE & Push Sync to Firebase Cloud
      state.cart.forEach(c => {
        if (!c || !c.product) return;
        const prodId = c.product.id || c.product;
        const prod = state.products.find(p => p.id === prodId);
        if (prod) {
          const currentStock = parseInt(prod.stock, 10) || 0;
          prod.stock = Math.max(0, currentStock - (c.qty || 1));
        }
      });
      saveData(STORAGE_KEYS.PRODUCTS);

      // 2. Save POS Transaction to Firebase Cloud
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

      if (!Array.isArray(state.posTx)) state.posTx = [];
      state.posTx.unshift(transaction);
      saveData(STORAGE_KEYS.POS_TX);

      try {
        API.savePosTransaction(transaction);
      } catch (apiErr) {
        console.warn('API.savePosTransaction warning:', apiErr);
      }

      // 3. Render Receipt Paper
      try {
        renderPosReceipt(transaction);
      } catch (receiptErr) {
        console.error('renderPosReceipt error:', receiptErr);
      }

      // 4. Reset Cart, Refresh Product Grid (Stok Berkurang) & Open Receipt Modal
      state.cart = [];
      if (cashInput) cashInput.value = '';
      renderCart();
      renderPosProducts();
      closeModal('modalCheckout');
      openModal('modalPosReceipt');

      showToast(`Pembayaran ${formatRupiah(grandTotal)} berhasil! Kembalian: ${formatRupiah(change)}`, 'success', 4000);
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Gagal memproses pembayaran: ' + (err.message || err), 'error', 5000);
    } finally {
      setTimeout(() => {
        state.isProcessingCheckout = false;
      }, 500);
    }
  }

  // Expose global handlers for fail-proof inline onclick execution
  window.appExecuteCheckout = executeCheckout;
  window.updateCheckoutChange = updateCheckoutChange;

  function triggerPrint() {
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print error:', err);
      }
    }, 100);
  }
  window.triggerPrint = triggerPrint;

  function renderPosReceipt(tx) {
    const area = document.getElementById('posReceiptArea');
    area.innerHTML = `
      <div class="receipt-header">
        <h2>AJIB STORE</h2>
        <div>Jl. Al Hidayah No. 27 Dsn. Pagotan Desa Keplaksari Kec. Peterongan Jombang</div>
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

    // Attach event delegation once if not already attached
    if (!tbody.hasAttribute('data-delegated')) {
      tbody.setAttribute('data-delegated', 'true');
      tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-pos-tx');
        const printBtn = e.target.closest('.btn-view-pos-receipt');
        const delBtn = e.target.closest('.btn-del-pos-tx');

        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          openEditPosTxModal(id);
        }

        if (printBtn) {
          const id = printBtn.getAttribute('data-id');
          const tx = state.posTx.find(t => String(t.id) === String(id));
          if (tx) {
            renderPosReceipt(tx);
            openModal('modalPosReceipt');
          }
        }

        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          deletePosTx(id);
        }
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada transaksi pada rentang tanggal ini.</td></tr>`;
      return;
    }

    const isKasir = state.currentUser && state.currentUser.role === 'kasir';

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
            <div style="display: inline-flex; gap: 6px;">
              ${isKasir ? '' : `
              <button class="btn btn-sm btn-primary btn-edit-pos-tx" data-id="${t.id}" title="Edit Transaksi">
                <i class="fa-solid fa-pen"></i> Edit
              </button>`}
              <button class="btn btn-sm btn-secondary btn-view-pos-receipt" data-id="${t.id}" title="Lihat/Cetak Struk">
                <i class="fa-solid fa-print"></i> Struk
              </button>
              ${isKasir ? '' : `
              <button class="btn btn-sm btn-danger btn-del-pos-tx" data-id="${t.id}" title="Hapus Transaksi">
                <i class="fa-solid fa-trash"></i> Hapus
              </button>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');
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

    // Attach event delegation once if not already attached
    if (!tbody.hasAttribute('data-delegated')) {
      tbody.setAttribute('data-delegated', 'true');
      tbody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-wifi-tx');
        const printBtn = e.target.closest('.btn-view-wifi-receipt');
        const delBtn = e.target.closest('.btn-del-wifi-tx');

        if (editBtn) {
          const id = editBtn.getAttribute('data-id');
          openEditWifiTxModal(id);
        }

        if (printBtn) {
          const id = printBtn.getAttribute('data-id');
          const tx = state.wifiTx.find(t => String(t.id) === String(id));
          if (tx) {
            renderWifiReceipt(tx);
            openModal('modalWifiReceipt');
          }
        }

        if (delBtn) {
          const id = delBtn.getAttribute('data-id');
          deleteWifiTx(id);
        }
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">Tidak ada transaksi pembayaran Wifi pada rentang tanggal ini.</td></tr>`;
      return;
    }

    const isKasir = state.currentUser && state.currentUser.role === 'kasir';

    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td style="font-family: monospace; color: #10b981;">${t.receiptNo}</td>
        <td>${formatDateTimeReadable(t.timestamp)}</td>
        <td style="font-weight: 600;">${t.customerName}</td>
        <td><span class="badge badge-info">${t.bandwidth}</span></td>
        <td><span class="badge badge-success">${t.periodMonth}</span></td>
        <td style="font-weight: 700; color: #34d399;">${formatRupiah(t.amount)}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            ${isKasir ? '' : `
            <button class="btn btn-sm btn-primary btn-edit-wifi-tx" data-id="${t.id}" title="Edit Transaksi">
              <i class="fa-solid fa-pen"></i> Edit
            </button>`}
            <button class="btn btn-sm btn-secondary btn-view-wifi-receipt" data-id="${t.id}" title="Lihat/Cetak Struk">
              <i class="fa-solid fa-print"></i> Struk
            </button>
            ${isKasir ? '' : `
            <button class="btn btn-sm btn-danger btn-del-wifi-tx" data-id="${t.id}" title="Hapus Transaksi">
              <i class="fa-solid fa-trash"></i> Hapus
            </button>`}
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================
  // 10. Application Initialization
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    loadDataAndSyncInitial();
    initAuth();
    initNavigation();
    initCategoryManagement();
    renderCategoryDropdowns();
    initProductManagement();
    initPosCashier();
    initRekapPos();
    initEditPosTx();
    initUserManagement();
    initWifiCustomers();
    initBayarWifi();
    initRekapWifi();
    initEditWifiTx();

    // Default Render Dashboard
    renderDashboard();

    // Initialize Firebase Realtime Cloud Sync for Vercel
    initFirebaseRealtimeSync();

    // Connection status & info modal trigger
    const syncBadge = document.getElementById('connectionStatusBadge');
    if (syncBadge) {
      syncBadge.addEventListener('click', showServerInfoModal);
    }
    updateServerConnectionStatus();

    // Sync with SQLite backend & Broadcast Channel
    syncWithServer(true);

    // Fast Auto-sync polling every 1.5 seconds for instant multi-device sync
    setInterval(() => {
      syncWithServer(true);
      updateServerConnectionStatus();
    }, 1500);

    window.addEventListener('focus', () => {
      syncWithServer(true);
      updateServerConnectionStatus();
    });
  });

})();
