-- ==============================================================================
-- USAHAKU - AUTHENTICATION, USERS SEEDING & ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Jalankan seluruh script ini pada SQL Editor di Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AKTIFKAN EXTENSION PGCRYPTO (UNTUK HASH PASSWORD & GENERATE UUID)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. SEED DAFTAR USER KE AUTH.USERS SUPABASE
-- Default Password: "adm1nusahaku"
-- Email terdaftar:
--   1. kholan.childs404@gmail.com (KHOLAN MUSTAQIM)
--   2. kartikaniadewi@gmail.com   (NIA DEWI KARTIKA)
--   3. muhammadridhaby@gmail.com  (M RIDHABY)
--   4. pebrianyrstn@gmail.com     (PEBRIAN YURISTIANA)
--   5. siswanto7612@gmail.com     (SISWANTO)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_users RECORD;
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Generate bcrypt hash untuk password "adm1nusahaku"
  v_encrypted_pw := crypt('adm1nusahaku', gen_salt('bf', 10));

  FOR v_users IN 
    SELECT 'kholan.childs404@gmail.com' as email, 'KHOLAN MUSTAQIM' as full_name
    UNION ALL SELECT 'kartikaniadewi@gmail.com', 'NIA DEWI KARTIKA'
    UNION ALL SELECT 'muhammadridhaby@gmail.com', 'M RIDHABY'
    UNION ALL SELECT 'pebrianyrstn@gmail.com', 'PEBRIAN YURISTIANA'
    UNION ALL SELECT 'siswanto7612@gmail.com', 'SISWANTO'
  LOOP
    -- Periksa apakah user sudah ada
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_users.email;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_users.email,
        v_encrypted_pw,
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', v_users.full_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      -- Masukkan juga ke auth.identities agar kompatibel dengan sistem Supabase Auth
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_users.email),
        'email',
        now(),
        now(),
        now()
      );
    ELSE
      -- Jika sudah ada, perbarui kata sandi dan metadata nama jika perlu
      UPDATE auth.users
      SET encrypted_password = v_encrypted_pw,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          raw_user_meta_data = jsonb_build_object('full_name', v_users.full_name),
          updated_at = now()
      WHERE id = v_user_id;
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. AKTIFKAN ROW LEVEL SECURITY (RLS) DI SELURUH TABEL DATA
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transaksi_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alokasi_stok_fifo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transaksi_kas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. HAPUS SEMUA KEBIJAKAN LAMA (TERMASUK AKSES ANONIM)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Akses anonim penuh produk" ON produk;
DROP POLICY IF EXISTS "Akses penuh produk" ON produk;
DROP POLICY IF EXISTS "Akses autentikasi produk" ON produk;

DROP POLICY IF EXISTS "Akses anonim penuh pesanan" ON pesanan;
DROP POLICY IF EXISTS "Akses penuh pesanan" ON pesanan;
DROP POLICY IF EXISTS "Akses autentikasi pesanan" ON pesanan;

DROP POLICY IF EXISTS "Akses anonim penuh transaksi_stok" ON transaksi_stok;
DROP POLICY IF EXISTS "Akses penuh transaksi_stok" ON transaksi_stok;
DROP POLICY IF EXISTS "Akses autentikasi transaksi_stok" ON transaksi_stok;

DROP POLICY IF EXISTS "Akses anonim penuh alokasi_stok_fifo" ON alokasi_stok_fifo;
DROP POLICY IF EXISTS "Akses penuh alokasi_stok_fifo" ON alokasi_stok_fifo;
DROP POLICY IF EXISTS "Akses autentikasi alokasi_stok_fifo" ON alokasi_stok_fifo;

DROP POLICY IF EXISTS "Akses anonim penuh transaksi_kas" ON transaksi_kas;
DROP POLICY IF EXISTS "Akses penuh transaksi_kas" ON transaksi_kas;
DROP POLICY IF EXISTS "Akses autentikasi transaksi_kas" ON transaksi_kas;

-- ------------------------------------------------------------------------------
-- 5. CABUT AKSES ANONIM & BERIKAN HANYA KEPADA ROLE AUTHENTICATED
-- ------------------------------------------------------------------------------
-- Cabut akses dari anonim (publik yang belum login)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Berikan izin akses penuh kepada role authenticated (pengguna yang sudah login)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. BUAT POLICY RLS KETAT: HANYA USER YANG SUDAH LOGIN DAPAT MENGAKSES
-- ------------------------------------------------------------------------------

-- Tabel Produk: Hanya authenticated
CREATE POLICY "Akses autentikasi produk"
ON produk
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel Pesanan: Hanya authenticated
CREATE POLICY "Akses autentikasi pesanan"
ON pesanan
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel Transaksi Stok: Hanya authenticated
CREATE POLICY "Akses autentikasi transaksi_stok"
ON transaksi_stok
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel Alokasi Stok FIFO: Hanya authenticated
CREATE POLICY "Akses autentikasi alokasi_stok_fifo"
ON alokasi_stok_fifo
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel Transaksi Kas: Hanya authenticated
CREATE POLICY "Akses autentikasi transaksi_kas"
ON transaksi_kas
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
