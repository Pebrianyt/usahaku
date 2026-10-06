// UsahaKu Business Calculations Module

export function kelompokkanPesanan(listPesanan, mapProduk = {}, hppPerPesanan = new Map()) {
  const normalisasiTeks = nilai => String(nilai || '').trim().toLocaleLowerCase('id-ID');
  const grouped = new Map();

  (listPesanan || []).forEach(row => {
    const rawKey = normalisasiTeks(row.no_pesanan);
    const key = rawKey || `__empty_${row.id}`;
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
    current.totalPenghasilan = Math.max(current.totalPenghasilan, Number(row.total_penghasilan_akhir || 0));
    if (row.status === 'Realisasi') current.status = 'Realisasi';
    if (row.tanggal_transaksi_masuk) current.tanggalRealisasi = row.tanggal_transaksi_masuk;

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

  return Array.from(grouped.values()).map(group => {
    const totalHpp = group.rows.reduce((sum, item) => sum + item.hpp, 0);
    group.displayRows = group.rows.flatMap(item => {
      const rows = item.hppAllocations.map((allocation, index) => ({
        ...item,
        displayKey: `${item.id}-${index}`,
        qty: allocation.qty,
        hpp: allocation.totalHpp,
        hppPerUnit: allocation.hppPerUnit,
        hppBelumTersedia: false
      }));
      const qtyTerhitung = rows.reduce((sum, row) => sum + row.qty, 0);
      const qtyBelumTerhitung = item.qty - qtyTerhitung;

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

export function hitungEstimasiHppFIFO(items, tanggalPesanan, daftarTransaksiStok, daftarAlokasiStok, pesananSedangDiedit = null) {
  const transaksiMap = new Map((daftarTransaksiStok || []).map(item => [String(item.id), item]));
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

  (daftarAlokasiStok || []).forEach(alokasi => {
    const keluar = transaksiMap.get(String(alokasi.transaksi_keluar_id));
    if (!keluar || keluar.tanggal > tanggalPesanan) return;
    if (pesananSedangDiedit?.ids && pesananSedangDiedit.ids.has(String(keluar.pesanan_id))) return;
    const batch = lapisan.find(item => item.id === String(alokasi.transaksi_masuk_id));
    if (batch) batch.qtySisa -= Number(alokasi.qty || 0);
  });

  return (items || []).map(item => {
    const kode = String(item.kode_produk || '');
    const qtyDiminta = Number(item.qty || 0);
    if (!kode || qtyDiminta <= 0) {
      return { kode, qty: qtyDiminta, hppSatuan: 0, rincian: [], totalHpp: 0, sisaKurang: 0, sukses: false };
    }

    let sisaDiminta = qtyDiminta;
    let biaya = 0;
    let qtyDialokasikan = 0;
    const rincian = [];

    for (const batch of lapisan) {
      if (batch.kode !== kode || batch.qtySisa <= 0 || sisaDiminta <= 0) continue;
      const diambil = Math.min(sisaDiminta, batch.qtySisa);
      batch.qtySisa -= diambil;
      sisaDiminta -= diambil;
      qtyDialokasikan += diambil;
      biaya += diambil * batch.hpp;
      const segmenTerakhir = rincian[rincian.length - 1];
      if (segmenTerakhir && segmenTerakhir.hppPerUnit === batch.hpp) {
        segmenTerakhir.qty += diambil;
        segmenTerakhir.totalHpp += diambil * batch.hpp;
      } else {
        rincian.push({ qty: diambil, hppPerUnit: batch.hpp, totalHpp: diambil * batch.hpp });
      }
    }

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

export function hitungRingkasanKas(transaksiKas, bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const hariAkhir = new Date(tahun, nomorBulan, 0).getDate();
  const awal = `${bulan}-01`;
  const akhir = `${bulan}-${String(hariAkhir).padStart(2, '0')}`;

  let saldoAwal = 0;
  let totalMasuk = 0;
  let totalKeluar = 0;

  (transaksiKas || []).forEach(row => {
    const tgl = row.tanggal;
    const nominal = Number(row.nominal || 0);
    if (tgl < awal) {
      if (row.jenis === 'Masuk' || row.jenis === 'Saldo Awal') saldoAwal += nominal;
      else if (row.jenis === 'Keluar') saldoAwal -= nominal;
    } else if (tgl <= akhir) {
      if (row.jenis === 'Saldo Awal') {
        saldoAwal += nominal;
      } else if (row.jenis === 'Masuk') {
        totalMasuk += nominal;
      } else if (row.jenis === 'Keluar') {
        totalKeluar += nominal;
      }
    }
  });

  const saldoAkhirPeriode = saldoAwal + totalMasuk - totalKeluar;

  let saldoBisnisHariIni = 0;
  (transaksiKas || []).forEach(row => {
    const nominal = Number(row.nominal || 0);
    if (row.jenis === 'Masuk' || row.jenis === 'Saldo Awal') saldoBisnisHariIni += nominal;
    else if (row.jenis === 'Keluar') saldoBisnisHariIni -= nominal;
  });

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

export function hitungLabaRugi(pesanan, transaksiStok, alokasiStok, transaksiKas, bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const hariAkhir = new Date(tahun, nomorBulan, 0).getDate();
  const awal = `${bulan}-01`;
  const akhir = `${bulan}-${String(hariAkhir).padStart(2, '0')}`;

  const pesananById = new Map((pesanan || []).map(item => [String(item.id), item]));
  const nilaiPerKeluar = new Map();
  const qtyPerKeluar = new Map();

  (alokasiStok || []).forEach(alokasi => {
    const idKeluar = String(alokasi.transaksi_keluar_id);
    nilaiPerKeluar.set(idKeluar, (nilaiPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0) * Number(alokasi.harga_satuan || 0));
    qtyPerKeluar.set(idKeluar, (qtyPerKeluar.get(idKeluar) || 0) + Number(alokasi.qty || 0));
  });

  const nilaiPerPesanan = new Map();
  const lengkapPerPesanan = new Map();
  const keluarPerPesanan = new Map();
  let hppBulan = 0;

  (transaksiStok || []).filter(item => item.jenis === 'Keluar' && item.sumber === 'Pesanan').forEach(keluar => {
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

  (pesanan || []).filter(item => item.tanggal_pesanan >= awal && item.tanggal_pesanan <= akhir).forEach(item => {
    const id = String(item.id);
    if (!keluarPerPesanan.has(id)) lengkapPerPesanan.set(id, false);
  });

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
      baris.total = Math.max(baris.total, total);
      baris.hpp += hpp;
      baris.hppLengkap = baris.hppLengkap && hppLengkap;
      baris.realisasi = baris.realisasi || item.status === 'Realisasi';
    }
  });

  const rincianPesanan = Array.from(kelompok.values()).sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal) || a.noPesanan.localeCompare(b.noPesanan)
  );

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
    if (!item.hppLengkap) pesananPerluCek += 1;
    item.status = item.realisasi ? 'Realisasi' : 'Potential';
  });

  const totalOmzet = omzetRealisasi + omzetPotential;
  const totalHppProyeksi = hppRealisasi + hppPotential;

  const biayaOperasionalList = (transaksiKas || []).filter(item =>
    item.jenis === 'Keluar' &&
    item.tanggal >= awal && item.tanggal <= akhir &&
    (item.kategori === 'Biaya Operasional' || (!item.kategori &&
      String(item.keterangan || '').toLocaleLowerCase('id-ID').includes('biaya operasional')))
  ).sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  const biayaOperasional = biayaOperasionalList.reduce((sum, item) => sum + Number(item.nominal || 0), 0);

  const labaKotorRealisasi = omzetRealisasi - hppRealisasi;
  const labaKotorProyeksi = totalOmzet - totalHppProyeksi;

  const labaBersihRealisasi = labaKotorRealisasi - biayaOperasional;
  const labaBersihProyeksi = labaKotorProyeksi - biayaOperasional;

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

export function validasiProduk(nama, hpp, produkData = [], kecualiId = null) {
  const namaNormal = String(nama || '').trim().toLocaleLowerCase('id-ID');
  if (!namaNormal) return 'Nama produk wajib diisi.';
  if (!Number.isFinite(hpp) || hpp < 0) return 'HPP harus berupa angka nol atau lebih.';
  const isDuplicate = produkData.some(row =>
    String(row.id) !== String(kecualiId) &&
    String(row.nama_produk || '').trim().toLocaleLowerCase('id-ID') === namaNormal
  );
  if (isDuplicate) return 'Nama produk tersebut sudah terdaftar.';
  return '';
}
