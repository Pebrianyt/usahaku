// 1. Referensi elemen halaman dan state transaksi kas.
const statusEl = document.getElementById('status');
const tabelEl = document.getElementById('tabelKas');
const formEl = document.getElementById('formKas');
const filterBulanEl = document.getElementById('filterBulanKas');
const jenisEl = document.getElementById('selectJenis');
const kategoriEl = document.getElementById('selectKategoriKas');
const tombolBatalEdit = document.getElementById('btnBatalEditKas');

let transaksiKas = [];
let transaksiDieditId = null;

const kategoriPerJenis = {
  'Saldo Awal': ['Modal Awal'],
  Masuk: ['Pencairan Penjualan Shopee', 'Pendapatan Lain', 'Lainnya'],
  Keluar: ['Pembelian Stok', 'Biaya Operasional', 'Pengambilan Pribadi', 'Lainnya']
};

// 2. Helper format, tanggal, kategori, dan tabel.
// Memformat rupiah.
function formatRupiah(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

// Menghasilkan tanggal lokal dalam format YYYY-MM-DD.
function tanggalLokal(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Menentukan batas awal bulan.
function awalBulan(bulan) {
  return `${bulan}-01`;
}

// Menentukan batas akhir bulan.
function akhirBulan(bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const hari = new Date(tahun, nomorBulan, 0).getDate();
  return `${bulan}-${String(hari).padStart(2, '0')}`;
}

// Membuat sel tabel dan memasukkan nilai teks dengan aman.
function tambahSel(row, value) {
  const cell = document.createElement('td');
  cell.textContent = value ?? '-';
  row.appendChild(cell);
  return cell;
}

// Memilih nama kategori yang akan ditampilkan pada riwayat kas.
function kategoriUntukTampilan(row) {
  if (row.kategori) return row.kategori;
  if (row.jenis === 'Saldo Awal') return 'Modal Awal';
  if (row.jenis === 'Keluar' && String(row.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional')) {
    return 'Biaya Operasional';
  }
  return 'Belum dikategorikan';
}

// Mengisi pilihan kategori sesuai jenis transaksi yang aktif.
function aturKategoriKas(pilihan = '') {
  const pilihanValid = kategoriPerJenis[jenisEl.value] || [];
  kategoriEl.replaceChildren();
  if (jenisEl.value !== 'Saldo Awal') {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- pilih kategori --';
    kategoriEl.appendChild(placeholder);
  }
  pilihanValid.forEach(nama => {
    const option = document.createElement('option');
    option.value = nama;
    option.textContent = nama;
    kategoriEl.appendChild(option);
  });
  if (pilihan && !pilihanValid.includes(pilihan)) {
    const option = document.createElement('option');
    option.value = pilihan;
    option.textContent = pilihan;
    kategoriEl.appendChild(option);
  }
  kategoriEl.value = pilihan || (jenisEl.value === 'Saldo Awal' ? 'Modal Awal' : '');
  const petunjuk = {
    'Modal Awal': 'Catat sekali saat mulai menggunakan aplikasi.',
    'Pencairan Penjualan Shopee': 'Masukkan jumlah bersih yang benar-benar diterima dari Shopee.',
    'Pembelian Stok': 'Pembayaran stok dicatat di sini; HPP penjualan dihitung dari menu Stok.',
    'Biaya Operasional': 'Transaksi ini otomatis dihitung sebagai biaya operasional di Laba Rugi.'
  };
  document.getElementById('petunjukKategoriKas').textContent = petunjuk[kategoriEl.value] || '';
}

// Mengunci opsi saldo awal jika catatan saldo awal sudah ada.
function perbaruiSaldoAwalTersedia() {
  const optionSaldoAwal = Array.from(jenisEl.options).find(option => option.value === 'Saldo Awal');
  const saldoAwalSudahAda = transaksiKas.some(row =>
    row.jenis === 'Saldo Awal' && String(row.id) !== String(transaksiDieditId || '')
  );
  if (optionSaldoAwal) optionSaldoAwal.disabled = saldoAwalSudahAda;
  if (saldoAwalSudahAda && jenisEl.value === 'Saldo Awal' && !transaksiDieditId) {
    jenisEl.value = 'Masuk';
    aturKategoriKas();
  }
}

// 3. Render ringkasan dan riwayat kas.
// Merender ringkasan.
function renderRingkasan() {
  const bulan = filterBulanEl.value;
  if (!bulan) return;
  const awal = awalBulan(bulan);
  const akhir = akhirBulan(bulan);
  const transaksiPeriode = transaksiKas.filter(row => row.tanggal >= awal && row.tanggal <= akhir);

  let saldoAwalPeriode = 0;
  transaksiKas.filter(row => row.tanggal < awal).forEach(row => {
    const nominal = Number(row.nominal || 0);
    saldoAwalPeriode += row.jenis === 'Keluar' ? -nominal : nominal;
  });

  const uangMasukPeriode = transaksiPeriode
    .filter(row => row.jenis === 'Masuk' || row.jenis === 'Saldo Awal')
    .reduce((total, row) => total + Number(row.nominal || 0), 0);
  const uangKeluarPeriode = transaksiPeriode
    .filter(row => row.jenis === 'Keluar')
    .reduce((total, row) => total + Number(row.nominal || 0), 0);
  const saldoAkhirPeriode = saldoAwalPeriode + uangMasukPeriode - uangKeluarPeriode;

  const hariIni = tanggalLokal();
  const saldoSaatIni = transaksiKas.filter(row => row.tanggal <= hariIni).reduce((total, row) => {
    const nominal = Number(row.nominal || 0);
    return total + (row.jenis === 'Keluar' ? -nominal : nominal);
  }, 0);

  document.getElementById('saldoAwal').textContent = formatRupiah(saldoAwalPeriode);
  document.getElementById('totalMasuk').textContent = formatRupiah(uangMasukPeriode);
  document.getElementById('totalKeluar').textContent = formatRupiah(uangKeluarPeriode);
  document.getElementById('saldoAkhirPeriode').textContent = formatRupiah(saldoAkhirPeriode);
  document.getElementById('saldo').textContent = formatRupiah(saldoSaatIni);
  renderTabel(transaksiPeriode);
}

// Menampilkan daftar transaksi kas berdasarkan tanggal terbaru.
function renderTabel(daftar) {
  tabelEl.replaceChildren();
  daftar.slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal) || Number(b.id) - Number(a.id))
    .forEach(data => {
      const row = document.createElement('tr');
      tambahSel(row, data.tanggal);
      tambahSel(row, data.jenis);
      tambahSel(row, kategoriUntukTampilan(data));
      tambahSel(row, formatRupiah(data.nominal));
      tambahSel(row, data.keterangan || '-');
      const aksi = document.createElement('td');
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btnEdit';
      edit.dataset.aksi = 'edit';
      edit.dataset.id = data.id;
      edit.textContent = 'Edit';
      const hapus = document.createElement('button');
      hapus.type = 'button';
      hapus.className = 'btnHapus';
      hapus.dataset.aksi = 'hapus';
      hapus.dataset.id = data.id;
      hapus.textContent = 'Hapus';
      aksi.append(edit, hapus);
      row.appendChild(aksi);
      tabelEl.appendChild(row);
    });

  if (daftar.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'Belum ada transaksi pada bulan ini.';
    row.appendChild(cell);
    tabelEl.appendChild(row);
  }
}

// 4. Muat dan simpan data kas.
// Mengambil transaksi kas lalu memperbarui ringkasan dan riwayat.
async function muatKas() {
  statusEl.textContent = 'Memuat data arus kas...';
  const semua = [];
  const ukuranHalaman = 1000;
  for (let awal = 0; ; awal += ukuranHalaman) {
    const { data, error } = await supabaseClient.from('transaksi_kas').select('*')
      .order('tanggal', { ascending: false }).order('id', { ascending: false })
      .range(awal, awal + ukuranHalaman - 1);
    if (error) {
      statusEl.textContent = 'Data arus kas gagal dimuat: ' + error.message;
      return;
    }
    semua.push(...(data || []));
    if (!data || data.length < ukuranHalaman) break;
  }

  transaksiKas = semua;
  perbaruiSaldoAwalTersedia();
  renderRingkasan();
  const statusSaldoAwal = transaksiKas.some(row => row.jenis === 'Saldo Awal')
    ? 'Saldo awal sudah dicatat.' : 'Saldo awal belum dicatat.';
  statusEl.textContent = `${transaksiKas.length} transaksi kas tercatat. ${statusSaldoAwal.replace('Saldo awal', 'Modal awal usaha')}`;
}

// Menghapus state edit dan memulihkan form transaksi kas.
function batalEditKas() {
  transaksiDieditId = null;
  formEl.reset();
  document.getElementById('inputTanggal').value = tanggalLokal();
  jenisEl.value = transaksiKas.some(row => row.jenis === 'Saldo Awal') ? 'Masuk' : 'Saldo Awal';
  aturKategoriKas();
  perbaruiSaldoAwalTersedia();
  tombolBatalEdit.hidden = true;
  document.getElementById('judulFormKas').textContent = 'Catat Transaksi Kas';
  const submit = formEl.querySelector('button[type="submit"]');
  submit.title = 'Simpan transaksi';
  submit.setAttribute('aria-label', 'Simpan transaksi');
}

// 5. Event UI dan inisialisasi halaman.
// Menyesuaikan data atau tampilan saat pilihan berubah.
jenisEl.addEventListener('change', () => {
  aturKategoriKas();
  perbaruiSaldoAwalTersedia();
});
// Menyesuaikan data atau tampilan saat pilihan berubah.
filterBulanEl.addEventListener('change', renderRingkasan);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
tombolBatalEdit.addEventListener('click', batalEditKas);

// Menangani aksi pengguna pada tombol atau baris yang dipilih.
tabelEl.addEventListener('click', async event => {
  const tombol = event.target.closest('button[data-aksi]');
  if (!tombol) return;
  const row = transaksiKas.find(item => String(item.id) === String(tombol.dataset.id));
  if (!row) return;

  if (tombol.dataset.aksi === 'edit') {
    transaksiDieditId = row.id;
    document.getElementById('inputTanggal').value = row.tanggal || '';
    jenisEl.value = row.jenis;
    aturKategoriKas(row.kategori || (row.jenis === 'Saldo Awal' ? 'Modal Awal' :
      (row.jenis === 'Keluar' && String(row.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional')
        ? 'Biaya Operasional' : '')));
    perbaruiSaldoAwalTersedia();
    document.getElementById('inputNominal').value = window.UsahaKuCurrency.format(row.nominal || 0);
    document.getElementById('inputKeterangan').value = row.keterangan || '';
    tombolBatalEdit.hidden = false;
    document.getElementById('judulFormKas').textContent = 'Edit Transaksi Kas';
    const submit = formEl.querySelector('button[type="submit"]');
    submit.title = 'Simpan perubahan';
    submit.setAttribute('aria-label', 'Simpan perubahan transaksi');
    document.getElementById('inputTanggal').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!confirm(`Hapus transaksi ${row.jenis} ${formatRupiah(row.nominal)} tanggal ${row.tanggal}?`)) return;
  tombol.disabled = true;
  const { error } = await supabaseClient.from('transaksi_kas').delete().eq('id', row.id);
  if (error) {
    tombol.disabled = false;
    alert('Gagal menghapus transaksi: ' + error.message);
    return;
  }
  const batalkanFormEdit = String(transaksiDieditId) === String(row.id);
  if (batalkanFormEdit) transaksiDieditId = null;
  await muatKas();
  if (batalkanFormEdit) batalEditKas();
});

// Memvalidasi lalu menyimpan data dari form.
formEl.addEventListener('submit', async event => {
  event.preventDefault();
  const tanggal = document.getElementById('inputTanggal').value;
  const jenis = jenisEl.value;
  const kategori = kategoriEl.value;
  const nominal = window.UsahaKuCurrency.parse(document.getElementById('inputNominal').value);
  const keterangan = document.getElementById('inputKeterangan').value.trim();
  if (!tanggal || !kategori || !keterangan || !Number.isFinite(nominal) || nominal <= 0) {
    alert('Tanggal, kategori, rincian, dan nominal lebih besar dari nol wajib diisi.');
    return;
  }
  if (jenis === 'Saldo Awal' && transaksiKas.some(row =>
    row.jenis === 'Saldo Awal' && String(row.id) !== String(transaksiDieditId || '')
  )) {
    alert('Saldo awal hanya dicatat satu kali, saat mulai menggunakan aplikasi.');
    return;
  }

  const tombol = formEl.querySelector('button[type="submit"]');
  tombol.disabled = true;
  const nilaiSimpan = { tanggal, jenis, kategori, nominal, keterangan };
  const hasil = transaksiDieditId
    ? await supabaseClient.from('transaksi_kas').update(nilaiSimpan).eq('id', transaksiDieditId)
    : await supabaseClient.from('transaksi_kas').insert([nilaiSimpan]);
  tombol.disabled = false;

  if (hasil.error) {
    alert(`Gagal ${transaksiDieditId ? 'mengubah' : 'menyimpan'} transaksi: ` + hasil.error.message);
    return;
  }
  transaksiDieditId = null;
  await muatKas();
  batalEditKas();
});

filterBulanEl.value = tanggalLokal().slice(0, 7);
jenisEl.value = 'Saldo Awal';
aturKategoriKas();
document.getElementById('inputTanggal').value = tanggalLokal();
muatKas();
