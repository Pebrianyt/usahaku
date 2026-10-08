<template>
  <main class="page-container">
    <header class="pagehead d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
      <div>
        <h1>Manajemen Pengguna</h1>
        <p>Kelola akun pengguna dan hak akses (role) sistem UsahaKu.</p>
      </div>
      <div>
        <button 
          type="button" 
          class="btn btn-primary d-inline-flex align-items-center gap-2 text-white px-3 py-2"
          style="background: var(--brand, #9bbe92); border-color: var(--brand, #9bbe92); border-radius: 8px;"
          @click="bukaModalTambah"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>
    </header>

    <!-- Search and Role Filter Bar -->
    <section class="card p-3 shadow-sm border mb-4" style="background: var(--panel, #ffffff); border-radius: var(--r, 14px); border-color: var(--line, #E7E3DB) !important;">
      <div class="row g-2 align-items-center">
        <div class="col-12 col-md-6">
          <input 
            type="text" 
            v-model="filterCari" 
            class="form-control" 
            placeholder="Cari berdasarkan nama atau email pengguna..."
          >
        </div>
        <div class="col-12 col-md-4">
          <select v-model="filterRole" class="form-select">
            <option value="">Semua Peran (Role)</option>
            <option value="owner">Owner (Akses Penuh)</option>
            <option value="admin">Admin (Akses Terbatas)</option>
          </select>
        </div>
        <div class="col-12 col-md-2 text-md-end text-secondary small">
          Total: <strong>{{ filteredUsers.length }}</strong> pengguna
        </div>
      </div>
    </section>

    <!-- Users Table -->
    <div class="tableScroll table-responsive shadow-sm" style="border-radius: var(--r, 14px); border: 1px solid var(--line, #E7E3DB);">
      <table class="table align-middle mb-0" style="background: var(--panel, #ffffff);">
        <thead>
          <tr>
            <th scope="col" style="width: 60px;" class="text-center">No</th>
            <th scope="col">Pengguna</th>
            <th scope="col">Email</th>
            <th scope="col">Peran (Role)</th>
            <th scope="col" style="width: 220px;">Ubah Peran</th>
            <th scope="col" style="width: 100px;" class="text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="memuat">
            <td colspan="6" class="text-center py-4 text-secondary">
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Memuat daftar pengguna...
            </td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td colspan="6" class="text-center py-4 text-secondary">
              Tidak ada pengguna yang sesuai dengan filter.
            </td>
          </tr>
          <tr v-for="(u, idx) in filteredUsers" :key="u.email">
            <td class="text-center text-secondary small">{{ idx + 1 }}</td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div 
                  class="d-flex align-items-center justify-content-center text-white fw-bold rounded-circle flex-shrink-0"
                  :style="{ 
                    width: '36px', 
                    height: '36px', 
                    background: u.role === 'owner' ? '#B4700F' : 'var(--brand, #9bbe92)', 
                    fontSize: '13px' 
                  }"
                >
                  {{ dapatkanInisial(u.nama) }}
                </div>
                <div>
                  <div class="fw-semibold text-dark">{{ u.nama }}</div>
                  <div v-if="u.email === currentUserEmail" class="badge bg-light text-primary border" style="font-size: 10px;">
                    Akun Anda
                  </div>
                </div>
              </div>
            </td>
            <td class="text-secondary">{{ u.email }}</td>
            <td>
              <span 
                v-if="u.role === 'owner'" 
                class="badge" 
                style="background: #FCEFDD; color: #B4700F; padding: 6px 12px; font-weight: 600; font-size: 12px; border-radius: 100px;"
              >
                Owner (Penuh)
              </span>
              <span 
                v-else 
                class="badge" 
                style="background: #EAF3EF; color: #1F7A43; padding: 6px 12px; font-weight: 600; font-size: 12px; border-radius: 100px;"
              >
                Admin (Terbatas)
              </span>
            </td>
            <td>
              <div class="d-flex align-items-center gap-1">
                <select 
                  :value="u.role" 
                  @change="handleGantiRole(u.email, $event.target.value)"
                  class="form-select form-select-sm"
                  style="max-width: 140px; font-size: 12px;"
                  :disabled="sedangProses"
                >
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            </td>
            <td class="text-center">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-danger p-1"
                title="Hapus Pengguna"
                :disabled="u.email === currentUserEmail || sedangProses"
                @click="handleHapusUser(u)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form Tambah User Baru -->
    <div 
      v-if="showModalTambah" 
      class="modal-backdrop-custom d-flex align-items-center justify-content-center position-fixed top-0 start-0 w-100 h-100" 
      style="background: rgba(0,0,0,0.5); z-index: 1050;"
    >
      <div 
        class="card shadow-lg p-4 border" 
        style="max-width: 480px; width: 90%; border-radius: var(--r, 14px); background: var(--panel, #ffffff); border-color: var(--line, #E7E3DB) !important;"
      >
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h2 class="h5 fw-bold mb-0" style="color: var(--ink, #1B2430);">Daftarkan Pengguna Baru</h2>
          <button type="button" class="btn-close" aria-label="Tutup" @click="showModalTambah = false"></button>
        </div>

        <form @submit.prevent="handleSimpanUserBaru" class="d-flex flex-column gap-3 p-0 border-0 bg-transparent">
          <div class="w-100">
            <label for="inputNamaUser" class="form-label small fw-medium mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              id="inputNamaUser" 
              v-model="formNama" 
              class="form-control" 
              placeholder="Contoh: Budi Santoso" 
              required
            >
          </div>

          <div class="w-100">
            <label for="inputEmailUser" class="form-label small fw-medium mb-1">Alamat Email</label>
            <input 
              type="email" 
              id="inputEmailUser" 
              v-model="formEmail" 
              class="form-control" 
              placeholder="nama@email.com" 
              required
            >
          </div>

          <div>
            <label for="inputRoleUser" class="form-label small fw-medium mb-1">Peran (Role)</label>
            <select id="inputRoleUser" v-model="formRole" class="form-select" required>
              <option value="admin">Admin — Hanya Dashboard, Persediaan, Pesanan, Arus Kas & Profil</option>
              <option value="owner">Owner — Akses Penuh ke Semua Menu (termasuk Master Data, Laba Rugi & User)</option>
            </select>
          </div>

          <div>
            <label for="inputPasswordUser" class="form-label small fw-medium mb-1">Kata Sandi Default</label>
            <div class="input-group">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                id="inputPasswordUser" 
                v-model="formPassword" 
                class="form-control" 
                placeholder="Minimal 6 karakter" 
                required
                minlength="6"
              >
              <button type="button" class="btn btn-outline-secondary" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                </svg>
              </button>
            </div>
            <div class="form-text small text-secondary">
              Pengguna dapat mengubah kata sandi ini nantinya melalui menu Profil.
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-3 pt-2 border-top">
            <button 
              type="button" 
              class="btn btn-light border text-secondary" 
              @click="showModalTambah = false"
            >
              Batal
            </button>
            <button 
              type="submit" 
              class="btn btn-primary text-white d-flex align-items-center gap-2"
              style="background: var(--brand, #9bbe92); border-color: var(--brand, #9bbe92);"
              :disabled="sedangProses"
            >
              <span v-if="sedangProses" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>{{ sedangProses ? 'Menyimpan...' : 'Daftarkan Pengguna' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script>
import { 
  authState, 
  fetchAppUsers, 
  createNewUser, 
  updateAppUserRole, 
  deleteAppUser, 
  getInitials 
} from '@/services/auth';
import { showToast, confirmAction } from '@/services/notification';

export default {
  name: 'UserManagementView',
  data() {
    return {
      users: [],
      memuat: true,
      sedangProses: false,
      filterCari: '',
      filterRole: '',
      showModalTambah: false,
      formNama: '',
      formEmail: '',
      formRole: 'admin',
      formPassword: 'adm1nusahaku',
      showPassword: false
    };
  },
  computed: {
    currentUserEmail() {
      return authState.user?.email || '';
    },
    filteredUsers() {
      const cari = this.filterCari.trim().toLowerCase();
      return this.users.filter(u => {
        const matchCari = !cari || 
          u.nama.toLowerCase().includes(cari) || 
          u.email.toLowerCase().includes(cari);
        const matchRole = !this.filterRole || u.role === this.filterRole;
        return matchCari && matchRole;
      });
    }
  },
  methods: {
    dapatkanInisial(nama) {
      return getInitials(nama);
    },
    async muatDataUser() {
      this.memuat = true;
      try {
        this.users = await fetchAppUsers();
      } catch (err) {
        showToast('Gagal memuat daftar pengguna.', 'error');
      } finally {
        this.memuat = false;
      }
    },
    bukaModalTambah() {
      this.formNama = '';
      this.formEmail = '';
      this.formRole = 'admin';
      this.formPassword = 'adm1nusahaku';
      this.showPassword = false;
      this.showModalTambah = true;
    },
    async handleSimpanUserBaru() {
      if (!this.formNama || !this.formEmail || !this.formPassword) {
        showToast('Semua kolom wajib diisi.', 'warning');
        return;
      }

      const emailCheck = this.formEmail.trim().toLowerCase();
      if (this.users.some(u => u.email.toLowerCase() === emailCheck)) {
        showToast('Email tersebut sudah terdaftar.', 'warning');
        return;
      }

      this.sedangProses = true;
      const res = await createNewUser({
        nama: this.formNama,
        email: emailCheck,
        role: this.formRole,
        password: this.formPassword
      });
      this.sedangProses = false;

      if (!res.success) {
        showToast(res.error || 'Gagal mendaftarkan pengguna baru.', 'error');
        return;
      }

      showToast(`Pengguna ${this.formNama} berhasil didaftarkan sebagai ${this.formRole.toUpperCase()}!`, 'success');
      this.showModalTambah = false;
      await this.muatDataUser();
    },
    async handleGantiRole(email, newRole) {
      this.sedangProses = true;
      const res = await updateAppUserRole(email, newRole);
      this.sedangProses = false;

      if (!res.success) {
        showToast('Gagal mengubah peran pengguna.', 'error');
        return;
      }

      showToast(`Peran pengguna ${email} berhasil diubah menjadi ${newRole.toUpperCase()}.`, 'success');
      await this.muatDataUser();
    },
    async handleHapusUser(user) {
      const confirmed = await confirmAction(
        `Apakah Anda yakin ingin menghapus pengguna "${user.nama}" (${user.email})? Tindakan ini tidak dapat dibatalkan.`,
        {
          title: 'Konfirmasi Hapus Pengguna',
          confirmText: 'Ya, Hapus Pengguna',
          confirmVariant: 'danger'
        }
      );

      if (!confirmed) return;

      this.sedangProses = true;
      const res = await deleteAppUser(user.email);
      this.sedangProses = false;

      if (!res.success) {
        showToast(res.error || 'Gagal menghapus pengguna.', 'error');
        return;
      }

      showToast(`Pengguna ${user.nama} berhasil dihapus.`, 'info');
      await this.muatDataUser();
    }
  },
  mounted() {
    this.muatDataUser();
  }
};
</script>
