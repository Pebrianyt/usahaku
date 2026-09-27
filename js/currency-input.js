// Input nominal Rupiah: tampil bertitik ribuan, menerima salinan berformat
// Indonesia maupun format umum dengan koma sebagai pemisah ribuan.
(function () {
  function pecahNominal(value) {
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

    let bagianUtama = posisiDesimal >= 0 ? teks.slice(0, posisiDesimal) : teks;
    let fraction = posisiDesimal >= 0 ? teks.slice(posisiDesimal + 1).replace(/\D/g, '').slice(0, 2) : '';
    let integer = bagianUtama.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (pemisahDesimal && !integer) integer = '0';
    return { integer, fraction, decimal: posisiDesimal >= 0, trailingDecimal: posisiDesimal >= 0 && teks.endsWith(pemisahDesimal) };
  }

  function formatNominal(value) {
    const bagian = pecahNominal(value);
    if (!bagian.integer && !bagian.decimal) return '';
    const integer = (bagian.integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (!bagian.decimal) return integer;
    return integer + ',' + bagian.fraction;
  }

  function parseNominal(value) {
    const bagian = pecahNominal(value);
    if (!bagian.integer && !bagian.fraction) return 0;
    const angka = `${bagian.integer || '0'}${bagian.decimal ? '.' + bagian.fraction : ''}`;
    return Number(angka) || 0;
  }

  function posisiSetelahDigit(teks, jumlahDigit) {
    if (jumlahDigit <= 0) return 0;
    let digitDitemukan = 0;
    for (let i = 0; i < teks.length; i++) {
      if (/\d/.test(teks[i])) digitDitemukan++;
      if (digitDitemukan >= jumlahDigit) return i + 1;
    }
    return teks.length;
  }

  function formatInput(input) {
    const awalCaret = input.selectionStart ?? input.value.length;
    const jumlahDigitSebelumCaret = (input.value.slice(0, awalCaret).match(/\d/g) || []).length;
    const nilaiBaru = formatNominal(input.value);
    input.value = nilaiBaru;
    const inputBerakhirPemisah = /[,.]$/.test(input.value.slice(0, awalCaret));
    const caretBaru = inputBerakhirPemisah ? nilaiBaru.length : posisiSetelahDigit(nilaiBaru, jumlahDigitSebelumCaret);
    try { input.setSelectionRange(caretBaru, caretBaru); } catch (_) { /* tipe input tanpa caret */ }
  }

  document.addEventListener('input', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.matches('[data-currency-input]')) formatInput(input);
  });

  document.addEventListener('blur', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.matches('[data-currency-input]')) {
      input.value = formatNominal(input.value);
    }
  }, true);

  window.UsahaKuCurrency = {
    format: formatNominal,
    parse: parseNominal
  };
})();
