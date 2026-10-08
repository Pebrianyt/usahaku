<template>
  <main class="page-container d-flex flex-column align-items-center justify-content-center text-center py-5" style="min-height: 70vh;">
    <div class="card p-5 shadow-sm border" style="max-width: 540px; width: 100%; border-radius: var(--r, 14px); background: var(--panel, #ffffff); border-color: var(--line, #E7E3DB) !important;">
      
      <!-- 404 Visual Badge -->
      <div 
        class="d-inline-flex align-items-center justify-content-center mx-auto mb-3"
        style="width: 80px; height: 80px; border-radius: 50%; background: #FDE8E8; color: #E02424;"
      >
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h1 class="h3 fw-bold mb-2" style="color: var(--ink, #1B2430);">404 - Halaman Tidak Ditemukan</h1>
      
      <p class="text-secondary small mb-4">
        Halaman yang Anda cari tidak tersedia, atau peran (role) akun Anda saat ini 
        <strong v-if="userRole" class="text-dark">({{ userRole.toUpperCase() }})</strong> 
        tidak memiliki izin untuk mengakses menu tersebut.
      </p>

      <div class="d-flex flex-column flex-sm-row justify-content-center gap-2">
        <RouterLink 
          to="/" 
          class="btn btn-primary px-4 py-2 fw-medium text-white d-flex align-items-center justify-content-center gap-2"
          style="background: var(--brand, #9bbe92); border-color: var(--brand, #9bbe92); border-radius: 8px;"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Kembali ke Dashboard</span>
        </RouterLink>

        <button 
          type="button" 
          class="btn btn-light border px-4 py-2 text-secondary"
          style="border-radius: 8px;"
          @click="$router.back()"
        >
          Kembali ke Halaman Sebelumnya
        </button>
      </div>

    </div>
  </main>
</template>

<script>
import { authState } from '@/services/auth';

export default {
  name: 'NotFoundView',
  computed: {
    userRole() {
      return authState.user?.role || '';
    }
  }
};
</script>
