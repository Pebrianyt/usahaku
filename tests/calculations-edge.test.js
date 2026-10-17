import { describe, expect, it } from 'vitest';
import { hitungEstimasiHppFIFO, hitungLabaRugi, hitungRingkasanKas } from '../src/utils/calculations.js';

describe('business calculation edge cases', () => {
  it('excludes stock receipts after the order date and invalid quantities', () => {
    const stock = [
      { id: 1, jenis: 'Masuk', tanggal: '2026-04-01', kode_produk: 7, qty: 3, harga_satuan: 100 },
      { id: 2, jenis: 'Masuk', tanggal: '2026-04-03', kode_produk: 7, qty: 20, harga_satuan: 200 }
    ];

    const result = hitungEstimasiHppFIFO([
      { kode_produk: 7, qty: 5 }, { kode_produk: 7, qty: 0 }, { kode_produk: '', qty: 1 }
    ], '2026-04-02', stock, []);

    expect(result[0]).toMatchObject({ sukses: false, totalHpp: 300, sisaKurang: 2, hppSatuan: 100 });
    expect(result[1]).toMatchObject({ sukses: false, totalHpp: 0, sisaKurang: 0 });
    expect(result[2]).toMatchObject({ sukses: false, totalHpp: 0, sisaKurang: 0 });
  });

  it('restores allocations for the order currently being edited', () => {
    const stock = [
      { id: 1, jenis: 'Masuk', tanggal: '2026-04-01', kode_produk: 7, qty: 5, harga_satuan: 100 },
      { id: 2, jenis: 'Keluar', tanggal: '2026-04-02', kode_produk: 7, qty: 4, pesanan_id: 99 }
    ];
    const allocations = [{ transaksi_keluar_id: 2, transaksi_masuk_id: 1, qty: 4 }];

    const [result] = hitungEstimasiHppFIFO([{ kode_produk: 7, qty: 5 }], '2026-04-03', stock, allocations, {
      ids: new Set(['99'])
    });

    expect(result).toMatchObject({ sukses: true, totalHpp: 500, sisaKurang: 0 });
  });

  it('includes month-end transactions, ignores other months, and sorts same-day entries by ID', () => {
    const result = hitungRingkasanKas([
      { id: 2, tanggal: '2024-02-29', jenis: 'Masuk', nominal: 20 },
      { id: 3, tanggal: '2024-03-01', jenis: 'Keluar', nominal: 90 },
      { id: 1, tanggal: '2024-02-29', jenis: 'Keluar', nominal: 5 },
      { id: 0, tanggal: '2024-01-31', jenis: 'Saldo Awal', nominal: 100 }
    ], '2024-02');

    expect(result).toMatchObject({ saldoAwal: 100, totalMasuk: 20, totalKeluar: 5, saldoAkhirPeriode: 115, saldoBisnisHariIni: 25 });
    expect(result.listBulan.map(row => row.id)).toEqual([2, 1]);
  });

  it('flags orders without complete stock allocations and keeps zero-revenue margins finite', () => {
    const result = hitungLabaRugi([
      { id: 1, no_pesanan: 'ORD-1', tanggal_pesanan: '2026-04-10', total_penghasilan_akhir: 0, status: 'Pending' }
    ], [], [], [], '2026-04');

    expect(result.pesananPerluCek).toBe(1);
    expect(result.rincianPesanan[0]).toMatchObject({ hppLengkap: false, status: 'Potential' });
    expect(result).toMatchObject({ omzetPotential: 0, gpmRealisasi: 0, gpmProyeksi: 0, npmRealisasi: 0, npmProyeksi: 0 });
    expect(Number.isFinite(result.npmProyeksi)).toBe(true);
  });
});
