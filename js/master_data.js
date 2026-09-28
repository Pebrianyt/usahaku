// 1. Referensi elemen dan state produk.
const statusEl = document.getElementById('status');
const tabelEl = document.getElementById('tabelProduk');
const formEl = document.getElementById('formTambah');

let produkData = [];
let editingId = null;

// 2. Helper format dan validasi produk.
// Memformat rupiah.
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

// Membentuk kode produk yang ditampilkan dari ID database.
function formatKode(id) {
  return 'P' + String(id).padStart(4, '0');
}

// Memformat angka input.
function formatAngkaInput(value) {
  return window.UsahaKuCurrency.format(value);
}

// Mengurai rupiah input.
function parseRupiahInput(str) {
  return window.UsahaKuCurrency.parse(str);
}

// Mencari produk duplikat.
function namaProdukDuplikat(nama, kecualiId = null) {
  const namaNormal = nama.trim().toLocaleLowerCase('id-ID');
  return produkData.some(row => String(row.id) !== String(kecualiId) &&
    String(row.nama_produk || '').trim().toLocaleLowerCase('id-ID') === namaNormal);
}

// Menyusun pesan validasi produk.
function pesanValidasiProduk(nama, hpp, kecualiId = null) {
  if (!nama) return 'Nama produk wajib diisi.';
  if (!Number.isFinite(hpp) || hpp < 0) return 'HPP harus berupa angka nol atau lebih.';
  if (namaProdukDuplikat(nama, kecualiId)) return 'Nama produk tersebut sudah terdaftar.';
  return '';
}

// Mengubah error database menjadi pesan produk yang mudah dipahami.
function tampilkanErrorProduk(error, aksi) {
  if (error.code === '23505') {
    alert('Nama produk tersebut sudah terdaftar. Gunakan nama yang berbeda.');
    return;
  }
  alert('Gagal ' + aksi + ' produk: ' + error.message);
}

const inputHppEl = document.getElementById('inputHpp');
// Mencegah nilai HPP kurang dari nol dimasukkan.
function tolakHppNegatif(event) {
  const input = event.target.closest?.('#inputHpp, .editHpp');
  if (!input) return;
  const teks = event.type === 'paste'
    ? event.clipboardData?.getData('text') || ''
    : event.type === 'keydown'
      ? (event.key === '-' || event.key === 'Subtract' ? '-' : '')
      : event.data || '';
  if (teks.includes('-')) {
    event.preventDefault();
    alert('HPP tidak boleh bernilai negatif.');
  }
}

// Menangani event antarmuka untuk menjaga alur halaman.
document.addEventListener('beforeinput', tolakHppNegatif);
// Menangani event antarmuka untuk menjaga alur halaman.
document.addEventListener('paste', tolakHppNegatif);
// Menangani event antarmuka untuk menjaga alur halaman.
document.addEventListener('keydown', tolakHppNegatif);
// Menangani perubahan nilai saat pengguna mengetik.
inputHppEl.addEventListener('input', (e) => {
  e.target.value = formatAngkaInput(e.target.value);
});

// 3. Memuat dan merender data produk.
// Mengambil daftar produk dari Supabase lalu memperbarui status halaman.
async function muatProduk() {
  statusEl.textContent = 'Memuat data...';

  const { data, error } = await supabaseClient
    .from('produk')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    statusEl.textContent = 'Gagal memuat data: ' + error.message;
    return;
  }

  const aktif = data.filter(row => row.aktif !== false).length;
  statusEl.textContent = `${aktif} produk aktif · ${data.length - aktif} produk nonaktif`;
  produkData = data;
  editingId = null;
  renderTabel();
}

// Membuat ulang tabel produk beserta tombol aksinya.
function renderTabel() {
  tabelEl.innerHTML = '';

  produkData.forEach(row => {
    const tr = document.createElement('tr');

    if (String(row.id) === String(editingId)) {
      // Mode edit: baris berubah jadi input langsung di tabel
      tr.innerHTML =
        '<td>' + formatKode(row.id) + '</td>' +
        '<td><input type="text" class="editNama" value="' + row.nama_produk + '"></td>' +
        '<td>' +
          '<div class="inputRupiah">' +
            '<span class="prefix">Rp</span>' +
            '<input type="text" class="editHpp" data-currency-input inputmode="decimal" value="' + formatAngkaInput(String(row.hpp)) + '">' +
          '</div>' +
        '</td>' +
        '<td><span class="statusProduk ' + (row.aktif === false ? 'nonaktif' : 'aktif') + '">' + (row.aktif === false ? 'Nonaktif' : 'Aktif') + '</span></td>' +
        '<td>' +
          '<button class="btnIcon btnSimpan" title="Simpan" data-id="' + row.id + '">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
          '</button>' +
          '<button class="btnIcon btnBatal" title="Batal" data-id="' + row.id + '">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</td>';
    } else {
      // Mode tampil biasa
      tr.innerHTML =
        '<td>' + formatKode(row.id) + '</td>' +
        '<td>' + row.nama_produk + '</td>' +
        '<td>' + formatRupiah(row.hpp) + '</td>' +
        '<td><span class="statusProduk ' + (row.aktif === false ? 'nonaktif' : 'aktif') + '">' + (row.aktif === false ? 'Nonaktif' : 'Aktif') + '</span></td>' +
        '<td>' +
          '<button class="btnIcon btnEdit" title="Edit" data-id="' + row.id + '">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
          '</button>' +
          '<button type="button" class="btnStatusProduk" data-action="toggle" data-id="' + row.id + '" title="' + (row.aktif === false ? 'Aktifkan produk' : 'Nonaktifkan produk') + '">' + (row.aktif === false ? 'Aktifkan' : 'Nonaktifkan') + '</button>' +
          '<button class="btnIcon btnHapus" title="Hapus" data-id="' + row.id + '">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1B2430" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
          '</button>' +
        '</td>';
    }

    tabelEl.appendChild(tr);
  });
}

// 4. Event form, tabel, dan pencarian.
// Memvalidasi lalu menyimpan data dari form.
formEl.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nama = document.getElementById('inputNama').value;
  const inputHpp = document.getElementById('inputHpp').value;
  const hpp = parseRupiahInput(inputHpp);
  const namaBersih = nama.trim();
  const pesan = !inputHpp.trim() ? 'HPP wajib diisi.' : pesanValidasiProduk(namaBersih, hpp);
  if (pesan) {
    alert(pesan);
    return;
  }

  const { error } = await supabaseClient
    .from('produk')
    .insert([{ nama_produk: namaBersih, hpp, aktif: true }]);

  if (error) {
    tampilkanErrorProduk(error, 'menambah');
    return;
  }

  formEl.reset();
  muatProduk();
});

// Memformat input HPP langsung saat pengguna mengetik di baris edit.
tabelEl.addEventListener('input', (e) => {
  if (e.target.classList.contains('editHpp')) {
    e.target.value = formatAngkaInput(e.target.value);
  }
});

// Menangani aksi pengguna pada tombol atau baris yang dipilih.
tabelEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const id = btn.dataset.id;

  if (btn.classList.contains('btnEdit')) {
    editingId = id;
    renderTabel();
    return;
  }

  if (btn.classList.contains('btnBatal')) {
    editingId = null;
    renderTabel();
    return;
  }

  if (btn.classList.contains('btnSimpan')) {
    const tr = btn.closest('tr');
    const namaBaru = tr.querySelector('.editNama').value.trim();
    const inputHppBaru = tr.querySelector('.editHpp').value;
    const hppBaru = parseRupiahInput(inputHppBaru);
    const pesan = !inputHppBaru.trim() ? 'HPP wajib diisi.' : pesanValidasiProduk(namaBaru, hppBaru, id);
    if (pesan) {
      alert(pesan);
      return;
    }

    const { error } = await supabaseClient
      .from('produk')
      .update({ nama_produk: namaBaru, hpp: hppBaru })
      .eq('id', id);

    if (error) {
      tampilkanErrorProduk(error, 'mengubah');
      return;
    }

    muatProduk();
    return;
  }

  if (btn.classList.contains('btnStatusProduk')) {
    const produk = produkData.find(row => String(row.id) === String(id));
    if (!produk) return;
    const akanAktif = produk.aktif === false;
    const pesan = akanAktif
      ? `Aktifkan kembali ${produk.nama_produk}? Produk akan muncul di pilihan transaksi baru.`
      : `Nonaktifkan ${produk.nama_produk}? Produk tidak akan muncul di pilihan pesanan dan stok baru. Riwayat lama tetap tersimpan.`;
    if (!confirm(pesan)) return;

    const { error } = await supabaseClient
      .from('produk')
      .update({ aktif: akanAktif })
      .eq('id', id);
    if (error) {
      tampilkanErrorProduk(error, akanAktif ? 'mengaktifkan' : 'menonaktifkan');
      return;
    }
    await muatProduk();
    return;
  }

  if (btn.classList.contains('btnHapus')) {
    const konfirmasi = confirm(
      'Hapus produk ini? Produk yang sudah dipakai pada pesanan atau transaksi stok tidak dapat dihapus agar riwayat tetap tersimpan.'
    );
    if (!konfirmasi) return;

    const { error } = await supabaseClient
      .from('produk')
      .delete()
      .eq('id', id);

    if (error) {
      const terkaitRiwayat = error.code === '23503' || /foreign key constraint|violates foreign key/i.test(error.message || '');
      alert(terkaitRiwayat
        ? 'Produk ini tidak dapat dihapus karena sudah digunakan pada pesanan atau transaksi stok. Riwayat transaksi tetap aman. Untuk saat ini, biarkan produk tercatat di master data.'
        : 'Gagal menghapus produk: ' + error.message);
      return;
    }

    muatProduk();
  }
});

muatProduk();

// ==========================================
// KODE FITUR SEARCH 
// ==========================================
const searchInput = document.getElementById('searchInput');

if (searchInput) {
// Menangani perubahan nilai saat pengguna mengetik.
  searchInput.addEventListener('input', function (e) {
    const keyword = e.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach(row => {
      // Ambil teks dari kolom ke-1 (Kode) dan kolom ke-2 (Nama Produk)
      const kodeText = row.children[0] ? row.children[0].textContent.toLowerCase() : '';
      const namaText = row.children[1] ? row.children[1].textContent.toLowerCase() : '';

      // Tampilkan jika cocok, sembunyikan jika tidak
      if (kodeText.includes(keyword) || namaText.includes(keyword)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  });
}
