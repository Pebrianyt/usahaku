/**
 * router/index.js - Konfigurasi routing aplikasi UsahaKu
 * 
 * File ini berisi definisi semua route aplikasi termasuk:
 * - Route publik (login)
 * - Route yang memerlukan autentikasi
 * - Route khusus admin/owner
 * - Redirect dari path legacy .html
 * - Route catch-all untuk halaman tidak ditemukan
 * 
 * @module router
 */

import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import MasterDataView from '@/views/MasterDataView.vue';
import PersediaanView from '@/views/PersediaanView.vue';
import DaftarPesananView from '@/views/DaftarPesananView.vue';
import ArusKasView from '@/views/ArusKasView.vue';
import LabaRugiView from '@/views/LabaRugiView.vue';
import ProfileView from '@/views/ProfileView.vue';
import LoginView from '@/views/LoginView.vue';
import UserManagementView from '@/views/UserManagementView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import { authState, authReady } from '@/services/auth';

/**
 * Definisi semua route aplikasi
 * Dikelompokkan berdasarkan akses: publik, authenticated, dan khusus
 */
const routes = [
  // ============================================================
  // SECTION: Public Routes - Route yang dapat diakses tanpa login
  // ============================================================
  
  /**
   * Route Login
   * Halaman autentikasi pengguna. Tidak memerlukan autentikasi.
   */
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { title: 'UsahaKu - Masuk', public: true }
  },

  // ============================================================
  // SECTION: Authenticated Routes - Route yang memerlukan login
  // ============================================================

  /**
   * Route Dashboard
   * Halaman utama setelah login. Menampilkan ringkasan bisnis.
   */
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { title: 'UsahaKu - Dashboard' }
  },

  /**
   * Route Master Data
   * Halaman pengelolaan produk dan harga. Hanya untuk role owner.
   */
  {
    path: '/master-data',
    name: 'MasterData',
    component: MasterDataView,
    meta: { title: 'UsahaKu - Produk & Harga', roles: ['owner'] }
  },

  /**
   * Route Persediaan
   * Halaman pengelolaan stok barang.
   */
  {
    path: '/persediaan',
    name: 'Persediaan',
    component: PersediaanView,
    meta: { title: 'UsahaKu - Stok' }
  },

  /**
   * Route Daftar Pesanan
   * Halaman melihat daftar pesanan pelanggan.
   */
  {
    path: '/daftar-pesanan',
    name: 'DaftarPesanan',
    component: DaftarPesananView,
    meta: { title: 'UsahaKu - Pesanan' }
  },

  /**
   * Route Arus Kas
   * Halaman laporan arus kas masuk dan keluar.
   */
  {
    path: '/arus-kas',
    name: 'ArusKas',
    component: ArusKasView,
    meta: { title: 'UsahaKu - Arus Kas' }
  },

  /**
   * Route Laba Rugi
   * Halaman laporan laba/rugi bisnis. Hanya untuk role owner.
   */
  {
    path: '/laba-rugi',
    name: 'LabaRugi',
    component: LabaRugiView,
    meta: { title: 'UsahaKu - Laba Rugi', roles: ['owner'] }
  },

  /**
   * Route User Management
   * Halaman pengelolaan pengguna sistem. Hanya untuk role owner.
   */
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagementView,
    meta: { title: 'UsahaKu - Manajemen Pengguna', roles: ['owner'] }
  },

  /**
   * Route Profile
   * Halaman profil pengguna yang sedang login.
   */
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { title: 'UsahaKu - Profil Pengguna' }
  },

  // ============================================================
  // SECTION: Special Routes - 404 dan Redirect
  // ============================================================

  /**
   * Route 404 - Halaman Tidak Ditemukan
   * Ditampilkan ketika route yang diminta tidak ada.
   */
  {
    path: '/404',
    name: 'NotFound',
    component: NotFoundView,
    meta: { title: 'UsahaKu - 404 Halaman Tidak Ditemukan' }
  },

  // Redirects for legacy .html paths - kompatibilitas dengan URL lama
  { path: '/index.html', redirect: '/' },
  { path: '/master_data.html', redirect: '/master-data' },
  { path: '/persediaan.html', redirect: '/persediaan' },
  { path: '/daftar_pesanan.html', redirect: '/daftar-pesanan' },
  { path: '/arus_kas.html', redirect: '/arus-kas' },
  { path: '/laba_rugi.html', redirect: '/laba-rugi' },

  /**
   * Route Catch-All - Menangkap semua route yang tidak cocok
   * Mengarahkan ke halaman 404.
   */
  {
    path: '/:pathMatch(.*)*',
    name: 'CatchAllNotFound',
    component: NotFoundView,
    meta: { title: 'UsahaKu - 404 Halaman Tidak Ditemukan' }
  }
];

// ============================================================
// Router Instance Creation
// ============================================================

/**
 * Membuat instance router dengan konfigurasi yang sudah didefinisikan
 * Menggunakan HTML5 History API untuk navigasi yang bersih (tanpa #)
 */
const router = createRouter({
  history: createWebHistory(),
  routes,
  /**
   * Behavior scroll saat navigasi antar halaman
   * Selalu scroll ke atas dengan efek smooth
   */
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' };
  }
});

// ============================================================
// Route Guards / Middleware
// ============================================================

/**
 * Guard: beforeEach - dijalankan sebelum setiap navigasi
 * 
 * Logika autentikasi:
 * 1. Jika route adalah public (meta.public === true), izinkan akses
 * 2. Jika route memerlukan autentikasi tapi user belum login, redirect ke /login
 * 3. Jika user sudah di /login tapi sudah terautentikasi, redirect ke dashboard (/)
 * 4. Jika route memerlukan role tertentu dan user tidak memiliki role tersebut, tampilkan 404
 * 
 * @param {Route} to - Route tujuan navigasi
 * @param {Route} from - Route asal navigasi
 * @param {Function} next - Callback untuk melanjutkan/mengubah navigasi
 */
router.beforeEach(async (to, from, next) => {
  // Tunggu until auth state siap (terinisialisasi dari localStorage/session)
  await authReady;
  
  // Periksa apakah route bersifat publik
  const isPublic = to.meta.public === true;
  
  // Periksa status autentikasi user
  const isAuthenticated = !!authState.user;
  
  // Dapatkan role user, default ke 'admin' jika tidak ada
  const userRole = authState.user?.role || 'admin';

  // Cek 1: Route memerlukan autentikasi tapi user belum login
  if (!isPublic && !isAuthenticated) {
    next('/login');
  }
  // Cek 2: User sudah login tapi mengakses halaman login, redirect ke dashboard
  else if (to.path === '/login' && isAuthenticated) {
    next('/');
  }
  // Cek 3: Route memerlukan role tertentu dan user tidak memiliki akses
  else if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    // Jika role user tidak diizinkan (misal: admin membuka menu owner)
    next('/404');
  }
  // Cek 4: Izinkan navigasi
  else {
    next();
  }
});

/**
 * Guard: afterEach - dijalankan setelah navigasi selesai
 * Mengubah title dokumen berdasarkan meta.title route
 * 
 * @param {Route} to - Route yang baru dikunjungi
 */
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title;
  }
});

export default router;