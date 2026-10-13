// UsahaKu Business Calculations Module

/**
 * Mengelompokkan data pesanan berdasarkan nomor pesanan.
 * Setiap grup berisi informasi lengkap termasuk detail items, HPP, dan profit.
 *
 * @param {Array} listPesanan - Array objek pesanan dari database
 * @param {Object} mapProduk - Mapping kode produk ke informasi produk (nama, dll)
 * @param {Map} hppPerPesanan - Map yang menyimpan data HPP per ID pesanan
 * @returns {Array} Array grup pesanan yang sudah digabungkan dengan Kalkulasi profit dan margin
 */
export function kelompokkanPesanan(listPesanan, mapProduk = {}, hppPerPesanan = new Map()) {
  const normalisasiTeks = nilai => String(nilai || '').trim().toLocaleLowerCase('id-ID');
  const grouped = new Map();

  // Iterasi setiap pesanan untuk mengelompokkan berdasarkan nomor pesanan
  (listPesanan || []).forEach(row => {
    const rawKey = normalisasiTeks(row.no_pesanan);
    const key = rawKey || `__empty_${row.id}`;

    // Inisialisasi grup baru jika belum ada
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        noPesanan: row.no_pesanan || '(tanpa nomor)',
        tanggal: row.tanggal_pesanan || '',
        totalPenghasilan: Number(row.total_penghasilan_akhir || 0),
        status: row.status || 'Pending',
        tanggalRealisasi: row.tanggal_transaksi_masuk || '',
        rows: []
      });
    }

    const current = grouped.get(key);
    // Update total penghasilan dengan nilai maksimum dari semua row dalam grup
    current.totalPenghasilan = Math.max(current.totalPenghasilan, Number(row.total_penghasilan_akhir || 0));
    if (row.status === 'Realisasi') current.status = 'Realisasi';
    if (row.tanggal_transaksi_masuk) current.tanggalRealisasi = row.tanggal_transaksi_masuk;

    // Tambahkan detail item pesanan dengan informasi HPP dari alokasi
    current.rows.push({
      id: row.id,
      kode_produk: row.kode_produk,
      qty: Number(row.qty || 0),
      harga_jual: Number(row.harga_jual || 0),
      hpp: Number(hppPerPesanan.get(String(row.id))?.total || 0),
      hppAllocations: hppPerPesanan.get(String(row.id))?.allocations || [],
      nama_produk: mapProduk[row.kode_produk]?.nama || `Produk ${row.kode_produk}`
    });
  });

  // Transformasi dan Kalkulasi final untuk setiap grup
  return Array.from(grouped.values()).map(group => {
    // Hitung total HPP dari semua item dalam grup
    const totalHpp = group.rows.reduce((sum, item) => sum + item.hpp, 0);

    // Flatmap untuk memecah alokasi HPP per batch dan menangani kasus belum lengkap
    group.displayRows = group.rows.flatMap(item => {
      // Konversi alokasi HPP menjadi baris display dengan detail per batch
      const rows = item.hppAllocations.map((allocation, index) => ({
        ...item,
        displayKey: `${item.id}-${index}`,
        qty: allocation.qty,
        hpp: allocation.totalHpp,
        hppPerUnit: allocation.hppPerUnit,
        hppBelumTersedia: false
      }));

      // Kalkulasi kuantitas yang sudah dialokasikan vs belum
      const qtyTerhitung = rows.reduce((sum, row) => sum + row.qty, 0);
      const qtyBelumTerhitung = item.qty - qtyTerhitung;

      // Tambahkan baris khusus untuk item yang belum memiliki alokasi HPP lengkap
      if (!rows.length || qtyBelumTerhitung > 0) {
        rows.push({
          ...item,
          displayKey: `${item.id}-belum-lengkap`,
          qty: rows.length ? qtyBelumTerhitung : item.qty,
          hpp: 0,
          hppPerUnit: null,
          hppBelumTersedia: true
        });
      }
      return rows;
    });

    // Kalkulasi profit dan margin untuk grup
    const profit = group.totalPenghasilan - totalHpp;
    const margin = group.totalPenghasilan > 0 ? (profit / group.totalPenghasilan) * 100 : 0;

    return {
      ...group,
      totalHpp,
      profit,
      margin
    };
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.noPesanan.localeCompare(b.noPesanan));
}

/**
 * Menghitung estimasi HPP menggunakan metode FIFO (First In, First Out).
 * Algoritma ini mengambil stok tertua terlebih dahulu untuk mengalokasikan biaya.
 *
 * @param {Array} items - Array item pesanan yang akan dihitung HPP-nya
 * @param {string} tanggalPesanan - Tanggal pesanan untuk filter transaksi stok
 * @param {Array} daftarTransaksiStok - Array transaksi stok (masuk/keluar)
 * @param {Array} daftarAlokasiStok - Array alokasi stok antar transaksi
 * @param {Object} pesananSedangDiedit - Data pesanan yang sedang dalam mode edit (optional)
 * @returns {Array} Array hasil Kalkulasi HPP per item dengan detail per batch
 */
export function hitungEstimasiHppFIFO(items, tanggalPesanan, daftarTransaksiStok, daftarAlokasiStok, pesananSedangDiedit = null) {
  // Mapping transaksi untuk akses cepat berdasarkan ID
  const transaksiMap = new Map((daftarTransaksiStok || []).map(item => [String(item.id), item]));

  // Build lapisan/stack FIFO: kumpulkan semua transaksi MASUK sebelum tanggal pesanan
  // Diurutkan berdasarkan tanggal (terlama pertama) untuk memastikan FIFO
  const lapisan = (daftarTransaksiStok || [])
    .filter(item => item.jenis === 'Masuk' && item.tanggal <= tanggalPesanan)
    .map(item => ({
      id: String(item.id),
      tanggal: item.tanggal,
      qtySisa: Number(item.qty || 0),
      hpp: Number(item.harga_satuan || 0),
      kode: String(item.kode_produk)
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || Number(a.id) - Number(b.id));

  // Kurangi qtySisa pada lapisan berdasarkan alokasi yang sudah ada
  // Ini memastikan kita tidak menggunakan stok yang sudah dialokasikan ke pesanan lain
  (daftarAlokasiStok || []).forEach(alokasi => {
    const keluar = transaksiMap.get(String(alokasi.transaksi_keluar_id));
    // Skip jika transaksi keluar tidak ada atau terjadi setelah tanggal pesanan
    if (!keluar || keluar.tanggal > tanggalPesanan) return;
    // Skip jika pesanan yang mengeluarkan stok sedang dalam mode edit
    if (pesananSedangDiedit?.ids && pesananSedangDiedit.ids.has(String(keluar.pesanan_id))) return;

    // Temukan batch yang sesuai dan kurangi qtySisa
    const batch = lapisan.find(item => item.id === String(alokasi.transaksi_masuk_id));
    if (batch) batch.qtySisa -= Number(alokasi.qty || 0);
  });

  // Proses setiap item pesanan untuk menghitung HPP dengan algoritma FIFO
  return (items || []).map(item => {
    const kode = String(item.kode_produk || '');
    const qtyDiminta = Number(item.qty || 0);

    // Validasi input: skip jika kode kosong atau qty tidak valid
    if (!kode || qtyDiminta <= 0) {
      return { kode, qty: qtyDiminta, hppSatuan: 0, rincian: [], totalHpp: 0, sisaKurang: 0, sukses: false };
    }

    let sisaDiminta = qtyDiminta;
    let biaya = 0;
    let qtyDialokasikan = 0;
    const rincian = [];

    // Iterasi melalui lapisan stok (sudah terurut FIFO)
    // Ambil dari batch tertua terlebih dahulu
    for (const batch of lapisan) {
      // Skip batch yang tidak cocok produk atau sudah habis
      if (batch.kode !== kode || batch.qtySisa <= 0 || sisaDiminta <= 0) continue;

      // Ambil quantidade yang diminta dari batch saat ini
      const diambil = Math.min(sisaDiminta, batch.qtySisa);
      batch.qtySisa -= diambil;
      sisaDiminta -= diambil;
      qtyDialokasikan += diambil;
      biaya += diambil * batch.hpp;

      // Gabungkan dengan segmen sebelumnya jika HPP per unit sama
      // Ini untuk efisiensi display dan kalkulasi
      const segmenTerakhir = rincian[rincian.length - 1];
      if (segmenTerakhir && segmenTerakhir.hppPerUnit === batch.hpp) {
        segmenTerakhir.qty += diambil;
        segmenTerakhir.totalHpp += diambil * batch.hpp;
      } else {
        rincian.push({ qty: diambil, hppPerUnit: batch.hpp, totalHpp: diambil * batch.hpp });
      }
    }

    // Kalkulasi HPP per unit
    const hppSatuan = qtyDialokasikan > 0 ? biaya / qtyDialokasikan : 0;

    return {
      kode,
      qty: qtyDiminta,
      hppSatuan,
      rincian,
      totalHpp: biaya,
      sisaKurang: sisaDiminta,
      sukses: sisaDiminta === 0
    };
  });
}

/**
 * Menghitung ringkasan kas untuk periode tertentu.
 * Membagi transaksi berdasarkan periode dan menghitung saldo awal, masuk, keluar, dan akhir.
 *
 * @param {Array} transaksiKas - Array transaksi kas (masuk/keluar/saldo awal)
 * @param {string} bulan - Format 'YYYY-MM' untuk periode yang akan dihitung
 * @returns {Object} Object berisi saldo awal, total masuk, total keluar, saldo akhir periode, dan saldo keseluruhan
 */
export function hitungRingkasanKas(transaksiKas, bulan) {
  // Parse periode bulan untuk menentukan tanggal awal dan akhir
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const hariAkhir = new Date(tahun, nomorBulan, 0).getDate();
  const awal = `${bulan}-01`;
  const akhir = `${bulan}-${String(hariAkhir).padStart(2, '0')}`;

  // Inisialisasi akumulator untuk saldo dan total
  let saldoAwal = 0;
  let totalMasuk = 0;
  let totalKeluar = 0;

  // Kalkulasi saldo awal dan total per periode
  (transaksiKas || []).forEach(row => {
    const tgl = row.tanggal;
    const nominal = Number(row.nominal || 0);

    // Transaksi sebelum periode = saldo awal
    if (tgl < awal) {
      if (row.jenis === 'Masuk' || row.jenis === 'Saldo Awal') saldoAwal += nominal;
      else if (row.jenis === 'Keluar') saldoAwal -= nominal;
    } else if (tgl <= akhir) {
      // Transaksi dalam periode = dimasukan ke perhitungan periode
      if (row.jenis === 'Saldo Awal') {
        saldoAwal += nominal;
      } else if (row.jenis === 'Masuk') {
        totalMasuk += nominal;
      } else if (row.jenis === 'Keluar') {
        totalKeluar += nominal;
      }
    }
  });

  // Kalkulasi saldo akhir untuk periode ini saja
  const saldoAkhirPeriode = saldoAwal + totalMasuk - totalKeluar;

  // Kalkulasi saldo bisnis hari ini (semua transaksi, tidak peduli tanggal)
  let saldoBisnisHariIni = 0;
  (transaksiKas || []).forEach(row => {
    const nominal = Number(row.nominal || 0);
    if (row.jenis === 'Masuk' || row.jenis === 'Saldo Awal') saldoBisnisHariIni += nominal;
    else if (row.jenis === 'Keluar') saldoBisnisHariIni -= nominal;
  });

  // Ambil daftar transaksi dalam periode untuk display (urut tanggal terbaru)
  const listBulan = (transaksiKas || [])
    .filter(row => row.tanggal >= awal && row.tanggal <= akhir)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id);

  return {
    saldoAwal,
    totalMasuk,
    totalKeluar,
    saldoAkhirPeriode,
    saldoBisnisHariIni,
    listBulan
  };
}

/**
 * Menghitung laporan laba-rugi untuk periode tertentu.
 * Includes omzet (realisasi & potential), HPP, biaya operasional, dan berbagai metrik profitabilitas.
 *
 * @param {Array} pesanan - Array data pesanan
 * @param {Array} transaksiStok - Array transaksi stok (masuk/keluar)
 * @param {Array} alokasiStok - Array alokasi stok antar transaksi
 * @param {Array} transaksiKas - Array transaksi kas untuk biaya operasional
 * @param {string} bulan - Format 'YYYY-MM' untuk periode yang akan dihitung
 * @returns {Object} Object lengkap dengan metrik profitabilitas dan rincian pesanan
 */
export function hitungLabaRugi(pesanan, transaksiStok, alokasiStok, transaksiKas, bulan) {
  // Parse periode bulan
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const hariAkhir = new Date(tahun, nomorBulan, 0).getDate();
  const awal = `${bulan}-01`;
  const akhir = `${bulan}-${String(hariAkhir).padStart(2, '0')}`;

  // Mapping pesanan by ID untuk akses cepat
  const pesananById = new Map((pesanan || []).map(item => [String(item.id), item]));

  // Kalkulasi nilai dan quantity per transaksi keluar (untuk HPP)
  const nilaiPerKeluar = new Map();
  const qtyPerKeluar = new Map();

  (alokasiStok || []).forEach(alokasi => {
    const idKeluar = String(alokasi.transaksi_keluar_id);
    // Akumulasi nilai = qty * harga_satuan
    nilaiPerKeluar.set(idKeluar, (nilaiPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0) * Number(alokasi.harga_satuan || 0));
    qtyPerKeluar.set(idKeluar, (qtyPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0));
  });

  // Kalkulasi HPP per pesanan berdasarkan transaksi keluar yang terkait
  const nilaiPerPesanan = new Map();
  const lengkapPerPesanan = new Map();
  const keluarPerPesanan = new Map();
  let hppBulan = 0;

  // Filter transaksi keluar yang sumbernya dari pesanan dan dalam periode
  (transaksiStok || []).filter(item => item.jenis === 'Keluar' && item.sumber === 'Pesanan').forEach(keluar => {
    const order = pesananById.get(String(keluar.pesanan_id));
    const tanggal = order?.tanggal_pesanan || keluar.tanggal;
    if (!tanggal || tanggal < awal || tanggal > akhir) return;

    const orderId = String(keluar.pesanan_id || '');
    const keluarId = String(keluar.id);
    const nilai = nilaiPerKeluar.get(keluarId) || 0;
    const qtyTerpasang = qtyPerKeluar.get(keluarId) || 0;

    // Cek apakah alokasi stok sudah lengkap (qty alokasi == qty keluar)
    const lengkap = qtyTerpasang === Number(keluar.qty || 0) && qtyTerpasang > 0;

    nilaiPerPesanan.set(orderId, (nilaiPerPesanan.get(orderId) || 0) + nilai);
    keluarPerPesanan.set(orderId, (keluarPerPesanan.get(orderId) || 0) + 1);
    lengkapPerPesanan.set(orderId, (lengkapPerPesanan.get(orderId) ?? true) && lengkap);
    hppBulan += nilai;
  });

  // Tandai pesanan yang tidak memiliki transaksi keluar sebagai tidak lengkap
  (pesanan || []).filter(item => item.tanggal_pesanan >= awal && item.tanggal_pesanan <= akhir).forEach(item => {
    const id = String(item.id);
    if (!keluarPerPesanan.has(id)) lengkapPerPesanan.set(id, false);
  });

  // Kelompokkan pesanan berdasarkan tanggal + nomor pesanan
  const kelompok = new Map();
  (pesanan || []).forEach(item => {
    const tanggal = item.tanggal_pesanan || '';
    if (tanggal < awal || tanggal > akhir) return;

    const noPesanan = String(item.no_pesanan || '(tanpa nomor)');
    const key = `${tanggal}\u0000${noPesanan}`;
    const total = Number(item.total_penghasilan_akhir || 0);
    const hpp = nilaiPerPesanan.get(String(item.id)) || 0;
    const hppLengkap = lengkapPerPesanan.get(String(item.id)) === true;

    if (!kelompok.has(key)) {
      kelompok.set(key, { tanggal, noPesanan, total, hpp, hppLengkap, realisasi: item.status === 'Realisasi' });
    } else {
      const baris = kelompok.get(key);
      // Ambil nilai tertinggi untuk total (jika ada beberapa row dengan nomor sama)
      baris.total = Math.max(baris.total, total);
      baris.hpp += hpp;
      baris.hppLengkap = baris.hppLengkap && hppLengkap;
      baris.realisasi = baris.realisasi || item.status === 'Realisasi';
    }
  });

  // Konversi ke array dan urutkan
  const rincianPesanan = Array.from(kelompok.values()).sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal) || a.noPesanan.localeCompare(b.noPesanan)
  );

  // Kalkulasi omzet dan HPP terpisah untuk realized vs potential
  let omzetRealisasi = 0;
  let omzetPotential = 0;
  let hppRealisasi = 0;
  let hppPotential = 0;
  let pesananPerluCek = 0;

  rincianPesanan.forEach(item => {
    if (item.realisasi) {
      omzetRealisasi += item.total;
      hppRealisasi += item.hpp;
    } else {
      omzetPotential += item.total;
      hppPotential += item.hpp;
    }
    // Hitung pesanan yang perlu dicek HPP-nya
    if (!item.hppLengkap) pesananPerluCek += 1;
    item.status = item.realisasi ? 'Realisasi' : 'Potential';
  });

  const totalOmzet = omzetRealisasi + omzetPotential;
  const totalHppProyeksi = hppRealisasi + hppPotential;

  // Filter biaya operasional dari transaksi kas
  const biayaOperasionalList = (transaksiKas || []).filter(item =>
    item.jenis === 'Keluar' &&
    item.tanggal >= awal && item.tanggal <= akhir &&
    (item.kategori === 'Biaya Operasional' || (!item.kategori &&
      String(item.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional')))
  ).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  // Total biaya operasional dalam periode
  const biayaOperasional = biayaOperasionalList.reduce((sum, item) => sum + Number(item.nominal || 0), 0);

  // Kalkulasi laba kotor (omzet - HPP)
  const labaKotorRealisasi = omzetRealisasi - hppRealisasi;
  const labaKotorProyeksi = totalOmzet - totalHppProyeksi;

  // Kalkulasi laba bersih (laba kotor - biaya operasional)
  const labaBersihRealisasi = labaKotorRealisasi - biayaOperasional;
  const labaBersihProyeksi = labaKotorProyeksi - biayaOperasional;

  // Kalkulasi metrik persentase (GPM = Gross Profit Margin, NPM = Net Profit Margin)
  const gpmRealisasi = omzetRealisasi > 0 ? (labaKotorRealisasi / omzetRealisasi) * 100 : 0;
  const gpmProyeksi = totalOmzet > 0 ? (labaKotorProyeksi / totalOmzet) * 100 : 0;
  const npmRealisasi = omzetRealisasi > 0 ? (labaBersihRealisasi / omzetRealisasi) * 100 : 0;
  const npmProyeksi = totalOmzet > 0 ? (labaBersihProyeksi / totalOmzet) * 100 : 0;

  return {
    omzetRealisasi,
    omzetPotential,
    totalOmzet,
    hppRealisasi,
    hppPotential,
    hppBulan: totalHppProyeksi,
    labaKotorRealisasi,
    labaKotorProyeksi,
    biayaOperasional,
    labaBersihRealisasi,
    labaBersihProyeksi,
    gpmRealisasi,
    gpmProyeksi,
    npmRealisasi,
    npmProyeksi,
    pesananPerluCek,
    rincianPesanan,
    biayaOperasionalList
  };
}

/**
 * Memvalidasi data produk sebelum disimpan.
 * Cek nama wajib diisi, HPP valid, dan tidak ada duplikasi nama.
 *
 * @param {string} nama - Nama produk yang akan divalidasi
 * @param {number} hpp - Harga Pokok Penjualan produk
 * @param {Array} produkData - Array data produk yang ada untuk cek duplikasi
 * @param {string|null] kecualiId - ID produk yang dikecualikan dari cek duplikasi (untuk mode edit)
 * @returns {string} String kosong jika valid, atau pesan error jika tidak valid
 */
export function validasiProduk(nama, hpp, produkData = [], kecualiId = null) {
  // Normalisasi nama produk untuk perbandingan (lowercase, trim)
  const namaNormal = String(nama || '').trim().toLocaleLowerCase('id-ID');

  // Validasi: nama wajib diisi
  if (!namaNormal) return 'Nama produk wajib diisi.';

  // Validasi: HPP harus angka non-negatif
  if (!Number.isFinite(hpp) || hpp < 0) return 'HPP harus berupa angka nol atau lebih.';

  // Validasi: cek duplikasi nama produk (abaikan produk dengan ID yang sama jika dalam mode edit)
  const isDuplicate = produkData.some(row =>
    String(row.id) !== String(kecualiId) &&
    String(row.nama_produk || '').trim().toLocaleLowerCase('id-ID') === namaNormal
  );
  if (isDuplicate) return 'Nama produk tersebut sudah terdaftar.';

  return '';
}