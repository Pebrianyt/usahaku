<template>
  <main class="page-container">
    <header class="pagehead">
      <h1>Daftar Pesanan</h1>
      <p>Catat pesanan pelanggan, pantau pembayarannya, dan lihat modal serta keuntungan.</p>
    </header>

    <p id="status" role="status" aria-live="polite" class="text-secondary small mb-3">
      {{ statusMessage }}
    </p>

    <!-- Order Form -->
    <form id="formPesanan" @submit.prevent="submitPesanan" class="mb-4">
      <div class="pesananUtama w-100 d-flex gap-3 flex-wrap mb-3">
        <div class="fieldGroup">
          <label for="inputNoPesanan">Nomor pesanan</label>
          <input type="text" id="inputNoPesanan" v-model="formNoPesanan" required>
        </div>
        <div class="fieldGroup">
          <label for="inputTanggal">Tanggal pesanan</label>
          <input type="date" id="inputTanggal" v-model="formTanggal" @change="hitungEstimasiHpp" required>
        </div>
        <div class="fieldGroup">
          <label for="inputTotalAkhir">Total penghasilan akhir pesanan (setelah potongan)</label>
          <div class="inputRupiah">
            <span class="prefix">Rp</span>
            <input 
              type="text" 
              id="inputTotalAkhir" 
              v-model="formTotalAkhirDisplay" 
              @input="onTotalAkhirInput" 
              inputmode="decimal" 
              placeholder="0" 
              required
            >
          </div>
        </div>
      </div>

      <!-- Multiple Products in Order -->
      <div id="produkPesananList" class="produkPesananList w-100 d-flex flex-column gap-2 mb-3">
        <div class="produkPesananHeader" aria-hidden="true">
          <span>Produk</span>
          <span>Qty</span>
          <span>HPP Produk</span>
          <span>Total HPP</span>
          <span>Aksi</span>
        </div>

        <div 
          v-for="(row, idx) in formItems" 
          :key="row.uid" 
          class="produkPesananRow d-flex align-items-center gap-2 flex-wrap p-2 border rounded bg-light"
        >
          <div class="flex-grow-1" style="min-width: 180px;">
            <select 
              v-model="row.kode_produk" 
              class="form-select form-select-sm" 
              @change="hitungEstimasiHpp" 
              required
            >
              <option value="" disabled>-- Pilih Produk --</option>
              <option 
                v-for="p in daftarProduk" 
                :key="p.id" 
                :value="p.id"
              >
                {{ formatKode(p.id) }} - {{ p.nama_produk }}
              </option>
            </select>
          </div>
          <div style="width: 100px;">
            <input 
              type="number" 
              v-model.number="row.qty" 
              class="form-control form-control-sm text-center" 
              placeholder="Qty" 
              min="1" 
              @input="hitungEstimasiHpp" 
              required
            >
          </div>
          <div style="width: 280px;">
            <div class="hppProdukGrid">
              <div
                v-for="(layer, layerIdx) in row.hppLayers"
                :key="`${row.uid}-${layer.hppPerUnit}-${layerIdx}`"
                class="hppProdukLayer"
              >
                <span>{{ formatRupiah(layer.hppPerUnit) }}</span>
                <small>{{ layer.qty }} pcs</small>
              </div>
              <div v-if="!row.hppLayers.length" class="hppProdukKosong">-</div>
            </div>
          </div>
          <div style="width: 150px;">
            <input 
              type="text" 
              :value="row.totalHppDisplay" 
              class="form-control form-control-sm bg-white text-secondary fw-medium" 
              placeholder="Total HPP" 
              readonly
            >
          </div>
          <div>
            <button 
              type="button" 
              class="btn btn-sm btn-outline-danger" 
              title="Hapus baris produk" 
              @click="hapusBarisProduk(idx)"
              :disabled="formItems.length === 1"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="pesananFormActions w-100 d-flex align-items-center justify-content-between gap-2">
        <button type="button" id="btnTambahProduk" class="btnTambahProduk" @click="tambahBarisProduk">
          + Tambah produk
        </button>
        <div class="d-flex align-items-center gap-2">
          <button 
            v-if="pesananSedangDiedit" 
            type="button" 
            id="btnBatalEditPesanan" 
            class="btnTambahProduk" 
            @click="batalEditPesanan"
          >
            Batal edit
          </button>
          <button 
            type="submit" 
            class="btnIcon btnSubmitPesanan" 
            :title="pesananSedangDiedit ? 'Simpan perubahan' : 'Simpan pesanan'" 
            :aria-label="pesananSedangDiedit ? 'Simpan perubahan' : 'Simpan pesanan'"
            :disabled="isSubmitting"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </button>
        </div>
      </div>
    </form>

    <!-- Bulk Actions Bar -->
    <section class="bulkbar d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 mb-3 bg-light border rounded" aria-label="Aksi pesanan terpilih">
      <div class="d-flex align-items-center gap-2">
        <input type="checkbox" id="checkAll" v-model="isCheckAll" @change="toggleCheckAll" class="form-check-input mt-0">
        <label for="checkAll" class="mb-0 small fw-medium">Pilih Semua Pesanan Pending</label>
        <span>{{ selectedOrderGroups.length }} dipilih</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span v-if="selectedProfitTotal > 0" class="small text-secondary me-2">
          Profit Terpilih: <strong class="text-success">{{ formatRupiah(selectedProfitTotal) }}</strong>
        </span>
        <button 
          type="button" 
          id="btnRealisasiTerpilih" 
          class="btn btn-sm btn-success px-3" 
          @click="tandaiRealisasiTerpilih"
          :disabled="selectedOrderGroups.length === 0"
        >
          Tandai Realisasi ({{ selectedOrderGroups.length }})
        </button>
      </div>
    </section>

    <!-- Search & Filter Controls -->
    <section class="pesananFilters d-flex gap-3 flex-wrap mb-3" aria-label="Filter daftar pesanan">
      <div class="fieldGroup flex-grow-1" style="min-width: 200px;">
        <label for="cariPesanan">Cari pesanan</label>
        <input type="search" id="cariPesanan" v-model="filterCari" placeholder="Cari nomor pesanan atau produk...">
      </div>
      <div class="fieldGroup" style="width: auto;">
        <label for="filterBulanPesanan">Bulan pesanan</label>
        <input type="month" id="filterBulanPesanan" v-model="filterBulan">
      </div>
      <div class="fieldGroup" style="width: auto;">
        <label for="filterStatusPesanan">Status pesanan</label>
        <select id="filterStatusPesanan" v-model="filterStatus">
          <option value="">Semua status</option>
          <option value="Pending">Pending</option>
          <option value="Realisasi">Realisasi</option>
        </select>
      </div>
    </section>

    <!-- Table of Orders -->
    <div class="tableScroll table-responsive">
      <table class="table tblPesanan align-middle">
        <thead>
          <tr>
            <th scope="col" style="width: 40px;"></th>
            <th scope="col">No Pesanan</th>
            <th scope="col">Tanggal</th>
            <th scope="col">Produk</th>
            <th scope="col" style="width: 60px;">Qty</th>
            <th scope="col">Total HPP<br>Produk</th>
            <th scope="col">Total Penghasilan<br>Akhir</th>
            <th scope="col">Total HPP<br>Pesanan</th>
            <th scope="col">Profit<br>Penjualan</th>
            <th scope="col">Margin</th>
            <th scope="col">Status</th>
            <th scope="col" style="width: 90px;">Aksi</th>
          </tr>
        </thead>
        <tbody id="tabelPesanan">
          <tr v-if="filteredGroups.length === 0">
            <td colspan="12" class="text-center py-4 text-secondary">
              Belum ada data pesanan yang sesuai filter.
            </td>
          </tr>
          <template v-for="group in filteredGroups" :key="group.key">
            <tr 
              v-for="(item, index) in group.displayRows" 
              :key="group.key + '-' + item.displayKey"
              :class="{ 'border-top-thick': index === 0 }"
            >
              <!-- Merged Columns for first row of group -->
              <td v-if="index === 0" :rowspan="group.displayRows.length" class="text-center">
                <input 
                  v-if="group.status !== 'Realisasi'" 
                  type="checkbox" 
                  class="form-check-input rowCheck" 
                  :value="group.key" 
                  v-model="selectedOrderGroups"
                  :aria-label="`Pilih pesanan ${group.noPesanan} untuk realisasi`"
                >
              </td>
              <td v-if="index === 0" :rowspan="group.displayRows.length" class="fw-bold">
                {{ group.noPesanan }}
              </td>
              <td v-if="index === 0" :rowspan="group.displayRows.length">
                {{ group.tanggal }}
              </td>

              <!-- Per product row details -->
              <td>{{ item.nama_produk }}</td>
              <td class="text-center">{{ item.qty }}</td>
              <td :title="item.hppPerUnit === null ? 'HPP FIFO belum tersedia untuk seluruh qty ini' : `${formatRupiah(item.hppPerUnit)} per unit`">
                {{ item.hppBelumTersedia ? 'Belum tersedia' : formatRupiah(item.hpp) }}
              </td>

              <!-- Group financial totals on first row -->
              <td v-if="index === 0" :rowspan="group.displayRows.length" class="fw-bold">
                {{ formatRupiah(group.totalPenghasilan) }}
              </td>
              <td v-if="index === 0" :rowspan="group.displayRows.length">
                {{ formatRupiah(group.totalHpp) }}
              </td>
              <td v-if="index === 0" :rowspan="group.displayRows.length" :class="group.profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'">
                {{ formatRupiah(group.profit) }}
              </td>
              <td v-if="index === 0" :rowspan="group.displayRows.length">
                {{ group.margin.toFixed(1) }}%
              </td>
              <td v-if="index === 0" :rowspan="group.displayRows.length" class="text-center">
                <span :class="['badge', group.status === 'Realisasi' ? 'bg-success' : 'bg-warning text-dark']" :title="group.status === 'Realisasi' ? `Realisasi pada ${group.tanggalRealisasi}` : ''">
                  {{ group.status }}
                </span>
              </td>
              <td v-if="index === 0" :rowspan="group.displayRows.length">
                <div class="d-flex align-items-center gap-1">
                  <button 
                    class="btnIcon btnEdit" 
                    title="Edit pesanan" 
                    @click="mulaiEditPesanan(group)"
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </button>
                  <button 
                    class="btnIcon btnHapus" 
                    title="Hapus satu pesanan beserta seluruh produknya" 
                    @click="hapusGrupPesanan(group.noPesanan)"
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </main>
</template>

<script>
import { supabase } from '@/services/supabase';
import { formatKode, formatRupiah, formatNominal, parseNominal, tanggalLokal } from '@/utils/currency';
import { kelompokkanPesanan, hitungEstimasiHppFIFO } from '@/utils/calculations';
import { showToast, confirmAction } from '@/services/notification';

export default {
  name: 'DaftarPesananView',
  data() {
    return {
      statusMessage: 'Menghubungkan ke database...',
      isSubmitting: false,
      listPesanan: [],
      daftarProduk: [],
      daftarTransaksiStok: [],
      daftarAlokasiStok: [],
      pesananSedangDiedit: null,
      formNoPesanan: '',
      formTanggal: tanggalLokal(),
      formTotalAkhirDisplay: '',
      rowIdGen: 1,
      formItems: [
        { uid: 1, kode_produk: '', qty: 1, hppLayers: [], totalHppDisplay: '' }
      ],
      selectedOrderGroups: [],
      isCheckAll: false,
      filterCari: '',
      filterBulan: '',
      filterStatus: ''
    };
  },
  computed: {
    mapProduk() {
      const map = {};
      this.daftarProduk.forEach(p => {
        map[p.id] = { nama: p.nama_produk, hpp: Number(p.hpp || 0) };
      });
      return map;
    },
    hppPerPesanan() {
      const alokasiPerKeluar = new Map();

      this.daftarAlokasiStok.forEach(alokasi => {
        const idKeluar = String(alokasi.transaksi_keluar_id);
        if (!alokasiPerKeluar.has(idKeluar)) alokasiPerKeluar.set(idKeluar, []);
        alokasiPerKeluar.get(idKeluar).push({
          qty: Number(alokasi.qty || 0),
          hppPerUnit: Number(alokasi.harga_satuan || 0)
        });
      });

      const hppPerPesanan = new Map();
      this.daftarTransaksiStok
        .filter(item => item.jenis === 'Keluar' && item.sumber === 'Pesanan')
        .forEach(keluar => {
          const idPesanan = String(keluar.pesanan_id);
          const dataPesanan = hppPerPesanan.get(idPesanan) || { total: 0, allocations: [] };
          (alokasiPerKeluar.get(String(keluar.id)) || []).forEach(alokasi => {
            const totalHpp = alokasi.qty * alokasi.hppPerUnit;
            const alokasiTerakhir = dataPesanan.allocations[dataPesanan.allocations.length - 1];

            dataPesanan.total += totalHpp;
            if (alokasiTerakhir?.hppPerUnit === alokasi.hppPerUnit) {
              alokasiTerakhir.qty += alokasi.qty;
              alokasiTerakhir.totalHpp += totalHpp;
            } else {
              dataPesanan.allocations.push({ ...alokasi, totalHpp });
            }
          });
          hppPerPesanan.set(idPesanan, dataPesanan);
        });

      return hppPerPesanan;
    },
    groupedOrders() {
      return kelompokkanPesanan(this.listPesanan, this.mapProduk, this.hppPerPesanan);
    },
    filteredGroups() {
      const cari = this.filterCari.trim().toLocaleLowerCase('id-ID');
      const bulan = this.filterBulan;
      const status = this.filterStatus;

      return this.groupedOrders.filter(group => {
        const cocokCari = !cari || 
          group.noPesanan.toLocaleLowerCase('id-ID').includes(cari) ||
          group.rows.some(r => (r.nama_produk || '').toLocaleLowerCase('id-ID').includes(cari));
        const cocokBulan = !bulan || (group.tanggal && group.tanggal.startsWith(bulan));
        const cocokStatus = !status || group.status === status;
        return cocokCari && cocokBulan && cocokStatus;
      });
    },
    selectedProfitTotal() {
      return this.filteredGroups
        .filter(g => this.selectedOrderGroups.includes(g.key))
        .reduce((sum, g) => sum + g.profit, 0);
    }
  },
  methods: {
    formatKode,
    formatRupiah,
    onTotalAkhirInput(e) {
      this.formTotalAkhirDisplay = formatNominal(e.target.value);
    },
    tambahBarisProduk(kodeAwal = '', qtyAwal = 1) {
      this.formItems.push({
        uid: ++this.rowIdGen,
        kode_produk: kodeAwal,
        qty: qtyAwal,
        hppLayers: [],
        totalHppDisplay: ''
      });
      this.hitungEstimasiHpp();
    },
    hapusBarisProduk(idx) {
      if (this.formItems.length > 1) {
        this.formItems.splice(idx, 1);
        this.hitungEstimasiHpp();
      }
    },
    async ambilSemuaBaris(tabel, kolom, kolomUrut = 'id') {
      const semua = [];
      const ukuranHalaman = 1000;
      for (let awal = 0; ; awal += ukuranHalaman) {
        const { data, error } = await supabase.from(tabel).select(kolom)
          .order(kolomUrut, { ascending: true })
          .range(awal, awal + ukuranHalaman - 1);
        if (error) return { data: null, error };
        semua.push(...(data || []));
        if (!data || data.length < ukuranHalaman) break;
      }
      return { data: semua, error: null };
    },
    async loadDataPesanan() {
      this.statusMessage = 'Memuat data pesanan...';
      const hasil = await Promise.all([
        this.ambilSemuaBaris('produk', 'id, nama_produk, hpp, aktif'),
        this.ambilSemuaBaris('pesanan', '*', 'id'),
        this.ambilSemuaBaris('transaksi_stok', 'id, tanggal, kode_produk, jenis, qty, harga_satuan, sumber, pesanan_id'),
        this.ambilSemuaBaris('alokasi_stok_fifo', 'id, transaksi_keluar_id, transaksi_masuk_id, qty, harga_satuan')
      ]);

      const gagal = hasil.find(item => item.error);
      if (gagal) {
        this.statusMessage = 'Gagal memuat data: ' + gagal.error.message;
        showToast('Gagal memuat data: ' + gagal.error.message, 'error');
        return;
      }

      this.daftarProduk = hasil[0].data || [];
      this.listPesanan = hasil[1].data || [];
      this.daftarTransaksiStok = hasil[2].data || [];
      this.daftarAlokasiStok = hasil[3].data || [];

      const groups = this.groupedOrders;
      this.statusMessage = `Data berhasil dimuat: ${groups.length} nomor pesanan.`;
    },
    hitungEstimasiHpp() {
      const tgl = this.formTanggal || tanggalLokal();
      const rawItems = this.formItems.map(item => ({
        kode_produk: item.kode_produk,
        qty: item.qty
      }));

      const hasil = hitungEstimasiHppFIFO(
        rawItems,
        tgl,
        this.daftarTransaksiStok,
        this.daftarAlokasiStok,
        this.pesananSedangDiedit
      );

      hasil.forEach((calc, idx) => {
        if (this.formItems[idx]) {
          this.formItems[idx].hppLayers = calc.rincian;
          this.formItems[idx].totalHppDisplay = calc.sisaKurang > 0
            ? `${formatRupiah(calc.totalHpp)} (stok kurang ${calc.sisaKurang} pcs)`
            : formatRupiah(calc.totalHpp);
        }
      });
    },
    toggleCheckAll() {
      if (this.isCheckAll) {
        this.selectedOrderGroups = this.filteredGroups
          .filter(g => g.status !== 'Realisasi')
          .map(g => g.key);
      } else {
        this.selectedOrderGroups = [];
      }
    },
    async submitPesanan() {
      const no = this.formNoPesanan.trim();
      const tgl = this.formTanggal || tanggalLokal();
      const totalAkhir = parseNominal(this.formTotalAkhirDisplay);

      if (!no) {
        showToast('Nomor pesanan wajib diisi.', 'warning');
        return;
      }

      const items = this.formItems.map(row => ({
        kode_produk: Number(row.kode_produk),
        qty: Number(row.qty)
      }));

      if (items.some(item => !item.kode_produk || !Number.isInteger(item.qty) || item.qty <= 0)) {
        showToast('Pilih produk dan isi qty bilangan bulat lebih dari nol untuk setiap baris.', 'warning');
        return;
      }

      this.isSubmitting = true;
      const rpcName = this.pesananSedangDiedit ? 'edit_pesanan_fifo' : 'simpan_pesanan_fifo';
      const rpcArgs = this.pesananSedangDiedit
        ? {
            p_no_pesanan_lama: this.pesananSedangDiedit.no,
            p_no_pesanan_baru: no,
            p_tanggal: tgl,
            p_total_penghasilan_akhir: totalAkhir,
            p_items: items
          }
        : {
            p_no_pesanan: no,
            p_tanggal: tgl,
            p_total_penghasilan_akhir: totalAkhir,
            p_items: items
          };

      const { error } = await supabase.rpc(rpcName, rpcArgs);
      this.isSubmitting = false;

      if (error) {
        const errText = error.code === '23505'
          ? 'Nomor pesanan tersebut sudah digunakan. Gunakan nomor lain.'
          : 'Gagal menyimpan pesanan: ' + error.message;
        showToast(errText, 'error');
        return;
      }

      showToast(`Pesanan "${no}" berhasil ${this.pesananSedangDiedit ? 'diperbarui' : 'disimpan'}!`, 'success');
      this.batalEditPesanan();
      await this.loadDataPesanan();
    },
    mulaiEditPesanan(group) {
      this.pesananSedangDiedit = {
        no: group.noPesanan,
        ids: new Set(group.rows.map(r => String(r.id)))
      };
      this.formNoPesanan = group.noPesanan;
      this.formTanggal = group.tanggal;
      this.formTotalAkhirDisplay = formatNominal(group.totalPenghasilan);
      this.formItems = group.rows.map(r => ({
        uid: ++this.rowIdGen,
        kode_produk: r.kode_produk,
        qty: r.qty,
        hppLayers: [],
        totalHppDisplay: ''
      }));
      this.hitungEstimasiHpp();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    batalEditPesanan() {
      this.pesananSedangDiedit = null;
      this.formNoPesanan = '';
      this.formTanggal = tanggalLokal();
      this.formTotalAkhirDisplay = '';
      this.formItems = [
        { uid: ++this.rowIdGen, kode_produk: '', qty: 1, hppLayers: [], totalHppDisplay: '' }
      ];
    },
    async hapusGrupPesanan(noPesanan) {
      const confirmed = await confirmAction(
        `Hapus pesanan ${noPesanan} beserta seluruh produk di dalamnya? Stok FIFO akan dihitung ulang.`,
        {
          title: 'Hapus Pesanan',
          confirmText: 'Ya, Hapus Pesanan',
          confirmVariant: 'danger'
        }
      );
      if (!confirmed) return;

      const { error } = await supabase.rpc('hapus_grup_pesanan_fifo', { p_no_pesanan: noPesanan });
      if (error) {
        showToast('Gagal menghapus pesanan: ' + error.message, 'error');
        return;
      }

      showToast(`Pesanan ${noPesanan} berhasil dihapus.`, 'success');
      await this.loadDataPesanan();
    },
    async tandaiRealisasiTerpilih() {
      if (this.selectedOrderGroups.length === 0) return;
      const hariIni = tanggalLokal();

      const idList = this.filteredGroups
        .filter(g => this.selectedOrderGroups.includes(g.key))
        .flatMap(g => g.rows.map(r => String(r.id)));

      const { error } = await supabase
        .from('pesanan')
        .update({ status: 'Realisasi', tanggal_transaksi_masuk: hariIni })
        .in('id', idList);

      if (error) {
        showToast('Gagal mengubah status pesanan: ' + error.message, 'error');
        return;
      }

      showToast(`${this.selectedOrderGroups.length} pesanan berhasil ditandai Realisasi!`, 'success');
      this.selectedOrderGroups = [];
      this.isCheckAll = false;
      await this.loadDataPesanan();
    }
  },
  mounted() {
    this.loadDataPesanan();
  }
};
</script>

<style scoped>
.border-top-thick {
  border-top: 2px solid #e2ded5;
}
</style>
