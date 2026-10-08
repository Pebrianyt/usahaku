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
import { authState } from '@/services/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { title: 'UsahaKu - Masuk', public: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { title: 'UsahaKu - Dashboard' }
  },
  {
    path: '/master-data',
    name: 'MasterData',
    component: MasterDataView,
    meta: { title: 'UsahaKu - Produk & Harga', roles: ['owner'] }
  },
  {
    path: '/persediaan',
    name: 'Persediaan',
    component: PersediaanView,
    meta: { title: 'UsahaKu - Stok' }
  },
  {
    path: '/daftar-pesanan',
    name: 'DaftarPesanan',
    component: DaftarPesananView,
    meta: { title: 'UsahaKu - Pesanan' }
  },
  {
    path: '/arus-kas',
    name: 'ArusKas',
    component: ArusKasView,
    meta: { title: 'UsahaKu - Arus Kas' }
  },
  {
    path: '/laba-rugi',
    name: 'LabaRugi',
    component: LabaRugiView,
    meta: { title: 'UsahaKu - Laba Rugi', roles: ['owner'] }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagementView,
    meta: { title: 'UsahaKu - Manajemen Pengguna', roles: ['owner'] }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { title: 'UsahaKu - Profil Pengguna' }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: NotFoundView,
    meta: { title: 'UsahaKu - 404 Halaman Tidak Ditemukan' }
  },
  // Redirects for legacy .html paths
  { path: '/index.html', redirect: '/' },
  { path: '/master_data.html', redirect: '/master-data' },
  { path: '/persediaan.html', redirect: '/persediaan' },
  { path: '/daftar_pesanan.html', redirect: '/daftar-pesanan' },
  { path: '/arus_kas.html', redirect: '/arus-kas' },
  { path: '/laba_rugi.html', redirect: '/laba-rugi' },
  // Catch-all route -> NotFoundView
  {
    path: '/:pathMatch(.*)*',
    name: 'CatchAllNotFound',
    component: NotFoundView,
    meta: { title: 'UsahaKu - 404 Halaman Tidak Ditemukan' }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, behavior: 'smooth' };
  }
});

router.beforeEach((to, from, next) => {
  const isPublic = to.meta.public === true;
  const isAuthenticated = !!authState.user;
  const userRole = authState.user?.role || 'admin';

  if (!isPublic && !isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && isAuthenticated) {
    next('/');
  } else if (to.meta.roles && !to.meta.roles.includes(userRole)) {
    // If user role is not permitted to access this menu (e.g. admin opening owner menu)
    next('/404');
  } else {
    next();
  }
});

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title;
  }
});

export default router;
