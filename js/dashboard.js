// 1. Referensi elemen dan state ringkasan.
const statusEl = document.getElementById('status');
const filterBulanEl = document.getElementById('filterBulanDashboard');
let semuaPesanan = [];
let semuaProduk = [];
let semuaTransaksiStok = [];
let semuaAlokasiStok = [];
let semuaTransaksiKas = [];

const warnaGrafik = ['#6E9B66', '#D98E2B', '#5385A6'];
// Memformat uang.
const formatUang = nilai => 'Rp ' + Number(nilai || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
// Memformat angka besar dengan bentuk singkat.
const formatPendek = nilai => {
  const abs = Math.abs(nilai);
  if (abs >= 1_000_000_000) return `${(nilai / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`; 
  if (abs >= 1_000_000) return `${(nilai / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000) return `${(nilai / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return String(Math.round(nilai));
};

// 2. Helper periode dan pengambilan data.
// Menentukan bulan berjalan dalam format YYYY-MM.
function bulanSekarang() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Menyusun daftar bulan terakhir.
function daftarBulanTerakhir(bulanAkhir, jumlah = 12) {
  const [tahun, bulan] = bulanAkhir.split('-').map(Number);
  return Array.from({ length: jumlah }, (_, index) => {
    const date = new Date(tahun, bulan - jumlah + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: `${date.toLocaleDateString('id-ID', { month: 'short' })} '${String(date.getFullYear()).slice(-2)}`
    };
  });
}

// Membentuk rentang bulan.
function rentangBulan(bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const hariAkhir = new Date(tahun, nomorBulan, 0).getDate();
  return { awal: `${bulan}-01`, akhir: `${bulan}-${String(hariAkhir).padStart(2, '0')}` };
}

// Mengambil seluruh baris dari tabel Supabase secara bertahap.
async function ambilSemua(tabel, kolom) {
  const semua = [];
  const ukuranHalaman = 1000;
  for (let awal = 0; ; awal += ukuranHalaman) {
    const { data, error } = await supabaseClient.from(tabel).select(kolom)
      .order('id', { ascending: true })
      .range(awal, awal + ukuranHalaman - 1);
    if (error) return { data: null, error };
    semua.push(...(data || []));
    if (!data || data.length < ukuranHalaman) break;
  }
  return { data: semua, error: null };
}

// 3. Perhitungan pesanan, HPP, dan saldo.
// Mengelompokkan pesanan berdasarkan kunci yang relevan.
function kelompokkanPesanan(hppPerPesanan) {
  const kelompok = new Map();
  semuaPesanan.forEach(row => {
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
      group.realisasi ||= row.status === 'Realisasi';
    }
  });
  return Array.from(kelompok.values());
}

// Menyusun peta HPP untuk setiap nomor pesanan.
function buatPetaHppPesanan() {
  const pesananById = new Map(semuaPesanan.map(item => [String(item.id), item]));
  const hppPerKeluar = new Map();
  semuaAlokasiStok.forEach(alokasi => {
    const idKeluar = String(alokasi.transaksi_keluar_id);
    hppPerKeluar.set(idKeluar, (hppPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0) * Number(alokasi.harga_satuan || 0));
  });
  const hppPerPesanan = new Map();
  semuaTransaksiStok.forEach(keluar => {
    if (keluar.jenis !== 'Keluar' || keluar.sumber !== 'Pesanan' || !keluar.pesanan_id) return;
    const order = pesananById.get(String(keluar.pesanan_id));
    if (!order) return;
    const idPesanan = String(order.id);
    hppPerPesanan.set(idPesanan, (hppPerPesanan.get(idPesanan) || 0) + (hppPerKeluar.get(String(keluar.id)) || 0));
  });
  return hppPerPesanan;
}

// 4. Render grafik dashboard.
// Membuat elemen SVG beserta atributnya.
function svgNode(tag, attrs = {}, text = '') {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
  if (text !== '') element.textContent = text;
  return element;
}

// Menggambar grafik berkala untuk omzet, pesanan, atau arus kas.
function renderGrafikKelompok(id, labels, series, compact = false) {
  const container = document.getElementById(id);
  container.replaceChildren();
  const width = 860;
  const height = 310;
  const margin = { top: 18, right: 18, bottom: 45, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...series.flatMap(item => item.values));
  const step = plotWidth / Math.max(labels.length, 1);
  const groupWidth = Math.min(step * 0.68, 48);
  const barWidth = Math.max(3, groupWidth / series.length - 3);
  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'presentation', preserveAspectRatio: 'xMidYMid meet' });

  for (let tick = 0; tick <= 4; tick++) {
    const fraction = tick / 4;
    const y = margin.top + plotHeight * (1 - fraction);
    const value = maxValue * fraction;
    svg.appendChild(svgNode('line', { x1: margin.left, y1: y, x2: width - margin.right, y2: y, class: 'chartGridLine' }));
    svg.appendChild(svgNode('text', { x: margin.left - 8, y: y + 4, 'text-anchor': 'end', class: 'chartAxisLabel' }, compact ? formatPendek(value) : String(Math.round(value))));
  }

  labels.forEach((item, index) => {
    const center = margin.left + step * index + step / 2;
    const start = center - (barWidth * series.length + (series.length - 1) * 3) / 2;
    series.forEach((line, seriesIndex) => {
      const value = Number(line.values[index] || 0);
      const barHeight = value > 0 ? Math.max(1, plotHeight * value / maxValue) : 0;
      const x = start + seriesIndex * (barWidth + 3);
      const y = margin.top + plotHeight - barHeight;
      const rect = svgNode('rect', { x, y, width: barWidth, height: barHeight, rx: 3, fill: warnaGrafik[seriesIndex % warnaGrafik.length], class: 'chartBar' });
      rect.appendChild(svgNode('title', {}, `${item.label} — ${line.name}: ${compact ? formatUang(value) : value}`));
      svg.appendChild(rect);
    });
    svg.appendChild(svgNode('text', { x: center, y: height - 14, 'text-anchor': 'middle', class: 'chartAxisLabel' }, item.label));
  });
  container.appendChild(svg);

  const legend = document.createElement('div');
  legend.className = 'chartLegend';
  series.forEach((item, index) => {
    const label = document.createElement('span');
    const swatch = document.createElement('i');
    swatch.style.backgroundColor = warnaGrafik[index % warnaGrafik.length];
    label.append(swatch, document.createTextNode(item.name));
    legend.appendChild(label);
  });
  container.appendChild(legend);
}

// Menampilkan lima produk dengan jumlah barang keluar tertinggi.
function renderGrafikPareto(daftar) {
  const container = document.getElementById('grafikProdukKeluar');
  container.replaceChildren();
  if (!daftar.length) {
    const empty = document.createElement('p');
    empty.className = 'chartEmpty';
    empty.textContent = 'Belum ada barang terjual pada bulan ini.';
    container.appendChild(empty);
    return;
  }

  const width = 860;
  const rowHeight = 48;
  const height = Math.max(110, daftar.length * rowHeight + 20);
  const labelWidth = 230;
  const barMax = width - labelWidth - 75;
  const maxValue = Math.max(1, ...daftar.map(item => item.qty));
  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'presentation', preserveAspectRatio: 'xMidYMid meet' });
  daftar.forEach((item, index) => {
    const y = 14 + index * rowHeight;
    const barWidth = barMax * item.qty / maxValue;
    const name = item.nama.length > 32 ? `${item.nama.slice(0, 29)}…` : item.nama;
    svg.appendChild(svgNode('text', { x: labelWidth - 12, y: y + 20, 'text-anchor': 'end', class: 'chartProductLabel' }, name));
    svg.appendChild(svgNode('rect', { x: labelWidth, y, width: barWidth, height: 28, rx: 5, fill: warnaGrafik[index % warnaGrafik.length] }));
    svg.appendChild(svgNode('text', { x: labelWidth + barWidth + 8, y: y + 19, class: 'chartValueLabel' }, `${item.qty} pcs`));
  });
  container.appendChild(svg);
}

// Menghitung metrik bulan terpilih dan memperbarui kartu serta grafik.
function renderDashboard() {
  const bulan = filterBulanEl.value;
  if (!bulan) return;
  const { awal, akhir } = rentangBulan(bulan);
  const bulanGrafik = daftarBulanTerakhir(bulan);
  const kelompok = kelompokkanPesanan(buatPetaHppPesanan());
  const padaBulanIni = kelompok.filter(item => item.bulan === bulan);
  const realisasi = padaBulanIni.filter(item => item.realisasi).reduce((sum, item) => sum + item.total, 0);
  const potential = padaBulanIni.filter(item => !item.realisasi).reduce((sum, item) => sum + item.total, 0);
  const totalOmzet = realisasi + potential;
  const hppRealisasi = padaBulanIni.filter(item => item.realisasi).reduce((sum, item) => sum + item.hpp, 0);
  const hppPotential = padaBulanIni.filter(item => !item.realisasi).reduce((sum, item) => sum + item.hpp, 0);
  const biayaOperasional = semuaTransaksiKas.filter(item =>
    item.jenis === 'Keluar' && item.tanggal >= awal && item.tanggal <= akhir &&
    (item.kategori === 'Biaya Operasional' || (!item.kategori &&
      String(item.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional')))
  ).reduce((sum, item) => sum + Number(item.nominal || 0), 0);
  const labaBersihRealisasi = realisasi - hppRealisasi - biayaOperasional;
  const labaBersihProyeksi = totalOmzet - hppRealisasi - hppPotential - biayaOperasional;

  const monthCount = new Map(bulanGrafik.map(item => [item.key, new Set()]));
  const monthOmzet = new Map(bulanGrafik.map(item => [item.key, { realisasi: 0, potential: 0 }]));
  kelompok.forEach(item => {
    if (!monthCount.has(item.bulan)) return;
    monthCount.get(item.bulan).add(item.noPesanan);
    const sums = monthOmzet.get(item.bulan);
    if (item.realisasi) sums.realisasi += item.total;
    else sums.potential += item.total;
  });

  const kasBulan = new Map(bulanGrafik.map(item => [item.key, { masuk: 0, keluar: 0 }]));
  semuaTransaksiKas.forEach(item => {
    if (!kasBulan.has(String(item.tanggal || '').slice(0, 7))) return;
    const sums = kasBulan.get(item.tanggal.slice(0, 7));
    if (item.jenis === 'Masuk') sums.masuk += Number(item.nominal || 0);
    if (item.jenis === 'Keluar') sums.keluar += Number(item.nominal || 0);
  });

  const saldoAwal = semuaTransaksiKas.filter(item => item.jenis === 'Saldo Awal').reduce((sum, item) => sum + Number(item.nominal || 0), 0);
  const totalMasuk = semuaTransaksiKas.filter(item => item.jenis === 'Masuk').reduce((sum, item) => sum + Number(item.nominal || 0), 0);
  const totalKeluar = semuaTransaksiKas.filter(item => item.jenis === 'Keluar').reduce((sum, item) => sum + Number(item.nominal || 0), 0);

  document.getElementById('totalPesanan').textContent = String(padaBulanIni.length);
  document.getElementById('omzetRealisasi').textContent = formatUang(realisasi);
  document.getElementById('omzetPotential').textContent = formatUang(potential);
  document.getElementById('omset').textContent = formatUang(totalOmzet);
  document.getElementById('labaBersihRealisasi').textContent = formatUang(labaBersihRealisasi);
  document.getElementById('labaBersihProyeksi').textContent = formatUang(labaBersihProyeksi);
  document.getElementById('saldoKas').textContent = formatUang(saldoAwal + totalMasuk - totalKeluar);

  renderGrafikKelompok('grafikPesanan', bulanGrafik, [{ name: 'Nomor pesanan', values: bulanGrafik.map(item => monthCount.get(item.key).size) }]);
  renderGrafikKelompok('grafikOmzet', bulanGrafik, [
    { name: 'Terealisasi', values: bulanGrafik.map(item => monthOmzet.get(item.key).realisasi) },
    { name: 'Pesanan pending', values: bulanGrafik.map(item => monthOmzet.get(item.key).potential) }
  ], true);
  renderGrafikKelompok('grafikKas', bulanGrafik, [
    { name: 'Uang masuk', values: bulanGrafik.map(item => kasBulan.get(item.key).masuk) },
    { name: 'Uang keluar', values: bulanGrafik.map(item => kasBulan.get(item.key).keluar) }
  ], true);

  const keluarProduk = new Map();
  const produkMap = new Map(semuaProduk.map(item => [String(item.id), item]));
  semuaTransaksiStok.forEach(transaksi => {
    if (transaksi.jenis !== 'Keluar' || transaksi.sumber !== 'Pesanan' || transaksi.tanggal < awal || transaksi.tanggal > akhir) return;
    const kode = String(transaksi.kode_produk);
    const itemProduk = produkMap.get(kode);
    if (!itemProduk) return;
    keluarProduk.set(kode, {
      nama: itemProduk.nama_produk || `Produk ${kode}`,
      qty: (keluarProduk.get(kode)?.qty || 0) + Number(transaksi.qty || 0)
    });
  });
  const topProduk = Array.from(keluarProduk.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  renderGrafikPareto(topProduk);

  const qtyAlokasi = new Map();
  semuaAlokasiStok.forEach(item => qtyAlokasi.set(
    String(item.transaksi_keluar_id), (qtyAlokasi.get(String(item.transaksi_keluar_id)) || 0) + Number(item.qty || 0)
  ));
  const fifoBelumLengkap = semuaTransaksiStok.some(item => item.jenis === 'Keluar' && item.sumber === 'Pesanan' &&
    (qtyAlokasi.get(String(item.id)) || 0) !== Number(item.qty || 0));
  const namaBulan = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(`${bulan}-01T00:00:00`));
  statusEl.textContent = `Ringkasan ${namaBulan} ${bulan.slice(0, 4)} diperbarui. Grafik menampilkan 12 bulan hingga bulan terpilih. Saldo kas menunjukkan saldo terkini dari seluruh transaksi.` +
    (fifoBelumLengkap ? ' Sebagian HPP pesanan belum lengkap, sehingga angka laba perlu diperiksa.' : '');
}

// 5. Memuat data dan memasang event filter.
// Mengambil data ringkasan Supabase lalu merender dashboard.
async function muatDashboard() {
  statusEl.textContent = 'Memuat data pesanan, produk, stok, dan kas...';
  const hasil = await Promise.all([
    ambilSemua('pesanan', 'id, no_pesanan, tanggal_pesanan, total_penghasilan_akhir, status'),
    ambilSemua('produk', 'id, nama_produk, hpp'),
    ambilSemua('transaksi_stok', 'id, tanggal, kode_produk, jenis, qty, sumber, pesanan_id, harga_satuan'),
    ambilSemua('alokasi_stok_fifo', 'id, transaksi_keluar_id, transaksi_masuk_id, qty, harga_satuan'),
    ambilSemua('transaksi_kas', 'id, tanggal, jenis, kategori, nominal, keterangan')
  ]);
  const gagal = hasil.find(item => item.error);
  if (gagal) {
    statusEl.textContent = 'Gagal memuat data dashboard: ' + gagal.error.message;
    return;
  }
  [semuaPesanan, semuaProduk, semuaTransaksiStok, semuaAlokasiStok, semuaTransaksiKas] = hasil.map(item => item.data || []);
  renderDashboard();
}

filterBulanEl.value = bulanSekarang();
// Menyesuaikan data atau tampilan saat pilihan berubah.
filterBulanEl.addEventListener('change', renderDashboard);
muatDashboard();
