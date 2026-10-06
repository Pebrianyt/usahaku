# UsahaKu (Vue 3 + Bootstrap + Supabase)

UsahaKu adalah aplikasi web manajemen usaha terpadu untuk memantau pesanan, inventori/stok FIFO, laba rugi, dan arus kas. Proyek ini dibangun dengan **Vue 3 Options API**, **Vue Router**, layout responsif **Bootstrap 5**, sistem autentikasi **Supabase Auth**, notifikasi Toast & dialog Modal Bootstrap, unit tests dengan **Vitest**, serta kebijakan keamanan **Row Level Security (RLS)** untuk Supabase.

---

## 🔐 Autentikasi & Akun Pengguna

Halaman login tersedia di `/login` dengan desain yang selaras dengan seluruh aplikasi.

### Akun Terdaftar:
- `kholan.childs404@gmail.com` — **KHOLAN MUSTAQIM**
- `kartikaniadewi@gmail.com` — **NIA DEWI KARTIKA**
- `muhammadridhaby@gmail.com` — **M RIDHABY**
- `pebrianyrstn@gmail.com` — **PEBRIAN YURISTIANA**
- `siswanto7612@gmail.com` — **SISWANTO**

**Password Default**: `adm1nusahaku`

---

## 👤 Menu Profil (`/profile`)

- **Card 1: Profil Pengguna**:
  - Avatar lingkaran menggunakan inisial nama pengguna (misal: **KM**, **NK**, **MR**, **PY**, **S**).
  - Nama lengkap dan alamat email aktif.
  - Badge peran "Admin UsahaKu" dan status terverifikasi.
  - Tombol keluar (Logout) dengan modal konfirmasi.
- **Card 2: Ubah Kata Sandi**:
  - Kolom password saat ini, password baru, dan konfirmasi password baru.
  - Validasi kecocokan dan enkripsi pembaruan sandi langsung via Supabase Auth.

---

## 🛡️ Kebijakan Row Level Security (RLS) Supabase

File SQL lengkap untuk memperbarui tabel, mengunci akses hanya untuk pengguna yang login, dan menambahkan user ke Supabase Auth tersedia di [`supabase_auth_rls_policies.sql`](./supabase_auth_rls_policies.sql).

### Cara Menerapkan di Supabase:
1. Buka dashboard proyek Supabase Anda: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Masuk ke menu **SQL Editor**.
3. Buka file [`supabase_auth_rls_policies.sql`](./supabase_auth_rls_policies.sql), salin kodenya, dan tempel ke query editor.
4. Klik **Run** untuk mengeksekusi.
5. Akses anonim publik akan dicabut dan seluruh operasi data hanya diizinkan untuk pengguna yang telah terautentikasi (`authenticated`).

---

## 🧪 Menjalankan Unit Tests

Seluruh logika bisnis inti dan utilitas autentikasi diuji menggunakan **Vitest**:

```bash
npm test
```

Pengujian mencakup:
- Pemformatan mata uang Rupiah & desimal (`formatRupiah`, `parseNominal`, `formatPendek`)
- Inisial profil pengguna & daftar email sah (`getInitials`, `REGISTERED_USERS`)
- Validasi data produk (`validasiProduk`)
- Perhitungan lapisan persediaan FIFO & HPP (`hitungEstimasiHppFIFO`)
- Pengelompokan pesanan, laba, & margin % (`kelompokkanPesanan`)
- Ringkasan arus kas periode & saldo bisnis (`hitungRingkasanKas`)
- Laporan Laba Rugi aktual & proyeksi (`hitungLabaRugi`)

---

## 💻 Menjalankan Aplikasi Lokal

```bash
# Jalankan server pengembangan
npm run dev

# Kompilasi aplikasi untuk produksi
npm run build
```
Aplikasi berjalan secara default di `http://localhost:3000`.
