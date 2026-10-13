// Currency and formatting utilities for UsahaKu

/**
 * Memecah nominal angka menjadi bagian integer dan desimal.
 * Mendukung berbagai format separator (titik dan koma) dengan aturan:
 * - Jika ada kedua separator, yang terakhir dengan max 2 digit di belakang dianggap desimal
 * - Jika hanya satu separator, dicek apakah itu desimal (max 2 digit di belakang)
 *
 * @param {string|number} value - Nilai yang akan dipecah
 * @returns {Object} Objek berisi { integer, fraction, decimal, trailingDecimal }
 * @property {string} integer - Bagian bilangan bulat
 * @property {string} fraction - Bagian desimal (maks 2 digit)
 * @property {boolean} decimal - Apakah ada bagian desimal
 * @property {boolean} trailingDecimal - Apakah diakhiri dengan separator desimal
 *
 * @example
 * pecahNominal('1.500.000,50')
 * // Returns: { integer: '1500000', fraction: '50', decimal: true, trailingDecimal: false }
 *
 * @example
 * pecahNominal('100.000')
 * // Returns: { integer: '100000', fraction: '', decimal: false, trailingDecimal: false }
 */
export function pecahNominal(value) {
  // Mengubah input menjadi string dan menghapus semua karakter kecuali angka, koma, dan titik
  const teks = String(value ?? '').trim().replace(/[^0-9.,]/g, '');
  if (!teks) return { integer: '', fraction: '', decimal: false };

  // Mencari posisi terakhir koma dan titik dalam teks
  const komaTerakhir = teks.lastIndexOf(',');
  const titikTerakhir = teks.lastIndexOf('.');
  const adaKoma = komaTerakhir >= 0;
  const adaTitik = titikTerakhir >= 0;
  let pemisahDesimal = '';
  let posisiDesimal = -1;

  // Jika ada kedua separator (koma dan titik), tentukan mana yang menjadi desimal
  // Desimal adalah separator terakhir dengan maksimal 2 digit di belakangnya
  if (adaKoma && adaTitik) {
    const kandidat = komaTerakhir > titikTerakhir ? ',' : '.';
    const posisiKandidat = Math.max(komaTerakhir, titikTerakhir);
    const jumlahBelakang = teks.length - posisiKandidat - 1;
    if (jumlahBelakang <= 2) {
      pemisahDesimal = kandidat;
      posisiDesimal = posisiKandidat;
    }
  } else if (adaKoma || adaTitik) {
    // Jika hanya ada satu separator, cek apakah itu desimal
    const kandidat = adaKoma ? ',' : '.';
    // Mengumpulkan semua posisi kemunculan separator
    const semuaPosisi = [...teks].flatMap((karakter, index) => karakter === kandidat ? [index] : []);
    const posisiKandidat = semuaPosisi[semuaPosisi.length - 1];
    const jumlahBelakang = teks.length - posisiKandidat - 1;
    if (jumlahBelakang <= 2) {
      pemisahDesimal = kandidat;
      posisiDesimal = posisiKandidat;
    }
  }

  // Memisahkan bagian utama (integer) dan bagian desimal (fraction)
  const bagianUtama = posisiDesimal >= 0 ? teks.slice(0, posisiDesimal) : teks;
  // Ambil fraction, hapus semua non-digit, batasi max 2 digit
  const fraction = posisiDesimal >= 0 ? teks.slice(posisiDesimal + 1).replace(/\D/g, '').slice(0, 2) : '';
  // Hapus semua non-digit dari integer, hilangkan leading zeros
  let integer = bagianUtama.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (pemisahDesimal && !integer) integer = '0';
  return { integer, fraction, decimal: posisiDesimal >= 0, trailingDecimal: posisiDesimal >= 0 && teks.endsWith(pemisahDesimal) };
}

/**
 * Mengonversi string nominal menjadi angka (number).
 * Menggunakan pecahNominal untuk parsing, lalu menggabungkan kembali menjadi angka.
 *
 * @param {string|number} value - Nilai yang akan dikonversi
 * @returns {number} Angka hasil konversi, atau 0 jika tidak valid
 *
 * @example
 * parseNominal('1.500.000')
 * // Returns: 1500000
 *
 * @example
 * parseNominal('Rp 1.500.000,50')
 * // Returns: 1500000.5
 */
export function parseNominal(value) {
  if (typeof value === 'number') return value;
  const bagian = pecahNominal(value);
  if (!bagian.integer && !bagian.fraction) return 0;
  const angka = `${bagian.integer || '0'}${bagian.decimal ? '.' + bagian.fraction : ''}`;
  return Number(angka) || 0;
}

/**
 * Memformat angka dengan separator titik untuk bagian ribuan.
 *
 * @param {string|number} value - Nilai yang akan diformat
 * @returns {string} Angka dengan separator titik, atau string kosong jika tidak valid
 *
 * @example
 * formatNominal(1500000)
 * // Returns: '1.500.000'
 *
 * @example
 * formatNominal('1500000,50')
 * // Returns: '1.500.000,50'
 */
export function formatNominal(value) {
  const bagian = pecahNominal(value);
  if (!bagian.integer && !bagian.decimal) return '';
  // \B mencegah match di awal string, (\d{3})+(?!\d) match kelipatan 3 digit
  const integer = (bagian.integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!bagian.decimal) return integer;
  return integer + (bagian.fraction ? ',' + bagian.fraction : '');
}

/**
 * Memformat angka menjadi format Rupiah dengan prefix "Rp".
 *
 * @param {number|string} angka - Nilai yang akan diformat
 * @param {Object} [options] - Opsi formatting
 * @param {string} [options.placeholder] - Placeholder jika nilai tidak valid (default: '-')
 * @param {number} [options.maxFraction] - Maksimal digit desimal (default: 0)
 * @returns {string} Format Rupiah, atau placeholder jika tidak valid
 *
 * @example
 * formatRupiah(1500000)
 * // Returns: 'Rp 1.500.000'
 *
 * @example
 * formatRupiah(1500000.5, { maxFraction: 2 })
 * // Returns: 'Rp 1.500.000,5'
 */
export function formatRupiah(angka, options = {}) {
  if (angka === null || angka === undefined || angka === '' || isNaN(angka)) {
    return options.placeholder ?? '-';
  }
  const maxFraction = options.maxFraction ?? 0;
  return 'Rp ' + Number(angka).toLocaleString('id-ID', { maximumFractionDigits: maxFraction });
}

/**
 * Memformat angka menjadi format ringkas (M untuk juta, jt untuk puluh ribuan, rb untuk ribuan).
 *
 * @param {number} nilai - Nilai yang akan diformat
 * @returns {string} Format ringkas
 *
 * @example
 * formatPendek(1500000)
 * // Returns: '1,5 jt'
 *
 * @example
 * formatPendek(1500000000)
 * // Returns: '1,5 M'
 *
 * @example
 * formatPendek(500000)
 * // Returns: '500 rb'
 */
export function formatPendek(nilai) {
  const abs = Math.abs(nilai);
  // >= 1 milyar -> format M (Million)
  if (abs >= 1_000_000_000) return `${(nilai / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  // >= 1 juta -> format jt (juta)
  if (abs >= 1_000_000) return `${(nilai / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  // >= 1 ribu -> format rb (ribu)
  if (abs >= 1_000) return `${(nilai / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  // Dibawah 1000, tampilkan angka bulat
  return String(Math.round(nilai));
}

/**
 * Memformat ID menjadi kode produk dengan prefix "P" dan padding nol di depan.
 *
 * @param {number|string} id - ID yang akan diformat
 * @returns {string} Kode produk berformat, contoh: 'P0001'
 *
 * @example
 * formatKode(1)
 * // Returns: 'P0001'
 *
 * @example
 * formatKode(123)
 * // Returns: 'P0123'
 */
export function formatKode(id) {
  return 'P' + String(id).padStart(4, '0');
}

/**
 * Mendapatkan tanggal hari ini dalam format lokal (YYYY-MM-DD).
 *
 * @param {Date} [date] - Tanggal yang akan diformat (default: tanggal sekarang)
 * @returns {string} Tanggal dalam format YYYY-MM-DD
 *
 * @example
 * tanggalLokal()
 * // Returns: '2024-01-15' (tergantung tanggal sekarang)
 *
 * @example
 * tanggalLokal(new Date('2024-06-20'))
 * // Returns: '2024-06-20'
 */
export function tanggalLokal(date = new Date()) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, '0');
  const hari = String(date.getDate()).padStart(2, '0');
  return `${tahun}-${bulan}-${hari}`;
}

/**
 * Mendapatkan bulan dan tahun sekarang dalam format YYYY-MM.
 *
 * @returns {string} Bulan dan tahun dalam format YYYY-MM
 *
 * @example
 * bulanSekarang()
 * // Returns: '2024-01' (tergantung bulan sekarang)
 */
export function bulanSekarang() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Mendapatkan rentang tanggal untuk suatu bulan (awal dan akhir bulan).
 *
 * @param {string} bulan - Bulan dalam format YYYY-MM
 * @returns {Object} Objek berisi tanggal awal dan akhir bulan
 * @property {string} awal - Tanggal awal bulan (YYYY-MM-01)
 * @property {string} akhir - Tanggal akhir bulan (YYYY-MM-DD)
 *
 * @example
 * rentangBulan('2024-02')
 * // Returns: { awal: '2024-02-01', akhir: '2024-02-29' }
 *
 * @example
 * rentangBulan('2024-06')
 * // Returns: { awal: '2024-06-01', akhir: '2024-06-30' }
 */
export function rentangBulan(bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  // Tanggal 0 di bulan berikutnya = tanggal terakhir bulan sekarang
  const hariAkhir = new Date(tahun, nomorBulan, 0).getDate();
  return {
    awal: `${bulan}-01`,
    akhir: `${bulan}-${String(hariAkhir).padStart(2, '0')}`
  };
}

/**
 * Memformat tanggal menjadi format Indonesia (contoh: 15 Januari 2024).
 *
 * @param {string|Date} tanggal - Tanggal yang akan diformat
 * @returns {string} Tanggal dalam format Indonesia, atau '-' jika tidak valid
 *
 * @example
 * formatTanggalIndonesia('2024-01-15')
 * // Returns: '15 Januari 2024'
 *
 * @example
 * formatTanggalIndonesia('2024-06-20')
 * // Returns: '20 Juni 2024'
 */
export function formatTanggalIndonesia(tanggal) {
  if (!tanggal) return '-';
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}