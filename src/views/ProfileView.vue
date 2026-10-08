<template>
  <main class="page-container">
    <header class="pagehead">
      <h1>Profil Pengguna</h1>
      <p>Kelola informasi akun dan pengaturan keamanan kata sandi Anda.</p>
    </header>

    <div class="row g-4">
      <!-- Card 1: Informasi Akun & Avatar Inisial -->
      <div class="col-12 col-md-5">
        <article class="card h-100 shadow-sm border p-4" style="background: var(--panel, #ffffff); border-radius: var(--r, 14px); border-color: var(--line, #E7E3DB) !important;">
          <h2 class="fs-6 fw-bold mb-3 text-secondary text-uppercase" style="letter-spacing: 0.5px;">Profil Akun</h2>
          
          <div class="d-flex flex-column align-items-center text-center my-3">
            <!-- Avatar Initial -->
            <div 
              class="profile-avatar d-flex align-items-center justify-content-center shadow-sm mb-3"
              style="width: 88px; height: 88px; border-radius: 50%; background: var(--brand, #9bbe92); color: #ffffff; font-weight: 700; font-size: 32px; border: 3px solid var(--line, #E7E3DB);"
            >
              {{ currentUser?.initials || 'U' }}
            </div>

            <!-- Nama & Email -->
            <h3 class="h5 fw-bold mb-1" style="color: var(--ink, #1B2430);">
              {{ currentUser?.name || 'Pengguna UsahaKu' }}
            </h3>
            <p class="text-secondary small mb-2">{{ currentUser?.email || '-' }}</p>

            <span 
              class="badge text-uppercase" 
              :style="{
                background: currentUser?.role === 'owner' ? '#FCEFDD' : '#EAF3EF',
                color: currentUser?.role === 'owner' ? '#B4700F' : '#1F7A43',
                padding: '6px 14px',
                fontWeight: '600',
                fontSize: '12px',
                borderRadius: '100px'
              }"
            >
              {{ currentUser?.role === 'owner' ? 'Owner UsahaKu' : 'Admin UsahaKu' }}
            </span>
          </div>

          <div class="border-top pt-3 mt-auto">
            <div class="d-flex justify-content-between text-secondary small mb-2">
              <span>Status Akun:</span>
              <strong class="text-success">Aktif & Terverifikasi</strong>
            </div>
            <div class="d-flex justify-content-between text-secondary small mb-3">
              <span>Metode Autentikasi:</span>
              <span>Supabase Auth</span>
            </div>

            <button 
              type="button" 
              class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2" 
              style="border-radius: 8px;"
              @click="handleLogout"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </article>
      </div>

      <!-- Card 2: Form Ubah Password -->
      <div class="col-12 col-md-7">
        <article class="card h-100 shadow-sm border p-4" style="background: var(--panel, #ffffff); border-radius: var(--r, 14px); border-color: var(--line, #E7E3DB) !important;">
          <h2 class="fs-6 fw-bold mb-1 text-secondary text-uppercase" style="letter-spacing: 0.5px;">Ubah Kata Sandi</h2>
          <p class="text-secondary small mb-4">Pastikan kata sandi baru Anda minimal 6 karakter dan sulit ditebak oleh orang lain.</p>

          <form @submit.prevent="handleUpdatePassword" class="d-flex flex-column gap-3 p-0 border-0 bg-transparent">
            <div class="w-100">
              <label for="passwordSekarang" class="form-label small fw-medium mb-1">Password Sekarang</label>
              <div class="input-group">
                <input 
                  :type="showOld ? 'text' : 'password'" 
                  id="passwordSekarang" 
                  v-model="oldPassword" 
                  class="form-control" 
                  placeholder="Masukkan password saat ini" 
                  required
                >
                <button type="button" class="btn btn-outline-secondary" @click="showOld = !showOld">
                  <svg v-if="!showOld" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="w-100">
              <label for="passwordBaru" class="form-label small fw-medium mb-1">Password Baru</label>
              <div class="input-group">
                <input 
                  :type="showNew ? 'text' : 'password'" 
                  id="passwordBaru" 
                  v-model="newPassword" 
                  class="form-control" 
                  placeholder="Minimal 6 karakter" 
                  required
                  minlength="6"
                >
                <button type="button" class="btn btn-outline-secondary" @click="showNew = !showNew">
                  <svg v-if="!showNew" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="w-100">
              <label for="konfirmasiPasswordBaru" class="form-label small fw-medium mb-1">Konfirmasi Password Baru</label>
              <div class="input-group">
                <input 
                  :type="showConfirm ? 'text' : 'password'" 
                  id="konfirmasiPasswordBaru" 
                  v-model="confirmNewPassword" 
                  class="form-control" 
                  placeholder="Ulangi password baru" 
                  required
                  minlength="6"
                >
                <button type="button" class="btn btn-outline-secondary" @click="showConfirm = !showConfirm">
                  <svg v-if="!showConfirm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="mt-3">
              <button 
                type="submit" 
                class="btn btn-primary px-4 py-2 fw-medium text-white d-flex align-items-center gap-2"
                style="background: var(--brand, #9bbe92); border-color: var(--brand, #9bbe92); border-radius: 8px;"
                :disabled="isUpdating"
              >
                <span v-if="isUpdating" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>{{ isUpdating ? 'Menyimpan...' : 'Perbarui Kata Sandi' }}</span>
              </button>
            </div>
          </form>
        </article>
      </div>
    </div>
  </main>
</template>

<script>
import { authState, logoutUser, changePassword } from '@/services/auth';
import { showToast, confirmAction } from '@/services/notification';

export default {
  name: 'ProfileView',
  data() {
    return {
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      showOld: false,
      showNew: false,
      showConfirm: false,
      isUpdating: false
    };
  },
  computed: {
    currentUser() {
      return authState.user;
    }
  },
  methods: {
    async handleUpdatePassword() {
      if (!this.oldPassword || !this.newPassword || !this.confirmNewPassword) {
        showToast('Semua bidang kata sandi wajib diisi.', 'warning');
        return;
      }

      if (this.newPassword.length < 6) {
        showToast('Kata sandi baru minimal harus 6 karakter.', 'warning');
        return;
      }

      if (this.newPassword !== this.confirmNewPassword) {
        showToast('Konfirmasi kata sandi baru tidak cocok.', 'warning');
        return;
      }

      this.isUpdating = true;
      const result = await changePassword(this.oldPassword, this.newPassword);
      this.isUpdating = false;

      if (!result.success) {
        showToast(result.error || 'Gagal mengubah kata sandi.', 'error');
        return;
      }

      showToast('Kata sandi berhasil diperbarui!', 'success');
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    },
    async handleLogout() {
      const confirmed = await confirmAction('Apakah Anda yakin ingin keluar dari akun UsahaKu?', {
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
.profile-avatar {
  background: var(--brand, #9bbe92);
}
</style>
