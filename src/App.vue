<template>
  <div class="app-layout min-vw-100" :class="{ 'is-login-page': isLoginPage }">
    <AppNavbar v-if="!isLoginPage" />
    <RouterView />
    <NotificationToast />
    <ConfirmModal />
  </div>
</template>

<script>
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
    isLoginPage() {
      return this.$route.path === '/login';
    }
  }
};
</script>

<style>
/* Responsive layout adjustments for devices */
@media (max-width: 991.98px) {
  main {
    width: 100% !important;
    margin-left: 0 !important;
    padding: 16px 16px 60px !important;
  }
}

.tableScroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
