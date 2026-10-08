import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = "https://kjmbskcuerafyyrjgecr.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqbWJza2N1ZXJhZnl5cmpnZWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMTA3MzUsImV4cCI6MjEwNTc4NjczNX0.aXV4ORHttsLqDVSh3JO6vhGCPhYTiePuZCKNCZCGKrM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
export default supabase;
