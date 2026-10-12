<template>
  <main class="page-container dashboardPage" :class="{ adminDashboard: !isOwner }">
    <header class="dashboardHeader">
      <div>
        <h1>Dashboard Usaha</h1>
        <p>{{ isOwner
          ? 'Pantau pendapatan, pengeluaran, penjualan, dan laba usaha dalam satu halaman.'
          : 'Pantau produk terlaris, jumlah pesanan, dan detail penjualan.' }}</p>
      </div>
      <div class="dashboardMonth">
        <label for="filterBulanDashboard">Pilih bulan</label>
        <input
          id="filterBulanDashboard"
          v-model="selectedMonth"
          type="month"
          class="form-control"
        >
      </div>
    </header>

    <p role="status" aria-live="polite" class="dashboardStatus">
      {{ statusMessage }}
    </p>

    <section v-if="isOwner" class="dashboardSummary" aria-label="Ringkasan keuangan">
      <article class="summaryCard incomeCard">
        <h2>Pendapatan</h2>
        <strong>{{ formatRupiah(summary.pendapatan) }}</strong>
        <p>Uang masuk bulan ini</p>
      </article>
      <article class="summaryCard expenseCard">
        <h2>Pengeluaran</h2>
        <strong>{{ formatRupiah(summary.pengeluaran) }}</strong>
        <p>Uang keluar bulan ini</p>
      </article>
      <article class="summaryCard profitCard">
        <h2>Laba Bersih</h2>
        <strong>{{ formatRupiah(summary.labaBersih) }}</strong>
        <p>Omzet dikurangi HPP dan biaya operasional</p>
      </article>
      <article class="summaryCard balanceCard">
        <h2>Saldo Kas Terkini</h2>
        <strong>{{ formatRupiah(summary.saldoKas) }}</strong>
        <p>Saldo awal + uang masuk - uang keluar</p>
      </article>
    </section>

    <section class="dashboardGrid dashboardTopGrid" aria-label="Tren penjualan dan produk terlaris">
      <article v-if="isOwner" class="dashboardPanel salesPanel">
        <div class="panelHeading">
          <div>
            <h2>Sales Trend</h2>
            <p>Total omzet selama 12 bulan sampai bulan terpilih.</p>
          </div>
        </div>
        <div v-if="!chartSalesHasData" class="chartEmpty">Belum ada data penjualan pada periode ini.</div>
        <div v-else class="svgChartWrap">
          <svg viewBox="0 0 760 280" class="dashboardSvg" role="img" aria-label="Grafik sales trend 12 bulan">
            <g v-for="tick in 5" :key="'sales-grid-' + tick">
              <line x1="62" :y1="salesChartY(tick - 1)" x2="744" :y2="salesChartY(tick - 1)" class="chartGridLine" />
              <text x="53" :y="salesChartY(tick - 1) + 4" text-anchor="end" class="chartAxisLabel">
                {{ formatPendek(salesChartMax * (1 - (tick - 1) / 4)) }}
              </text>
            </g>

            <path v-if="salesChartArea" :d="salesChartArea" class="salesArea" />
            <polyline v-if="salesChartPoints" :points="salesChartPoints" class="salesLine" />
            <g v-for="(item, index) in chartSalesData" :key="item.key">
              <circle
                :cx="salesChartX(index)"
                :cy="salesChartValueY(item.total)"
                r="5"
                class="salesPoint"
              >
                <title>{{ item.label }}: {{ formatRupiah(item.total) }}</title>
              </circle>
              <text
                :x="salesChartX(index)"
                :y="salesChartLabelY(index)"
                text-anchor="middle"
                class="chartValueLabel"
              >
                {{ formatPendek(item.total) }}
              </text>
              <text :x="salesChartX(index)" y="266" text-anchor="middle" class="chartAxisLabel">
                {{ item.label }}
              </text>
            </g>
          </svg>
        </div>
      </article>

      <article class="dashboardPanel productPanel">
        <div class="panelHeading">
          <div>
            <h2>Produk Terlaris</h2>
            <p>Semua status pesanan · {{ selectedMonthLabel }}</p>
          </div>
        </div>
        <div v-if="!produkTerlaris.length" class="chartEmpty">Belum ada produk pada bulan ini.</div>
        <ol v-else class="topProducts">
          <li v-for="(item, index) in produkTerlaris" :key="item.id">
            <span class="productRank">{{ index + 1 }}</span>
            <div class="productInfo">
              <div class="productName">{{ item.nama }}</div>
              <div class="productTrack">
                <span :style="{ width: `${(item.qty / productMax) * 100}%` }"></span>
              </div>
            </div>
            <strong>{{ item.qty }} pcs</strong>
          </li>
        </ol>
      </article>
    </section>

    <section class="dashboardGrid dashboardMiddleGrid" aria-label="Grafik pesanan dan arus kas">
      <article class="dashboardPanel">
        <div class="panelHeading">
          <div>
            <h2>Jumlah Pesanan per Bulan</h2>
            <p>Total pesanan · 12 bulan sampai bulan terpilih</p>
          </div>
        </div>
        <div v-if="!chartPesananHasData" class="chartEmpty">Belum ada pesanan pada periode ini.</div>
        <div v-else class="svgChartWrap">
          <svg viewBox="0 0 600 280" class="dashboardSvg" role="img" aria-label="Grafik jumlah pesanan per bulan">
            <g v-for="tick in 5" :key="'orders-grid-' + tick">
              <line x1="52" :y1="barChartY(tick - 1)" x2="590" :y2="barChartY(tick - 1)" class="chartGridLine" />
              <text x="44" :y="barChartY(tick - 1) + 4" text-anchor="end" class="chartAxisLabel">
                {{ Math.round(chartPesananMax * (1 - (tick - 1) / 4)) }}
              </text>
            </g>

            <g v-for="(item, index) in chartPesananData" :key="item.key">
              <rect
                :x="barChartX(index, chartPesananData.length, 600, 52, 538, 24)"
                :y="barChartValueY(item.count, chartPesananMax)"
                width="24"
                :height="barChartHeight(item.count, chartPesananMax)"
                rx="4"
                :class="item.key === selectedMonth ? 'chartBar chartBarCurrent' : 'chartBar'"
              >
                <title>{{ item.label }}: {{ item.count }} pesanan</title>
              </rect>
              <text
                :x="barChartX(index, chartPesananData.length, 600, 52, 538, 24) + 12"
                :y="Math.max(barChartValueY(item.count, chartPesananMax) - 7, 14)"
                text-anchor="middle"
                class="chartValueLabel"
              >
                {{ item.count }}
              </text>
              <text :x="barChartX(index, chartPesananData.length, 600, 52, 538, 24) + 12" y="266" text-anchor="middle" class="chartAxisLabel">
                {{ item.label }}
              </text>
            </g>
          </svg>
        </div>
      </article>

      <article v-if="isOwner" class="dashboardPanel cashPanel">
        <div class="panelHeading">
          <div>
            <h2>Uang Masuk dan Keluar</h2>
            <p>Per bulan · Saldo Awal tidak dimasukkan ke grafik</p>
          </div>
        </div>
        <div v-if="!chartKasHasData" class="chartEmpty">Belum ada transaksi kas pada periode ini.</div>
        <div v-else class="svgChartWrap">
          <svg viewBox="0 0 600 280" class="dashboardSvg" role="img" aria-label="Grafik uang masuk dan keluar per bulan">
            <g v-for="tick in 5" :key="'cash-grid-' + tick">
              <line x1="58" :y1="barChartY(tick - 1)" x2="590" :y2="barChartY(tick - 1)" class="chartGridLine" />
              <text x="50" :y="barChartY(tick - 1) + 4" text-anchor="end" class="chartAxisLabel">
                {{ formatPendek(chartKasMax * (1 - (tick - 1) / 4)) }}
              </text>
            </g>
            <g v-for="(item, index) in chartKasData" :key="item.key">
              <rect
                :x="barChartX(index, chartKasData.length, 600, 58, 532, 17) - 9"
                :y="barChartValueY(item.masuk, chartKasMax)"
                width="17"
                :height="barChartHeight(item.masuk, chartKasMax)"
                rx="3"
                fill="#6E9B66"
                class="chartBar"
              >
                <title>{{ item.label }} — Uang Masuk: {{ formatRupiah(item.masuk) }}</title>
              </rect>
              <text
                v-if="item.masuk > 0"
                :x="barChartX(index, chartKasData.length, 600, 58, 532, 17) - 0.5"
                :y="Math.max(barChartValueY(item.masuk, chartKasMax) - 5, 16)"
                text-anchor="middle"
                class="chartValueLabel chartCashValueLabel"
              >
                {{ formatPendek(item.masuk) }}
              </text>
              <rect
                :x="barChartX(index, chartKasData.length, 600, 58, 532, 17) + 10"
                :y="barChartValueY(item.keluar, chartKasMax)"
                width="17"
                :height="barChartHeight(item.keluar, chartKasMax)"
                rx="3"
                class="cashOutBar"
              >
                <title>{{ item.label }} — Uang Keluar: {{ formatRupiah(item.keluar) }}</title>
              </rect>
              <text
                v-if="item.keluar > 0"
                :x="barChartX(index, chartKasData.length, 600, 58, 532, 17) + 18.5"
                :y="Math.max(barChartValueY(item.keluar, chartKasMax) - 5, 16)"
                text-anchor="middle"
                class="chartValueLabel chartCashValueLabel"
              >
                {{ formatPendek(item.keluar) }}
              </text>
              <text :x="barChartX(index, chartKasData.length, 600, 58, 532, 17) + 9" y="266" text-anchor="middle" class="chartAxisLabel">
                {{ item.label }}
              </text>
            </g>
          </svg>
        </div>
        <div class="chartLegend">
          <span><i class="legendIncome"></i>Uang Masuk</span>
          <span><i class="legendExpense"></i>Uang Keluar</span>
        </div>
      </article>
    </section>

    <section class="dashboardGrid dashboardBottomGrid" aria-label="Laba rugi tahunan dan detail penjualan">
      <article v-if="isOwner" class="dashboardPanel annualProfitPanel">
        <div class="panelHeading">
          <div>
            <h2>Laba/Rugi Tahun {{ selectedYear }}</h2>
            <p>Ringkasan keuangan selama tahun {{ selectedYear }}</p>
          </div>
        </div>
        <div v-if="!yearProfitHasData" class="chartEmpty">Belum ada data laba/rugi untuk tahun ini.</div>
        <div v-else class="annualProfit">
          <div class="annualProfitChart">
            <svg viewBox="0 0 160 160" role="img" :aria-label="`Rincian laba rugi tahun ${selectedYear}`">
              <circle cx="80" cy="80" r="58" class="annualPieTrack" />
              <circle
                v-for="segment in annualProfitSegments"
                :key="segment.key"
                cx="80"
                cy="80"
                r="58"
                class="annualPieSegment"
                :stroke="segment.color"
                :stroke-dasharray="`${segment.length} ${segment.circumference - segment.length}`"
                :stroke-dashoffset="-segment.offset"
                transform="rotate(-90 80 80)"
              >
                <title>{{ segment.label }}: {{ formatRupiah(segment.value) }}</title>
              </circle>
              <text
                v-for="segment in annualProfitSegments"
                :key="`${segment.key}-label`"
                :x="segment.labelX"
                :y="segment.labelY"
                text-anchor="middle"
                dominant-baseline="central"
                :class="segment.percentage < 5 ? 'annualPieLabel annualPieLabelSmall' : 'annualPieLabel'"
              >
                Rp {{ formatPendek(segment.value) }}
              </text>
              <text x="80" y="76" text-anchor="middle" class="annualPieCenterLabel">
                {{ yearProfitSummary.labaBersih >= 0 ? 'Laba' : 'Rugi' }}
              </text>
              <text x="80" y="94" text-anchor="middle" class="annualPieCenterValue">
                {{ formatPendek(Math.abs(yearProfitSummary.labaBersih)) }}
              </text>
            </svg>
          </div>
          <dl class="annualProfitDetails">
            <div v-for="segment in annualProfitSegments" :key="segment.key">
              <dt>
                <i :style="{ backgroundColor: segment.color }"></i>
                {{ segment.label }}
              </dt>
              <dd>
                <strong>{{ formatRupiah(segment.value) }}</strong>
                <span>{{ segment.percentage }}%</span>
              </dd>
            </div>
          </dl>
          <div class="annualProfitNet" :class="{ isLoss: yearProfitSummary.labaBersih < 0 }">
            <strong>{{ yearProfitSummary.labaBersih >= 0 ? 'Laba Bersih' : 'Rugi' }}</strong>
            <strong>{{ formatRupiah(Math.abs(yearProfitSummary.labaBersih)) }}</strong>
          </div>
        </div>
      </article>

      <article class="dashboardPanel detailPanel">
        <div class="panelHeading">
          <div>
            <h2>Detail Penjualan</h2>
            <p>{{ selectedMonthLabel }} · Semua status pesanan</p>
          </div>
        </div>
        <div class="detailTotal">
          <span>Total Omzet Pesanan</span>
          <strong>{{ formatRupiah(summary.totalOmzetPesanan) }}</strong>
        </div>
        <dl class="salesDetails">
          <div>
            <dt>Jumlah pesanan</dt>
            <dd>{{ summary.totalPesanan }} pesanan</dd>
          </div>
          <div>
            <dt>Jumlah produk</dt>
            <dd>{{ summary.totalProduk }} produk</dd>
          </div>
          <div>
            <dt>Jumlah barang</dt>
            <dd>{{ summary.totalBarang }} barang</dd>
          </div>
        </dl>
      </article>
    </section>
  </main>
</template>

<script>
import { supabase } from '@/services/supabase';
import { showToast } from '@/services/notification';
import { formatRupiah, formatPendek, bulanSekarang, rentangBulan } from '@/utils/currency';
import { authState, authReady } from '@/services/auth';

const JUMLAH_BULAN_GRAFIK = 12;
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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
      paretoColors: ['#6E9B66', '#D98E2B', '#5385A6', '#8769A0', '#4A928F']
    };
  },
  computed: {
    isOwner() {
      return authState.user?.role === 'owner';
    },
    selectedYear() {
      return Number((this.selectedMonth || '').slice(0, 4)) || new Date().getFullYear();
    },
    selectedMonthLabel() {
      if (!this.selectedMonth) return '';
      const [year, month] = this.selectedMonth.split('-').map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    },
    hppPerPesanan() {
      const hppPerKeluar = new Map();
      this.semuaAlokasiStok.forEach(alokasi => {
        const idKeluar = String(alokasi.transaksi_keluar_id);
        const nilai = Number(alokasi.qty || 0) * Number(alokasi.harga_satuan || 0);
        hppPerKeluar.set(idKeluar, (hppPerKeluar.get(idKeluar) || 0) + nilai);
      });

      const hppByOrder = new Map();
      this.semuaTransaksiStok.forEach(transaksi => {
        if (transaksi.jenis !== 'Keluar' || transaksi.sumber !== 'Pesanan' || !transaksi.pesanan_id) return;
        const idPesanan = String(transaksi.pesanan_id);
        const nilai = hppPerKeluar.get(String(transaksi.id)) || 0;
        hppByOrder.set(idPesanan, (hppByOrder.get(idPesanan) || 0) + nilai);
      });
      return hppByOrder;
    },
    kelompokPesanan() {
      const kelompok = new Map();
      this.semuaPesanan.forEach(row => {
        if (!row.tanggal_pesanan) return;
        const bulan = row.tanggal_pesanan.slice(0, 7);
        const noPesanan = String(row.no_pesanan || `(tanpa nomor ${row.id})`);
        const key = `${bulan}\u0000${noPesanan}`;
        const total = Number(row.total_penghasilan_akhir || 0);
        const hpp = this.hppPerPesanan.get(String(row.id)) || 0;
        if (!kelompok.has(key)) {
          kelompok.set(key, {
            bulan,
            noPesanan,
            total,
            hpp,
            realisasi: row.status === 'Realisasi'
          });
          return;
        }

        const group = kelompok.get(key);
        group.total = Math.max(group.total, total);
        group.hpp += hpp;
        group.realisasi = group.realisasi || row.status === 'Realisasi';
      });
      return Array.from(kelompok.values());
    },
    pesananBulanTerpilih() {
      return this.semuaPesanan.filter(row =>
        row.tanggal_pesanan && row.tanggal_pesanan.slice(0, 7) === this.selectedMonth
      );
    },
    transaksiKasBulanTerpilih() {
      if (!this.selectedMonth) return [];
      const { awal, akhir } = rentangBulan(this.selectedMonth);
      return this.semuaTransaksiKas.filter(item =>
        item.tanggal && item.tanggal >= awal && item.tanggal <= akhir
      );
    },
    biayaOperasionalPerBulan() {
      const biaya = new Map();
      this.semuaTransaksiKas.forEach(item => {
        if (item.jenis !== 'Keluar' || !item.tanggal) return;
        const isOperational = item.kategori === 'Biaya Operasional' || (!item.kategori &&
          String(item.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional'));
        if (!isOperational) return;
        const bulan = item.tanggal.slice(0, 7);
        biaya.set(bulan, (biaya.get(bulan) || 0) + Number(item.nominal || 0));
      });
      return biaya;
    },
    summary() {
      const transaksiBulan = this.transaksiKasBulanTerpilih;
      const kelompokBulan = this.kelompokPesanan.filter(item => item.bulan === this.selectedMonth);
      const pesanan = this.pesananBulanTerpilih;
      const productIds = new Set(pesanan.map(item => String(item.kode_produk)));
      const pendapatan = transaksiBulan
        .filter(item => item.jenis === 'Masuk')
        .reduce((sum, item) => sum + Number(item.nominal || 0), 0);
      const pengeluaran = transaksiBulan
        .filter(item => item.jenis === 'Keluar')
        .reduce((sum, item) => sum + Number(item.nominal || 0), 0);
      const omzetRealisasi = kelompokBulan
        .filter(item => item.realisasi)
        .reduce((sum, item) => sum + item.total, 0);
      const hppRealisasi = kelompokBulan
        .filter(item => item.realisasi)
        .reduce((sum, item) => sum + item.hpp, 0);
      const biayaOperasional = this.biayaOperasionalPerBulan.get(this.selectedMonth) || 0;
      const saldoKas = this.semuaTransaksiKas.reduce((saldo, item) => {
        const nominal = Number(item.nominal || 0);
        if (item.jenis === 'Masuk' || item.jenis === 'Saldo Awal') return saldo + nominal;
        if (item.jenis === 'Keluar') return saldo - nominal;
        return saldo;
      }, 0);

      return {
        pendapatan,
        pengeluaran,
        labaBersih: omzetRealisasi - hppRealisasi - biayaOperasional,
        saldoKas,
        totalOmzetPesanan: kelompokBulan.reduce((sum, item) => sum + item.total, 0),
        totalPesanan: new Set(kelompokBulan.map(item => item.noPesanan)).size,
        totalProduk: productIds.size,
        totalBarang: pesanan.reduce((sum, item) => sum + Number(item.qty || 0), 0)
      };
    },
    chartSalesData() {
      const months = this.daftarBulanTerakhir(this.selectedMonth);
      const totals = new Map(months.map(item => [item.key, 0]));
      this.kelompokPesanan.forEach(item => {
        if (totals.has(item.bulan)) totals.set(item.bulan, totals.get(item.bulan) + item.total);
      });
      return months.map(item => ({ ...item, total: totals.get(item.key) || 0 }));
    },
    salesChartMax() {
      return Math.max(1, ...this.chartSalesData.map(item => item.total));
    },
    salesChartPoints() {
      return this.chartSalesData
        .map((item, index) => `${this.salesChartX(index)},${this.salesChartValueY(item.total)}`)
        .join(' ');
    },
    salesChartArea() {
      if (!this.chartSalesData.length) return '';
      const firstX = this.salesChartX(0);
      const lastX = this.salesChartX(this.chartSalesData.length - 1);
      return `M ${firstX} 238 L ${this.salesChartPoints.replaceAll(',', ' ')} L ${lastX} 238 Z`;
    },
    chartSalesHasData() {
      return this.chartSalesData.some(item => item.total > 0);
    },
    chartPesananData() {
      const months = this.daftarBulanTerakhir(this.selectedMonth);
      const counts = new Map(months.map(item => [item.key, new Set()]));
      this.kelompokPesanan.forEach(item => {
        if (counts.has(item.bulan)) counts.get(item.bulan).add(item.noPesanan);
      });
      return months.map(item => ({ ...item, count: counts.get(item.key).size }));
    },
    chartPesananMax() {
      return Math.max(1, ...this.chartPesananData.map(item => item.count));
    },
    chartPesananHasData() {
      return this.chartPesananData.some(item => item.count > 0);
    },
    chartKasData() {
      const months = this.daftarBulanTerakhir(this.selectedMonth);
      const data = new Map(months.map(item => [item.key, { masuk: 0, keluar: 0 }]));
      this.semuaTransaksiKas.forEach(item => {
        if (!item.tanggal) return;
        const month = data.get(item.tanggal.slice(0, 7));
        if (!month) return;
        const nominal = Number(item.nominal || 0);
        if (item.jenis === 'Masuk') month.masuk += nominal;
        else if (item.jenis === 'Keluar') month.keluar += nominal;
      });
      return months.map(item => ({ ...item, ...data.get(item.key) }));
    },
    chartKasMax() {
      return Math.max(1, ...this.chartKasData.flatMap(item => [item.masuk, item.keluar]));
    },
    chartKasHasData() {
      return this.chartKasData.some(item => item.masuk > 0 || item.keluar > 0);
    },
    produkTerlaris() {
      const names = new Map(this.semuaProduk.map(item => [String(item.id), item.nama_produk]));
      const products = new Map();
      this.pesananBulanTerpilih.forEach(item => {
        const id = String(item.kode_produk);
        const current = products.get(id) || { id, qty: 0 };
        current.qty += Number(item.qty || 0);
        products.set(id, current);
      });
      return Array.from(products.values())
        .map(item => ({ ...item, nama: names.get(item.id) || `Produk #${item.id}` }))
        .sort((a, b) => b.qty - a.qty || a.nama.localeCompare(b.nama))
        .slice(0, 5);
    },
    productMax() {
      return Math.max(1, ...this.produkTerlaris.map(item => item.qty));
    },
    labaRugiTahunan() {
      const year = String(this.selectedYear);
      const months = Array.from({ length: 12 }, (_, index) => ({
        key: `${year}-${String(index + 1).padStart(2, '0')}`,
        label: NAMA_BULAN[index],
        omzet: 0,
        hpp: 0
      }));
      const byMonth = new Map(months.map(item => [item.key, item]));
      this.kelompokPesanan.forEach(item => {
        const month = byMonth.get(item.bulan);
        if (!month || !item.realisasi) return;
        month.omzet += item.total;
        month.hpp += item.hpp;
      });
      return months.map(item => ({
        ...item,
        biayaOperasional: this.biayaOperasionalPerBulan.get(item.key) || 0,
        labaBersih: item.omzet - item.hpp - (this.biayaOperasionalPerBulan.get(item.key) || 0)
      }));
    },
    yearProfitSummary() {
      return this.labaRugiTahunan.reduce((summary, item) => ({
        pendapatan: summary.pendapatan + item.omzet,
        hpp: summary.hpp + item.hpp,
        biayaOperasional: summary.biayaOperasional + item.biayaOperasional,
        labaBersih: summary.labaBersih + item.labaBersih
      }), {
        pendapatan: 0,
        hpp: 0,
        biayaOperasional: 0,
        labaBersih: 0
      });
    },
    annualProfitSegments() {
      const colors = {
        pendapatan: '#35c9a2',
        hpp: '#ffc83d',
        biayaOperasional: '#f15b7a'
      };
      const segments = [
        { key: 'pendapatan', label: 'Pendapatan', value: this.yearProfitSummary.pendapatan },
        { key: 'hpp', label: 'Nilai HPP', value: this.yearProfitSummary.hpp },
        { key: 'biayaOperasional', label: 'Pengeluaran', value: this.yearProfitSummary.biayaOperasional }
      ];
      const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
      const circumference = 2 * Math.PI * 58;
      let offset = 0;

      return segments.map(segment => {
        const value = Math.max(0, segment.value);
        const length = total ? circumference * value / total : 0;
        const midpoint = ((offset + length / 2) / circumference) * 2 * Math.PI - Math.PI / 2;
        const result = {
          ...segment,
          color: colors[segment.key],
          circumference,
          length,
          offset,
          percentage: total ? Math.round(value / total * 100) : 0,
          labelX: 80 + 58 * Math.cos(midpoint),
          labelY: 80 + 58 * Math.sin(midpoint)
        };
        offset += length;
        return result;
      }).filter(segment => segment.value > 0);
    },
    yearProfitHasData() {
      return this.annualProfitSegments.length > 0 || this.yearProfitSummary.labaBersih !== 0;
    }
  },
  methods: {
    formatRupiah,
    formatPendek,
    daftarBulanTerakhir(bulanAkhir, jumlah = JUMLAH_BULAN_GRAFIK) {
      if (!bulanAkhir) return [];
      const [tahun, bulan] = bulanAkhir.split('-').map(Number);
      return Array.from({ length: jumlah }, (_, index) => {
        const date = new Date(tahun, bulan - jumlah + index, 1);
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: NAMA_BULAN[date.getMonth()]
        };
      });
    },
    salesChartX(index) {
      const left = 72;
      const width = 656;
      return left + (this.chartSalesData.length <= 1 ? 0 : (width / (this.chartSalesData.length - 1)) * index);
    },
    salesChartValueY(value) {
      return 238 - (216 * value / this.salesChartMax);
    },
    salesChartLabelY(index) {
      const item = this.chartSalesData[index];
      const pointY = this.salesChartValueY(item.total);
      const label = this.formatPendek(item.total);
      const pointX = this.salesChartX(index);
      const collides = [index - 1, index + 1].some(neighborIndex => {
        const neighbor = this.chartSalesData[neighborIndex];
        if (!neighbor) return false;
        const neighborLabel = this.formatPendek(neighbor.total);
        const labelsOverlap = Math.abs(pointX - this.salesChartX(neighborIndex)) <
          ((label.length + neighborLabel.length) * 5.4) / 2 + 4;
        return labelsOverlap &&
          Math.abs(pointY - this.salesChartValueY(neighbor.total)) < 12;
      });

      if (!collides) return Math.max(pointY - 10, 14);
      return index % 2 === 0
        ? Math.max(pointY - 22, 12)
        : Math.min(pointY + 18, 250);
    },
    salesChartY(index) {
      return 22 + (216 / 4) * index;
    },
    barChartY(index) {
      return 22 + (216 / 4) * index;
    },
    barChartX(index, count, viewWidth, left, width, barWidth) {
      const slot = width / Math.max(count, 1);
      return left + slot * index + (slot - barWidth) / 2;
    },
    barChartValueY(value, max) {
      return 238 - (216 * value / max);
    },
    barChartHeight(value, max) {
      return value > 0 ? Math.max(2, 216 * value / max) : 0;
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
      await authReady;
      const isOwner = this.isOwner;
      this.statusMessage = isOwner
        ? 'Dashboard: Mengambil data produk, pesanan, transaksi stok, alokasi stok, dan transaksi kas...'
        : 'Dashboard: Mengambil data produk dan pesanan...';
      const permintaan = [
        this.ambilSemua('produk', 'id, nama_produk'),
        this.ambilSemua('pesanan', 'id, no_pesanan, tanggal_pesanan, kode_produk, qty, total_penghasilan_akhir, status')
      ];
      if (isOwner) {
        permintaan.push(
          this.ambilSemua('transaksi_stok', 'id, tanggal, jenis, kode_produk, qty, harga_satuan, sumber, pesanan_id'),
          this.ambilSemua('alokasi_stok_fifo', 'id, transaksi_keluar_id, transaksi_masuk_id, qty, harga_satuan'),
          this.ambilSemua('transaksi_kas', 'id, tanggal, jenis, nominal, keterangan, kategori')
        );
      }
      const hasil = await Promise.all(permintaan);

      const errorPertama = hasil.find(item => item.error);
      if (errorPertama) {
        this.statusMessage = `Gagal memuat data: ${errorPertama.error.message}`;
        showToast(this.statusMessage, 'error');
        return;
      }

      this.semuaProduk = hasil[0].data || [];
      this.semuaPesanan = hasil[1].data || [];
      this.semuaTransaksiStok = isOwner ? hasil[2].data || [] : [];
      this.semuaAlokasiStok = isOwner ? hasil[3].data || [] : [];
      this.semuaTransaksiKas = isOwner ? hasil[4].data || [] : [];
      this.statusMessage = `Data berhasil dimuat: ${this.semuaPesanan.length} baris pesanan dan ${this.semuaProduk.length} produk.`;
    }
  },
  mounted() {
    this.muatDataDashboard();
  }
};
</script>

<style scoped>
.dashboardPage {
  --dashboard-ink: #24352d;
  --dashboard-muted: #75827b;
  --dashboard-border: #e4eae5;
  --dashboard-green: #167a55;
  --dashboard-pale: #e8f4ed;
}

.dashboardPage.adminDashboard {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 1rem;
}

.adminDashboard .dashboardHeader,
.adminDashboard .dashboardStatus {
  grid-column: 1 / -1;
}

.adminDashboard .dashboardGrid {
  display: contents;
}

.adminDashboard .detailPanel {
  grid-column: 1 / -1;
}

.dashboardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.3rem 1.6rem;
  margin-bottom: 1rem;
  color: #fff;
  background: #136f50;
  border-radius: 1rem;
  box-shadow: 0 0.4rem 1.3rem rgb(19 111 80 / 12%);
}

.dashboardHeader h1 {
  margin: 0 0 0.35rem;
  font-size: clamp(1.4rem, 2.5vw, 1.8rem);
  font-weight: 700;
}

.dashboardHeader p {
  margin: 0;
  color: #d5e9df;
  font-size: 0.88rem;
}

.dashboardMonth {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 0 0 auto;
}

.dashboardMonth label {
  font-size: 0.82rem;
  font-weight: 600;
}

.dashboardMonth input {
  width: 175px;
  border: 0;
}

.dashboardStatus {
  min-height: 1.25rem;
  margin: 0 0 0.8rem;
  color: var(--dashboard-muted);
  font-size: 0.78rem;
}

.dashboardSummary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.summaryCard,
.dashboardPanel {
  min-width: 0;
  background: #fff;
  border: 1px solid var(--dashboard-border);
  border-radius: 0.9rem;
  box-shadow: 0 0.15rem 0.7rem rgb(32 54 43 / 3%);
}

.summaryCard {
  padding: 1rem 1.1rem;
  border-left: 4px solid var(--dashboard-green);
}

.expenseCard {
  border-left-color: #d98e2b;
}

.balanceCard {
  border-left-color: #5385a6;
}

.summaryCard h2 {
  margin: 0 0 0.55rem;
  color: var(--dashboard-muted);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.035em;
  text-transform: uppercase;
}

.summaryCard strong {
  display: block;
  overflow-wrap: anywhere;
  color: var(--dashboard-ink);
  font-size: clamp(1.05rem, 1.7vw, 1.45rem);
  line-height: 1.25;
}

.summaryCard p {
  margin: 0.5rem 0 0;
  color: var(--dashboard-muted);
  font-size: 0.7rem;
}

.dashboardGrid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}

.dashboardTopGrid {
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
}

.dashboardMiddleGrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dashboardBottomGrid {
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 1fr);
}

.dashboardPanel {
  padding: 1.1rem 1.2rem;
}

.panelHeading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.panelHeading h2 {
  margin: 0 0 0.3rem;
  color: var(--dashboard-ink);
  font-size: 1rem;
  font-weight: 700;
}

.panelHeading p {
  margin: 0;
  color: var(--dashboard-muted);
  font-size: 0.73rem;
}

.svgChartWrap {
  width: 100%;
  overflow: hidden;
}

.dashboardSvg {
  display: block;
  width: 100%;
  min-width: 0;
  height: auto;
}

.chartGridLine {
  stroke: #e9eeea;
  stroke-width: 1;
}

.chartAxisLabel {
  fill: #75827b;
  font-size: 10px;
}

.chartValueLabel {
  fill: var(--dashboard-ink);
  font-size: 9px;
  font-weight: 700;
  paint-order: stroke;
  pointer-events: none;
  stroke: #fff;
  stroke-linejoin: round;
  stroke-width: 3px;
}

.chartCashValueLabel {
  font-size: 9px;
}

.salesArea {
  fill: #d9eee4;
  opacity: 0.8;
}

.salesLine {
  fill: none;
  stroke: var(--dashboard-green);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.salesPoint {
  fill: var(--dashboard-green);
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}

.salesPoint:hover {
  r: 7;
}

.chartBar {
  fill: #cde9da;
}

.chartBarCurrent {
  fill: var(--dashboard-green);
}

.cashOutBar,
.lossBar {
  fill: #d98e2b;
}

.profitBar {
  fill: var(--dashboard-green);
}

.annualProfit {
  display: grid;
  grid-template-columns: minmax(115px, 0.8fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 0.8rem;
}

.annualProfitChart svg {
  display: block;
  width: min(100%, 180px);
  height: auto;
  margin: 0 auto;
}

.annualPieTrack,
.annualPieSegment {
  fill: none;
  stroke-width: 23;
}

.annualPieTrack {
  stroke: #edf1ee;
}

.annualPieSegment {
  stroke-linecap: butt;
}

.annualPieLabel {
  fill: #24352d;
  font-size: 8px;
  font-weight: 700;
  paint-order: stroke;
  pointer-events: none;
  stroke: #fff;
  stroke-linejoin: round;
  stroke-width: 2px;
}

.annualPieLabelSmall {
  font-size: 6px;
}

.annualPieCenterLabel {
  fill: var(--dashboard-muted);
  font-size: 9px;
}

.annualPieCenterValue {
  fill: var(--dashboard-ink);
  font-size: 12px;
  font-weight: 700;
}

.annualProfitDetails {
  display: grid;
  gap: 0.45rem;
  margin: 0;
}

.annualProfitDetails > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  font-size: 0.68rem;
}

.annualProfitDetails dt,
.annualProfitDetails dd {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  margin: 0;
}

.annualProfitDetails dt {
  color: var(--dashboard-muted);
}

.annualProfitDetails dt i {
  width: 0.55rem;
  height: 0.55rem;
  flex: 0 0 auto;
  border-radius: 50%;
}

.annualProfitDetails dd {
  justify-content: flex-end;
  flex-wrap: wrap;
  color: var(--dashboard-ink);
  text-align: right;
}

.annualProfitDetails dd strong {
  white-space: nowrap;
}

.annualProfitDetails dd span {
  padding: 0.1rem 0.3rem;
  color: #42634f;
  background: var(--dashboard-pale);
  border-radius: 1rem;
  font-size: 0.58rem;
}

.annualProfitNet {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid #edf0ed;
  color: var(--dashboard-ink);
  font-size: 0.82rem;
  grid-column: 1 / -1;
}

.annualProfitNet strong:last-child {
  color: var(--dashboard-green);
}

.annualProfitNet.isLoss strong:last-child {
  color: #e45c4e;
}

.chartEmpty {
  display: grid;
  min-height: 205px;
  place-items: center;
  padding: 1rem;
  color: var(--dashboard-muted);
  font-size: 0.85rem;
  text-align: center;
}

.topProducts {
  display: grid;
  gap: 0.9rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.topProducts li {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.productRank {
  display: grid;
  width: 1.8rem;
  height: 1.8rem;
  flex: 0 0 auto;
  place-items: center;
  color: var(--dashboard-green);
  background: var(--dashboard-pale);
  border-radius: 50%;
  font-size: 0.78rem;
  font-weight: 700;
}

.productInfo {
  flex: 1;
  min-width: 0;
}

.productName {
  overflow: hidden;
  color: var(--dashboard-ink);
  font-size: 0.77rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.productTrack {
  height: 6px;
  margin-top: 0.4rem;
  overflow: hidden;
  background: #edf0ed;
  border-radius: 5px;
}

.productTrack span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--dashboard-green), #d98e2b);
  border-radius: inherit;
}

.topProducts li > strong {
  flex: 0 0 auto;
  color: var(--dashboard-ink);
  font-size: 0.72rem;
}

.chartLegend {
  display: flex;
  justify-content: center;
  gap: 1.2rem;
  margin-top: 0.45rem;
  color: var(--dashboard-muted);
  font-size: 0.7rem;
}

.chartLegend span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.chartLegend i {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 2px;
}

.legendIncome,
.legendProfit {
  background: var(--dashboard-green);
}

.legendExpense {
  background: #d98e2b;
}

.detailTotal {
  display: grid;
  gap: 0.3rem;
  padding: 0.9rem 1rem;
  margin: 0.4rem 0 0.65rem;
  color: #42634f;
  background: var(--dashboard-pale);
  border-radius: 0.65rem;
  font-size: 0.75rem;
}

.detailTotal strong {
  color: #136f50;
  font-size: 1.25rem;
}

.salesDetails {
  margin: 0;
}

.salesDetails div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0.15rem;
  border-bottom: 1px solid #edf0ed;
  font-size: 0.78rem;
}

.salesDetails div:last-child {
  border-bottom: 0;
}

.salesDetails dt {
  color: var(--dashboard-muted);
  font-weight: 400;
}

.salesDetails dd {
  margin: 0;
  color: var(--dashboard-ink);
  font-weight: 700;
  text-align: right;
}

@media (max-width: 992px) {
  .dashboardSummary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboardTopGrid,
  .dashboardBottomGrid {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.85fr);
  }
}

@media (max-width: 720px) {
  .dashboardPage.adminDashboard {
    grid-template-columns: minmax(0, 1fr);
  }

  .dashboardHeader {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboardMonth {
    width: 100%;
    justify-content: space-between;
  }

  .dashboardMonth input {
    width: min(60%, 220px);
  }

  .dashboardTopGrid,
  .dashboardMiddleGrid,
  .dashboardBottomGrid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 420px) {
  .dashboardSummary {
    grid-template-columns: minmax(0, 1fr);
  }

  .dashboardPanel {
    padding: 0.9rem;
  }

  .annualProfit {
    grid-template-columns: minmax(100px, 0.75fr) minmax(0, 1.25fr);
    gap: 0.45rem;
  }
}
</style>
