// 1. Referensi elemen dan state persediaan.
const statusEl = document.getElementById('status');
const tabelEl = document.getElementById('tabelStok');
const tabelTransaksiEl = document.getElementById('tabelTransaksiStok');
const selectProdukEl = document.getElementById('selectProduk');
const formEl = document.getElementById('formStok');
const filterBulanEl = document.getElementById('filterBulan');
const tabelStokSaatIniEl = document.getElementById('tabelStokSaatIni');
const tombolBatalEditEl = document.getElementById('btnBatalEditStok');

let daftarProduk = [];
let daftarTransaksi = [];
let daftarAlokasi = [];
let transaksiSedangDiedit = null;

// 2. Helper format, tanggal, dan pencetakan.
// Memformat kode.
function formatKode(id) {
  return 'P' + String(id).padStart(4, '0');
}

// Memformat rupiah.
function formatRupiah(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

// Menghasilkan tanggal lokal dalam format YYYY-MM-DD.
function tanggalLokal(date = new Date()) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, '0');
  const hari = String(date.getDate()).padStart(2, '0');
  return `${tahun}-${bulan}-${hari}`;
}

// Mengamankan teks sebelum dimasukkan ke markup HTML.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, karakter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[karakter]);
}

// Memformat tanggal indonesia.
function formatTanggalIndonesia(tanggal) {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// 3. Perhitungan dan render persediaan.
// Menghitung stok sampai.
function hitungStokSampai(tanggalBatas) {
  const stok = new Map(daftarProduk.map(produk => [String(produk.id), 0]));
  daftarTransaksi.filter(item => item.tanggal <= tanggalBatas).forEach(item => {
    const kode = String(item.kode_produk);
    const perubahan = Number(item.qty || 0) * (item.jenis === 'Masuk' ? 1 : -1);
    stok.set(kode, (stok.get(kode) || 0) + perubahan);
  });
  return stok;
}

// Menyiapkan dan mencetak form opname.
function cetakFormOpname(judul, keteranganPeriode, produkUntukDicetak) {
  const areaCetak = document.getElementById('areaCetakStokOpname');
  const hariIni = tanggalLokal();
  const baris = produkUntukDicetak.map((produk, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(produk.nama_produk || '-')}</td>
      <td>${produk.qtyData}</td>
      <td class="kolomIsi"></td>
      <td class="kolomIsi"></td>
      <td class="kolomIsi"></td>
    </tr>`).join('');

  areaCetak.innerHTML = `
    <h1>${escapeHtml(judul)}</h1>
    <p>${escapeHtml(keteranganPeriode)}</p>
    <p>Tanggal cetak: ${escapeHtml(formatTanggalIndonesia(hariIni))}. Isi Qty Fisik setelah menghitung barang. Selisih = Qty Fisik dikurangi Qty Data; tulis Klop/Sesuai jika selisih 0.</p>
    <table>
      <thead><tr><th>No</th><th>Nama Barang</th><th>Qty Data</th><th>Qty Fisik</th><th>Hasil SO</th><th>Selisih Qty</th></tr></thead>
      <tbody>${baris || '<tr><td colspan="6">Tidak ada produk yang perlu dihitung pada periode ini.</td></tr>'}</tbody>
    </table>`;
  areaCetak.setAttribute('aria-hidden', 'false');
  document.body.classList.add('printMode');
  window.setTimeout(() => window.print(), 100);
}

// Menyiapkan dan mencetak stok semua produk.
function cetakStokSemuaProduk() {
  const stokSekarang = hitungStokSampai(tanggalLokal());
  const semuaProduk = daftarProduk.map(produk => ({
    ...produk, qtyData: stokSekarang.get(String(produk.id)) || 0
  }));
  cetakFormOpname(
    'Stock Opname Semua Produk',
    `Daftar seluruh produk, termasuk produk nonaktif. Qty Data adalah stok tersedia per ${formatTanggalIndonesia(tanggalLokal())}.`,
    semuaProduk
  );
}

// Menyiapkan dan mencetak opname mingguan.
function cetakOpnameMingguan() {
  const akhir = tanggalLokal();
  const tanggalMulai = new Date();
  tanggalMulai.setDate(tanggalMulai.getDate() - 7);
  const awal = tanggalLokal(tanggalMulai);
  const produkBergerak = new Set(daftarTransaksi
    .filter(item => item.tanggal >= awal && item.tanggal <= akhir && ['Masuk', 'Keluar'].includes(item.jenis))
    .map(item => String(item.kode_produk)));
  const stokSekarang = hitungStokSampai(akhir);
  const produkUntukDicetak = daftarProduk
    .filter(produk => produkBergerak.has(String(produk.id)))
    .map(produk => ({ ...produk, qtyData: stokSekarang.get(String(produk.id)) || 0 }));
  cetakFormOpname(
    'Form Stock Opname Mingguan',
    `Periode transaksi ${formatTanggalIndonesia(awal)} sampai ${formatTanggalIndonesia(akhir)}. Hanya produk yang mengalami barang masuk atau keluar pada periode ini; Qty Data menunjukkan stok saat ini.`,
    produkUntukDicetak
  );
}

// Membuat sel tabel dan memasukkan nilai teks dengan aman.
function tambahSel(row, value) {
  const td = document.createElement('td');
  td.textContent = value ?? '-';
  row.appendChild(td);
}

// Mengisi dropdown produk.
function isiDropdownProduk() {
  selectProdukEl.innerHTML = '<option value="">-- pilih produk --</option>';
  daftarProduk.filter(produk => produk.aktif !== false).forEach(produk => {
    const option = document.createElement('option');
    option.value = produk.id;
    option.textContent = formatKode(produk.id) + ' - ' + produk.nama_produk;
    option.dataset.hpp = produk.hpp || 0;
    selectProdukEl.appendChild(option);
  });
}

// Menampilkan HPP terbaru untuk produk yang dipilih.
function tampilkanHppProduk() {
  const option = selectProdukEl.options[selectProdukEl.selectedIndex];
  document.getElementById('inputHppStok').value = option?.value
    ? window.UsahaKuCurrency.format(option.dataset.hpp || 0)
    : '';
}

// Membentuk tanggal awal dan akhir dari bulan yang dipilih.
function tanggalBulan(bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const akhir = new Date(tahun, nomorBulan, 0).getDate();
  return { awal: `${bulan}-01`, akhir: `${bulan}-${String(akhir).padStart(2, '0')}` };
}

// Menghubungkan transaksi stok keluar dengan lapisan stok masuk.
function buatPetaAlokasi() {
  const transaksiMap = new Map(daftarTransaksi.map(item => [String(item.id), item]));
  const perMasuk = new Map();
  const perKeluar = new Map();
  daftarAlokasi.forEach(alokasi => {
    const keluar = transaksiMap.get(String(alokasi.transaksi_keluar_id));
    const masukId = String(alokasi.transaksi_masuk_id);
    const keluarId = String(alokasi.transaksi_keluar_id);
    const biaya = Number(alokasi.qty || 0) * Number(alokasi.harga_satuan || 0);
    const isiMasuk = perMasuk.get(masukId) || [];
    isiMasuk.push({ qty: Number(alokasi.qty || 0), tanggalKeluar: keluar?.tanggal || '', biaya });
    perMasuk.set(masukId, isiMasuk);
    const isiKeluar = perKeluar.get(keluarId) || { qty: 0, biaya: 0 };
    isiKeluar.qty += Number(alokasi.qty || 0);
    isiKeluar.biaya += biaya;
    perKeluar.set(keluarId, isiKeluar);
  });
  return { transaksiMap, perMasuk, perKeluar };
}

// Merender rekap bulan.
function renderRekapBulan() {
  const bulan = filterBulanEl.value;
  if (!bulan) return;
  const { awal, akhir } = tanggalBulan(bulan);
  const { perMasuk, perKeluar } = buatPetaAlokasi();
  const ringkasan = new Map(daftarProduk.map(produk => [String(produk.id), {
    produk, stokAwal: 0, masuk: 0, keluar: 0, stokAkhir: 0, nilaiAkhir: 0
  }]));
  const transaksiBulan = daftarTransaksi.filter(item => item.tanggal >= awal && item.tanggal <= akhir);
  let nilaiAwal = 0;
  let nilaiPembelian = 0;
  let nilaiAkhir = 0;

  daftarTransaksi.filter(item => item.jenis === 'Masuk').forEach(lapisan => {
    const kode = String(lapisan.kode_produk);
    const baris = ringkasan.get(kode);
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
      nilaiAwal += qtyAwal * hpp;
    } else if (lapisan.tanggal <= akhir) {
      baris.masuk += qty;
      nilaiPembelian += qty * hpp;
    }

    if (lapisan.tanggal <= akhir) {
      const qtySisa = Math.max(0, qty - terpakaiSampaiAkhir);
      baris.stokAkhir += qtySisa;
      baris.nilaiAkhir += qtySisa * hpp;
      nilaiAkhir += qtySisa * hpp;
    }
  });

  daftarTransaksi.filter(item => item.jenis === 'Keluar' && item.tanggal >= awal && item.tanggal <= akhir)
    .forEach(item => {
      const baris = ringkasan.get(String(item.kode_produk));
      if (baris) baris.keluar += Number(item.qty || 0);
    });

  tabelEl.replaceChildren();
  ringkasan.forEach(({ produk, stokAwal, masuk, keluar, stokAkhir, nilaiAkhir: nilaiProduk }) => {
    const row = document.createElement('tr');
    const hppRataRata = stokAkhir > 0 ? nilaiProduk / stokAkhir : 0;
    [
      formatKode(produk.id), produk.nama_produk || '-', stokAwal, masuk, keluar,
      stokAkhir, stokAkhir > 0 ? formatRupiah(hppRataRata) : '-', formatRupiah(nilaiProduk)
    ].forEach(value => tambahSel(row, value));
    tabelEl.appendChild(row);
  });

  if (ringkasan.size === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.textContent = 'Belum ada data produk.';
    row.appendChild(cell);
    tabelEl.appendChild(row);
  }

  document.getElementById('nilaiPersediaanAwal').textContent = formatRupiah(nilaiAwal);
  document.getElementById('nilaiPembelian').textContent = formatRupiah(nilaiPembelian);
  document.getElementById('nilaiPersediaanAkhir').textContent = formatRupiah(nilaiAkhir);
  document.getElementById('hppBulanan').textContent = formatRupiah(nilaiAwal + nilaiPembelian - nilaiAkhir);
  renderStokSaatIni(perMasuk);
  tampilkanTransaksiBulan(daftarTransaksi, perKeluar);
}

// Merender stok saat ini.
function renderStokSaatIni(perMasuk) {
  const hariIni = tanggalLokal();
  tabelStokSaatIniEl.replaceChildren();
  daftarProduk.forEach(produk => {
    const lapisan = daftarTransaksi.filter(item => String(item.kode_produk) === String(produk.id) && item.jenis === 'Masuk' && item.tanggal <= hariIni);
    const transaksiProduk = daftarTransaksi.filter(item => String(item.kode_produk) === String(produk.id) && item.tanggal <= hariIni);
    const qtyTersedia = transaksiProduk.reduce((total, item) => total + (item.jenis === 'Masuk' ? Number(item.qty || 0) : -Number(item.qty || 0)), 0);
    let qtyDariLapisan = 0;
    let nilaiStok = 0;
    lapisan.forEach(item => {
      const qtyMasuk = Number(item.qty || 0);
      const terpakai = (perMasuk.get(String(item.id)) || [])
        .filter(alokasi => alokasi.tanggalKeluar && alokasi.tanggalKeluar <= hariIni)
        .reduce((total, alokasi) => total + alokasi.qty, 0);
      const sisa = Math.max(0, qtyMasuk - terpakai);
      qtyDariLapisan += sisa;
      nilaiStok += sisa * Number(item.harga_satuan || 0);
    });
    const row = document.createElement('tr');
    const fifoLengkap = qtyTersedia === qtyDariLapisan;
    const hppRataRata = qtyTersedia > 0 && fifoLengkap ? nilaiStok / qtyTersedia : 0;
    [formatKode(produk.id), produk.nama_produk || '-', qtyTersedia,
      qtyTersedia ? (fifoLengkap ? formatRupiah(hppRataRata) : 'Perlu diperiksa') : '-',
      fifoLengkap ? formatRupiah(nilaiStok) : 'Perlu diperiksa']
      .forEach(value => tambahSel(row, value));
    tabelStokSaatIniEl.appendChild(row);
  });
  if (!daftarProduk.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Belum ada data produk.';
    row.appendChild(cell);
    tabelStokSaatIniEl.appendChild(row);
  }
}

// Menampilkan transaksi bulan.
function tampilkanTransaksiBulan(transaksiBulan, perKeluar) {
  const produkMap = new Map(daftarProduk.map(produk => [String(produk.id), produk]));
  const cari = document.getElementById('cariTransaksiStok').value.trim().toLocaleLowerCase('id-ID');
  const jenisDipilih = document.getElementById('filterJenisTransaksi').value;
  const tanggalMulai = document.getElementById('filterTanggalMulai').value;
  const tanggalAkhir = document.getElementById('filterTanggalAkhir').value;
  const hasilFilter = transaksiBulan.filter(transaksi => {
    const namaProduk = produkMap.get(String(transaksi.kode_produk))?.nama_produk || '';
    const cocokCari = !cari || `${formatKode(transaksi.kode_produk)} ${namaProduk}`.toLocaleLowerCase('id-ID').includes(cari);
    return cocokCari && (!jenisDipilih || transaksi.jenis === jenisDipilih)
      && (!tanggalMulai || transaksi.tanggal >= tanggalMulai)
      && (!tanggalAkhir || transaksi.tanggal <= tanggalAkhir);
  });
  tabelTransaksiEl.replaceChildren();
  hasilFilter.forEach(transaksi => {
    const produk = produkMap.get(String(transaksi.kode_produk));
    const qty = Number(transaksi.qty || 0);
    const biayaKeluar = perKeluar.get(String(transaksi.id)) || { qty: 0, biaya: 0 };
    const nilai = transaksi.jenis === 'Masuk'
      ? qty * Number(transaksi.harga_satuan || 0)
      : biayaKeluar.biaya;
    const hppUnit = transaksi.jenis === 'Masuk'
      ? Number(transaksi.harga_satuan || 0)
      : (biayaKeluar.qty > 0 ? biayaKeluar.biaya / biayaKeluar.qty : 0);
    const row = document.createElement('tr');
    [
      transaksi.tanggal, formatKode(transaksi.kode_produk), produk?.nama_produk || '-',
      transaksi.jenis, qty, formatRupiah(hppUnit), formatRupiah(nilai),
      transaksi.sumber === 'Manual' ? 'Pembelian / restok' : (transaksi.sumber || '-'),
      transaksi.keterangan || '-'
    ].forEach(value => tambahSel(row, value));
    const aksi = document.createElement('td');
    if (transaksi.jenis === 'Masuk') {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btnTambahProduk btnAksiStok';
      edit.textContent = 'Edit';
      edit.dataset.aksi = 'edit';
      edit.dataset.id = transaksi.id;
      edit.setAttribute('aria-label', `Edit stok masuk ${formatKode(transaksi.kode_produk)} tanggal ${transaksi.tanggal}`);
      const hapus = document.createElement('button');
      hapus.type = 'button';
      hapus.className = 'btnTambahProduk btnAksiStok';
      hapus.textContent = 'Hapus';
      hapus.dataset.aksi = 'hapus';
      hapus.dataset.id = transaksi.id;
      hapus.setAttribute('aria-label', `Hapus stok masuk ${formatKode(transaksi.kode_produk)} tanggal ${transaksi.tanggal}`);
      aksi.append(edit, hapus);
    } else {
      aksi.textContent = '-';
    }
    row.appendChild(aksi);
    tabelTransaksiEl.appendChild(row);
  });

  if (hasilFilter.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 10;
    cell.textContent = 'Tidak ada transaksi yang sesuai dengan pencarian atau filter.';
    row.appendChild(cell);
    tabelTransaksiEl.appendChild(row);
  }
}

// 4. Akses database, filter, dan aksi transaksi.
// Mengambil seluruh transaksi persediaan dari Supabase secara bertahap.
async function ambilSemuaTransaksi(tabel, kolom) {
  const semua = [];
  const ukuranHalaman = 1000;
  for (let awal = 0; ; awal += ukuranHalaman) {
    const { data, error } = await supabaseClient.from(tabel).select(kolom)
      .order('id', { ascending: true }).range(awal, awal + ukuranHalaman - 1);
    if (error) return { data: null, error };
    semua.push(...(data || []));
    if (!data || data.length < ukuranHalaman) break;
  }
  return { data: semua, error: null };
}

// Mengambil data produk, stok, dan alokasi untuk membangun halaman.
async function muatDataStok() {
  statusEl.textContent = 'Memuat data stok...';
  const [hasilProduk, hasilTransaksi, hasilAlokasi] = await Promise.all([
    supabaseClient.from('produk').select('id, nama_produk, hpp, aktif').order('id', { ascending: true }),
    ambilSemuaTransaksi('transaksi_stok', 'id, tanggal, kode_produk, jenis, qty, harga_satuan, sumber, pesanan_id, keterangan'),
    ambilSemuaTransaksi('alokasi_stok_fifo', 'id, transaksi_keluar_id, transaksi_masuk_id, qty, harga_satuan')
  ]);
  const error = hasilProduk.error || hasilTransaksi.error || hasilAlokasi.error;
  if (error) {
    statusEl.textContent = 'Gagal memuat data stok: ' + error.message;
    return;
  }

  daftarProduk = hasilProduk.data || [];
  daftarTransaksi = hasilTransaksi.data || [];
  daftarAlokasi = hasilAlokasi.data || [];
  isiDropdownProduk();
  document.getElementById('btnCetakStokSaatIni').disabled = false;
  document.getElementById('btnCetakOpnameMingguan').disabled = false;
  renderRekapBulan();

  const alokasiKeluar = new Map();
  daftarAlokasi.forEach(item => alokasiKeluar.set(
    String(item.transaksi_keluar_id), (alokasiKeluar.get(String(item.transaksi_keluar_id)) || 0) + Number(item.qty || 0)
  ));
  const keluarBelumPenuh = daftarTransaksi.filter(item => item.jenis === 'Keluar')
    .some(item => (alokasiKeluar.get(String(item.id)) || 0) !== Number(item.qty || 0));
  statusEl.textContent = `Data stok berhasil dimuat: ${daftarProduk.length} produk dan ${daftarTransaksi.length} transaksi.` +
    (keluarBelumPenuh ? ' Ada barang keluar lama yang nilai modalnya belum tercatat lengkap. Periksa saldo awal stok.' : '');
}

// Menyesuaikan data atau tampilan saat pilihan berubah.
selectProdukEl.addEventListener('change', tampilkanHppProduk);
// Menyesuaikan data atau tampilan saat pilihan berubah.
filterBulanEl.addEventListener('change', renderRekapBulan);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
document.getElementById('btnCetakStokSaatIni').addEventListener('click', cetakStokSemuaProduk);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
document.getElementById('btnCetakOpnameMingguan').addEventListener('click', cetakOpnameMingguan);
// 5. Event UI dan inisialisasi halaman.
// Memulihkan tampilan setelah proses cetak selesai.
window.addEventListener('afterprint', () => {
  document.body.classList.remove('printMode');
  const areaCetak = document.getElementById('areaCetakStokOpname');
  areaCetak.setAttribute('aria-hidden', 'true');
});
['cariTransaksiStok', 'filterJenisTransaksi', 'filterTanggalMulai', 'filterTanggalAkhir'].forEach(id => {
  const el = document.getElementById(id);
// Menangani event antarmuka untuk menjaga alur halaman.
  el.addEventListener(id === 'cariTransaksiStok' ? 'input' : 'change', () => renderRekapBulan());
});

// Menghapus state edit dan memulihkan form stok.
function batalEditStok() {
  transaksiSedangDiedit = null;
  formEl.reset();
  document.getElementById('inputTanggal').value = tanggalLokal();
  document.getElementById('inputHppStok').value = '';
  selectProdukEl.disabled = false;
  selectProdukEl.querySelectorAll('[data-temp-edit-option="true"]').forEach(option => option.remove());
  tombolBatalEditEl.hidden = true;
  document.getElementById('judulFormStok').textContent = 'Catat Barang Masuk';
  const tombolSubmit = formEl.querySelector('button[type="submit"]');
  tombolSubmit.title = 'Simpan stok';
  tombolSubmit.setAttribute('aria-label', 'Simpan stok');
}

// Menangani aksi pengguna pada tombol atau baris yang dipilih.
tombolBatalEditEl.addEventListener('click', batalEditStok);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
tabelTransaksiEl.addEventListener('click', async event => {
  const tombol = event.target.closest('button[data-aksi]');
  if (!tombol) return;
  const transaksi = daftarTransaksi.find(item => String(item.id) === String(tombol.dataset.id));
  if (!transaksi || transaksi.jenis !== 'Masuk') return;

  if (tombol.dataset.aksi === 'edit') {
    transaksiSedangDiedit = transaksi;
    document.getElementById('judulFormStok').textContent = 'Edit Transaksi Barang Masuk';
    document.getElementById('inputTanggal').value = transaksi.tanggal;
    if (!Array.from(selectProdukEl.options).some(option => option.value === String(transaksi.kode_produk))) {
      const option = document.createElement('option');
      option.value = String(transaksi.kode_produk);
      const namaProduk = daftarProduk.find(produk => String(produk.id) === String(transaksi.kode_produk))?.nama_produk || 'Produk';
      option.textContent = `${formatKode(transaksi.kode_produk)} - ${namaProduk} (nonaktif)`;
      option.dataset.tempEditOption = 'true';
      selectProdukEl.appendChild(option);
    }
    selectProdukEl.value = String(transaksi.kode_produk);
    selectProdukEl.disabled = false;
    document.getElementById('selectSumber').value = transaksi.sumber || 'Manual';
    document.getElementById('inputQty').value = transaksi.qty;
    document.getElementById('inputHppStok').value = window.UsahaKuCurrency.format(transaksi.harga_satuan || 0);
    tombolBatalEditEl.hidden = false;
    const tombolSubmit = formEl.querySelector('button[type="submit"]');
    tombolSubmit.title = 'Simpan perubahan';
    tombolSubmit.setAttribute('aria-label', 'Simpan perubahan stok');
    document.getElementById('inputTanggal').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!confirm(`Hapus barang masuk ${formatKode(transaksi.kode_produk)} sebanyak ${transaksi.qty} pcs pada ${transaksi.tanggal}? Stok dan HPP pesanan terkait akan dihitung ulang.`)) return;
  tombol.disabled = true;
  const { error } = await supabaseClient.rpc('hapus_stok_masuk_fifo', { p_transaksi_id: transaksi.id });
  tombol.disabled = false;
  if (error) {
    alert('Stok tidak dapat dihapus: ' + error.message);
    return;
  }
  await muatDataStok();
});

// Memvalidasi lalu menyimpan data dari form.
formEl.addEventListener('submit', async e => {
  e.preventDefault();
  const kodeProduk = Number(selectProdukEl.value);
  const qty = Number(document.getElementById('inputQty').value);
  const hargaSatuan = window.UsahaKuCurrency.parse(document.getElementById('inputHppStok').value);
  const tanggal = document.getElementById('inputTanggal').value;
  const sumber = document.getElementById('selectSumber').value;
  const tombolSubmit = formEl.querySelector('button[type="submit"]');
  if (!kodeProduk || !tanggal || !Number.isInteger(qty) || qty <= 0 || !Number.isFinite(hargaSatuan) || hargaSatuan < 0) return;

  tombolSubmit.disabled = true;
  const namaRpc = transaksiSedangDiedit ? 'ubah_stok_masuk_fifo' : 'simpan_stok_masuk_fifo';
  const parameter = transaksiSedangDiedit
    ? { p_transaksi_id: transaksiSedangDiedit.id, p_tanggal: tanggal, p_kode_produk: kodeProduk, p_qty: qty, p_harga_satuan: hargaSatuan, p_sumber: sumber }
    : { p_tanggal: tanggal, p_kode_produk: kodeProduk, p_qty: qty, p_harga_satuan: hargaSatuan, p_sumber: sumber, p_keterangan: null };
  const { error } = await supabaseClient.rpc(namaRpc, parameter);
  tombolSubmit.disabled = false;
  if (error) {
    alert('Gagal menyimpan perubahan stok: ' + error.message);
    return;
  }

  batalEditStok();
  await muatDataStok();
});

document.getElementById('inputTanggal').value = tanggalLokal();
filterBulanEl.value = tanggalLokal().slice(0, 7);
const rentangAwalBulan = tanggalBulan(filterBulanEl.value);
document.getElementById('filterTanggalMulai').value = rentangAwalBulan.awal;
document.getElementById('filterTanggalAkhir').value = rentangAwalBulan.akhir;
muatDataStok();
