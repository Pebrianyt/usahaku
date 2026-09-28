// ============================================================================
// FILE: usahaku/js/daftar_pesanan.js
// ============================================================================

// 1. State halaman dan data pesanan.
let listPesanan = [];
let mapProduk = {};
let daftarProduk = [];
let nomorBarisProduk = 0;
let daftarTransaksiStok = [];
let daftarAlokasiStok = [];
let pesananSedangDiedit = null;

// Menormalkan teks agar pencarian nomor pesanan konsisten.
const normalisasiTeks = nilai => String(nilai || '').trim().toLocaleLowerCase('id-ID');

// 2. Helper harga, stok FIFO, dan form produk.
// Memformat rupiah.
function formatRupiah(angka) {
  if (angka === null || angka === undefined || angka === '' || isNaN(angka)) return '';
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

// Mengubah nilai teks menjadi angka.
function parseNumber(val) {
  if (typeof val === 'number') return val;
  return Number(val) || 0;
}

// Menghitung ulang nilai baris saat produk atau kuantitas berubah.
function updateHargaJualOtomatis(baris) {
  hitungEstimasiHppFIFO();
}

// Menghitung estimasi HPP pesanan berdasarkan alokasi FIFO.
function hitungEstimasiHppFIFO() {
  const tanggalPesanan = document.getElementById('inputTanggal').value || new Date().toISOString().slice(0, 10);
  const transaksiMap = new Map(daftarTransaksiStok.map(item => [String(item.id), item]));
  const lapisan = daftarTransaksiStok
    .filter(item => item.jenis === 'Masuk' && item.tanggal <= tanggalPesanan)
    .map(item => ({
      id: String(item.id), tanggal: item.tanggal, qtySisa: Number(item.qty || 0),
      hpp: Number(item.harga_satuan || 0), kode: String(item.kode_produk)
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || Number(a.id) - Number(b.id));

  daftarAlokasiStok.forEach(alokasi => {
    const keluar = transaksiMap.get(String(alokasi.transaksi_keluar_id));
    if (!keluar || keluar.tanggal > tanggalPesanan) return;
    if (pesananSedangDiedit?.ids.has(String(keluar.pesanan_id))) return;
    const batch = lapisan.find(item => item.id === String(alokasi.transaksi_masuk_id));
    if (batch) batch.qtySisa -= Number(alokasi.qty || 0);
  });

  const barisProduk = Array.from(document.querySelectorAll('.produkPesananRow'));
  barisProduk.forEach(baris => {
    const kode = String(baris.querySelector('.selectProduk').value || '');
    const qtyDiminta = parseNumber(baris.querySelector('.inputQty').value);
    const inputHpp = baris.querySelector('.hppInfo');
    const inputTotalHpp = baris.querySelector('.inputHargaJual');
    if (!kode || qtyDiminta <= 0) {
      inputHpp.value = '';
      inputTotalHpp.value = '';
      return;
    }

    let sisaDiminta = qtyDiminta;
    let biaya = 0;
    let qtyDialokasikan = 0;
    for (const batch of lapisan) {
      if (batch.kode !== kode || batch.qtySisa <= 0 || sisaDiminta <= 0) continue;
      const diambil = Math.min(sisaDiminta, batch.qtySisa);
      batch.qtySisa -= diambil;
      sisaDiminta -= diambil;
      qtyDialokasikan += diambil;
      biaya += diambil * batch.hpp;
    }

    inputHpp.value = qtyDialokasikan ? formatRupiah(biaya / qtyDialokasikan) : '';
    inputTotalHpp.value = sisaDiminta > 0
      ? 'Stok kurang ' + sisaDiminta + ' pcs'
      : formatRupiah(biaya);
  });
}

// Merender dropdown produk.
function renderDropdownProduk(dataProduk) {
  daftarProduk = dataProduk || [];
  document.getElementById('produkPesananList').innerHTML = '';
  tambahBarisProduk();
}

// Menambahkan satu baris produk dengan pilihan, kuantitas, dan aksi hapus.
function tambahBarisProduk(kodeAwal = null, qtyAwal = 1) {
  const container = document.getElementById('produkPesananList');
  const baris = document.createElement('div');
  baris.className = 'produkPesananRow';
  const suffixId = ++nomorBarisProduk;

  const selectProduk = document.createElement('select');
  selectProduk.className = 'selectProduk';
  selectProduk.id = 'selectProdukPesanan' + suffixId;
  selectProduk.required = true;
  const optionAwal = document.createElement('option');
  optionAwal.value = '';
  optionAwal.textContent = '-- Pilih Produk --';
  selectProduk.appendChild(optionAwal);

  daftarProduk.filter(produk => produk.aktif !== false || String(produk.id) === String(kodeAwal)).forEach(produk => {
    const option = document.createElement('option');
    option.value = produk.id;
    option.textContent = (produk.nama_produk || 'Produk ' + produk.id) + (produk.aktif === false ? ' (nonaktif)' : '');
    option.dataset.hpp = produk.hpp || 0;
    selectProduk.appendChild(option);
  });

  const fieldProduk = document.createElement('div');
  fieldProduk.className = 'fieldGroup';
  const labelProduk = document.createElement('label');
  labelProduk.htmlFor = selectProduk.id;
  labelProduk.textContent = 'Produk';
  fieldProduk.appendChild(labelProduk);
  fieldProduk.appendChild(selectProduk);

  const inputHpp = document.createElement('input');
  inputHpp.type = 'text';
  inputHpp.className = 'hppInfo hppBox';
  inputHpp.id = 'hppPesanan' + suffixId;
  inputHpp.placeholder = 'Menunggu stok';
  inputHpp.readOnly = true;
  inputHpp.tabIndex = -1;
  const fieldHpp = document.createElement('div');
  fieldHpp.className = 'fieldGroup';
  const labelHpp = document.createElement('label');
  labelHpp.htmlFor = inputHpp.id;
  labelHpp.textContent = 'HPP FIFO estimasi / unit';
  fieldHpp.append(labelHpp, inputHpp);

  const inputQty = document.createElement('input');
  inputQty.type = 'number';
  inputQty.className = 'inputQty';
  inputQty.id = 'qtyPesanan' + suffixId;
  inputQty.placeholder = 'Qty';
  inputQty.required = true;
  inputQty.min = '1';
  inputQty.value = '1';
  const fieldQty = document.createElement('div');
  fieldQty.className = 'fieldGroup';
  const labelQty = document.createElement('label');
  labelQty.htmlFor = inputQty.id;
  labelQty.textContent = 'Jumlah produk (qty)';
  fieldQty.append(labelQty, inputQty);

  const inputHargaJual = document.createElement('input');
  inputHargaJual.type = 'text';
  inputHargaJual.className = 'inputHargaJual hppBox';
  inputHargaJual.id = 'totalHppPesanan' + suffixId;
  inputHargaJual.placeholder = 'Pilih produk';
  inputHargaJual.readOnly = true;
  inputHargaJual.tabIndex = -1;
  const fieldTotalHpp = document.createElement('div');
  fieldTotalHpp.className = 'fieldGroup';
  const labelTotalHpp = document.createElement('label');
  labelTotalHpp.htmlFor = inputHargaJual.id;
  labelTotalHpp.textContent = 'Estimasi total HPP produk';
  fieldTotalHpp.append(labelTotalHpp, inputHargaJual);

  const btnHapus = document.createElement('button');
  btnHapus.type = 'button';
  btnHapus.className = 'btnHapusProduk';
  btnHapus.textContent = 'Hapus';
  btnHapus.title = 'Hapus produk dari pesanan';
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
  btnHapus.addEventListener('click', () => {
    baris.remove();
    perbaruiTombolHapusProduk();
  });

// Menyesuaikan data atau tampilan saat pilihan berubah.
  selectProduk.addEventListener('change', () => {
    const option = selectProduk.options[selectProduk.selectedIndex];
    inputHpp.value = option.value ? formatRupiah(Number(option.dataset.hpp || 0)) : '';
    updateHargaJualOtomatis(baris);
  });
// Menangani perubahan nilai saat pengguna mengetik.
  inputQty.addEventListener('input', () => updateHargaJualOtomatis(baris));

  btnHapus.setAttribute('aria-label', 'Hapus produk dari pesanan');
  baris.append(fieldProduk, fieldHpp, fieldQty, fieldTotalHpp, btnHapus);
  container.appendChild(baris);
  if (kodeAwal !== null) {
    selectProduk.value = String(kodeAwal);
    inputQty.value = String(qtyAwal);
  }
  perbaruiTombolHapusProduk();
}

// Memperbarui tombol hapus produk.
function perbaruiTombolHapusProduk() {
  const barisProduk = document.querySelectorAll('.produkPesananRow');
  barisProduk.forEach(baris => {
    baris.querySelector('.btnHapusProduk').disabled = barisProduk.length === 1;
  });
  hitungEstimasiHppFIFO();
}

// Menyelaraskan checkbox, jumlah pilihan, dan tombol aksi massal.
function updateBulkBar() {
  const checked = document.querySelectorAll('.rowCheck:checked');
  const countEl = document.getElementById('bulkCount');
  const btnEl = document.getElementById('btnRealisasiTerpilih');
  const kelompokDipilih = new Set(Array.from(checked, cb => cb.dataset.orderGroup));

  countEl.textContent = kelompokDipilih.size + ' pesanan dipilih';
  btnEl.disabled = checked.length === 0;
  const semuaCheckbox = document.querySelectorAll('.rowCheck');
  const checkAll = document.getElementById('checkAll');
  checkAll.checked = semuaCheckbox.length > 0 && Array.from(semuaCheckbox).every(cb => cb.checked);
}

// 3. Pengelompokan data dan render tabel.
// Mengelompokkan pesanan berdasarkan kunci yang relevan.
function kelompokkanPesanan(dataPesanan) {
  const groups = new Map();
  dataPesanan.forEach(item => {
    const noPesanan = String(item.no_pesanan || '-').trim();
    const key = normalisasiTeks(noPesanan);
    if (!groups.has(key)) {
      groups.set(key, {
        key, noPesanan, tanggal: item.tanggal_pesanan || '',
        totalPenghasilan: Number(item.total_penghasilan_akhir || 0),
        status: item.status || 'Pending',
        tanggalRealisasi: item.tanggal_transaksi_masuk || '',
        rows: [], totalQty: 0, totalHpp: 0
      });
    }
    const group = groups.get(key);
    group.rows.push(item);
    group.totalPenghasilan = Math.max(group.totalPenghasilan, Number(item.total_penghasilan_akhir || 0));
    group.totalQty += Number(item.qty || 0);
    group.totalHpp += Number(item.harga_jual || 0);
    if (item.status === 'Realisasi') group.status = 'Realisasi';
    if (item.tanggal_transaksi_masuk && item.tanggal_transaksi_masuk > group.tanggalRealisasi) {
      group.tanggalRealisasi = item.tanggal_transaksi_masuk;
    }
  });
  return Array.from(groups.values()).map(group => {
    group.profit = group.totalPenghasilan - group.totalHpp;
    group.margin = group.totalHpp > 0 ? group.profit / group.totalHpp * 100 : 0;
    return group;
  }).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.noPesanan.localeCompare(b.noPesanan));
}

// Membuat elemen sel tabel dan mengisi teksnya.
function tambahCell(row, teks, className = '') {
  const td = document.createElement('td');
  td.textContent = teks;
  if (className) td.className = className;
  row.appendChild(td);
  return td;
}

// Membuat sel tabel yang menggabungkan beberapa baris.
function tambahCellGabung(row, teks, jumlahBaris, className = '') {
  const cell = tambahCell(row, teks, className);
  if (jumlahBaris > 1) cell.rowSpan = jumlahBaris;
  cell.classList.add('pesananOrderCell');
  return cell;
}

// Membuat tombol aksi pesanan.
function tombolAksiPesanan(className, title, svg) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btnIcon ${className}`;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = svg;
  return button;
}

// Merender tabel pesanan.
function renderTabelPesanan(dataPesanan) {
  const tbody = document.getElementById('tabelPesanan');
  if (!tbody) return;
  tbody.replaceChildren();

  const cari = normalisasiTeks(document.getElementById('cariPesanan').value);
  const bulan = document.getElementById('filterBulanPesanan').value;
  const status = document.getElementById('filterStatusPesanan').value;
  const groups = kelompokkanPesanan(dataPesanan).filter(group => {
    if (bulan && group.tanggal.slice(0, 7) !== bulan) return false;
    if (status && group.status !== status) return false;
    return !cari || normalisasiTeks(group.noPesanan).includes(cari);
  });

  if (!groups.length) {
    const row = document.createElement('tr');
    const cell = tambahCell(row, dataPesanan.length ? 'Tidak ada pesanan yang cocok dengan pencarian atau filter.' : 'Belum ada data pesanan.');
    cell.colSpan = 12;
    cell.style.textAlign = 'center';
    tbody.appendChild(row);
    updateBulkBar();
    return;
  }

  groups.forEach(group => {
    group.rows.forEach((item, index) => {
      const row = document.createElement('tr');
      row.className = `pesananDetailRow${index === 0 ? ' pesananGroupStart' : ''}`;

      if (index === 0) {
        const checkboxCell = document.createElement('td');
        checkboxCell.className = 'pesananOrderCell pesananCheckboxCell';
        if (group.rows.length > 1) checkboxCell.rowSpan = group.rows.length;
        if (group.status !== 'Realisasi') {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'rowCheck';
          checkbox.dataset.orderGroup = group.key;
          checkbox.dataset.orderIds = JSON.stringify(group.rows.map(orderRow => orderRow.id));
          checkbox.setAttribute('aria-label', `Pilih pesanan ${group.noPesanan} untuk realisasi`);
// Menyesuaikan data atau tampilan saat pilihan berubah.
          checkbox.addEventListener('change', updateBulkBar);
          checkboxCell.appendChild(checkbox);
        }
        row.appendChild(checkboxCell);
        tambahCellGabung(row, group.noPesanan, group.rows.length);
        tambahCellGabung(row, group.tanggal || '-', group.rows.length);
      }

      tambahCell(row, mapProduk[item.kode_produk]?.nama || `Produk ${item.kode_produk}`);
      tambahCell(row, String(item.qty || 0));
      tambahCell(row, formatRupiah(item.harga_jual || 0));

      if (index === 0) {
        tambahCellGabung(row, formatRupiah(group.totalPenghasilan), group.rows.length);
        tambahCellGabung(row, formatRupiah(group.totalHpp), group.rows.length);
        tambahCellGabung(row, formatRupiah(group.profit), group.rows.length);
        tambahCellGabung(row, `${group.margin.toFixed(1)}%`, group.rows.length);
        const statusCell = tambahCellGabung(row, '', group.rows.length);
        statusCell.style.textAlign = 'center';
        const badge = document.createElement('span');
        badge.className = `badge ${group.status === 'Realisasi' ? 'bg-success' : 'bg-warning'}`;
        badge.textContent = group.status;
        if (group.status === 'Realisasi' && group.tanggalRealisasi) badge.title = `Realisasi pada ${group.tanggalRealisasi}`;
        statusCell.appendChild(badge);
        const actions = tambahCellGabung(row, '', group.rows.length);
        const editButton = tombolAksiPesanan('btnEditPesanan', 'Edit pesanan', '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>');
        editButton.dataset.orderNo = group.noPesanan;
        const deleteButton = tombolAksiPesanan('btnHapusGrupPesanan btnHapus', 'Hapus satu pesanan beserta semua produknya', '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>');
        deleteButton.dataset.orderNo = group.noPesanan;
        actions.append(editButton, deleteButton);
      }
      tbody.appendChild(row);
    });
  });
  updateBulkBar();
}

// 4. Akses database dan operasi pesanan.
// Mengambil semua baris dari Supabase secara bertahap.
async function ambilSemuaBaris(tabel, kolom, kolomUrut = 'id') {
  const semua = [];
  const ukuranHalaman = 1000;
  for (let awal = 0; ; awal += ukuranHalaman) {
    const { data, error } = await supabaseClient.from(tabel).select(kolom)
      .order(kolomUrut, { ascending: true })
      .range(awal, awal + ukuranHalaman - 1);
    if (error) return { data: null, error };
    semua.push(...(data || []));
    if (!data || data.length < ukuranHalaman) break;
  }
  return { data: semua, error: null };
}

// Mengambil pesanan, produk, stok, dan alokasi untuk halaman ini.
async function loadDataPesanan() {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Memuat data pesanan...';
  const hasil = await Promise.all([
    ambilSemuaBaris('produk', 'id, nama_produk, hpp, aktif'),
    ambilSemuaBaris('pesanan', '*', 'id'),
    ambilSemuaBaris('transaksi_stok', 'id, tanggal, kode_produk, jenis, qty, harga_satuan, sumber, pesanan_id'),
    ambilSemuaBaris('alokasi_stok_fifo', 'id, transaksi_keluar_id, transaksi_masuk_id, qty, harga_satuan')
  ]);
  const gagal = hasil.find(item => item.error);
  if (gagal) {
    statusEl.textContent = 'Gagal memuat data: ' + gagal.error.message;
    return;
  }

  daftarProduk = hasil[0].data || [];
  listPesanan = hasil[1].data || [];
  daftarTransaksiStok = hasil[2].data || [];
  daftarAlokasiStok = hasil[3].data || [];
  mapProduk = {};
  daftarProduk.forEach(item => {
    mapProduk[item.id] = { nama: item.nama_produk || 'Produk ' + item.id, hpp: Number(item.hpp || 0) };
  });
  renderDropdownProduk(daftarProduk);
  renderTabelPesanan(listPesanan);

  const transaksiKeluar = daftarTransaksiStok.filter(item => item.jenis === 'Keluar');
  const qtyAlokasiKeluar = new Map();
  daftarAlokasiStok.forEach(item => qtyAlokasiKeluar.set(
    String(item.transaksi_keluar_id), (qtyAlokasiKeluar.get(String(item.transaksi_keluar_id)) || 0) + Number(item.qty || 0)
  ));
  const fifoBelumLengkap = transaksiKeluar.some(item =>
    (qtyAlokasiKeluar.get(String(item.id)) || 0) !== Number(item.qty || 0)
  );
  const jumlahPesanan = kelompokkanPesanan(listPesanan).length;
  statusEl.textContent = `Data berhasil dimuat: ${jumlahPesanan} pesanan.` +
    (fifoBelumLengkap ? ' Ada transaksi stok lama yang modal barangnya belum tercatat lengkap. Periksa saldo awal stok.' : '');
}

// Satu pengiriman form membuat satu baris pesanan per produk melalui RPC FIFO.
async function tambahPesanan(e) {
  if (e) e.preventDefault();

  const inputNoPesanan = document.getElementById('inputNoPesanan');
  const inputTanggal = document.getElementById('inputTanggal');
  const inputTotalAkhir = document.getElementById('inputTotalAkhir');
  const barisProduk = Array.from(document.querySelectorAll('.produkPesananRow'));

  if (!inputNoPesanan.value.trim()) {
    alert('No Pesanan wajib diisi.');
    return;
  }
  if (!pesananSedangDiedit && listPesanan.some(item =>
    normalisasiTeks(item.no_pesanan) === normalisasiTeks(inputNoPesanan.value)
  )) {
    alert('Nomor pesanan tersebut sudah ada. Tambahkan seluruh produk untuk nomor itu dalam satu pengisian atau edit pesanan yang sudah ada.');
    return;
  }

  const totalAkhirVal = window.UsahaKuCurrency.parse(inputTotalAkhir.value);
  const items = barisProduk.map(baris => ({
    kode_produk: Number(baris.querySelector('.selectProduk').value),
    qty: parseNumber(baris.querySelector('.inputQty').value)
  }));
  if (items.some(item => !item.kode_produk || !Number.isInteger(item.qty) || item.qty <= 0)) {
    alert('Pilih produk dan isi qty bilangan bulat lebih dari nol untuk setiap baris.');
    return;
  }
  const tanggalPesanan = inputTanggal.value || new Date().toISOString().slice(0, 10);
  const tombolSubmit = document.querySelector('#formPesanan button[type="submit"]');
  tombolSubmit.disabled = true;
  const rpcName = pesananSedangDiedit ? 'edit_pesanan_fifo' : 'simpan_pesanan_fifo';
  const rpcArgs = pesananSedangDiedit
    ? {
        p_no_pesanan_lama: pesananSedangDiedit.no,
        p_no_pesanan_baru: inputNoPesanan.value.trim(),
        p_tanggal: tanggalPesanan,
        p_total_penghasilan_akhir: totalAkhirVal,
        p_items: items
      }
    : {
        p_no_pesanan: inputNoPesanan.value.trim(),
        p_tanggal: tanggalPesanan,
        p_total_penghasilan_akhir: totalAkhirVal,
        p_items: items
      };
  const { error } = await supabaseClient.rpc(rpcName, rpcArgs);
  tombolSubmit.disabled = false;
  if (error) {
    alert(error.code === '23505'
      ? 'Nomor pesanan tersebut sudah digunakan. Gunakan nomor lain.'
      : 'Gagal menyimpan pesanan FIFO: ' + error.message);
    return;
  }

  pesananSedangDiedit = null;
  document.getElementById('btnBatalEditPesanan').hidden = true;
  tombolSubmit.title = 'Simpan pesanan';
  tombolSubmit.setAttribute('aria-label', 'Simpan pesanan');
  document.getElementById('formPesanan').reset();
  await loadDataPesanan();
}

// Menyimpan perubahan status untuk semua pesanan yang dipilih.
async function tandaiRealisasiTerpilih() {
  const checkedBoxes = document.querySelectorAll('.rowCheck:checked');
  if (checkedBoxes.length === 0) return;

  const hariIni = new Date().toISOString().split('T')[0];
  const idList = Array.from(checkedBoxes).flatMap(cb => JSON.parse(cb.dataset.orderIds || '[]').map(String));

  const { error } = await supabaseClient
    .from('pesanan')
    .update({ status: 'Realisasi', tanggal_transaksi_masuk: hariIni })
    .in('id', idList);

  if (error) {
    alert('Gagal mengubah status: ' + error.message);
    console.error(error);
    return;
  }

  await loadDataPesanan();
}

// Mengisi form dengan seluruh detail pada grup pesanan yang dipilih.
async function mulaiEditPesanan(noPesanan) {
  const group = kelompokkanPesanan(listPesanan).find(item => item.key === normalisasiTeks(noPesanan));
  if (!group) return;
  pesananSedangDiedit = { no: group.noPesanan, ids: new Set(group.rows.map(row => String(row.id))) };
  document.getElementById('inputNoPesanan').value = group.noPesanan;
  document.getElementById('inputTanggal').value = group.tanggal;
  document.getElementById('inputTotalAkhir').value = window.UsahaKuCurrency.format(group.totalPenghasilan);
  document.getElementById('produkPesananList').replaceChildren();
  group.rows.forEach(item => tambahBarisProduk(item.kode_produk, item.qty));
  document.getElementById('btnBatalEditPesanan').hidden = false;
  const tombolSimpan = document.querySelector('#formPesanan button[type="submit"]');
  tombolSimpan.title = 'Simpan perubahan pesanan';
  tombolSimpan.setAttribute('aria-label', 'Simpan perubahan pesanan');
  document.getElementById('formPesanan').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Menghapus state edit dan memulihkan form pesanan.
function batalEditPesanan() {
  pesananSedangDiedit = null;
  document.getElementById('formPesanan').reset();
  document.getElementById('produkPesananList').replaceChildren();
  document.getElementById('btnBatalEditPesanan').hidden = true;
  const tombolSimpan = document.querySelector('#formPesanan button[type="submit"]');
  tombolSimpan.title = 'Simpan pesanan';
  tombolSimpan.setAttribute('aria-label', 'Simpan pesanan');
  tambahBarisProduk();
}

// Menghapus seluruh baris detail dengan nomor pesanan yang sama.
async function hapusGrupPesanan(noPesanan) {
  if (!confirm(`Hapus pesanan ${noPesanan} beserta seluruh produk di dalamnya? Stok FIFO akan dihitung ulang.`)) return;

  const { error } = await supabaseClient.rpc('hapus_grup_pesanan_fifo', { p_no_pesanan: noPesanan });

  if (error) {
    alert('Gagal menghapus pesanan: ' + error.message);
    return;
  }

  await loadDataPesanan();
}

// 5. Event UI dan inisialisasi halaman.
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
document.getElementById('tabelPesanan').addEventListener('click', event => {
  const tombolEdit = event.target.closest('.btnEditPesanan');
  const tombolHapus = event.target.closest('.btnHapusGrupPesanan');
  if (tombolEdit) mulaiEditPesanan(tombolEdit.dataset.orderNo);
  if (tombolHapus) hapusGrupPesanan(tombolHapus.dataset.orderNo);
});

// Memasang listener dan memuat data setelah dokumen siap.
document.addEventListener('DOMContentLoaded', function () {
// Memvalidasi lalu menyimpan data dari form.
  document.getElementById('formPesanan').addEventListener('submit', tambahPesanan);
// Menyesuaikan data atau tampilan saat pilihan berubah.
  document.getElementById('inputTanggal').addEventListener('change', hitungEstimasiHppFIFO);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
  document.getElementById('btnTambahProduk').addEventListener('click', tambahBarisProduk);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
  document.getElementById('btnBatalEditPesanan').addEventListener('click', batalEditPesanan);
// Menangani aksi pengguna pada tombol atau baris yang dipilih.
  document.getElementById('btnRealisasiTerpilih').addEventListener('click', tandaiRealisasiTerpilih);
// Menangani perubahan nilai saat pengguna mengetik.
  document.getElementById('cariPesanan').addEventListener('input', () => renderTabelPesanan(listPesanan));
// Menyesuaikan data atau tampilan saat pilihan berubah.
  document.getElementById('filterBulanPesanan').addEventListener('change', () => renderTabelPesanan(listPesanan));
// Menyesuaikan data atau tampilan saat pilihan berubah.
  document.getElementById('filterStatusPesanan').addEventListener('change', () => renderTabelPesanan(listPesanan));

// Menyesuaikan data atau tampilan saat pilihan berubah.
  document.getElementById('checkAll').addEventListener('change', function () {
    document.querySelectorAll('.rowCheck').forEach(cb => { cb.checked = this.checked; });
    updateBulkBar();
  });

  loadDataPesanan();
});
