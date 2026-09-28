// 1. Referensi elemen dan state laporan.
const statusEl = document.getElementById('status');
const filterBulanEl = document.getElementById('filterBulanLabaRugi');
const unduhPdfBtn = document.getElementById('unduhPdf');
const tbodyOmzet = document.getElementById('tabelOmzet');
const tbodyBiaya = document.getElementById('tabelBiaya');

let pesanan = [];
let transaksiStok = [];
let alokasiStok = [];
let transaksiKas = [];

// 2. Helper format, tanggal, dan akses data.
// Memformat rupiah.
function formatRupiah(nilai) {
  return 'Rp ' + Number(nilai || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

// Memformat persen.
function formatPersen(nilai, pembagi) {
  return pembagi ? `${(nilai / pembagi * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%` : '0%';
}

// Menentukan bulan berjalan dalam format YYYY-MM.
function bulanSekarang() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Menentukan batas bulan.
function batasBulan(bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const akhir = new Date(tahun, nomorBulan, 0).getDate();
  return { awal: `${bulan}-01`, akhir: `${bulan}-${String(akhir).padStart(2, '0')}` };
}

// Mengambil seluruh baris dari tabel Supabase secara bertahap.
async function ambilSemua(tabel, kolom, orderKolom = 'id') {
  const semua = [];
  const ukuranHalaman = 1000;
  for (let awal = 0; ; awal += ukuranHalaman) {
    const { data, error } = await supabaseClient.from(tabel).select(kolom)
      .order(orderKolom, { ascending: true })
      .range(awal, awal + ukuranHalaman - 1);
    if (error) return { data: null, error };
    semua.push(...(data || []));
    if (!data || data.length < ukuranHalaman) break;
  }
  return { data: semua, error: null };
}

// 3. Perhitungan omzet, HPP, dan biaya.
// Menyusun data HPP berdasarkan alokasi stok untuk periode laporan.
function buatDataHpp(awal, akhir) {
  const transaksiById = new Map(transaksiStok.map(item => [String(item.id), item]));
  const pesananById = new Map(pesanan.map(item => [String(item.id), item]));
  const nilaiPerKeluar = new Map();
  const qtyPerKeluar = new Map();
  alokasiStok.forEach(alokasi => {
    const idKeluar = String(alokasi.transaksi_keluar_id);
    nilaiPerKeluar.set(idKeluar, (nilaiPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0) * Number(alokasi.harga_satuan || 0));
    qtyPerKeluar.set(idKeluar, (qtyPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0));
  });

  const nilaiPerPesanan = new Map();
  const lengkapPerPesanan = new Map();
  const keluarPerPesanan = new Map();
  let hppBulan = 0;
  transaksiStok.filter(item => item.jenis === 'Keluar' && item.sumber === 'Pesanan').forEach(keluar => {
    const order = pesananById.get(String(keluar.pesanan_id));
    const tanggal = order?.tanggal_pesanan || keluar.tanggal;
    if (!tanggal || tanggal < awal || tanggal > akhir) return;
    const orderId = String(keluar.pesanan_id || '');
    const keluarId = String(keluar.id);
    const nilai = nilaiPerKeluar.get(keluarId) || 0;
    const qtyTerpasang = qtyPerKeluar.get(keluarId) || 0;
    const lengkap = qtyTerpasang === Number(keluar.qty || 0) && qtyTerpasang > 0;
    nilaiPerPesanan.set(orderId, (nilaiPerPesanan.get(orderId) || 0) + nilai);
    keluarPerPesanan.set(orderId, (keluarPerPesanan.get(orderId) || 0) + 1);
    lengkapPerPesanan.set(orderId, (lengkapPerPesanan.get(orderId) ?? true) && lengkap);
    hppBulan += nilai;
  });

  // A pesanan without any stock-out row cannot have a complete HPP either.
  pesanan.filter(item => item.tanggal_pesanan >= awal && item.tanggal_pesanan <= akhir)
    .forEach(item => {
      const id = String(item.id);
      if (!keluarPerPesanan.has(id)) lengkapPerPesanan.set(id, false);
    });

  return { nilaiPerPesanan, lengkapPerPesanan, hppBulan };
}

// Menghitung omzet, HPP, dan profit setiap grup pesanan pada periode laporan.
function hitungOmzet(awal, akhir, hppData) {
  const kelompok = new Map();
  pesanan.forEach(item => {
    const tanggal = item.tanggal_pesanan || '';
    if (tanggal < awal || tanggal > akhir) return;
    const noPesanan = String(item.no_pesanan || '(tanpa nomor)');
    const key = `${tanggal}\u0000${noPesanan}`;
    const total = Number(item.total_penghasilan_akhir || 0);
    const hpp = hppData.nilaiPerPesanan.get(String(item.id)) || 0;
    const hppLengkap = hppData.lengkapPerPesanan.get(String(item.id)) === true;
    if (!kelompok.has(key)) {
      kelompok.set(key, { tanggal, noPesanan, total, hpp, hppLengkap, realisasi: item.status === 'Realisasi' });
    } else {
      const baris = kelompok.get(key);
      baris.total = Math.max(baris.total, total);
      baris.hpp += hpp;
      baris.hppLengkap &&= hppLengkap;
      baris.realisasi ||= item.status === 'Realisasi';
    }
  });

  const daftar = Array.from(kelompok.values()).sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal) || a.noPesanan.localeCompare(b.noPesanan)
  );
  const ringkasan = { realisasi: 0, potential: 0, hppRealisasi: 0, hppPotential: 0, pesananPerluCek: 0 };
  daftar.forEach(item => {
    const jenis = item.realisasi ? 'Realisasi' : 'Potential';
    if (item.realisasi) {
      ringkasan.realisasi += item.total;
      ringkasan.hppRealisasi += item.hpp;
    } else {
      ringkasan.potential += item.total;
      ringkasan.hppPotential += item.hpp;
    }
    if (!item.hppLengkap) ringkasan.pesananPerluCek += 1;
    item.status = jenis;
  });
  renderRincian(tbodyOmzet, daftar.map(item => [
    item.tanggal,
    item.noPesanan,
    item.status,
    formatRupiah(item.total),
    item.hppLengkap ? formatRupiah(item.hpp) : `${formatRupiah(item.hpp)} (belum lengkap)`,
    item.hppLengkap ? formatRupiah(item.total - item.hpp) : 'Perlu diperiksa',
    item.hppLengkap ? 'Lengkap' : 'Perlu diperiksa'
  ]), 7, 'Belum ada pesanan pada bulan ini.');
  return ringkasan;
}

// Menghitung biaya operasional.
function hitungBiayaOperasional(awal, akhir) {
  const biaya = transaksiKas.filter(item =>
    item.jenis === 'Keluar' &&
    item.tanggal >= awal && item.tanggal <= akhir &&
    (item.kategori === 'Biaya Operasional' || (!item.kategori &&
      String(item.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional')))
  ).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const jumlah = biaya.reduce((total, item) => total + Number(item.nominal || 0), 0);
  renderRincian(tbodyBiaya, biaya.map(item => [
    item.tanggal,
    item.kategori || 'Biaya Operasional',
    item.keterangan || '-',
    formatRupiah(item.nominal)
  ]), 4, 'Belum ada biaya operasional pada bulan ini.');
  return jumlah;
}

// 4. Render tabel, ringkasan, dan dokumen PDF.
// Menampilkan baris rincian laporan atau pesan saat data kosong.
function renderRincian(tbody, barisData, jumlahKolom, pesanKosong) {
  tbody.replaceChildren();
  if (barisData.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = jumlahKolom;
    cell.textContent = pesanKosong;
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  barisData.forEach(nilaiBaris => {
    const row = document.createElement('tr');
    nilaiBaris.forEach(nilai => {
      const cell = document.createElement('td');
      cell.textContent = nilai;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
}

// Merender laporan.
function renderLaporan() {
  const bulan = filterBulanEl.value;
  if (!bulan) return;
  const { awal, akhir } = batasBulan(bulan);
  const hppData = buatDataHpp(awal, akhir);
  const omzet = hitungOmzet(awal, akhir, hppData);
  const totalOmzet = omzet.realisasi + omzet.potential;
  const totalHpp = omzet.hppRealisasi + omzet.hppPotential;
  const biaya = hitungBiayaOperasional(awal, akhir);
  const labaKotorRealisasi = omzet.realisasi - omzet.hppRealisasi;
  const labaKotor = totalOmzet - totalHpp;
  const labaBersihRealisasi = labaKotorRealisasi - biaya;
  const labaBersih = labaKotor - biaya;

  document.getElementById('omzetRealisasi').textContent = formatRupiah(omzet.realisasi);
  document.getElementById('omzetPotential').textContent = formatRupiah(omzet.potential);
  document.getElementById('totalOmzet').textContent = formatRupiah(totalOmzet);
  document.getElementById('hppRealisasi').textContent = formatRupiah(omzet.hppRealisasi);
  document.getElementById('hppBulan').textContent = formatRupiah(totalHpp);
  document.getElementById('labaKotorRealisasi').textContent = formatRupiah(labaKotorRealisasi);
  document.getElementById('labaKotor').textContent = formatRupiah(labaKotor);
  document.getElementById('biayaOperasional').textContent = formatRupiah(biaya);
  document.getElementById('labaBersihRealisasi').textContent = formatRupiah(labaBersihRealisasi);
  document.getElementById('labaBersih').textContent = formatRupiah(labaBersih);
  document.getElementById('gpmRealisasi').textContent = formatPersen(labaKotorRealisasi, omzet.realisasi);
  document.getElementById('gpm').textContent = formatPersen(labaKotor, totalOmzet);
  document.getElementById('npmRealisasi').textContent = formatPersen(labaBersihRealisasi, omzet.realisasi);
  document.getElementById('npm').textContent = formatPersen(labaBersih, totalOmzet);

  const [tahun, bulanNomor] = bulan.split('-').map(Number);
  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(tahun, bulanNomor - 1, 1));
  statusEl.textContent = omzet.pesananPerluCek
    ? `Laporan ${namaBulan} ${tahun} dimuat. ${omzet.pesananPerluCek} pesanan perlu diperiksa karena HPP stoknya belum tercatat lengkap.`
    : `Laporan ${namaBulan} ${tahun} dimuat. HPP semua pesanan tercatat lengkap.`;
}

// Mengambil teks ringkasan dari elemen yang dipakai saat membuat PDF.
function nilaiTeks(id) {
  return document.getElementById(id)?.textContent?.trim() || '-';
}

// Mengunduh laporan pdf.
function unduhLaporanPdf() {
  if (!window.jspdf?.jsPDF) {
    statusEl.textContent = 'Fitur PDF belum termuat. Periksa koneksi internet lalu muat ulang halaman.';
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const bulan = filterBulanEl.value;
  const [tahun, bulanNomor] = bulan.split('-').map(Number);
  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(tahun, bulanNomor - 1, 1));
  const periode = `${namaBulan} ${tahun}`;
  const dibuat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
  const margin = 14;
  const ink = [23, 43, 67];
  const sub = [99, 116, 135];
  doc.setFillColor(23, 43, 67);
  doc.rect(0, 0, 297, 3, 'F');
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('UsahaKu', margin, 13);
  doc.setFontSize(21);
  doc.text('Laporan Laba Rugi', margin, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...sub);
  doc.text(`Periode ${periode}`, margin, 32);
  doc.text(`Dibuat ${dibuat}`, 283, 13, { align: 'right' });

  const left = 14;
  const leftWidth = 165;
  const right = 190;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ink);
  doc.text('Ringkasan', left, 49);
  doc.setFillColor(23, 43, 67);
  doc.roundedRect(left, 55, leftWidth, 12, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Komponen', left + 4, 63);
  doc.text('Nilai', left + leftWidth - 4, 63, { align: 'right' });

  const ringkasan = [
    ['Omzet Realisasi', nilaiTeks('omzetRealisasi')],
    ['Omzet Potential', nilaiTeks('omzetPotential')],
    ['Total Omzet Proyeksi', nilaiTeks('totalOmzet')],
    ['HPP Realisasi', nilaiTeks('hppRealisasi')],
    ['HPP Proyeksi Total', nilaiTeks('hppBulan')],
    ['Laba Kotor Realisasi', nilaiTeks('labaKotorRealisasi')],
    ['Laba Kotor Proyeksi', nilaiTeks('labaKotor')],
    ['Biaya Operasional', nilaiTeks('biayaOperasional')],
    ['Laba Bersih Realisasi', nilaiTeks('labaBersihRealisasi')],
    ['Laba Bersih Proyeksi', nilaiTeks('labaBersih')]
  ];
  let rowY = 67;
  ringkasan.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(247, 245, 241);
      doc.rect(left, rowY, leftWidth, 10, 'F');
    }
    doc.setFont('helvetica', index === 2 || index === 5 || index === 9 ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...ink);
    doc.text(row[0], left + 4, rowY + 6.6);
    doc.text(row[1], left + leftWidth - 4, rowY + 6.6, { align: 'right' });
    rowY += 10;
  });

// Menggambar ringkasan margin aktual dan proyeksi pada PDF.
  const buatKotakMargin = (y, judul, aktual, proyeksi) => {
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
    doc.text('Proyeksi', right + 6, y + 33);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...ink);
    doc.text(aktual, right + 87, y + 21, { align: 'right' });
    doc.text(proyeksi, right + 87, y + 33, { align: 'right' });
  };
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ink);
  doc.text('Analisis Margin', right, 49);
  buatKotakMargin(55, 'MARGIN LABA KOTOR', nilaiTeks('gpmRealisasi'), nilaiTeks('gpm'));
  buatKotakMargin(105, 'MARGIN LABA BERSIH', nilaiTeks('npmRealisasi'), nilaiTeks('npm'));

  doc.setFillColor(247, 245, 241);
  doc.roundedRect(right, 155, 93, 25, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...ink);
  doc.text('Catatan', right + 5, 163);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...sub);
  doc.text('Proyeksi mencakup pesanan pending.', right + 5, 169);
  doc.text('HPP dihitung berdasarkan FIFO.', right + 5, 175);

  doc.setDrawColor(222, 216, 206);
  doc.line(margin, 193, 283, 193);
  doc.setFontSize(8);
  doc.setTextColor(...sub);
  doc.text('UsahaKu · Laporan internal', margin, 199);

  doc.save(`Laporan-Laba-Rugi-${bulan}.pdf`);
}

// 5. Memuat data dan memasang event laporan.
// Mengambil pesanan, stok, alokasi, dan kas untuk laporan laba rugi.
async function muatData() {
  statusEl.textContent = 'Memuat pesanan, stok, dan transaksi kas...';
  const hasil = await Promise.all([
    ambilSemua('pesanan', 'id, no_pesanan, tanggal_pesanan, total_penghasilan_akhir, status'),
    ambilSemua('transaksi_stok', 'id, tanggal, jenis, qty, sumber, pesanan_id'),
    ambilSemua('alokasi_stok_fifo', 'id, transaksi_keluar_id, qty, harga_satuan'),
    ambilSemua('transaksi_kas', 'id, tanggal, jenis, kategori, nominal, keterangan')
  ]);
  const gagal = hasil.find(item => item.error);
  if (gagal) {
    statusEl.textContent = 'Gagal memuat data: ' + gagal.error.message;
    return;
  }
  [pesanan, transaksiStok, alokasiStok, transaksiKas] = hasil.map(item => item.data || []);
  unduhPdfBtn.disabled = false;
  renderLaporan();
}

filterBulanEl.value = bulanSekarang();
// Menyesuaikan data atau tampilan saat pilihan berubah.
filterBulanEl.addEventListener('change', renderLaporan);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
unduhPdfBtn.addEventListener('click', unduhLaporanPdf);
muatData();
