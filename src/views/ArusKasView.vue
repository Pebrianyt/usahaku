<template>
  <main class="page-container">
    <header class="pagehead">
      <h1>Arus Kas</h1>
      <p>Pantau uang penjualan yang diterima, pembayaran stok, dan biaya usaha.</p>
    </header>

    <p id="status" role="status" aria-live="polite" class="text-secondary small mb-3">
      {{ statusMessage }}
    </p>

    <!-- Period Filter -->
    <section class="kasPeriodFilter d-flex align-items-center gap-2 mb-3" aria-label="Filter periode arus kas">
      <label for="filterBulanKas" class="mb-0 fw-medium">Ringkasan bulan</label>
      <input type="month" id="filterBulanKas" v-model="filterBulan" class="form-control" style="width: auto;">
    </section>

    <!-- Cards Summary -->
    <section class="cards" aria-label="Ringkasan metrik">
      <article class="card">
        <h2 class="label">Saldo Awal Periode</h2>
        <div class="value">{{ formatRupiah(ringkasan.saldoAwal) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Uang Masuk Periode</h2>
        <div class="value">{{ formatRupiah(ringkasan.totalMasuk) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Uang Keluar Periode</h2>
        <div class="value">{{ formatRupiah(ringkasan.totalKeluar) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Saldo Akhir Periode</h2>
        <div class="value">{{ formatRupiah(ringkasan.saldoAkhirPeriode) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Saldo Bisnis Hari Ini</h2>
        <div class="value">{{ formatRupiah(ringkasan.saldoBisnisHariIni) }}</div>
      </article>
    </section>

    <!-- Form Kas -->
    <form id="formKas" @submit.prevent="submitKas" class="mb-4">
      <h2 id="judulFormKas" class="w-100 fs-6 fw-bold mb-2">
        {{ transaksiDieditId ? 'Edit Transaksi Kas' : 'Catat Transaksi Kas' }}
      </h2>
      <div class="fieldGroup">
        <label for="inputTanggal">Tanggal transaksi</label>
        <input type="date" id="inputTanggal" v-model="formTanggal" required>
      </div>
      <div class="fieldGroup">
        <label for="selectJenis">Jenis transaksi</label>
        <select id="selectJenis" v-model="formJenis" @change="onJenisChange" required>
          <option value="Saldo Awal" :disabled="saldoAwalSudahAda && !isEditingSaldoAwal">Saldo Awal</option>
          <option value="Masuk">Masuk</option>
          <option value="Keluar">Keluar</option>
        </select>
      </div>
      <div class="fieldGroup">
        <label for="selectKategoriKas">Kategori</label>
        <select id="selectKategoriKas" v-model="formKategori" required>
          <option value="" disabled>-- pilih kategori --</option>
          <option v-for="kat in kategoriOptions" :key="kat" :value="kat">{{ kat }}</option>
        </select>
        <small id="petunjukKategoriKas" class="kasFieldHint text-secondary">{{ petunjukKategori }}</small>
      </div>
      <div class="fieldGroup">
        <label for="inputNominal">Nominal</label>
        <div class="inputRupiah">
          <span class="prefix">Rp</span>
          <input 
            type="text" 
            id="inputNominal" 
            v-model="formNominalDisplay" 
            @input="onNominalInput" 
            inputmode="decimal" 
            placeholder="0" 
            required
          >
        </div>
      </div>
      <div class="fieldGroup kasRincianKas flex-grow-1" style="min-width: 200px;">
        <label for="inputKeterangan">Rincian transaksi</label>
        <input type="text" id="inputKeterangan" v-model="formKeterangan" placeholder="Keterangan..." required>
      </div>
      <div class="kasFormActions d-flex align-items-center gap-2">
        <button 
          type="submit" 
          class="btnIcon btnTambah" 
          :title="transaksiDieditId ? 'Simpan perubahan' : 'Simpan transaksi'" 
          :aria-label="transaksiDieditId ? 'Simpan perubahan' : 'Simpan transaksi'"
          :disabled="isSubmitting"
        ></button>
        <button 
          v-if="transaksiDieditId" 
          type="button" 
          id="btnBatalEditKas" 
          class="btnTambahProduk" 
          @click="batalEditKas"
        >
          Batalkan edit
        </button>
      </div>
    </form>

    <!-- Riwayat Transaksi Table -->
    <h2 class="fs-5 fw-bold mb-2">Riwayat Transaksi Bulan Terpilih</h2>
    <div class="tableScroll table-responsive">
      <table class="table align-middle">
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Jenis</th>
            <th scope="col">Kategori</th>
            <th scope="col">Keterangan</th>
            <th scope="col">Nominal</th>
            <th scope="col" style="width: 100px;">Aksi</th>
          </tr>
        </thead>
        <tbody id="tabelKas">
          <tr v-if="ringkasan.listBulan.length === 0">
            <td colspan="6" class="text-center py-4 text-secondary">
              Belum ada transaksi kas pada bulan ini.
            </td>
          </tr>
          <tr v-for="t in ringkasan.listBulan" :key="t.id">
            <td>{{ t.tanggal }}</td>
            <td>
              <span :class="['badge', t.jenis === 'Masuk' ? 'bg-success' : (t.jenis === 'Keluar' ? 'bg-danger' : 'bg-primary')]">
                {{ t.jenis }}
              </span>
            </td>
            <td>{{ t.kategori || '-' }}</td>
            <td>{{ t.keterangan || '-' }}</td>
            <td :class="t.jenis === 'Keluar' ? 'text-danger fw-bold' : 'text-success fw-bold'">
              {{ formatRupiah(t.nominal) }}
            </td>
            <td>
              <div class="d-flex align-items-center gap-1">
                <button 
                  class="btnIcon btnEdit" 
                  title="Edit transaksi" 
                  @click="mulaiEditKas(t)"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                </button>
                <button 
                  class="btnIcon btnHapus" 
                  title="Hapus transaksi" 
                  @click="hapusKas(t)"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script>
import { supabase } from '@/services/supabase';
import { formatRupiah, formatNominal, parseNominal, tanggalLokal, bulanSekarang } from '@/utils/currency';
import { hitungRingkasanKas } from '@/utils/calculations';
import { showToast, confirmAction } from '@/services/notification';

/**
 * Halaman manajemen arus kas - mencatat dan memonitor uang masuk,
 * uang keluar, dan saldo kas berdasarkan kategori transaksi
 */
export default {
  name: 'ArusKasView',
  data() {
    return {
      /** Pesan status untuk menampilkan feedback ke pengguna */
      statusMessage: 'Memuat data arus kas...',
      /** Flag untuk mencegah double submit saat menyimpan */
      isSubmitting: false,
      /** Array menyimpan semua data transaksi kas dari database */
      transaksiKas: [],
      /** ID transaksi yang sedang diedit, null jika mode tambah baru */
      transaksiDieditId: null,
      /** Filter bulan dalam format YYYY-MM untuk menampilkan transaksi periode tertentu */
      filterBulan: bulanSekarang(),
      /** Tanggal untuk form input transaksi baru */
      formTanggal: tanggalLokal(),
      /** Jenis transaksi yang dipilih: Saldo Awal, Masuk, atau Keluar */
      formJenis: 'Saldo Awal',
      /** Kategori transaksi berdasarkan jenis yang dipilih */
      formKategori: 'Modal Awal',
      /** Nominal dalam format display (dengan titik sebagai pemisah ribuan) */
      formNominalDisplay: '',
      /** Keterangan/rincian tambahan untuk transaksi */
      formKeterangan: '',
      /** Mapping jenis transaksi ke daftar kategori yang tersedia */
      kategoriPerJenis: {
        'Saldo Awal': ['Modal Awal'],
        'Masuk': ['Pencairan Penjualan Shopee', 'Pendapatan Lain', 'Lainnya'],
        'Keluar': ['Pembelian Stok', 'Biaya Operasional', 'Pengambilan Pribadi', 'Lainnya']
      },
      /** Petunjuk/hint untuk setiap kategori tertentu */
      petunjukMap: {
        'Modal Awal': 'Catat sekali saat mulai menggunakan aplikasi.',
        'Pencairan Penjualan Shopee': 'Masukkan jumlah bersih yang benar-benar diterima dari Shopee.',
        'Pembelian Stok': 'Pembayaran stok dicatat di sini; HPP penjualan dihitung dari menu Stok.',
        'Biaya Operasional': 'Transaksi ini otomatis dihitung sebagai biaya operasional di Laba Rugi.'
      }
    };
  },
  computed: {
    /**
     * Mengambil daftar kategori berdasarkan jenis transaksi yang dipilih.
     * Digunakan untuk populate dropdown kategori di form.
     * @returns {string[]} Array nama kategori yang tersedia untuk jenis tersebut
     */
    kategoriOptions() {
      return this.kategoriPerJenis[this.formJenis] || [];
    },
    /**
     * Mengambil petunjuk/hint untuk kategori yang sedang dipilih.
     * Menampilkan panduan singkat kepada pengguna tentang cara mengisi kategori.
     * @returns {string} Teks petunjuk atau string kosong jika tidak ada
     */
    petunjukKategori() {
      return this.petunjukMap[this.formKategori] || '';
    },
    /**
     * Memeriksa apakah saldo awal usaha sudah pernah dicatat.
     * Constraint: hanya boleh ada satu transaksi saldo awal.
     * @returns {boolean} True jika saldo awal sudah ada
     */
    saldoAwalSudahAda() {
      return this.transaksiKas.some(r => r.jenis === 'Saldo Awal');
    },
    /**
     * Memeriksa apakah sedang mengedit transaksi saldo awal yang sudah ada.
     * Digunakan untuk mengaktifkan opsi "Saldo Awal" di dropdown saat edit.
     * @returns {boolean} True jika transaksi yang diedit adalah saldo awal
     */
    isEditingSaldoAwal() {
      const current = this.transaksiKas.find(r => r.id === this.transaksiDieditId);
      return current?.jenis === 'Saldo Awal';
    },
    /**
     * Menghitung ringkasan arus kas untuk periode yang dipilih.
     * Includes: saldo awal, total masuk, total keluar, saldo akhir periode,
     * dan saldo bisnis hari ini (saldo akhir dari transaksi terakhir).
     * @returns {object} Object berisi ringkasan dengan properti saldoAwal, totalMasuk, totalKeluar, dll
     */
    ringkasan() {
      return hitungRingkasanKas(this.transaksiKas, this.filterBulan);
    }
  },
  methods: {
    formatRupiah,
    /**
     * Handler untuk input nominal - format angka dengan pemisah ribuan.
     * Dipanggil saat pengguna mengetik di field nominal.
     * @param {Event} e - Event dari input field
     */
    onNominalInput(e) {
      this.formNominalDisplay = formatNominal(e.target.value);
    },
    /**
     * Handler saat jenis transaksi berubah.
     * Otomatis memilih kategori pertama yang tersedia untuk jenis tersebut.
     */
    onJenisChange() {
      const options = this.kategoriOptions;
      this.formKategori = options.length ? options[0] : '';
    },
    /**
     * Memuat semua data transaksi kas dari database Supabase.
     * Mengurutkan berdasarkan tanggal secara descending (terbaru dulu).
     * Setelah memuat, cek apakah saldo awal sudah ada - jika sudah,
     * switch form ke mode "Masuk" agar tidak duplikat.
     */
    async muatKas() {
      this.statusMessage = 'Memuat transaksi arus kas...';
      const { data, error } = await supabase.from('transaksi_kas').select('*').order('tanggal', { ascending: false });
      if (error) {
        this.statusMessage = 'Gagal memuat kas: ' + error.message;
        showToast('Gagal memuat kas: ' + error.message, 'error');
        return;
      }

      this.transaksiKas = data || [];
      // Jika saldo awal sudah ada dan form masih di mode Saldo Awal, switch ke Masuk
      // Kecuali jika sedang dalam mode edit saldo awal itu sendiri
      if (this.saldoAwalSudahAda && this.formJenis === 'Saldo Awal' && !this.transaksiDieditId) {
        this.formJenis = 'Masuk';
        this.onJenisChange();
      }

      const hasAwal = this.saldoAwalSudahAda;
      this.statusMessage = `${this.transaksiKas.length} transaksi kas tercatat. ${hasAwal ? 'Modal awal usaha sudah dicatat.' : 'Modal awal usaha belum dicatat.'}`;
    },
    /**
     * Menyimpan transaksi baru atau memperbarui transaksi yang diedit.
     * Validasi: tanggal, kategori, keterangan wajib diisi, nominal harus > 0.
     * Constraint: saldo awal hanya boleh ada satu di sistem.
     */
    async submitKas() {
      const tgl = this.formTanggal;
      const jenis = this.formJenis;
      const kat = this.formKategori;
      const nominal = parseNominal(this.formNominalDisplay);
      const ket = this.formKeterangan.trim();

      // Validasi form: semua field wajib diisi dan nominal harus positif
      if (!tgl || !kat || !ket || !Number.isFinite(nominal) || nominal <= 0) {
        showToast('Tanggal, kategori, rincian, dan nominal lebih besar dari nol wajib diisi.', 'warning');
        return;
      }

      // Constraint: saldo awal hanya boleh ada satu, kecuali sedang mengedit yang sama
      if (jenis === 'Saldo Awal' && this.transaksiKas.some(row => row.jenis === 'Saldo Awal' && String(row.id) !== String(this.transaksiDieditId || ''))) {
        showToast('Saldo awal hanya dicatat satu kali, saat mulai menggunakan aplikasi.', 'warning');
        return;
      }

      this.isSubmitting = true;
      const payload = { tanggal: tgl, jenis, kategori: kat, nominal, keterangan: ket };

      // Pilih operasi insert atau update berdasarkan mode edit
      const { error } = this.transaksiDieditId
        ? await supabase.from('transaksi_kas').update(payload).eq('id', this.transaksiDieditId)
        : await supabase.from('transaksi_kas').insert([payload]);

      this.isSubmitting = false;

      if (error) {
        showToast(`Gagal ${this.transaksiDieditId ? 'mengubah' : 'menyimpan'} transaksi: ` + error.message, 'error');
        return;
      }

      showToast(`Transaksi ${jenis} berhasil ${this.transaksiDieditId ? 'diperbarui' : 'disimpan'}!`, 'success');
      this.batalEditKas();
      await this.muatKas();
    },
    /**
     * Memulai mode edit transaksi - mengisi form dengan data dari baris yang dipilih.
     * Scroll ke atas agar form terlihat oleh pengguna.
     * @param {object} row - Object data transaksi yang akan diedit
     */
    mulaiEditKas(row) {
      this.transaksiDieditId = row.id;
      this.formTanggal = row.tanggal;
      this.formJenis = row.jenis;
      this.formKategori = row.kategori || '';
      this.formNominalDisplay = formatNominal(row.nominal);
      this.formKeterangan = row.keterangan || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    /**
     * Membatalkan mode edit dan mereset form ke kondisi awal.
     * Jika saldo awal belum ada, reset ke mode "Saldo Awal".
     * Jika sudah ada, reset ke mode "Masuk".
     */
    batalEditKas() {
      this.transaksiDieditId = null;
      this.formTanggal = tanggalLokal();
      this.formJenis = this.saldoAwalSudahAda ? 'Masuk' : 'Saldo Awal';
      this.onJenisChange();
      this.formNominalDisplay = '';
      this.formKeterangan = '';
    },
    /**
     * Menghapus transaksi kas dari database.
     * Menampilkan konfirmasi terlebih dahulu sebelum menghapus.
     * Jika transaksi yang dihapus sedang dalam mode edit, reset form.
     * @param {object} row - Object data transaksi yang akan dihapus
     */
    async hapusKas(row) {
      const confirmed = await confirmAction(
        `Hapus transaksi ${row.jenis} ${formatRupiah(row.nominal)} tanggal ${row.tanggal}?`,
        {
          title: 'Hapus Transaksi Kas',
          confirmText: 'Ya, Hapus',
          confirmVariant: 'danger'
        }
      );
      if (!confirmed) return;

      const { error } = await supabase.from('transaksi_kas').delete().eq('id', row.id);
      if (error) {
        showToast('Gagal menghapus transaksi: ' + error.message, 'error');
        return;
      }

      showToast('Transaksi kas berhasil dihapus.', 'success');
      // Jika transaksi yang dihapus sedang dalam mode edit, reset form
      if (this.transaksiDieditId === row.id) {
        this.batalEditKas();
      }
      await this.muatKas();
    }
  },
  mounted() {
    this.muatKas();
  }
};
</script>
