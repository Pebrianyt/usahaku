// ==========================================================
// KONEKSI KE SUPABASE - UsahaKu
// ==========================================================

const SUPABASE_URL = "https://kjmbskcuerafyyrjgecr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqbWJza2N1ZXJhZnl5cmpnZWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTA3MzUsImV4cCI6MjEwNTc4NjczNX0.aXV4ORHttsLqDVSh3JO6vhGCPhYTiePuZCKNCZCGKrM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);