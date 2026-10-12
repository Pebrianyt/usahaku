-- ==============================================================================
-- USAHAKU - AUTHENTICATION, ROLES (OWNER & ADMIN), USERS & ROW LEVEL SECURITY
-- ==============================================================================
-- Jalankan seluruh script ini pada SQL Editor di Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AKTIFKAN EXTENSION PGCRYPTO (UNTUK HASH PASSWORD & GENERATE UUID)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. TABEL DAFTAR PENGGUNA & PERAN (APP_USERS)
-- Role: 'owner' (Akses Penuh Semua Menu), 'admin' (Akses Menu Terbatas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  nama text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. SEED USER OWNER & ADMIN KE APP_USERS & AUTH.USERS
-- Owner Awal: yangpunya@gmail.com (Password: "ownerusahaku")
-- Admin: kholan.childs404@gmail.com, kartikaniadewi@gmail.com, dll (Password: "adm1nusahaku")
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_users RECORD;
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Data pengguna awal
  FOR v_users IN 
    SELECT 'yangpunya@gmail.com' as email, 'PEMILIK USAHAKU' as full_name, 'owner' as role, 'ownerusahaku' as password
    UNION ALL SELECT 'kholan.childs404@gmail.com', 'KHOLAN MUSTAQIM', 'admin', 'adm1nusahaku'
    UNION ALL SELECT 'kartikaniadewi@gmail.com', 'NIA DEWI KARTIKA', 'admin', 'adm1nusahaku'
    UNION ALL SELECT 'muhammadridhaby@gmail.com', 'M RIDHABY', 'admin', 'adm1nusahaku'
    UNION ALL SELECT 'pebrianyrstn@gmail.com', 'PEBRIAN YURISTIANA', 'admin', 'adm1nusahaku'
    UNION ALL SELECT 'siswanto7612@gmail.com', 'SISWANTO', 'admin', 'adm1nusahaku'
  LOOP
    -- 1. Upsert ke tabel public.app_users
    INSERT INTO public.app_users (email, nama, role)
    VALUES (v_users.email, v_users.full_name, v_users.role)
    ON CONFLICT (email) 
    DO UPDATE SET 
      nama = EXCLUDED.nama,
      role = EXCLUDED.role,
      updated_at = now();

    -- 2. Generate bcrypt hash untuk kata sandi
    v_encrypted_pw := crypt(v_users.password, gen_salt('bf', 10));

    -- 3. Upsert ke auth.users Supabase
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
        jsonb_build_object('full_name', v_users.full_name, 'role', v_users.role),
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
      -- Jika sudah ada, perbarui kata sandi dan metadata peran
      UPDATE auth.users
      SET encrypted_password = v_encrypted_pw,
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          raw_user_meta_data = jsonb_build_object('full_name', v_users.full_name, 'role', v_users.role),
          updated_at = now()
      WHERE id = v_user_id;
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 4. AKTIFKAN ROW LEVEL SECURITY (RLS) DI SELURUH TABEL DATA
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pesanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaksi_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alokasi_stok_fifo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transaksi_kas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. HAPUS SEMUA KEBIJAKAN LAMA
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Akses autentikasi app_users" ON public.app_users;
DROP POLICY IF EXISTS "Akses autentikasi produk" ON public.produk;
DROP POLICY IF EXISTS "Akses autentikasi pesanan" ON public.pesanan;
DROP POLICY IF EXISTS "Akses autentikasi transaksi_stok" ON public.transaksi_stok;
DROP POLICY IF EXISTS "Akses autentikasi alokasi_stok_fifo" ON public.alokasi_stok_fifo;
DROP POLICY IF EXISTS "Akses autentikasi transaksi_kas" ON public.transaksi_kas;

-- ------------------------------------------------------------------------------
-- 6. CABUT AKSES ANONIM (PUBLIK) & BERIKAN HANYA KEPADA ROLE AUTHENTICATED
-- ------------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. BUAT POLICY RLS KETAT: HANYA USER YANG SUDAH LOGIN DAPAT MENGAKSES
-- ------------------------------------------------------------------------------

-- Tabel app_users
CREATE POLICY "Akses autentikasi app_users"
ON public.app_users
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel produk
CREATE POLICY "Akses autentikasi produk"
ON public.produk
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel pesanan
CREATE POLICY "Akses autentikasi pesanan"
ON public.pesanan
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel transaksi_stok
CREATE POLICY "Akses autentikasi transaksi_stok"
ON public.transaksi_stok
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel alokasi_stok_fifo
CREATE POLICY "Akses autentikasi alokasi_stok_fifo"
ON public.alokasi_stok_fifo
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Tabel transaksi_kas
CREATE POLICY "Akses autentikasi transaksi_kas"
ON public.transaksi_kas
FOR ALL
TO authenticated
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
