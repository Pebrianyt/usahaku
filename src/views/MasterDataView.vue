<template>
  <main class="page-container">
    <header class="pagehead">
      <h1>Produk & Harga</h1>
      <p>Kelola daftar produk dan HPP acuan untuk pencatatan stok masuk. HPP pesanan mengikuti harga stok masuk dengan metode FIFO. Produk nonaktif tidak tersedia untuk transaksi baru.</p>
    </header>

    <p id="status" role="status" aria-live="polite" class="text-secondary small mb-3">
      {{ statusMessage }}
    </p>

    <!-- Search Section -->
    <section class="searchProduk mb-3" aria-label="Pencarian produk">
      <label for="searchInput" class="form-label me-2 mb-0 fw-medium">Cari produk</label>
      <input 
        type="search" 
        id="searchInput" 
        v-model="searchQuery" 
        placeholder="Cari kode atau nama produk..." 
        class="form-control"
      />
    </section>

    <!-- Add Product Form -->
    <form id="formTambah" @submit.prevent="tambahProduk" class="mb-4">
      <div class="fieldGroup">
        <label for="inputNama">Nama produk</label>
        <input 
          type="text" 
          id="inputNama" 
          v-model="formNama" 
          required
        >
      </div>
      <div class="fieldGroup">
        <label for="inputHpp">HPP acuan terbaru per unit</label>
        <div class="inputRupiah">
          <span class="prefix">Rp</span>
          <input 
            type="text" 
            id="inputHpp" 
            v-model="formHppDisplay" 
            @input="onHppInput" 
            inputmode="decimal" 
            placeholder="0" 
            required
          >
        </div>
      </div>
      <button 
        type="submit" 
        class="btnIcon btnTambah" 
        title="Tambah produk" 
        aria-label="Tambah produk"
        :disabled="isSubmitting"
      ></button>
    </form>

    <!-- Products Table -->
    <div class="tableScroll table-responsive">
      <table class="table align-middle">
        <thead>
          <tr>
            <th scope="col" style="width: 100px;">Kode</th>
            <th scope="col">Nama Produk</th>
            <th scope="col" style="width: 180px;">HPP Acuan Terbaru</th>
            <th scope="col" style="width: 110px;">Status</th>
            <th scope="col" style="width: 170px;">Aksi</th>
          </tr>
        </thead>
        <tbody id="tabelProduk">
          <tr v-if="filteredProduk.length === 0">
            <td colspan="5" class="text-center py-4 text-secondary">
              {{ searchQuery ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Belum ada data produk.' }}
            </td>
          </tr>
          <tr v-for="row in filteredProduk" :key="row.id">
            <!-- Edit Mode -->
            <template v-if="editingId === row.id">
              <td>{{ formatKode(row.id) }}</td>
              <td>
                <input type="text" v-model="editForm.nama" class="form-control form-control-sm" required>
              </td>
              <td>
                <div class="inputRupiah">
                  <span class="prefix">Rp</span>
                  <input 
                    type="text" 
                    v-model="editForm.hppDisplay" 
                    @input="onEditHppInput" 
                    class="form-control form-control-sm" 
                    inputmode="decimal" 
                    required
                  >
                </div>
              </td>
              <td>
                <span :class="['statusProduk', row.aktif === false ? 'nonaktif' : 'aktif']">
                  {{ row.aktif === false ? 'Nonaktif' : 'Aktif' }}
                </span>
              </td>
              <td>
                <div class="d-flex align-items-center gap-1">
                  <button 
                    class="btnIcon btnSimpan" 
                    title="Simpan" 
                    @click="simpanEdit(row.id)"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  </button>
                  <button 
                    class="btnIcon btnBatal" 
                    title="Batal" 
                    @click="batalEdit"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </td>
            </template>

            <!-- Display Mode -->
            <template v-else>
              <td>{{ formatKode(row.id) }}</td>
              <td>{{ row.nama_produk }}</td>
              <td>{{ formatRupiah(row.hpp, { maxFraction: 2 }) }}</td>
              <td>
                <span :class="['statusProduk', row.aktif === false ? 'nonaktif' : 'aktif']">
                  {{ row.aktif === false ? 'Nonaktif' : 'Aktif' }}
                </span>
              </td>
              <td>
                <div class="d-flex align-items-center gap-1 flex-wrap">
                  <button 
                    class="btnIcon btnEdit" 
                    title="Edit" 
                    @click="mulaiEdit(row)"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </button>
                  <button 
                    type="button" 
                    class="btnStatusProduk" 
                    @click="toggleStatus(row)" 
                    :title="row.aktif === false ? 'Aktifkan produk' : 'Nonaktifkan produk'"
                  >
                    {{ row.aktif === false ? 'Aktifkan' : 'Nonaktifkan' }}
                  </button>
                  <button 
                    class="btnIcon btnHapus" 
                    title="Hapus" 
                    @click="hapusProduk(row)"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script>
/**
 * Halaman master data produk - kelola data produk (tambah, ubah, hapus) dan konfigurasi HPP
 */
import { supabase } from '@/services/supabase';
import { formatKode, formatRupiah, formatNominal, parseNominal } from '@/utils/currency';
import { validasiProduk } from '@/utils/calculations';
import { showToast, confirmAction } from '@/services/notification';

/**
 * Komponen View untuk halaman Master Data Produk
 * Digunakan untuk mengelola data produk termasuk tambah, edit, hapus, dan ubah status
 */
export default {
  name: 'MasterDataView',
  data() {
    return {
      // Array untuk menyimpan data produk dari database
      produkData: [],
      // Query pencarian produk berdasarkan kode atau nama
      searchQuery: '',
      // Pesan status yang ditampilkan kepada pengguna
      statusMessage: 'Menghubungkan ke database...',
      // Flag untuk menandai sedang proses submit form
      isSubmitting: false,
      // Form input untuk tambah produk baru
      formNama: '',
      formHppDisplay: '',
      // State untuk mode edit produk
      editingId: null,
      editForm: {
        nama: '',
        hppDisplay: ''
      }
    };
  },
  computed: {
    /**
     * Computed property untuk mendapatkan daftar produk yang sudah difilter berdasarkan search query
     * Jika tidak ada query, tampilkan semua produk
     * @returns {Array} Array produk yang sudah difilter
     */
    filteredProduk() {
      // Normalisasi query pencarian ke lowercase untuk perbandingan
      const query = this.searchQuery.trim().toLocaleLowerCase('id-ID');
      // Jika tidak ada query, kembalikan semua data produk
      if (!query) return this.produkData;
      // Filter produk berdasarkan kode atau nama yang cocok dengan query
      return this.produkData.filter(item => {
        const kode = formatKode(item.id).toLocaleLowerCase('id-ID');
        const nama = String(item.nama_produk || '').toLocaleLowerCase('id-ID');
        return kode.includes(query) || nama.includes(query);
      });
    }
  },
  methods: {
    // Import utility functions
    formatKode,
    formatRupiah,

    /**
     * Handler untuk input HPP pada form tambah produk
     * Mengformat input menjadi format nominal Rupiah saat pengguna mengetik
     * @param {Event} e - Event dari input field
     */
    onHppInput(e) {
      this.formHppDisplay = formatNominal(e.target.value);
    },

    /**
     * Handler untuk input HPP pada form edit produk
     * Mengformat input menjadi format nominal Rupiah saat pengguna mengetik
     * @param {Event} e - Event dari input field
     */
    onEditHppInput(e) {
      this.editForm.hppDisplay = formatNominal(e.target.value);
    },

    /**
     * Memuat data produk dari database Supabase
     * Mengambil semua produk dan menyimpannya ke state lokal
     */
    async muatProduk() {
      this.statusMessage = 'Memuat data produk...';
      // Ambil session untuk debugging (opsional)
      const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        console.log('SESSION:', sessionData.session);
        console.log('USER:', sessionData.session?.user);

      // Query produk dari tabel 'produk' di database, urut berdasarkan ID ascending
      const { data, error } = await supabase.from('produk').select('*').order('id', { ascending: true });
      // Tangani jika terjadi error saat pengambilan data
      if (error) {
        this.statusMessage = 'Gagal memuat produk: ' + error.message;
        showToast('Gagal memuat produk: ' + error.message, 'error');
        return;
      }
      // Simpan data ke state lokal
      this.produkData = data || [];
      // Update pesan status dengan jumlah produk
      this.statusMessage = `${this.produkData.length} produk terdaftar.`;
    },

    /**
     * Menambahkan produk baru ke database
     * Validasi input sebelum submit ke database
     */
    async tambahProduk() {
      // Bersihkan whitespace dari input nama
      const namaBersih = this.formNama.trim();
      // Parse nominal HPP dari format Rupiah ke angka
      const hpp = parseNominal(this.formHppDisplay);
      // Validasi: cek apakah HPP diisi dan validasi nama produk (unik, tidak kosong)
      const pesan = !this.formHppDisplay.trim() ? 'HPP wajib diisi.' : validasiProduk(namaBersih, hpp, this.produkData);
      // Tampilkan pesan error jika validasi gagal
      if (pesan) {
        showToast(pesan, 'warning');
        return;
      }

      // Set flag submitting untuk disable button sementara
      this.isSubmitting = true;
      // Insert produk baru ke database
      const { error } = await supabase.from('produk').insert([{
        nama_produk: namaBersih,
        hpp,
        aktif: true
      }]);
      this.isSubmitting = false;

      // Tangani error dari Supabase (constraint violation, dll)
      if (error) {
        const errText = error.code === '23505'
          ? 'Nama produk tersebut sudah terdaftar. Gunakan nama yang berbeda.'
          : 'Gagal menambah produk: ' + error.message;
        showToast(errText, 'error');
        return;
      }

      // Reset form dan muat ulang data produk
      showToast(`Produk "${namaBersih}" berhasil ditambahkan!`, 'success');
      this.formNama = '';
      this.formHppDisplay = '';
      await this.muatProduk();
    },

    /**
     * Memulai mode edit untuk produk tertentu
     * Menyimpan data produk ke form edit dan set editingId
     * @param {Object} row - Objek produk yang akan diedit
     */
    mulaiEdit(row) {
      this.editingId = row.id;
      // Inisialisasi form edit dengan data produk yang akan diubah
      this.editForm = {
        nama: row.nama_produk,
        hppDisplay: formatNominal(row.hpp)
      };
    },

    /**
     * Membatalkan mode edit dan menutup form
     */
    batalEdit() {
      this.editingId = null;
    },

    /**
     * Menyimpan perubahan produk ke database
     * Validasi input sebelum update
     * @param {number} id - ID produk yang akan diperbarui
     */
    async simpanEdit(id) {
      // Bersihkan whitespace dari input
      const namaBaru = this.editForm.nama.trim();
      const hppBaru = parseNominal(this.editForm.hppDisplay);
      // Validasi input HPP dan nama produk
      const pesan = !this.editForm.hppDisplay.trim() ? 'HPP wajib diisi.' : validasiProduk(namaBaru, hppBaru, this.produkData, id);
      // Tampilkan pesan error jika validasi gagal
      if (pesan) {
        showToast(pesan, 'warning');
        return;
      }

      // Update produk di database berdasarkan ID
      const { error } = await supabase.from('produk').update({
        nama_produk: namaBaru,
        hpp: hppBaru
      }).eq('id', id);

      // Tangani error jika update gagal
      if (error) {
        const errText = error.code === '23505'
          ? 'Nama produk tersebut sudah terdaftar. Gunakan nama yang berbeda.'
          : 'Gagal mengubah produk: ' + error.message;
        showToast(errText, 'error');
        return;
      }

      // Tampilkan sukses dan muat ulang data
      showToast(`Produk "${namaBaru}" berhasil diperbarui!`, 'success');
      this.editingId = null;
      await this.muatProduk();
    },

    /**
     * Mengubah status aktif/nonaktif produk
     * Menampilkan konfirmasi sebelum mengubah status
     * @param {Object} row - Objek produk yang akan diubah statusnya
     */
    async toggleStatus(row) {
      // Tentukan status baru (toggle dari status saat ini)
      const akanAktif = row.aktif === false;
      const pesan = akanAktif
        ? `Aktifkan kembali "${row.nama_produk}"? Produk akan muncul di pilihan transaksi baru.`
        : `Nonaktifkan "${row.nama_produk}"? Produk tidak akan muncul di pilihan pesanan dan stok baru. Riwayat lama tetap tersimpan.`;

      // Tampilkan dialog konfirmasi
      const confirmed = await confirmAction(pesan, {
        title: akanAktif ? 'Aktifkan Produk' : 'Nonaktifkan Produk',
        confirmText: akanAktif ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan',
        confirmVariant: akanAktif ? 'success' : 'warning'
      });
      // Jika pengguna membatalkan, hentikan operasi
      if (!confirmed) return;

      // Update status produk di database
      const { error } = await supabase.from('produk').update({ aktif: akanAktif }).eq('id', row.id);
      if (error) {
        showToast('Gagal mengubah status produk: ' + error.message, 'error');
        return;
      }

      // Tampilkan pesan sukses dan muat ulang data
      showToast(`Status produk "${row.nama_produk}" berhasil diubah menjadi ${akanAktif ? 'Aktif' : 'Nonaktif'}.`, 'success');
      await this.muatProduk();
    },

    /**
     * Menghapus produk dari database
     * Menampilkan konfirmasi sebelum menghapus
     * @param {Object} row - Objek produk yang akan dihapus
     */
    async hapusProduk(row) {
      // Tampilkan dialog konfirmasi dengan peringatan
      const confirmed = await confirmAction(
        `Hapus produk "${row.nama_produk}"? Produk yang sudah dipakai pada pesanan atau transaksi stok tidak dapat dihapus agar riwayat tetap tersimpan.`,
        {
          title: 'Hapus Produk',
          confirmText: 'Ya, Hapus',
          confirmVariant: 'danger'
        }
      );
      // Jika pengguna membatalkan, hentikan operasi
      if (!confirmed) return;

      // Hapus produk dari database berdasarkan ID
      const { error } = await supabase.from('produk').delete().eq('id', row.id);
      if (error) {
        showToast('Gagal menghapus produk: ' + error.message, 'error');
        return;
      }

      // Tampilkan pesan sukses dan muat ulang data
      showToast(`Produk "${row.nama_produk}" berhasil dihapus.`, 'success');
      await this.muatProduk();
    }
  },

  /**
   * Lifecycle hook - dipanggil saat komponen berhasil mount ke DOM
   * Langsung memuat data produk saat halaman dibuka
   */
  mounted() {
    this.muatProduk();
  }
};
</script>
