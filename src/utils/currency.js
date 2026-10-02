// Currency and formatting utilities for UsahaKu

export function pecahNominal(value) {
  const teks = String(value ?? '').trim().replace(/[^0-9.,]/g, '');
  if (!teks) return { integer: '', fraction: '', decimal: false };

  const komaTerakhir = teks.lastIndexOf(',');
  const titikTerakhir = teks.lastIndexOf('.');
  const adaKoma = komaTerakhir >= 0;
  const adaTitik = titikTerakhir >= 0;
  let pemisahDesimal = '';
  let posisiDesimal = -1;

  if (adaKoma && adaTitik) {
    const kandidat = komaTerakhir > titikTerakhir ? ',' : '.';
    const posisiKandidat = Math.max(komaTerakhir, titikTerakhir);
    const jumlahBelakang = teks.length - posisiKandidat - 1;
    if (jumlahBelakang <= 2) {
      pemisahDesimal = kandidat;
      posisiDesimal = posisiKandidat;
    }
  } else if (adaKoma || adaTitik) {
    const kandidat = adaKoma ? ',' : '.';
    const semuaPosisi = [...teks].flatMap((karakter, index) => karakter === kandidat ? [index] : []);
    const posisiKandidat = semuaPosisi[semuaPosisi.length - 1];
    const jumlahBelakang = teks.length - posisiKandidat - 1;
    if (jumlahBelakang <= 2) {
      pemisahDesimal = kandidat;
      posisiDesimal = posisiKandidat;
    }
  }

  const bagianUtama = posisiDesimal >= 0 ? teks.slice(0, posisiDesimal) : teks;
  const fraction = posisiDesimal >= 0 ? teks.slice(posisiDesimal + 1).replace(/\D/g, '').slice(0, 2) : '';
  let integer = bagianUtama.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (pemisahDesimal && !integer) integer = '0';
  return { integer, fraction, decimal: posisiDesimal >= 0, trailingDecimal: posisiDesimal >= 0 && teks.endsWith(pemisahDesimal) };
}

export function formatNominal(value) {
  const bagian = pecahNominal(value);
  if (!bagian.integer && !bagian.decimal) return '';
  const integer = (bagian.integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!bagian.decimal) return integer;
  return integer + (bagian.fraction ? ',' + bagian.fraction : '');
}

export function parseNominal(value) {
  if (typeof value === 'number') return value;
  const bagian = pecahNominal(value);
  if (!bagian.integer && !bagian.fraction) return 0;
  const angka = `${bagian.integer || '0'}${bagian.decimal ? '.' + bagian.fraction : ''}`;
  return Number(angka) || 0;
}

export function formatRupiah(angka, options = {}) {
  if (angka === null || angka === undefined || angka === '' || isNaN(angka)) {
    return options.placeholder ?? '-';
  }
  const maxFraction = options.maxFraction ?? 0;
  return 'Rp ' + Number(angka).toLocaleString('id-ID', { maximumFractionDigits: maxFraction });
}

export function formatPendek(nilai) {
  const abs = Math.abs(nilai);
  if (abs >= 1_000_000_000) return `${(nilai / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`; 
  if (abs >= 1_000_000) return `${(nilai / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000) return `${(nilai / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return String(Math.round(nilai));
}

export function formatKode(id) {
  return 'P' + String(id).padStart(4, '0');
}

export function tanggalLokal(date = new Date()) {
  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, '0');
  const hari = String(date.getDate()).padStart(2, '0');
  return `${tahun}-${bulan}-${hari}`;
}

export function bulanSekarang() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function rentangBulan(bulan) {
  const [tahun, nomorBulan] = bulan.split('-').map(Number);
  const hariAkhir = new Date(tahun, nomorBulan, 0).getDate();
  return { 
    awal: `${bulan}-01`, 
    akhir: `${bulan}-${String(hariAkhir).padStart(2, '0')}` 
  };
}

export function formatTanggalIndonesia(tanggal) {
  if (!tanggal) return '-';
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}
