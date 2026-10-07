<template>
  <main class="page-container">
    <header class="pagehead">
      <h1>Stok / Inventori</h1>
      <p>Catat barang masuk dan pantau jumlah stok serta nilai modal yang tersedia.</p>
    </header>

    <p id="status" role="status" aria-live="polite" class="text-secondary small mb-3">
      {{ statusMessage }}
    </p>

    <!-- Form Catat Barang Masuk -->
    <form id="formStok" @submit.prevent="simpanStok" class="mb-4">
      <h2 id="judulFormStok" class="w-100 fs-6 fw-bold mb-2">
        {{ transaksiSedangDiedit ? 'Edit Transaksi Barang Masuk' : 'Catat Barang Masuk' }}
      </h2>
      <div class="fieldGroup">
        <label for="inputTanggal">Tanggal transaksi stok</label>
        <input type="date" id="inputTanggal" v-model="formTanggal" required>
      </div>
      <div class="fieldGroup">
        <label for="selectProduk">Produk</label>
        <select id="selectProduk" v-model="formProdukId" @change="onProdukChange" required>
          <option value="" disabled>-- Pilih Produk --</option>
          <option 
            v-for="p in daftarProdukPilihan" 
            :key="p.id" 
            :value="p.id"
          >
            {{ formatKode(p.id) }} - {{ p.nama_produk }} {{ p.aktif === false ? '(nonaktif)' : '' }}
          </option>
        </select>
      </div>
      <div class="fieldGroup">
        <label for="selectSumber">Jenis stok masuk</label>
        <select id="selectSumber" v-model="formSumber" required>
          <option value="Manual">Pembelian / restok</option>
          <option value="Saldo Awal">Saldo awal</option>
        </select>
      </div>
      <div class="fieldGroup">
        <label for="inputQty">Jumlah barang masuk (qty)</label>
        <input type="number" id="inputQty" v-model.number="formQty" required min="1">
      </div>
      <div class="fieldGroup hppField">
        <label for="inputHppStok">Harga perolehan / unit</label>

        <div class="inputRupiah">
          <span class="prefix">Rp</span>
          <input 
            type="text"
            id="inputHppStok"
            v-model="formHppDisplay"
            @input="onHppInput"
            inputmode="decimal"
            placeholder="0"
            :readonly="gunakanHppProduk"
            required
          >
        </div>

        <div class="hppCheck">
          <input
            type="checkbox"
            id="gunakanHppProduk"
            v-model="gunakanHppProduk"
            @change="onToggleHppProduk"
          >

          <label for="gunakanHppProduk">
            Gunakan harga perolehan dari data produk
          </label>
        </div>

        <small class="hppHelp">
          Harga ini digunakan sebagai nilai modal untuk lapisan stok FIFO.
        </small>
      </div>
      <button 
        type="submit" 
        class="btnIcon btnTambah" 
        :title="transaksiSedangDiedit ? 'Simpan perubahan' : 'Simpan stok'" 
        :aria-label="transaksiSedangDiedit ? 'Simpan perubahan stok' : 'Simpan stok'"
        :disabled="isSubmitting"
      ></button>
      <button 
        v-if="transaksiSedangDiedit" 
        type="button" 
        id="btnBatalEditStok" 
        class="btnTambahProduk ms-2" 
        @click="batalEditStok"
      >
        Batalkan edit
      </button>
    </form>

    <!-- Stock Opname Tools -->
    <section class="stokOpnameTools mb-4">
      <div>
        <h2>Stock Opname</h2>
        <p>Cetak daftar stok saat ini atau form pemeriksaan mingguan untuk diisi manual.</p>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button 
          type="button" 
          id="btnCetakStokSaatIni" 
          class="btnTambahProduk" 
          @click="cetakStokSemuaProduk"
          :disabled="!daftarProduk.length"
        >
          Cetak stok semua produk
        </button>
        <button 
          type="button" 
          id="btnCetakOpnameMingguan" 
          class="btnTambahProduk" 
          @click="cetakOpnameMingguan"
          :disabled="!daftarProduk.length"
        >
          Cetak form opname mingguan
        </button>
      </div>
    </section>

    <!-- Rekap HPP Bulanan -->
    <section class="stokRekap mb-4">
      <div class="stokRekapHeader d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h2>Rekap HPP Bulanan</h2>
          <p>Rekap ini menghitung nilai modal dari stok awal dan pembelian pada bulan yang dipilih.</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <label for="filterBulan" class="mb-0 fw-medium">Bulan laporan</label>
          <input type="month" id="filterBulan" v-model="filterBulan" class="form-control" style="width: auto;">
        </div>
      </div>
      <section class="cards" aria-label="Ringkasan metrik">
        <article class="card">
          <h2 class="label">Persediaan Awal</h2>
          <div class="value">{{ formatRupiah(rekapBulanan.nilaiAwal) }}</div>
        </article>
        <article class="card">
          <h2 class="label">Pembelian Produk</h2>
          <div class="value">{{ formatRupiah(rekapBulanan.nilaiPembelian) }}</div>
        </article>
        <article class="card">
          <h2 class="label">Persediaan Akhir</h2>
          <div class="value">{{ formatRupiah(rekapBulanan.nilaiAkhir) }}</div>
        </article>
        <article class="card">
          <h2 class="label">HPP Bulan Ini</h2>
          <div class="value">{{ formatRupiah(rekapBulanan.hppBulanan) }}</div>
        </article>
      </section>
    </section>

    <!-- Tabel Stok Tersedia Saat Ini -->
    <h2 class="fs-5 fw-bold mb-2">Stok Tersedia Saat Ini</h2>
    <div class="tableScroll table-responsive mb-4">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Kode</th>
            <th scope="col">Nama Produk</th>
            <th scope="col">Qty Tersedia</th>
            <th scope="col">HPP Produk</th>
            <th scope="col">Nilai Persediaan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="stokSaatIniList.length === 0">
            <td colspan="5" class="text-center py-3 text-secondary">Belum ada data produk.</td>
          </tr>
          <tr v-for="item in stokSaatIniList" :key="item.id">
            <td>{{ formatKode(item.id) }}</td>
            <td>{{ item.nama_produk }}</td>
            <td>{{ item.qtyTersedia }}</td>
            <td>
              <div v-if="item.qtyTersedia && item.fifoLengkap" class="hppProdukGrid">
                <div v-for="(layer, index) in item.hppLayers" :key="`${item.id}-${index}`" class="hppProdukLayer">
                  <span>{{ formatRupiah(layer.hppPerUnit) }}</span>
                  <small>{{ layer.qty }} pcs</small>
                </div>
              </div>
              <span v-else>{{ item.qtyTersedia ? 'Perlu diperiksa' : '-' }}</span>
            </td>
            <td>{{ item.fifoLengkap ? formatRupiah(item.nilaiStok) : 'Perlu diperiksa' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Tabel Stok Akhir Bulan -->
    <h2 class="fs-5 fw-bold mb-2">Stok per Produk pada Akhir Bulan</h2>
    <div class="tableScroll table-responsive mb-4">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Kode</th>
            <th scope="col">Nama Produk</th>
            <th scope="col">Stok Awal</th>
            <th scope="col">Total Masuk</th>
            <th scope="col">Total Keluar</th>
            <th scope="col">Stok Tersedia</th>
            <th scope="col">HPP Produk</th>
            <th scope="col">Nilai Persediaan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rekapPerProdukList.length === 0">
            <td colspan="8" class="text-center py-3 text-secondary">Belum ada data produk.</td>
          </tr>
          <tr v-for="item in rekapPerProdukList" :key="item.produk.id">
            <td>{{ formatKode(item.produk.id) }}</td>
            <td>{{ item.produk.nama_produk || '-' }}</td>
            <td>{{ item.stokAwal }}</td>
            <td>{{ item.masuk }}</td>
            <td>{{ item.keluar }}</td>
            <td>{{ item.stokAkhir }}</td>
            <td>
              <div v-if="item.hppLayers.length" class="hppProdukGrid">
                <div v-for="(layer, index) in item.hppLayers" :key="`${item.produk.id}-${index}`" class="hppProdukLayer">
                  <span>{{ formatRupiah(layer.hppPerUnit) }}</span>
                  <small>{{ layer.qty }} pcs</small>
                </div>
              </div>
              <span v-else>-</span>
            </td>
            <td>{{ formatRupiah(item.nilaiAkhir) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Riwayat Transaksi Stok -->
    <h2 class="fs-5 fw-bold mb-2">Riwayat Transaksi Stok</h2>
    <section class="stokTransaksiFilters mb-3" aria-label="Pencarian dan filter transaksi stok">
      <div class="fieldGroup">
        <label for="cariTransaksiStok">Cari produk</label>
        <input type="search" id="cariTransaksiStok" v-model="filterCari" placeholder="Ketik nama atau kode produk">
      </div>
      <div class="fieldGroup">
        <label for="filterJenisTransaksi">Jenis transaksi</label>
        <select id="filterJenisTransaksi" v-model="filterJenis">
          <option value="">Semua jenis</option>
          <option value="Masuk">Barang masuk</option>
          <option value="Keluar">Barang keluar</option>
        </select>
      </div>
      <div class="fieldGroup">
        <label for="filterTanggalMulai">Dari tanggal</label>
        <input type="date" id="filterTanggalMulai" v-model="filterTanggalMulai">
      </div>
      <div class="fieldGroup">
        <label for="filterTanggalAkhir">Sampai tanggal</label>
        <input type="date" id="filterTanggalAkhir" v-model="filterTanggalAkhir">
      </div>
    </section>

    <div class="tableScroll table-responsive">
      <table class="table stokRiwayatTable">
        <thead>
          <tr>
            <th scope="col">Tanggal</th>
            <th scope="col">Kode</th>
            <th scope="col">Nama Produk</th>
            <th scope="col">Jenis</th>
            <th scope="col">Qty</th>
            <th scope="col">Harga Perolehan / Unit</th>
            <th scope="col">Nilai Persediaan</th>
            <th scope="col">Sumber</th>
            <th scope="col">Keterangan</th>
            <th scope="col">Aksi</th>
          </tr>
        </thead>
        <tbody id="tabelTransaksiStok">
          <tr v-if="filteredTransaksi.length === 0">
            <td colspan="10" class="text-center py-3 text-secondary">Belum ada transaksi stok.</td>
          </tr>
          <tr v-for="t in filteredTransaksi" :key="t.id">
            <td>{{ t.tanggal }}</td>
            <td>{{ formatKode(t.kode_produk) }}</td>
            <td>{{ t.nama_produk }}</td>
            <td>
              <span :class="['badge', t.jenis === 'Masuk' ? 'bg-success' : 'bg-secondary']">
                {{ t.jenis }}
              </span>
            </td>
            <td>{{ t.qty }}</td>
            <td>{{ t.hppDisplay }}</td>
            <td>{{ t.nilaiDisplay }}</td>
            <td>{{ t.sumber === 'Manual' ? 'Pembelian / restock' : (t.sumber || '-') }}</td>
            <td>{{ t.keterangan || '-' }}</td>
            <td>
              <div v-if="t.jenis === 'Masuk'" class="d-flex align-items-center gap-1">
                <button 
                  class="btnIcon btnEdit" 
                  title="Edit barang masuk" 
                  @click="mulaiEditStok(t)"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                </button>
                <button 
                  class="btnIcon btnHapus" 
                  title="Hapus barang masuk" 
                  @click="hapusStokMasuk(t)"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
              <span v-else class="text-secondary small">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Hidden Printable Area for Stock Opname -->
    <Teleport to="body">
      <div id="areaCetakStokOpname" class="printOnly d-none" v-html="printHtml"></div>
    </Teleport>
  </main>
</template>

<script>
import { supabase } from '@/services/supabase';
import { 
  formatKode, formatRupiah, formatNominal, parseNominal, 
  tanggalLokal, bulanSekarang, rentangBulan, formatTanggalIndonesia 
} from '@/utils/currency';
import { showToast, confirmAction } from '@/services/notification';

function gabungkanLapisanHpp(layers) {
  const grouped = new Map();
  (layers || []).forEach(layer => {
    const key = String(layer.hppPerUnit);
    const current = grouped.get(key);
    if (current) current.qty += layer.qty;
    else grouped.set(key, { ...layer });
  });
  return Array.from(grouped.values());
}

export default {
  name: 'PersediaanView',
  data() {
    return {
      statusMessage: 'Menghubungkan ke database...',
      isSubmitting: false,
      daftarProduk: [],
      daftarTransaksi: [],
      daftarAlokasi: [],
      transaksiSedangDiedit: null,
      filterBulan: bulanSekarang(),
      filterCari: '',
      filterJenis: '',
      filterTanggalMulai: '',
      filterTanggalAkhir: '',
      formTanggal: tanggalLokal(),
      formProdukId: '',
      formSumber: 'Manual',
      formQty: 1,
      formHppDisplay: '',
      gunakanHppProduk: false,
      printHtml: ''
    };
  },
  computed: {
    daftarProdukPilihan() {
      return this.daftarProduk;
    },
    alokasiKeluarMap() {
      const perKeluar = new Map();
      this.daftarAlokasi.forEach(item => {
        const key = String(item.transaksi_keluar_id);
        if (!perKeluar.has(key)) perKeluar.set(key, []);
        perKeluar.get(key).push({
          id: item.id,
          masukId: item.transaksi_masuk_id,
          qty: Number(item.qty || 0),
          hpp: Number(item.harga_satuan || 0)
        });
      });
      return perKeluar;
    },
    alokasiMasukMap() {
      const transaksiMap = new Map(this.daftarTransaksi.map(item => [String(item.id), item]));
      const perMasuk = new Map();
      this.daftarAlokasi.forEach(item => {
        const key = String(item.transaksi_masuk_id);
        const keluar = transaksiMap.get(String(item.transaksi_keluar_id));
        if (!perMasuk.has(key)) perMasuk.set(key, []);
        perMasuk.get(key).push({
          id: item.id,
          keluarId: item.transaksi_keluar_id,
          qty: Number(item.qty || 0),
          hpp: Number(item.harga_satuan || 0),
          tanggalKeluar: keluar ? keluar.tanggal : null
        });
      });
      return perMasuk;
    },
    rekapBulanan() {
      const bulan = this.filterBulan;
      if (!bulan) return { nilaiAwal: 0, nilaiPembelian: 0, nilaiAkhir: 0, hppBulanan: 0 };
      const { awal, akhir } = rentangBulan(bulan);

      let nilaiAwal = 0;
      let nilaiPembelian = 0;
      let nilaiAkhir = 0;

      const perMasuk = this.alokasiMasukMap;
      const lapisanMasuk = this.daftarTransaksi.filter(item => item.jenis === 'Masuk');

      lapisanMasuk.forEach(lapisan => {
        const qty = Number(lapisan.qty || 0);
        const hpp = Number(lapisan.harga_satuan || 0);
        const alokasiLapisan = perMasuk.get(String(lapisan.id)) || [];

        const terpakaiSebelumBulan = alokasiLapisan
          .filter(item => item.tanggalKeluar && item.tanggalKeluar < awal)
          .reduce((sum, item) => sum + item.qty, 0);

        const terpakaiSampaiAkhir = alokasiLapisan
          .filter(item => item.tanggalKeluar && item.tanggalKeluar <= akhir)
          .reduce((sum, item) => sum + item.qty, 0);

        const saldoAwalMasukBulan = lapisan.sumber === 'Saldo Awal' && lapisan.tanggal >= awal && lapisan.tanggal <= akhir;

        if (lapisan.tanggal < awal || saldoAwalMasukBulan) {
          const qtyAwal = Math.max(0, qty - terpakaiSebelumBulan);
          nilaiAwal += qtyAwal * hpp;
        } else if (lapisan.tanggal <= akhir) {
          nilaiPembelian += qty * hpp;
        }

        if (lapisan.tanggal <= akhir) {
          const qtySisa = Math.max(0, qty - terpakaiSampaiAkhir);
          nilaiAkhir += qtySisa * hpp;
        }
      });

      const hppBulanan = nilaiAwal + nilaiPembelian - nilaiAkhir;
      return { nilaiAwal, nilaiPembelian, nilaiAkhir, hppBulanan };
    },
    stokSaatIniList() {
      const hariIni = tanggalLokal();
      const perMasuk = this.alokasiMasukMap;

      return this.daftarProduk.map(produk => {
        const lapisan = this.daftarTransaksi.filter(item => String(item.kode_produk) === String(produk.id) && item.jenis === 'Masuk' && item.tanggal <= hariIni);
        const transaksiProduk = this.daftarTransaksi.filter(item => String(item.kode_produk) === String(produk.id) && item.tanggal <= hariIni);
        const qtyTersedia = transaksiProduk.reduce((total, item) => total + (item.jenis === 'Masuk' ? Number(item.qty || 0) : -Number(item.qty || 0)), 0);

        let qtyDariLapisan = 0;
        let nilaiStok = 0;
        const hppLayers = [];

        lapisan.forEach(item => {
          const qtyMasuk = Number(item.qty || 0);
          const terpakai = (perMasuk.get(String(item.id)) || [])
            .filter(alokasi => alokasi.tanggalKeluar && alokasi.tanggalKeluar <= hariIni)
            .reduce((total, alokasi) => total + alokasi.qty, 0);
          const sisa = Math.max(0, qtyMasuk - terpakai);
          qtyDariLapisan += sisa;
          nilaiStok += sisa * Number(item.harga_satuan || 0);
          if (sisa > 0) hppLayers.push({ qty: sisa, hppPerUnit: Number(item.harga_satuan || 0) });
        });

        const fifoLengkap = qtyTersedia === qtyDariLapisan;
        return {
          id: produk.id,
          nama_produk: produk.nama_produk,
          qtyTersedia,
          fifoLengkap,
          nilaiStok,
          hppLayers: gabungkanLapisanHpp(hppLayers)
        };
      });
    },
    rekapPerProdukList() {
      const bulan = this.filterBulan;
      if (!bulan) return [];
      const { awal, akhir } = rentangBulan(bulan);
      const perMasuk = this.alokasiMasukMap;

      const ringkasan = new Map(this.daftarProduk.map(produk => [
        String(produk.id),
        { produk, stokAwal: 0, masuk: 0, keluar: 0, stokAkhir: 0, nilaiAkhir: 0, hppLayers: [] }
      ]));

      this.daftarTransaksi.filter(item => item.jenis === 'Masuk').forEach(lapisan => {
        const baris = ringkasan.get(String(lapisan.kode_produk));
        if (!baris) return;
        const qty = Number(lapisan.qty || 0);
        const hpp = Number(lapisan.harga_satuan || 0);
        const alokasiLapisan = perMasuk.get(String(lapisan.id)) || [];

        const terpakaiSebelumBulan = alokasiLapisan
          .filter(item => item.tanggalKeluar && item.tanggalKeluar < awal)
          .reduce((sum, item) => sum + item.qty, 0);

        const terpakaiSampaiAkhir = alokasiLapisan
          .filter(item => item.tanggalKeluar && item.tanggalKeluar <= akhir)
          .reduce((sum, item) => sum + item.qty, 0);

        const saldoAwalMasukBulan = lapisan.sumber === 'Saldo Awal' && lapisan.tanggal >= awal && lapisan.tanggal <= akhir;

        if (lapisan.tanggal < awal || saldoAwalMasukBulan) {
          const qtyAwal = Math.max(0, qty - terpakaiSebelumBulan);
          baris.stokAwal += qtyAwal;
        } else if (lapisan.tanggal <= akhir) {
          baris.masuk += qty;
        }

        if (lapisan.tanggal <= akhir) {
          const qtySisa = Math.max(0, qty - terpakaiSampaiAkhir);
          baris.stokAkhir += qtySisa;
          baris.nilaiAkhir += qtySisa * hpp;
          if (qtySisa > 0) baris.hppLayers.push({ qty: qtySisa, hppPerUnit: hpp });
        }
      });

      this.daftarTransaksi.filter(item => item.jenis === 'Keluar' && item.tanggal >= awal && item.tanggal <= akhir)
        .forEach(item => {
          const baris = ringkasan.get(String(item.kode_produk));
          if (baris) baris.keluar += Number(item.qty || 0);
        });

      return Array.from(ringkasan.values()).map(row => ({
        ...row,
        hppLayers: gabungkanLapisanHpp(row.hppLayers)
      }));
    },
    filteredTransaksi() {
      const produkMap = new Map(this.daftarProduk.map(p => [String(p.id), p]));
      const cari = this.filterCari.trim().toLocaleLowerCase('id-ID');
      const perKeluar = this.alokasiKeluarMap;

      return this.daftarTransaksi
        .filter(item => {
          const produk = produkMap.get(String(item.kode_produk));
          const cocokCari = !cari || (produk?.nama_produk || '').toLocaleLowerCase('id-ID').includes(cari) ||
            formatKode(item.kode_produk).toLocaleLowerCase('id-ID').includes(cari);
          const cocokJenis = !this.filterJenis || item.jenis === this.filterJenis;
          const cocokMulai = !this.filterTanggalMulai || item.tanggal >= this.filterTanggalMulai;
          const cocokAkhir = !this.filterTanggalAkhir || item.tanggal <= this.filterTanggalAkhir;
          return cocokCari && cocokJenis && cocokMulai && cocokAkhir;
        })
        .map(item => {
          const produk = produkMap.get(String(item.kode_produk));
          const alokasi = perKeluar.get(String(item.id)) || [];
          const qtyAlokasi = alokasi.reduce((total, a) => total + a.qty, 0);
          const nilaiKeluar = alokasi.reduce((total, a) => total + a.qty * a.hpp, 0);
          const hppKeluar = qtyAlokasi ? nilaiKeluar / qtyAlokasi : 0;
          const nilai = item.jenis === 'Masuk' ? Number(item.total_nilai || 0) : nilaiKeluar;
          const hpp = item.jenis === 'Masuk' ? Number(item.harga_satuan || 0) : hppKeluar;
          const fifoPenuh = item.jenis === 'Masuk' || qtyAlokasi === Number(item.qty || 0);

          return {
            ...item,
            nama_produk: produk?.nama_produk || '-',
            hppDisplay: fifoPenuh ? formatRupiah(hpp) : 'Perlu diperiksa',
            nilaiDisplay: fifoPenuh ? formatRupiah(nilai) : 'Perlu diperiksa'
          };
        })
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id);
    }
  },
  methods: {
    formatKode,
    formatRupiah,
    onHppInput(e) {
      this.formHppDisplay = formatNominal(e.target.value);
    },
    onProdukChange() {
      const p = this.daftarProduk.find(
        item => String(item.id) === String(this.formProdukId)
      );

      if (!p) return;

      if (this.gunakanHppProduk) {
        this.formHppDisplay = formatNominal(p.hpp || 0);
      } else {
        this.formHppDisplay = '';
      }
    },
    onToggleHppProduk() {
      const p = this.daftarProduk.find(
        item => String(item.id) === String(this.formProdukId)
      );

      if (!p) return;

      if (this.gunakanHppProduk) {
        this.formHppDisplay = formatNominal(p.hpp || 0);
      } else {
        this.formHppDisplay = '';
      }
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
    async muatDataStok() {
      this.statusMessage = 'Memuat data persediaan...';
      const hasil = await Promise.all([
        this.ambilSemua('produk', 'id, nama_produk, hpp, aktif'),
        this.ambilSemua('transaksi_stok', 'id, tanggal, jenis, kode_produk, qty, harga_satuan, total_nilai, sumber, keterangan, pesanan_id'),
        this.ambilSemua('alokasi_stok_fifo', 'id, transaksi_keluar_id, transaksi_masuk_id, qty, harga_satuan')
      ]);

      const errorPertama = hasil.find(item => item.error);
      if (errorPertama) {
        this.statusMessage = 'Gagal memuat persediaan: ' + errorPertama.error.message;
        showToast('Gagal memuat data persediaan: ' + errorPertama.error.message, 'error');
        return;
      }

      this.daftarProduk = hasil[0].data || [];
      this.daftarTransaksi = (hasil[1].data || []).sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.id - b.id);
      this.daftarAlokasi = hasil[2].data || [];

      this.statusMessage = `Data stok berhasil dimuat: ${this.daftarProduk.length} produk dan ${this.daftarTransaksi.length} transaksi.`;
    },
    async simpanStok() {
      const kodeProduk = Number(this.formProdukId);
      const qty = Number(this.formQty);
      const hargaSatuan = parseNominal(this.formHppDisplay);
      const tanggal = this.formTanggal;
      const sumber = this.formSumber;

      if (!kodeProduk || !tanggal || !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(hargaSatuan) || hargaSatuan < 0) {
        showToast('Mohon lengkapi semua kolom dengan nilai yang valid.', 'warning');
        return;
      }

      this.isSubmitting = true;
      const namaRpc = this.transaksiSedangDiedit ? 'ubah_stok_masuk_fifo' : 'simpan_stok_masuk_fifo';
      const parameter = this.transaksiSedangDiedit
        ? { p_transaksi_id: this.transaksiSedangDiedit.id, p_tanggal: tanggal, p_kode_produk: kodeProduk, p_qty: qty, p_harga_satuan: hargaSatuan, p_sumber: sumber }
        : { p_tanggal: tanggal, p_kode_produk: kodeProduk, p_qty: qty, p_harga_satuan: hargaSatuan, p_sumber: sumber, p_keterangan: null };

      const { error } = await supabase.rpc(namaRpc, parameter);
      this.isSubmitting = false;

      if (error) {
        showToast('Gagal menyimpan transaksi stok: ' + error.message, 'error');
        return;
      }

      showToast(`Stok ${this.transaksiSedangDiedit ? 'berhasil diubah' : 'berhasil dicatat'}!`, 'success');
      this.batalEditStok();
      await this.muatDataStok();
    },
    mulaiEditStok(transaksi) {
      this.transaksiSedangDiedit = transaksi;
      this.formTanggal = transaksi.tanggal;
      this.formProdukId = transaksi.kode_produk;
      this.formSumber = transaksi.sumber || 'Manual';
      this.formQty = transaksi.qty;
      this.gunakanHppProduk = false;
      this.formHppDisplay = formatNominal(transaksi.harga_satuan || 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    batalEditStok() {
      this.transaksiSedangDiedit = null;
      this.formTanggal = tanggalLokal();
      this.formProdukId = '';
      this.formSumber = 'Manual';
      this.formQty = 1;
      this.formHppDisplay = '';
      this.gunakanHppProduk = false;
    },
    async hapusStokMasuk(transaksi) {
      const confirmed = await confirmAction(
        `Hapus barang masuk ${formatKode(transaksi.kode_produk)} sebanyak ${transaksi.qty} pcs pada ${transaksi.tanggal}? Stok dan HPP pesanan terkait akan dihitung ulang.`,
        {
          title: 'Hapus Barang Masuk',
          confirmText: 'Ya, Hapus Stok',
          confirmVariant: 'danger'
        }
      );
      if (!confirmed) return;

      const { error } = await supabase.rpc('hapus_stok_masuk_fifo', { p_transaksi_id: transaksi.id });
      if (error) {
        showToast('Stok tidak dapat dihapus: ' + error.message, 'error');
        return;
      }

      showToast('Barang masuk berhasil dihapus.', 'success');
      await this.muatDataStok();
    },
    cetakStokSemuaProduk() {
      const hariIni = tanggalLokal();
      const list = this.stokSaatIniList.map(item => ({
        nama: item.nama_produk,
        qty: item.qtyTersedia
      }));
      this.renderAndPrintOpname('Daftar Stok Semua Produk', `Stok barang tersedia per ${formatTanggalIndonesia(hariIni)}`, list);
    },
    cetakOpnameMingguan() {
      const hariIni = tanggalLokal();
      const mulaiTanggalDate = new Date(`${hariIni}T00:00:00`);
      mulaiTanggalDate.setDate(mulaiTanggalDate.getDate() - 6);
      const mulaiTanggal = tanggalLokal(mulaiTanggalDate);
      const produkBertransaksi = new Set(this.daftarTransaksi
        .filter(item => ['Masuk', 'Keluar'].includes(item.jenis) && item.tanggal >= mulaiTanggal && item.tanggal <= hariIni)
        .map(item => String(item.kode_produk)));
      const list = this.stokSaatIniList.filter(item => produkBertransaksi.has(String(item.id))).map(item => ({
        nama: item.nama_produk,
        qty: item.qtyTersedia
      }));
      this.renderAndPrintOpname(
        'Form Stock Opname Mingguan',
        `Produk dengan transaksi stok ${formatTanggalIndonesia(mulaiTanggal)} sampai ${formatTanggalIndonesia(hariIni)}`,
        list
      );
    },
    renderAndPrintOpname(judul, keterangan, produkList) {
      const baris = produkList.map((p, idx) => `
        <tr>
          <td style="border: 1px solid #333; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #333; padding: 6px;">${p.nama}</td>
          <td style="border: 1px solid #333; padding: 6px; text-align: center;">${p.qty}</td>
          <td style="border: 1px solid #333; padding: 6px;"></td>
        </tr>
      `).join('');

      this.printHtml = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="margin-bottom: 4px;">${judul}</h2>
          <p style="color: #666; margin-bottom: 16px;">${keterangan}</p>
          <table style="width: auto; max-width: 100%; border-collapse: collapse; table-layout: auto;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="border: 1px solid #333; padding: 6px; width: 40px;">No</th>
                <th style="border: 1px solid #333; padding: 6px;">Nama Barang</th>
                <th style="border: 1px solid #333; padding: 6px; width: 150px;">Qty Persediaan / Qty Data</th>
                <th style="border: 1px solid #333; padding: 6px; width: 90px;">Qty Fisik</th>
              </tr>
            </thead>
            <tbody>
              ${baris}
            </tbody>
          </table>
        </div>
      `;

      this.$nextTick(() => {
        document.body.classList.add('printMode');
        window.addEventListener('afterprint', () => {
          document.body.classList.remove('printMode');
        }, { once: true });
        window.print();
      });
    }
  },
  mounted() {
    const rentang = rentangBulan(this.filterBulan);
    this.filterTanggalMulai = rentang.awal;
    this.filterTanggalAkhir = rentang.akhir;
    this.muatDataStok();
  }
};
</script>
