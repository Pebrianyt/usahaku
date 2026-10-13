<template>
  <div class="app-layout" :class="{ 'is-login-page': isLoginPage }">
    <!-- Hanya tampilkan navbar jika BUKAN halaman login -->
    <AppNavbar v-if="!isLoginPage" />
    <RouterView />
    <NotificationToast />
    <ConfirmModal />
  </div>
</template>

<script>
/**
 * App.vue - Root component aplikasi UsahaKu
 * 
 * Komponen utama yang membungkus seluruh aplikasi.
 * Bertanggung jawab atas layout dasar dan menampilkan komponen global.
 * 
 * @component
 * @description Root component aplikasi UsahaKu
 */

import AppNavbar from '@/components/AppNavbar.vue';
import NotificationToast from '@/components/NotificationToast.vue';
import ConfirmModal from '@/components/ConfirmModal.vue';

export default {
  name: 'App',
  components: {
    AppNavbar,
    NotificationToast,
    ConfirmModal
  },
  computed: {
    /**
     * Mendeteksi apakah pengguna sedang di halaman login
     * Digunakan untuk menentukan apakah navbar harus ditampilkan
     * 
     * @returns {boolean} true jika path saat ini adalah /login
     */
    isLoginPage() {
      return this.$route.path === '/login';
    }
  }
};
</script>

<style>
#app {
  width: 100%;
}

.app-layout {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex: 1 1 auto;
}

/* Pada halaman login, gunakan layout flex penuh dengan tinggi viewport */
.app-layout.is-login-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Responsive layout adjustments for devices */
@media (max-width: 991.98px) {
  main {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    margin-left: 0 !important;
    padding: 16px 16px 60px !important;
  }
}

.tableScroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
</style>