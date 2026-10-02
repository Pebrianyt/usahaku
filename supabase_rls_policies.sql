-- ==========================================================
-- USAHAKU - ROW LEVEL SECURITY (RLS) & POLICIES FOR SUPABASE
-- ==========================================================
-- Terapkan script ini pada SQL Editor di Supabase Dashboard
-- https://supabase.com/dashboard/project/_/sql

-- 1. AKTIFKAN ROW LEVEL SECURITY (RLS) DI SETIAP TABEL
ALTER TABLE IF EXISTS produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transaksi_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alokasi_stok_fifo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transaksi_kas ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- 2. HAPUS KEBIJAKAN LAMA JIKA SUDAH ADA (AGAR BERSIH)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Akses anonim penuh produk" ON produk;
DROP POLICY IF EXISTS "Akses anonim penuh pesanan" ON pesanan;
DROP POLICY IF EXISTS "Akses anonim penuh transaksi_stok" ON transaksi_stok;
DROP POLICY IF EXISTS "Akses anonim penuh alokasi_stok_fifo" ON alokasi_stok_fifo;
DROP POLICY IF EXISTS "Akses anonim penuh transaksi_kas" ON transaksi_kas;

-- ----------------------------------------------------------
-- 3. KEBIJAKAN AKSES STANDAR (ANON & AUTHENTICATED)
-- Sesuai dengan arsitektur UsahaKu saat ini yang menggunakan anon key
-- ----------------------------------------------------------

-- Kebijakan Tabel Produk
CREATE POLICY "Akses penuh produk"
ON produk
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Kebijakan Tabel Pesanan
CREATE POLICY "Akses penuh pesanan"
ON pesanan
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Kebijakan Tabel Transaksi Stok
CREATE POLICY "Akses penuh transaksi_stok"
ON transaksi_stok
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Kebijakan Tabel Alokasi Stok FIFO
CREATE POLICY "Akses penuh alokasi_stok_fifo"
ON alokasi_stok_fifo
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Kebijakan Tabel Transaksi Kas
CREATE POLICY "Akses penuh transaksi_kas"
ON transaksi_kas
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------------
-- 4. HAK AKSES PERMISSION (GRANT) UNTUK ROLE DATABASE
-- ----------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ----------------------------------------------------------
-- 5. OPSIONAL: JIKA MENGGUNAKAN MULTI-USER DENGAN SUPABASE AUTH (user_id)
-- Hapus tanda komentar (uncomment) jika ingin membatasi data per user akun:
-- ----------------------------------------------------------
/*
-- Tambahkan kolom user_id jika belum ada:
-- ALTER TABLE produk ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
-- ALTER TABLE pesanan ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
-- ALTER TABLE transaksi_stok ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();
-- ALTER TABLE transaksi_kas ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- Kebijakan per pengguna (hanya bisa lihat & ubah data miliknya sendiri):
-- CREATE POLICY "User data produk" ON produk FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "User data pesanan" ON pesanan FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "User data transaksi_stok" ON transaksi_stok FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "User data transaksi_kas" ON transaksi_kas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
*/
