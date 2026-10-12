import { describe, it, expect } from 'vitest';
import { 
  formatRupiah, 
  formatPendek, 
  formatNominal, 
  parseNominal, 
  formatKode 
} from '../src/utils/currency.js';
import { 
  kelompokkanPesanan, 
  hitungEstimasiHppFIFO, 
  hitungRingkasanKas, 
  hitungLabaRugi, 
  validasiProduk 
} from '../src/utils/calculations.js';
import { getInitials, REGISTERED_USERS, DEFAULT_PASSWORD } from '../src/services/auth.js';

describe('UsahaKu Unit Tests - All Features', () => {

  // 1. Currency & Formatting
  describe('Currency & Code Formatting', () => {
    it('formats numbers into Rupiah currency representation', () => {
      expect(formatRupiah(150000)).toBe('Rp 150.000');
      expect(formatRupiah(0)).toBe('Rp 0');
      expect(formatRupiah(null)).toBe('-');
    });

    it('formats short numbers (rb, jt, M)', () => {
      expect(formatPendek(500)).toBe('500');
      expect(formatPendek(15000)).toBe('15 rb');
      expect(formatPendek(2500000)).toBe('2,5 jt');
      expect(formatPendek(1200000000)).toBe('1,2 M');
    });

    it('formats code correctly with P prefix and 4 digits padding', () => {
      expect(formatKode(1)).toBe('P0001');
      expect(formatKode(42)).toBe('P0042');
      expect(formatKode(1005)).toBe('P1005');
    });

    it('parses formatted nominal inputs correctly', () => {
      expect(parseNominal('150.000')).toBe(150000);
      expect(parseNominal('25.500,50')).toBe(25500.5);
      expect(parseNominal('0')).toBe(0);
      expect(parseNominal('')).toBe(0);
    });

    it('formats nominal input with thousand separators', () => {
      expect(formatNominal('1000000')).toBe('1.000.000');
      expect(formatNominal('5000')).toBe('5.000');
    });
  });

  // 2. Authentication & Profile Initials
  describe('Authentication & Profile Utilities', () => {
    it('generates correct initials from user names', () => {
      expect(getInitials('KHOLAN MUSTAQIM')).toBe('KM');
      expect(getInitials('NIA DEWI KARTIKA')).toBe('NK');
      expect(getInitials('M RIDHABY')).toBe('MR');
      expect(getInitials('PEBRIAN YURISTIANA')).toBe('PY');
      expect(getInitials('SISWANTO')).toBe('SI');
    });

    it('contains owner and admin roles correctly configured', () => {
      expect(DEFAULT_PASSWORD).toBe('adm1nusahaku');
      expect(REGISTERED_USERS['yangpunya@gmail.com']?.role).toBe('owner');
      expect(REGISTERED_USERS['kholan.childs404@gmail.com']?.role).toBe('admin');
      expect(REGISTERED_USERS['kartikaniadewi@gmail.com']?.role).toBe('admin');
      expect(REGISTERED_USERS['muhammadridhaby@gmail.com']?.role).toBe('admin');
      expect(REGISTERED_USERS['pebrianyrstn@gmail.com']?.role).toBe('admin');
      expect(REGISTERED_USERS['siswanto7612@gmail.com']?.role).toBe('admin');
    });
  });

  // 3. Master Data - Product Validation
  describe('Master Data Product Validation', () => {
    const existingProducts = [
      { id: 1, nama_produk: 'Kaos Polos Hitam', hpp: 35000, aktif: true },
      { id: 2, nama_produk: 'Kemeja Flanel', hpp: 85000, aktif: true }
    ];

    it('validates required product name', () => {
      expect(validasiProduk('', 50000, existingProducts)).toBe('Nama produk wajib diisi.');
      expect(validasiProduk('   ', 50000, existingProducts)).toBe('Nama produk wajib diisi.');
    });

    it('validates non-negative HPP', () => {
      expect(validasiProduk('Celana Jeans', -1000, existingProducts)).toBe('HPP harus berupa angka nol atau lebih.');
    });

    it('detects duplicate product names case-insensitively', () => {
      expect(validasiProduk('kaos polos hitam', 40000, existingProducts)).toBe('Nama produk tersebut sudah terdaftar.');
      expect(validasiProduk('KAOS POLOS HITAM', 40000, existingProducts)).toBe('Nama produk tersebut sudah terdaftar.');
    });

    it('allows updating product without triggering duplicate check on itself', () => {
      expect(validasiProduk('Kaos Polos Hitam', 38000, existingProducts, 1)).toBe('');
    });

    it('passes validation for valid new product', () => {
      expect(validasiProduk('Jaket Bomber', 120000, existingProducts)).toBe('');
    });
  });

  // 4. Persediaan - FIFO Stock Allocation
  describe('Persediaan FIFO Stock Calculations', () => {
    const mockTransaksiStok = [
      { id: 1, tanggal: '2026-09-01', jenis: 'Masuk', kode_produk: 1, qty: 10, harga_satuan: 30000 },
      { id: 101, tanggal: '2026-09-05', jenis: 'Keluar', kode_produk: 1, qty: 5, pesanan_id: 99 },
      { id: 2, tanggal: '2026-09-10', jenis: 'Masuk', kode_produk: 1, qty: 10, harga_satuan: 35000 }
    ];
    const mockAlokasiStok = [
      { id: 1, transaksi_keluar_id: 101, transaksi_masuk_id: 1, qty: 5, harga_satuan: 30000 }
    ];

    it('estimates HPP correctly using FIFO layering', () => {
      const items = [{ kode_produk: 1, qty: 8 }];
      const result = hitungEstimasiHppFIFO(items, '2026-09-15', mockTransaksiStok, mockAlokasiStok);

      expect(result).toHaveLength(1);
      expect(result[0].sukses).toBe(true);
      expect(result[0].totalHpp).toBe(255000);
      expect(result[0].hppSatuan).toBe(31875);
      expect(result[0].sisaKurang).toBe(0);
    });

    it('detects when stock is insufficient', () => {
      const items = [{ kode_produk: 1, qty: 20 }];
      const result = hitungEstimasiHppFIFO(items, '2026-09-15', mockTransaksiStok, mockAlokasiStok);

      expect(result[0].sukses).toBe(false);
      expect(result[0].sisaKurang).toBe(5);
    });
  });

  // 5. Daftar Pesanan - Grouping and Financials
  describe('Daftar Pesanan Grouping & Profit Calculations', () => {
    const mockPesananRows = [
      { id: 1, no_pesanan: 'ORD-001', tanggal_pesanan: '2026-10-01', kode_produk: 1, qty: 2, harga_jual: 30000, total_penghasilan_akhir: 100000, status: 'Pending' },
      { id: 2, no_pesanan: 'ORD-001', tanggal_pesanan: '2026-10-01', kode_produk: 2, qty: 1, harga_jual: 20000, total_penghasilan_akhir: 100000, status: 'Pending' },
      { id: 3, no_pesanan: 'ORD-002', tanggal_pesanan: '2026-10-02', kode_produk: 1, qty: 1, harga_jual: 30000, total_penghasilan_akhir: 50000, status: 'Realisasi', tanggal_transaksi_masuk: '2026-10-02' }
    ];

    const mockHppMap = new Map([
      ['1', { total: 50000, allocations: [{ qty: 2, hppPerUnit: 25000, totalHpp: 50000 }] }],
      ['2', { total: 30000, allocations: [{ qty: 1, hppPerUnit: 30000, totalHpp: 30000 }] }],
      ['3', { total: 30000, allocations: [{ qty: 1, hppPerUnit: 30000, totalHpp: 30000 }] }]
    ]);

    it('groups multiple order rows by no_pesanan', () => {
      const grouped = kelompokkanPesanan(mockPesananRows, {}, mockHppMap);
      expect(grouped).toHaveLength(2);

      const ord1 = grouped.find(g => g.noPesanan === 'ORD-001');
      expect(ord1).toBeDefined();
      expect(ord1.rows).toHaveLength(2);
      expect(ord1.totalPenghasilan).toBe(100000);
      expect(ord1.totalHpp).toBe(80000);
      expect(ord1.profit).toBe(20000);
      expect(ord1.margin).toBe(20);
      expect(ord1.status).toBe('Pending');
    });

    it('calculates realized orders properly', () => {
      const grouped = kelompokkanPesanan(mockPesananRows, {}, mockHppMap);
      const ord2 = grouped.find(g => g.noPesanan === 'ORD-002');
      expect(ord2.status).toBe('Realisasi');
      expect(ord2.profit).toBe(20000);
      expect(ord2.margin).toBe(40);
    });
  });

  // 6. Arus Kas - Cash Flow Summary
  describe('Arus Kas Calculations', () => {
    const mockKas = [
      { id: 1, tanggal: '2026-08-01', jenis: 'Saldo Awal', nominal: 1000000 },
      { id: 2, tanggal: '2026-09-05', jenis: 'Masuk', nominal: 500000 },
      { id: 3, tanggal: '2026-09-10', jenis: 'Keluar', nominal: 200000 },
      { id: 4, tanggal: '2026-10-01', jenis: 'Masuk', nominal: 300000 },
      { id: 5, tanggal: '2026-10-02', jenis: 'Keluar', nominal: 100000 }
    ];

    it('calculates period cash flow and current business balance', () => {
      const septSummary = hitungRingkasanKas(mockKas, '2026-09');
      expect(septSummary.saldoAwal).toBe(1000000);
      expect(septSummary.totalMasuk).toBe(500000);
      expect(septSummary.totalKeluar).toBe(200000);
      expect(septSummary.saldoAkhirPeriode).toBe(1300000);
      expect(septSummary.saldoBisnisHariIni).toBe(1500000);
    });
  });

  // 7. Laba Rugi - Profit & Loss Calculation
  describe('Laba Rugi Calculations', () => {
    const mockPesanan = [
      { id: 10, no_pesanan: 'ORD-10', tanggal_pesanan: '2026-10-05', total_penghasilan_akhir: 200000, status: 'Realisasi' },
      { id: 11, no_pesanan: 'ORD-11', tanggal_pesanan: '2026-10-10', total_penghasilan_akhir: 100000, status: 'Pending' }
    ];
    const mockTransaksiStok = [
      { id: 201, tanggal: '2026-10-05', jenis: 'Keluar', sumber: 'Pesanan', pesanan_id: 10, qty: 2 },
      { id: 202, tanggal: '2026-10-10', jenis: 'Keluar', sumber: 'Pesanan', pesanan_id: 11, qty: 1 }
    ];
    const mockAlokasiStok = [
      { id: 1, transaksi_keluar_id: 201, qty: 2, harga_satuan: 50000 },
      { id: 2, transaksi_keluar_id: 202, qty: 1, harga_satuan: 60000 }
    ];
    const mockKas = [
      { id: 301, tanggal: '2026-10-15', jenis: 'Keluar', kategori: 'Biaya Operasional', nominal: 30000 }
    ];

    it('calculates realized revenue, potential, COGS, operating cost, and margins', () => {
      const pl = hitungLabaRugi(mockPesanan, mockTransaksiStok, mockAlokasiStok, mockKas, '2026-10');

      expect(pl.omzetRealisasi).toBe(200000);
      expect(pl.omzetPotential).toBe(100000);
      expect(pl.totalOmzet).toBe(300000);

      expect(pl.hppRealisasi).toBe(100000);
      expect(pl.hppPotential).toBe(60000);
      expect(pl.hppBulan).toBe(160000);

      expect(pl.biayaOperasional).toBe(30000);
      expect(pl.labaKotorRealisasi).toBe(100000);
      expect(pl.labaBersihRealisasi).toBe(70000);
      expect(pl.labaKotorProyeksi).toBe(140000);
      expect(pl.labaBersihProyeksi).toBe(110000);

      expect(pl.gpmRealisasi).toBe(50);
      expect(pl.npmRealisasi).toBe(35);
    });
  });

});
