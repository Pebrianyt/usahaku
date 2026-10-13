import { createClient } from '@supabase/supabase-js';

/**
 * URL endpoint untuk layanan Supabase.
 * Digunakan sebagai base URL untuk semua request ke database dan auth.
 * @type {string}
 */
export const SUPABASE_URL = "https://kjmbskcuerafyyrjgecr.supabase.co";

/**
 * Kunci API publik (anon key) untuk autentikasi client-side.
 * CATATAN: Ini adalah public anon key, BUKAN service key.
 * Jangan gunakan service role key di sisi client karena akan
 * mengekspos akses database penuh tanpa batasan RLS.
 * @type {string}
 */
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqbWJza2N1ZXJhZnl5cmpnZWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTA3MzUsImV4cCI6MjEwNTc4NjczNX0.aXV4ORHttsLqDVSh3JO6vhGCPhYTiePuZCKNCZCGKrM";

/**
 * Instance client Supabase yang dikonfigurasi.
 * Konfigurasi auth:
 * - persistSession: menyimpan session di localStorage
 * - autoRefreshToken: otomatis memperbarui token sebelum expired
 * - detectSessionInUrl: mendeteksi session dari URL callback OAuth
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;