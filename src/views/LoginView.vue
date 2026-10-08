<template>
  <div class="login-wrapper d-flex align-items-center justify-content-center min-vh-100 p-3">
    <div class="login-card shadow-sm border p-4 p-md-5" style="max-width: 440px; width: 100%; border-radius: var(--r, 14px); background: var(--panel, #ffffff);">
      
      <!-- Brand Header -->
      <div class="text-center mb-4">
        <div class="mark d-inline-flex align-items-center justify-content-center mx-auto mb-2" style="width: 46px; height: 46px; border-radius: 12px; background: var(--brand, #9bbe92); color: var(--brand-ink, #EAF3EF); font-weight: 700; font-size: 22px;">
          U
        </div>
        <h1 class="h4 fw-bold mb-1" style="color: var(--ink, #1B2430);">UsahaKu</h1>
        <p class="text-secondary small mb-0">Masuk untuk mengelola operasional dan keuangan usaha.</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="d-flex flex-column gap-3 p-0 border-0 bg-transparent mb-3">
        <div class="w-100">
          <label for="loginEmail" class="form-label small fw-medium mb-1">Email</label>
          <input 
            type="email" 
            id="loginEmail" 
            v-model="email" 
            class="form-control" 
            placeholder="nama@email.com" 
            required 
            autocomplete="email"
          >
        </div>

        <div class="w-100">
          <label for="loginPassword" class="form-label small fw-medium mb-1">Password</label>
          <div class="input-group">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              id="loginPassword" 
              v-model="password" 
              class="form-control" 
              placeholder="Masukkan password" 
              required
              autocomplete="current-password"
            >
            <button 
              type="button" 
              class="btn btn-outline-secondary" 
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Sembunyikan' : 'Tampilkan'"
            >
              <svg v-if="!showPassword" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          class="btn btn-primary w-100 py-2 mt-2 fw-medium text-white d-flex align-items-center justify-content-center gap-2" 
          style="background: var(--brand, #9bbe92); border-color: var(--brand, #9bbe92); border-radius: 8px;"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span>{{ isSubmitting ? 'Memeriksa kredensial...' : 'Masuk ke UsahaKu' }}</span>
        </button>
      </form>

      <!-- Pre-registered accounts helper / quick select -->
      <div class="mt-3 pt-3 border-top" v-show="false">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <small class="text-secondary fw-semibold">Pilih Cepat Akun:</small>
          <small class="badge bg-light text-secondary border">Password: adm1nusahaku</small>
        </div>
        <div class="d-flex flex-column gap-1">
          <button 
            v-for="(info, mail) in registeredUsers" 
            :key="mail"
            type="button" 
            class="btn btn-sm btn-light border text-start d-flex justify-content-between align-items-center py-1 px-2"
            @click="quickSelectUser(mail)"
          >
            <span class="small text-truncate" style="max-width: 220px;">{{ info.name }}</span>
            <span class="badge text-bg-secondary" style="font-size: 10px;">Pilih</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { 
  loginUser, 
  INITIAL_USERS, 
  DEFAULT_ADMIN_PASSWORD, 
  DEFAULT_OWNER_PASSWORD 
} from '@/services/auth';
import { showToast } from '@/services/notification';

export default {
  name: 'LoginView',
  data() {
    return {
      email: '',
      password: '',
      showPassword: false,
      isSubmitting: false,
      registeredUsers: INITIAL_USERS
    };
  },
  methods: {
    quickSelectUser(selectedEmail) {
      this.email = selectedEmail;
      const user = this.registeredUsers[selectedEmail];
      this.password = user?.defaultPw || (user?.role === 'owner' ? DEFAULT_OWNER_PASSWORD : DEFAULT_ADMIN_PASSWORD);
    },
    async handleLogin() {
      if (!this.email || !this.password) {
        showToast('Email dan password wajib diisi.', 'warning');
        return;
      }

      this.isSubmitting = true;
      const result = await loginUser(this.email, this.password);
      this.isSubmitting = false;

      if (!result.success) {
        showToast(result.error || 'Gagal masuk. Periksa email atau password Anda.', 'error');
        return;
      }

      showToast(`Selamat datang kembali, ${result.user.name} (${(result.user.role || 'admin').toUpperCase()})!`, 'success');
      this.$router.push('/');
    }
  }
};
</script>

<style scoped>
.login-wrapper {
  background: var(--bg, #F7F5F1);
}
.login-card {
  border-color: var(--line, #E7E3DB) !important;
}
</style>
