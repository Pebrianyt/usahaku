<template>
  <div>
    <!-- Mobile Header (Visible on screens < 992px) -->
    <header class="d-lg-none mobile-topbar d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white sticky-top">
      <div class="brand d-flex align-items-center gap-2">
        <div class="mark">U</div>
        <div class="name">UsahaKu</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <RouterLink 
          to="/profile" 
          class="btn btn-sm d-flex align-items-center justify-content-center p-1"
          title="Profil Pengguna"
        >
          <div 
            class="d-flex align-items-center justify-content-center text-white fw-bold rounded-circle"
            style="width: 32px; height: 32px; background: var(--brand, #9bbe92); font-size: 13px;"
          >
            {{ userInitials }}
          </div>
        </RouterLink>
        <button 
          class="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-2" 
          type="button" 
          aria-label="Buka navigasi"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" fill="none" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Backdrop for mobile drawer -->
    <div 
      v-if="isMobileMenuOpen" 
      class="mobile-backdrop d-lg-none position-fixed top-0 start-0 w-100 h-100" 
      style="background: rgba(0,0,0,0.4); z-index: 1040;"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- Main Navigation Sidebar (Desktop + Mobile Drawer) -->
    <nav 
      class="topnav d-flex flex-column justify-content-between" 
      :class="{ 'mobile-open': isMobileMenuOpen }" 
      aria-label="Navigasi utama"
    >
      <div>
        <div class="d-flex align-items-center justify-content-between pe-1 mb-2">
          <div class="brand">
            <div class="mark">U</div>
            <div class="name">UsahaKu</div>
          </div>
          <button 
            class="btn-close d-lg-none me-2" 
            aria-label="Tutup navigasi" 
            @click="isMobileMenuOpen = false"
          ></button>
        </div>

        <ul class="navMenu">
          <li>
            <RouterLink to="/" active-class="active" @click="isMobileMenuOpen = false">
              <svg class="navIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
              </svg>
              <span>Dashboard</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/master-data" active-class="active" @click="isMobileMenuOpen = false">
              <svg class="navIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3.5" y="4.5" width="17" height="15" rx="2"/>
                <path d="M3.5 10h17M9 4.5v15"/>
              </svg>
              <span>Master Data</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/persediaan" active-class="active" @click="isMobileMenuOpen = false">
              <svg class="navIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Z"/>
                <path d="m3.8 7.7 8.2 4.5 8.2-4.5M12 12.2V21"/>
              </svg>
              <span>Persediaan</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/daftar-pesanan" active-class="active" @click="isMobileMenuOpen = false">
              <svg class="navIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 6h12M8 12h12M8 18h12"/>
                <circle cx="4" cy="6" r=".8" fill="currentColor" stroke="none"/>
                <circle cx="4" cy="12" r=".8" fill="currentColor" stroke="none"/>
                <circle cx="4" cy="18" r=".8" fill="currentColor" stroke="none"/>
              </svg>
              <span>Daftar Pesanan</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/arus-kas" active-class="active" @click="isMobileMenuOpen = false">
              <svg class="navIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20V4M4 20h17M7 15l4-4 3 2 5-7"/>
                <path d="M16 6h3v3"/>
              </svg>
              <span>Arus Kas</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/laba-rugi" active-class="active" @click="isMobileMenuOpen = false">
              <svg class="navIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20V4M4 20h17"/>
                <rect x="7" y="12" width="3" height="5" rx=".8"/>
                <rect x="13" y="8" width="3" height="9" rx=".8"/>
                <rect x="19" y="5" width="2" height="12" rx=".8"/>
              </svg>
              <span>Laba Rugi</span>
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/profile" active-class="active" @click="isMobileMenuOpen = false">
              <svg class="navIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Profil</span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <!-- Bottom User Profile & Logout Area -->
      <div class="sidebar-user border-top pt-3 mt-4">
        <RouterLink 
          to="/profile" 
          class="d-flex align-items-center gap-2 p-2 rounded text-decoration-none text-dark"
          style="background: var(--bg, #F7F5F1);"
          @click="isMobileMenuOpen = false"
        >
          <div 
            class="d-flex align-items-center justify-content-center text-white fw-bold rounded-circle flex-shrink-0"
            style="width: 34px; height: 34px; background: var(--brand, #9bbe92); font-size: 13px;"
          >
            {{ userInitials }}
          </div>
          <div class="overflow-hidden">
            <div class="small fw-bold text-truncate" style="color: var(--ink, #1B2430);">
              {{ userName }}
            </div>
            <div class="text-secondary small text-truncate" style="font-size: 11px;">
              {{ userEmail }}
            </div>
          </div>
        </RouterLink>

        <button 
          type="button" 
          class="btn btn-sm btn-light border w-100 mt-2 d-flex align-items-center justify-content-center gap-1 text-secondary"
          @click="handleLogout"
          style="border-radius: 8px; font-size: 12px;"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Keluar</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script>
import { authState, logoutUser } from '@/services/auth';
import { confirmAction, showToast } from '@/services/notification';

export default {
  name: 'AppNavbar',
  data() {
    return {
      isMobileMenuOpen: false
    };
  },
  computed: {
    currentUser() {
      return authState.user;
    },
    userInitials() {
      return authState.user?.initials || 'U';
    },
    userName() {
      return authState.user?.name || 'Pengguna';
    },
    userEmail() {
      return authState.user?.email || '';
    }
  },
  methods: {
    async handleLogout() {
      this.isMobileMenuOpen = false;
      const confirmed = await confirmAction('Apakah Anda yakin ingin keluar dari UsahaKu?', {
        title: 'Konfirmasi Keluar',
        confirmText: 'Ya, Keluar',
        confirmVariant: 'danger'
      });

      if (!confirmed) return;

      await logoutUser();
      showToast('Anda telah berhasil keluar.', 'info');
      this.$router.push('/login');
    }
  }
};
</script>

<style scoped>
@media (max-width: 991.98px) {
  nav.topnav {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1050;
    transform: translateX(-100%);
    transition: transform 0.25s ease-in-out;
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.1);
  }

  nav.topnav.mobile-open {
    transform: translateX(0);
  }
}
</style>
