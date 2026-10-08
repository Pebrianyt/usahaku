<template>
  <main class="page-container">
    <header class="pagehead">
      <h1>Dashboard</h1>
      <p>Pantau pesanan, omzet, laba, saldo kas, dan produk terlaris dalam satu halaman.</p>
    </header>

    <section class="reportFilter dashboardFilter mb-3" aria-label="Filter periode dashboard">
      <label for="filterBulanDashboard" class="form-label me-2 mb-0 fw-medium">Pilih bulan</label>
      <input 
        type="month" 
        id="filterBulanDashboard" 
        v-model="selectedMonth" 
        class="form-control d-inline-block" 
        style="width: auto; max-width: 220px;"
      >
    </section>

    <p id="status" role="status" aria-live="polite" class="text-secondary small mb-3">
      {{ statusMessage }}
    </p>

    <!-- Cards Summary -->
    <section class="cards" aria-label="Ringkasan metrik">
      <article class="card">
        <h2 class="label">Jumlah Nomor Pesanan</h2>
        <div class="value">{{ summary.totalPesanan }}</div>
      </article>
      <article class="card">
        <h2 class="label">Omzet Terealisasi</h2>
        <div class="value">{{ formatRupiah(summary.omzetRealisasi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Omzet Pesanan Pending</h2>
        <div class="value">{{ formatRupiah(summary.omzetPotential) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Total Omzet Proyeksi</h2>
        <div class="value">{{ formatRupiah(summary.omset) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Laba Bersih Terealisasi</h2>
        <div class="value">{{ formatRupiah(summary.labaBersihRealisasi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Laba Bersih Proyeksi</h2>
        <div class="value">{{ formatRupiah(summary.labaBersihProyeksi) }}</div>
      </article>
      <article class="card">
        <h2 class="label">Saldo Kas Terkini</h2>
        <div class="value">{{ formatRupiah(summary.saldoKas) }}</div>
      </article>
    </section>

    <!-- Charts Section -->
    <section class="dashboardCharts" aria-label="Grafik ringkasan dashboard">
      <!-- Chart 1: Pesanan per Bulan -->
      <article class="chartCard">
        <h2>Jumlah Pesanan per Bulan</h2>
        <p>Nomor pesanan yang sama dihitung satu kali, meski berisi beberapa produk.</p>
        <div class="dashboardChart table-responsive">
          <svg viewBox="0 0 860 310" class="w-100 h-auto" preserveAspectRatio="xMidYMid meet">
            <!-- Grid Lines & Labels -->
            <template v-for="tick in 5" :key="'tick-' + tick">
              <line 
                x1="58" 
                :y1="18 + 247 * (1 - (tick - 1) / 4)" 
                x2="842" 
                :y2="18 + 247 * (1 - (tick - 1) / 4)" 
                class="chartGridLine" 
              />
              <text 
                x="50" 
                :y="18 + 247 * (1 - (tick - 1) / 4) + 4" 
                text-anchor="end" 
                class="chartAxisLabel"
              >
                {{ Math.round(chartPesananMax * ((tick - 1) / 4)) }}
              </text>
            </template>

            <!-- Bars & X Labels -->
            <template v-for="(item, idx) in chartPesananData" :key="item.key">
              <rect 
                :x="58 + (784 / Math.max(chartPesananData.length, 1)) * idx + (784 / Math.max(chartPesananData.length, 1)) / 2 - 12"
                :y="18 + 247 - (item.count > 0 ? Math.max(2, 247 * item.count / chartPesananMax) : 0)"
                width="24"
                :height="item.count > 0 ? Math.max(2, 247 * item.count / chartPesananMax) : 0"
                rx="3"
                fill="var(--brand)"
                class="chartBar"
              >
                <title>{{ item.label }}: {{ item.count }} pesanan</title>
              </rect>
              <text 
                :x="58 + (784 / Math.max(chartPesananData.length, 1)) * idx + (784 / Math.max(chartPesananData.length, 1)) / 2"
                y="296" 
                text-anchor="middle" 
                class="chartAxisLabel"
              >
                {{ item.label }}
              </text>
            </template>
          </svg>
          <div class="chartLegend">
            <span><i style="background-color: #6E9B66;"></i>Jumlah Pesanan</span>
          </div>
        </div>
      </article>

      <!-- Chart 2: Perkembangan Omzet -->
      <article class="chartCard">
        <h2>Perkembangan Omzet</h2>
        <p>Omzet terealisasi dan omzet dari pesanan pending, berdasarkan tanggal pesanan.</p>
        <div class="dashboardChart table-responsive">
          <svg viewBox="0 0 860 310" class="w-100 h-auto" preserveAspectRatio="xMidYMid meet">
            <template v-for="tick in 5" :key="'omzet-tick-' + tick">
              <line 
                x1="58" 
                :y1="18 + 247 * (1 - (tick - 1) / 4)" 
                x2="842" 
                :y2="18 + 247 * (1 - (tick - 1) / 4)" 
                class="chartGridLine" 
              />
              <text 
                x="50" 
                :y="18 + 247 * (1 - (tick - 1) / 4) + 4" 
                text-anchor="end" 
                class="chartAxisLabel"
              >
                {{ formatPendek(chartOmzetMax * ((tick - 1) / 4)) }}
              </text>
            </template>

            <template v-for="(item, idx) in chartOmzetData" :key="item.key">
              <!-- Realisasi bar -->
              <rect 
                :x="58 + (784 / Math.max(chartOmzetData.length, 1)) * idx + (784 / Math.max(chartOmzetData.length, 1)) / 2 - 18"
                :y="18 + 247 - (item.realisasi > 0 ? Math.max(2, 247 * item.realisasi / chartOmzetMax) : 0)"
                width="16"
                :height="item.realisasi > 0 ? Math.max(2, 247 * item.realisasi / chartOmzetMax) : 0"
                rx="3"
                fill="var(--brand)"
                class="chartBar"
              >
                <title>{{ item.label }} — Realisasi: {{ formatRupiah(item.realisasi) }}</title>
              </rect>
              <!-- Pending bar -->
              <rect 
                :x="58 + (784 / Math.max(chartOmzetData.length, 1)) * idx + (784 / Math.max(chartOmzetData.length, 1)) / 2 + 2"
                :y="18 + 247 - (item.potential > 0 ? Math.max(2, 247 * item.potential / chartOmzetMax) : 0)"
                width="16"
                :height="item.potential > 0 ? Math.max(2, 247 * item.potential / chartOmzetMax) : 0"
                rx="3"
                fill="#D98E2B"
                class="chartBar"
              >
                <title>{{ item.label }} — Pending: {{ formatRupiah(item.potential) }}</title>
              </rect>
              <text 
                :x="58 + (784 / Math.max(chartOmzetData.length, 1)) * idx + (784 / Math.max(chartOmzetData.length, 1)) / 2"
                y="296" 
                text-anchor="middle" 
                class="chartAxisLabel"
              >
                {{ item.label }}
              </text>
            </template>
          </svg>
          <div class="chartLegend">
            <span><i style="background-color: #6E9B66;"></i>Realisasi</span>
            <span><i style="background-color: #D98E2B;"></i>Pesanan Pending</span>
          </div>
        </div>
      </article>

      <!-- Chart 3: Uang Masuk dan Keluar -->
      <article class="chartCard">
        <h2>Uang Masuk dan Keluar</h2>
        <p>Perbandingan uang masuk dan keluar yang dicatat pada menu Arus Kas.</p>
        <div class="dashboardChart table-responsive">
          <svg viewBox="0 0 860 310" class="w-100 h-auto" preserveAspectRatio="xMidYMid meet">
            <template v-for="tick in 5" :key="'kas-tick-' + tick">
              <line 
                x1="58" 
                :y1="18 + 247 * (1 - (tick - 1) / 4)" 
                x2="842" 
                :y2="18 + 247 * (1 - (tick - 1) / 4)" 
                class="chartGridLine" 
              />
              <text 
                x="50" 
                :y="18 + 247 * (1 - (tick - 1) / 4) + 4" 
                text-anchor="end" 
                class="chartAxisLabel"
              >
                {{ formatPendek(chartKasMax * ((tick - 1) / 4)) }}
              </text>
            </template>

            <template v-for="(item, idx) in chartKasData" :key="item.key">
              <rect 
                :x="58 + (784 / Math.max(chartKasData.length, 1)) * idx + (784 / Math.max(chartKasData.length, 1)) / 2 - 18"
                :y="18 + 247 - (item.masuk > 0 ? Math.max(2, 247 * item.masuk / chartKasMax) : 0)"
                width="16"
                :height="item.masuk > 0 ? Math.max(2, 247 * item.masuk / chartKasMax) : 0"
                rx="3"
                fill="var(--brand)"
                class="chartBar"
              >
                <title>{{ item.label }} — Uang Masuk: {{ formatRupiah(item.masuk) }}</title>
              </rect>
              <rect 
                :x="58 + (784 / Math.max(chartKasData.length, 1)) * idx + (784 / Math.max(chartKasData.length, 1)) / 2 + 2"
                :y="18 + 247 - (item.keluar > 0 ? Math.max(2, 247 * item.keluar / chartKasMax) : 0)"
                width="16"
                :height="item.keluar > 0 ? Math.max(2, 247 * item.keluar / chartKasMax) : 0"
                rx="3"
                fill="#D98E2B"
                class="chartBar"
              >
                <title>{{ item.label }} — Uang Keluar: {{ formatRupiah(item.keluar) }}</title>
              </rect>
              <text 
                :x="58 + (784 / Math.max(chartKasData.length, 1)) * idx + (784 / Math.max(chartKasData.length, 1)) / 2"
                y="296" 
                text-anchor="middle" 
                class="chartAxisLabel"
              >
                {{ item.label }}
              </text>
            </template>
          </svg>
          <div class="chartLegend">
            <span><i style="background-color: #6E9B66;"></i>Uang Masuk</span>
            <span><i style="background-color: #D98E2B;"></i>Uang Keluar</span>
          </div>
        </div>
      </article>

      <!-- Chart 4: Item Pareto -->
      <article class="chartCard">
        <h2>Item Pareto</h2>
        <p>Lima produk terlaris berdasarkan jumlah barang dari pesanan pada bulan terpilih.</p>
        <div class="dashboardChart table-responsive">
          <div v-if="!paretoData.length" class="text-secondary p-4 text-center">
            Belum ada barang terjual pada bulan ini.
          </div>
          <svg v-else :viewBox="`0 0 860 ${Math.max(110, paretoData.length * 48 + 20)}`" class="w-100 h-auto" preserveAspectRatio="xMidYMid meet">
            <template v-for="(item, idx) in paretoData" :key="item.id">
              <text 
                x="218" 
                :y="14 + idx * 48 + 20" 
                text-anchor="end" 
                class="chartProductLabel"
              >
                {{ item.nama.length > 32 ? item.nama.slice(0, 29) + '…' : item.nama }}
              </text>
              <rect 
                x="230" 
                :y="14 + idx * 48" 
                :width="paretoMax > 0 ? (555 * item.qty / paretoMax) : 0" 
                height="28" 
                rx="5" 
                :fill="paretoColors[idx % paretoColors.length]" 
              />
              <text 
                :x="238 + (paretoMax > 0 ? (555 * item.qty / paretoMax) : 0)" 
                :y="14 + idx * 48 + 19" 
                class="chartValueLabel"
              >
                {{ item.qty }} pcs
              </text>
            </template>
          </svg>
        </div>
      </article>
    </section>
  </main>
</template>

<script>
import { supabase } from '@/services/supabase';
import { formatRupiah, formatPendek, bulanSekarang, rentangBulan } from '@/utils/currency';

export default {
  name: 'DashboardView',
  data() {
    return {
      selectedMonth: bulanSekarang(),
      statusMessage: 'Menghubungkan ke database...',
      semuaPesanan: [],
      semuaProduk: [],
      semuaTransaksiStok: [],
      semuaAlokasiStok: [],
      semuaTransaksiKas: [],
      paretoColors: ['#167A55', '#D98E2B', '#5385A6', '#8769A0', '#4A928F']
    };
  },
  computed: {
    hppPeta() {
      const pesananById = new Map(this.semuaPesanan.map(item => [String(item.id), item]));
      const hppPerKeluar = new Map();
      this.semuaAlokasiStok.forEach(alokasi => {
        const idKeluar = String(alokasi.transaksi_keluar_id);
        hppPerKeluar.set(idKeluar, (hppPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0) * Number(alokasi.harga_satuan || 0));
      });
      const hppPerPesanan = new Map();
      this.semuaTransaksiStok.forEach(keluar => {
        if (keluar.jenis !== 'Keluar' || keluar.sumber !== 'Pesanan' || !keluar.pesanan_id) return;
        const order = pesananById.get(String(keluar.pesanan_id));
        if (!order) return;
        const idPesanan = String(order.id);
        hppPerPesanan.set(idPesanan, (hppPerPesanan.get(idPesanan) || 0) + (hppPerKeluar.get(String(keluar.id)) || 0));
      });
      return hppPerPesanan;
    },
    kelompokPesanan() {
      const kelompok = new Map();
      const hppPerPesanan = this.hppPeta;
      this.semuaPesanan.forEach(row => {
        if (!row.tanggal_pesanan) return;
        const bulan = row.tanggal_pesanan.slice(0, 7);
        const noPesanan = String(row.no_pesanan || `(tanpa nomor ${row.id})`);
        const key = `${bulan}\u0000${noPesanan}`;
        const total = Number(row.total_penghasilan_akhir || 0);
        if (!kelompok.has(key)) {
          kelompok.set(key, {
            bulan,
            noPesanan,
            total,
            hpp: hppPerPesanan.get(String(row.id)) || 0,
            realisasi: row.status === 'Realisasi'
          });
        } else {
          const group = kelompok.get(key);
          group.total = Math.max(group.total, total);
          group.hpp += hppPerPesanan.get(String(row.id)) || 0;
          group.realisasi = group.realisasi || row.status === 'Realisasi';
        }
      });
      return Array.from(kelompok.values());
    },
    summary() {
      const bulan = this.selectedMonth;
      if (!bulan) {
        return {
          totalPesanan: 0, omzetRealisasi: 0, omzetPotential: 0, omset: 0,
          labaBersihRealisasi: 0, labaBersihProyeksi: 0, saldoKas: 0
        };
      }
      const { awal, akhir } = rentangBulan(bulan);
      const padaBulanIni = this.kelompokPesanan.filter(item => item.bulan === bulan);
      const realisasi = padaBulanIni.filter(item => item.realisasi).reduce((sum, item) => sum + item.total, 0);
      const potential = padaBulanIni.filter(item => !item.realisasi).reduce((sum, item) => sum + item.total, 0);
      const totalOmzet = realisasi + potential;
      const hppRealisasi = padaBulanIni.filter(item => item.realisasi).reduce((sum, item) => sum + item.hpp, 0);
      const hppPotential = padaBulanIni.filter(item => !item.realisasi).reduce((sum, item) => sum + item.hpp, 0);

      const biayaOperasional = this.semuaTransaksiKas.filter(item =>
        item.jenis === 'Keluar' && item.tanggal >= awal && item.tanggal <= akhir &&
        (item.kategori === 'Biaya Operasional' || (!item.kategori &&
          String(item.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional')))
      ).reduce((sum, item) => sum + Number(item.nominal || 0), 0);

      const labaBersihRealisasi = realisasi - hppRealisasi - biayaOperasional;
      const labaBersihProyeksi = totalOmzet - hppRealisasi - hppPotential - biayaOperasional;

      let saldoKas = 0;
      this.semuaTransaksiKas.forEach(item => {
        const nominal = Number(item.nominal || 0);
        if (item.jenis === 'Masuk' || item.jenis === 'Saldo Awal') saldoKas += nominal;
        else if (item.jenis === 'Keluar') saldoKas -= nominal;
      });

      return {
        totalPesanan: padaBulanIni.length,
        omzetRealisasi: realisasi,
        omzetPotential: potential,
        omset: totalOmzet,
        labaBersihRealisasi,
        labaBersihProyeksi,
        saldoKas
      };
    },
    chartPesananData() {
      const bulanGrafik = this.daftarBulanTerakhir(this.selectedMonth);
      const monthCount = new Map(bulanGrafik.map(item => [item.key, new Set()]));
      this.kelompokPesanan.forEach(item => {
        if (monthCount.has(item.bulan)) {
          monthCount.get(item.bulan).add(item.noPesanan);
        }
      });
      return bulanGrafik.map(b => ({
        key: b.key,
        label: b.label,
        count: monthCount.get(b.key)?.size || 0
      }));
    },
    chartPesananMax() {
      return Math.max(1, ...this.chartPesananData.map(d => d.count));
    },
    chartOmzetData() {
      const bulanGrafik = this.daftarBulanTerakhir(this.selectedMonth);
      const monthOmzet = new Map(bulanGrafik.map(item => [item.key, { realisasi: 0, potential: 0 }]));
      this.kelompokPesanan.forEach(item => {
        if (monthOmzet.has(item.bulan)) {
          const entry = monthOmzet.get(item.bulan);
          if (item.realisasi) entry.realisasi += item.total;
          else entry.potential += item.total;
        }
      });
      return bulanGrafik.map(b => ({
        key: b.key,
        label: b.label,
        realisasi: monthOmzet.get(b.key)?.realisasi || 0,
        potential: monthOmzet.get(b.key)?.potential || 0
      }));
    },
    chartOmzetMax() {
      return Math.max(1, ...this.chartOmzetData.flatMap(d => [d.realisasi, d.potential]));
    },
    chartKasData() {
      const bulanGrafik = this.daftarBulanTerakhir(this.selectedMonth);
      const monthKas = new Map(bulanGrafik.map(item => [item.key, { masuk: 0, keluar: 0 }]));
      this.semuaTransaksiKas.forEach(item => {
        if (!item.tanggal) return;
        const bln = item.tanggal.slice(0, 7);
        if (!monthKas.has(bln)) return;
        const nominal = Number(item.nominal || 0);
        const entry = monthKas.get(bln);
        if (item.jenis === 'Masuk' || item.jenis === 'Saldo Awal') entry.masuk += nominal;
        else if (item.jenis === 'Keluar') entry.keluar += nominal;
      });
      return bulanGrafik.map(b => ({
        key: b.key,
        label: b.label,
        masuk: monthKas.get(b.key)?.masuk || 0,
        keluar: monthKas.get(b.key)?.keluar || 0
      }));
    },
    chartKasMax() {
      return Math.max(1, ...this.chartKasData.flatMap(d => [d.masuk, d.keluar]));
    },
    paretoData() {
      const bulan = this.selectedMonth;
      const pesananBulan = this.semuaPesanan.filter(row => row.tanggal_pesanan && row.tanggal_pesanan.slice(0, 7) === bulan);
      const produkMap = new Map(this.semuaProduk.map(p => [String(p.id), p.nama_produk]));
      const sumPerProduk = new Map();
      pesananBulan.forEach(item => {
        const id = String(item.kode_produk);
        sumPerProduk.set(id, (sumPerProduk.get(id) || 0) + Number(item.qty || 0));
      });
      return Array.from(sumPerProduk.entries())
        .map(([id, qty]) => ({ id, qty, nama: produkMap.get(id) || `Produk #${id}` }))
        .sort((a, b) => b.qty - a.qty || a.nama.localeCompare(b.nama))
        .slice(0, 5);
    },
    paretoMax() {
      return Math.max(1, ...this.paretoData.map(d => d.qty));
    }
  },
  methods: {
    formatRupiah,
    formatPendek,
    daftarBulanTerakhir(bulanAkhir, jumlah = 12) {
      const [tahun, bulan] = bulanAkhir.split('-').map(Number);
      return Array.from({ length: jumlah }, (_, index) => {
        const date = new Date(tahun, bulan - jumlah + index, 1);
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: `${date.toLocaleDateString('id-ID', { month: 'short' })} '${String(date.getFullYear()).slice(-2)}`
        };
      });
    },
    async ambilSemua(tabel, kolom) {
      const semua = [];
      const ukuranHalaman = 1000;
      for (let awal = 0; ; awal += ukuranHalaman) {
        const { data, error } = await supabase.from(tabel).select(kolom)
          .order('id', { ascending: true })
          .range(awal, awal + ukuranHalaman - 1);
        if (error) return { data: null, error };
        semua.push(...(data || []));
        if (!data || data.length < ukuranHalaman) break;
      }
      return { data: semua, error: null };
    },
    async muatDataDashboard() {
      this.statusMessage = 'Memuat ringkasan data...';
      const hasil = await Promise.all([
        this.ambilSemua('produk', 'id, nama_produk'),
        this.ambilSemua('pesanan', 'id, no_pesanan, tanggal_pesanan, kode_produk, qty, total_penghasilan_akhir, status'),
        this.ambilSemua('transaksi_stok', 'id, tanggal, jenis, kode_produk, qty, harga_satuan, sumber, pesanan_id'),
        this.ambilSemua('alokasi_stok_fifo', 'id, transaksi_keluar_id, transaksi_masuk_id, qty, harga_satuan'),
        this.ambilSemua('transaksi_kas', 'id, tanggal, jenis, nominal, keterangan, kategori')
      ]);

      const errorPertama = hasil.find(item => item.error);
      if (errorPertama) {
        this.statusMessage = 'Gagal memuat data: ' + errorPertama.error.message;
        return;
      }

      this.semuaProduk = hasil[0].data || [];
      this.semuaPesanan = hasil[1].data || [];
      this.semuaTransaksiStok = hasil[2].data || [];
      this.semuaAlokasiStok = hasil[3].data || [];
      this.semuaTransaksiKas = hasil[4].data || [];

      this.statusMessage = `Data berhasil diperbarui: ${this.semuaPesanan.length} baris pesanan dan ${this.semuaTransaksiKas.length} transaksi kas.`;
    }
  },
  mounted() {
    this.muatDataDashboard();
  }
};
</script>
