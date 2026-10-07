<template>
  <main class="page-container">
    <header class="pagehead">
      <h1>Laporan Laba Rugi</h1>
      <p>Lihat hasil penjualan yang sudah terealisasi dan perkiraan hasil dari seluruh pesanan.</p>
    </header>

    <section class="reportFilter d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3" aria-label="Filter laporan">
      <div class="d-flex align-items-center gap-2">
        <label for="filterBulanLabaRugi" class="mb-0 fw-medium">Bulan laporan</label>
        <input type="month" id="filterBulanLabaRugi" v-model="filterBulan" class="form-control" style="width: auto;">
      </div>
      <button 
        type="button" 
        id="unduhPdf" 
        class="btnDownload" 
        @click="unduhLaporanPdf" 
        :disabled="isLoading"
      >
        Unduh Laporan Laba Rugi PDF
      </button>
    </section>

    <p id="status" role="status" aria-live="polite" class="text-secondary small mb-3">
      {{ statusMessage }}
    </p>

    <!-- Cards Summary -->
    <section class="cards" aria-label="Ringkasan metrik">
      <article class="card">
        <h2 class="label">Omzet Realisasi</h2>
        <div class="value">{{ formatRupiah(labaRugiData.omzetRealisasi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Omzet Potential</h2>
        <div class="value">{{ formatRupiah(labaRugiData.omzetPotential) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Total Omzet</h2>
        <div class="value">{{ formatRupiah(labaRugiData.totalOmzet) }}</div>
      </article>
      <article class="card">
        <h2 class="label">HPP Realisasi</h2>
        <div class="value">{{ formatRupiah(labaRugiData.hppRealisasi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">HPP Proyeksi Total</h2>
        <div class="value">{{ formatRupiah(labaRugiData.hppBulan) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Laba Kotor Realisasi</h2>
        <div class="value">{{ formatRupiah(labaRugiData.labaKotorRealisasi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Laba Kotor Proyeksi</h2>
        <div class="value">{{ formatRupiah(labaRugiData.labaKotorProyeksi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Biaya Operasional</h2>
        <div class="value">{{ formatRupiah(labaRugiData.biayaOperasional) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Laba Bersih Realisasi</h2>
        <div class="value">{{ formatRupiah(labaRugiData.labaBersihRealisasi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Laba Bersih Proyeksi</h2>
        <div class="value">{{ formatRupiah(labaRugiData.labaBersihProyeksi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Margin Kotor Realisasi</h2>
        <div class="value">{{ labaRugiData.gpmRealisasi.toFixed(2) }}%</div>
      </article>
      <article class="card">
        <h2 class="label">Margin Kotor Proyeksi</h2>
        <div class="value">{{ labaRugiData.gpmProyeksi.toFixed(2) }}%</div>
      </article>
      <article class="card">
        <h2 class="label">Margin Bersih Realisasi</h2>
        <div class="value">{{ labaRugiData.npmRealisasi.toFixed(2) }}%</div>
      </article>
      <article class="card">
        <h2 class="label">Margin Bersih Proyeksi</h2>
        <div class="value">{{ labaRugiData.npmProyeksi.toFixed(2) }}%</div>
      </article>
    </section>

    <!-- Table 1: Rincian Omzet per Pesanan -->
    <h2 class="fs-5 fw-bold mb-2">Rincian Omzet per Pesanan</h2>
    <div class="tableScroll table-responsive mb-4">
      <table class="table align-middle">
        <thead>
          <tr>
            <th scope="col">Tanggal Pesanan</th>
            <th scope="col">No Pesanan</th>
            <th scope="col">Status Pesanan</th>
            <th scope="col">Penghasilan Akhir</th>
            <th scope="col">Total HPP</th>
            <th scope="col">Profit Penjualan</th>
            <th scope="col">Kelengkapan HPP</th>
          </tr>
        </thead>
        <tbody id="tabelOmzet">
          <tr v-if="labaRugiData.rincianPesanan.length === 0">
            <td colspan="7" class="text-center py-4 text-secondary">
              Belum ada pesanan pada bulan ini.
            </td>
          </tr>
          <tr v-for="item in labaRugiData.rincianPesanan" :key="item.noPesanan + '-' + item.tanggal">
            <td>{{ item.tanggal }}</td>
            <td class="fw-bold">{{ item.noPesanan }}</td>
            <td>
              <span :class="['badge', item.status === 'Realisasi' ? 'bg-success' : 'bg-warning text-dark']">
                {{ item.status }}
              </span>
            </td>
            <td>{{ formatRupiah(item.total) }}</td>
            <td>
              {{ item.hppLengkap ? formatRupiah(item.hpp) : `${formatRupiah(item.hpp)} (belum lengkap)` }}
            </td>
            <td :class="item.hppLengkap ? (item.total - item.hpp >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold') : 'text-secondary'">
              {{ item.hppLengkap ? formatRupiah(item.total - item.hpp) : 'Perlu diperiksa' }}
            </td>
            <td>
              <span :class="['badge', item.hppLengkap ? 'bg-success' : 'bg-secondary']">
                {{ item.hppLengkap ? 'Lengkap' : 'Perlu diperiksa' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Table 2: Rincian Biaya Operasional -->
    <h2 class="fs-5 fw-bold mb-2">Rincian Biaya Operasional</h2>
    <div class="tableScroll table-responsive mb-3">
      <table class="table align-middle">
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Kategori</th>
            <th scope="col">Keterangan</th>
            <th scope="col">Nominal</th>
          </tr>
        </thead>
        <tbody id="tabelBiaya">
          <tr v-if="labaRugiData.biayaOperasionalList.length === 0">
            <td colspan="4" class="text-center py-4 text-secondary">
              Belum ada biaya operasional pada bulan ini.
            </td>
          </tr>
          <tr v-for="item in labaRugiData.biayaOperasionalList" :key="item.id">
            <td>{{ item.tanggal }}</td>
            <td>{{ item.kategori || 'Biaya Operasional' }}</td>
            <td>{{ item.keterangan || '-' }}</td>
            <td class="text-danger fw-bold">{{ formatRupiah(item.nominal) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="reportNote text-secondary small">
      Proyeksi mencakup pesanan pending. Laba realisasi hanya memakai pesanan yang sudah berstatus Realisasi. Biaya operasional dikurangi dari kedua hasil. Pencairan Shopee dicatat di Arus Kas dan tidak ditambahkan lagi sebagai omzet.
    </p>
  </main>
</template>

<script>
import { supabase } from '@/services/supabase';
import { formatRupiah, bulanSekarang } from '@/utils/currency';
import { hitungLabaRugi } from '@/utils/calculations';
import { showToast } from '@/services/notification';
import { jsPDF } from 'jspdf';

export default {
  name: 'LabaRugiView',
  data() {
    return {
      filterBulan: bulanSekarang(),
      statusMessage: 'Memuat laporan laba rugi...',
      isLoading: true,
      pesanan: [],
      transaksiStok: [],
      alokasiStok: [],
      transaksiKas: []
    };
  },
  computed: {
    labaRugiData() {
      return hitungLabaRugi(
        this.pesanan,
        this.transaksiStok,
        this.alokasiStok,
        this.transaksiKas,
        this.filterBulan
      );
    }
  },
  methods: {
    formatRupiah,
    async ambilSemua(tabel, kolom, orderKolom = 'id') {
      const semua = [];
      const ukuranHalaman = 1000;
      for (let awal = 0; ; awal += ukuranHalaman) {
        const { data, error } = await supabase.from(tabel).select(kolom)
          .order(orderKolom, { ascending: true })
          .range(awal, awal + ukuranHalaman - 1);
        if (error) return { data: null, error };
        semua.push(...(data || []));
        if (!data || data.length < ukuranHalaman) break;
      }
      return { data: semua, error: null };
    },
    async muatData() {
      this.statusMessage = 'Memuat pesanan, stok, dan transaksi kas...';
      this.isLoading = true;
      const hasil = await Promise.all([
        this.ambilSemua('pesanan', 'id, no_pesanan, tanggal_pesanan, total_penghasilan_akhir, status'),
        this.ambilSemua('transaksi_stok', 'id, tanggal, jenis, qty, sumber, pesanan_id'),
        this.ambilSemua('alokasi_stok_fifo', 'id, transaksi_keluar_id, qty, harga_satuan'),
        this.ambilSemua('transaksi_kas', 'id, tanggal, jenis, kategori, nominal, keterangan')
      ]);

      const gagal = hasil.find(item => item.error);
      this.isLoading = false;
      if (gagal) {
        this.statusMessage = 'Gagal memuat data: ' + gagal.error.message;
        showToast('Gagal memuat data: ' + gagal.error.message, 'error');
        return;
      }

      this.pesanan = hasil[0].data || [];
      this.transaksiStok = hasil[1].data || [];
      this.alokasiStok = hasil[2].data || [];
      this.transaksiKas = hasil[3].data || [];

      this.statusMessage = 'Laporan siap ditampilkan.';
    },
    unduhLaporanPdf() {
      try {
        const bulan = this.filterBulan;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const data = this.labaRugiData;
        const [tahun, nomorBulan] = bulan.split('-').map(Number);
        const dateObj = new Date(tahun, nomorBulan - 1, 1);
        const namaBulan = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const margin = 14;
        const left = margin;
        const leftWidth = 160;
        const right = left + leftWidth + 8;
        const ink = [27, 36, 48];
        const sub = [107, 116, 128];

        // Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(...ink);
        doc.text('UsahaKu', margin, 20);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(...sub);
        doc.text(`Laporan Laba Rugi — Periode ${namaBulan}`, margin, 27);

        // Left Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...ink);
        doc.text('Ringkasan Keuangan', left, 49);

        doc.setFillColor(23, 43, 67);
        doc.roundedRect(left, 55, leftWidth, 12, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('Komponen Laporan', left + 4, 63);
        doc.text('Nilai', left + leftWidth - 4, 63, { align: 'right' });

        const ringkasan = [
          ['Pendapatan', formatRupiah(data.omzetRealisasi), false],
          ['Jumlah Beban Pokok Penjualan', formatRupiah(data.hppRealisasi), false],
          ['Laba Kotor', formatRupiah(data.labaKotorRealisasi), true],
          ['Biaya Operasional', formatRupiah(data.biayaOperasional), false],
          ['Laba Bersih', formatRupiah(data.labaBersihRealisasi), true]
        ];

        let rowY = 67;
        ringkasan.forEach((row, index) => {
          if (index % 2 === 0) {
            doc.setFillColor(247, 245, 241);
            doc.rect(left, rowY, leftWidth, 10, 'F');
          }
          doc.setFont('helvetica', row[2] ? 'bold' : 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...ink);
          doc.text(row[0], left + 4, rowY + 6.6);
          doc.text(row[1], left + leftWidth - 4, rowY + 6.6, { align: 'right' });
          rowY += 10;
        });

        // Right Margin Analysis Boxes
        const buatKotakMargin = (y, judul, nilai) => {
          doc.setFillColor(247, 245, 241);
          doc.setDrawColor(231, 227, 219);
          doc.roundedRect(right, y, 93, 42, 3, 3, 'FD');
          doc.setFillColor(23, 43, 67);
          doc.roundedRect(right, y, 93, 10, 3, 3, 'F');
          doc.rect(right, y + 6, 93, 4, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text(judul, right + 46.5, y + 7, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...sub);
          doc.text('Realisasi', right + 6, y + 21);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...ink);
          doc.text(nilai, right + 87, y + 21, { align: 'right' });
        };

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...ink);
        doc.text('Analisis Margin', right, 49);
        buatKotakMargin(55, 'MARGIN LABA KOTOR', `${data.gpmRealisasi.toFixed(2)}%`);
        buatKotakMargin(105, 'MARGIN LABA BERSIH', `${data.npmRealisasi.toFixed(2)}%`);

        // Notes Box
        doc.setFillColor(247, 245, 241);
        doc.roundedRect(right, 155, 93, 25, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...ink);
        doc.text('Catatan', right + 5, 163);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...sub);
        doc.text('Laporan hanya memuat transaksi realisasi.', right + 5, 169);
        doc.text('HPP dihitung berdasarkan FIFO.', right + 5, 175);

        // Footer Line
        doc.setDrawColor(222, 216, 206);
        doc.line(margin, 193, 283, 193);
        doc.setFontSize(8);
        doc.setTextColor(...sub);
        doc.text('UsahaKu · Laporan internal', margin, 199);

        doc.save(`Laporan-Laba-Rugi-${bulan}.pdf`);
        showToast('Laporan Laba Rugi PDF berhasil diunduh!', 'success');
      } catch (err) {
        showToast('Gagal membuat PDF: ' + err.message, 'error');
      }
    }
  },
  mounted() {
    this.muatData();
  }
};
</script>
