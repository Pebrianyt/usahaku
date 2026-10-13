import { reactive } from 'vue';
import { supabase } from '@/services/supabase';

/**
 * Bagian 1: Fungsi Utilitas
 * Berisi fungsi-fungsi helper yang digunakan di seluruh modul.
 */

/**
 * Default password untuk user testing.
 * @type {string}
 */
export const DEFAULT_PASSWORD = 'adm1nusahaku';

/**
 * Data user yang terdaftar untuk testing.
 * @type {Object}
 */
export const REGISTERED_USERS = {
  'yangpunya@gmail.com': { role: 'owner' },
  'kholan.childs404@gmail.com': { role: 'admin' },
  'kartikaniadewi@gmail.com': { role: 'admin' },
  'muhammadridhaby@gmail.com': { role: 'admin' },
  'pebrianyrstn@gmail.com': { role: 'admin' },
  'siswanto7612@gmail.com': { role: 'admin' }
};

/**
 * Ekstrak inisial dari nama lengkap.
 * Jika satu kata, ambil 2 karakter pertama.
 * Jika lebih dari satu kata, gabungkan huruf pertama dan terakhir.
 * @param {string} name - Nama lengkap pengguna.
 * @returns {string} Inisial dalam huruf besar.
 */
export function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return (parts.length === 1
    ? parts[0].slice(0, 2)
    : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Bersihkan kredensial dan data pengguna yang disimpan oleh alur auth lama.
 * Menghapus key localStorage yang dimulai dengan 'usahaku_pwd_' dan
 * key 'usahaku_custom_users' serta 'usahaku_auth_user'.
 */
function clearLegacyAuthStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && (key.startsWith('usahaku_pwd_') || key === 'usahaku_custom_users' || key === 'usahaku_auth_user')) {
        keys.push(key);
      }
    }
    keys.forEach(key => window.localStorage.removeItem(key));
  } catch (error) {
    console.warn('Tidak dapat membersihkan data autentikasi lama:', error);
  }
}

// Panggil saat modul dimuat untuk membersihkan data auth lama.
clearLegacyAuthStorage();

/**
 * Bagian 2: Auth State & Session Management
 * Mengelola state autentikasi dan pemulihan sesi.
 */

/**
 * Reactive auth state yang menyimpan informasi sesi dan pengguna saat ini.
 * @property {object|null} user - Profil pengguna yang dimuat dari app_users.
 * @property {object|null} session - Session aktif dari Supabase Auth.
 * @property {boolean} isLoaded - Status apakah inisialisasi auth sudah selesai.
 * @property {string|null} error - Pesan error jika terjadi kegagalan.
 */
export const authState = reactive({
  user: null,
  session: null,
  isLoaded: false,
  error: null
});

/**
 * Ambil profil pengguna dari tabel app_users berdasarkan data auth Supabase.
 * Validasi kelengkapan data dan抛出 error jika profil tidak ditemukan.
 * @param {object} authUser - Objek user dari Supabase Auth.
 * @returns {Promise<object>} Objek profil pengguna dengan field id, email, name, role, initials.
 */
async function loadAppUser(authUser) {
  if (!authUser?.id || !authUser?.email) {
    throw new Error('Data pengguna dari Supabase tidak lengkap.');
  }

  const { data, error } = await supabase
    .from('app_users')
    .select('email, nama, role')
    .eq('email', authUser.email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Profil pengguna tidak ditemukan di app_users.');

  const name = data.nama?.trim() || authUser.email.split('@')[0];
  return {
    id: authUser.id,
    email: authUser.email.toLowerCase(),
    name,
    role: data.role,
    initials: getInitials(name)
  };
}

/**
 * Terapkan session ke aplikasi: simpan ke state dan muat profil pengguna.
 * Jika session tidak valid, reset semua state.
 * @param {object|null} session - Session dari Supabase Auth.
 * @returns {Promise<object|null>} Profil pengguna jika berhasil, null jika gagal.
 */
async function applySession(session) {
  // Simpan session ke state dan reset error.
  authState.session = session || null;
  authState.error = null;

  if (!session?.user) {
    authState.user = null;
    return null;
  }

  try {
    // Muat profil pengguna dari tabel app_users.
    const profile = await loadAppUser(session.user);
    authState.user = profile;
    return profile;
  } catch (error) {
    // Jika gagal, reset user dan catat error.
    authState.user = null;
    authState.error = error.message || 'Gagal memuat profil pengguna.';
    console.error('Gagal memuat profil app_users:', error);
    return null;
  }
}

/**
 * Promise yang di-resolve setelah inisialisasi auth selesai.
 * Menunggu pemulihan session dari Supabase storage.
 * @type {Promise<void>}
 */
export const authReady = (async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await applySession(data?.session);
  } catch (error) {
    // Jika gagal memulihkan session, reset semua state.
    authState.session = null;
    authState.user = null;
    authState.error = error.message || 'Gagal memulihkan sesi Supabase.';
    console.error('Gagal memulihkan sesi Supabase:', error);
  } finally {
    authState.isLoaded = true;
  }
})();

// Sinkronkan Vue reactive state dengan event auth dari Supabase.
// Supabase akan persist dan refresh session secara otomatis.
// Kita perlu menjaga sync dengan event sign-in, refresh, dan sign-out.
supabase.auth.onAuthStateChange((event, session) => {
  authState.session = session || null;
  if (!session?.user) {
    authState.user = null;
    authState.error = null;
    authState.isLoaded = true;
    return;
  }

  // Tunda pekerjaan database sampai setelah callback auth selesai
  // untuk避免 memblokir lock internal Supabase.
  Promise.resolve().then(() => applySession(session));
});

/**
 * Bagian 3: User Authentication
 * Operasi login, logout, dan Ubah password.
 */

/**
 * Masuk dengan kredensial email dan password.
 * Validasi input dan proses login ke Supabase Auth.
 * @param {string} emailInput - Email pengguna.
 * @param {string} passwordInput - Password pengguna.
 * @returns {Promise<{success: boolean, error?: string, user?: object, session?: object}>}
 */
export async function loginUser(emailInput, passwordInput) {
  const email = (emailInput || '').trim().toLowerCase();
  const password = passwordInput || '';

  if (!email || !password) {
    return { success: false, error: 'Email dan password wajib diisi.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message || 'Email atau password salah.' };
    if (!data?.user || !data?.session) {
      return { success: false, error: 'Supabase tidak mengembalikan sesi login yang valid.' };
    }

    const profile = await loadAppUser(data.user);
    authState.session = data.session;
    authState.user = profile;
    authState.error = null;
    authState.isLoaded = true;
    return { success: true, user: profile, session: data.session };
  } catch (error) {
    authState.user = null;
    return { success: false, error: error.message || 'Gagal masuk. Periksa koneksi dan konfigurasi akun.' };
  }
}

/**
 * Keluar dari aplikasi.
 * Menghapus session dari Supabase dan mereset state.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message || 'Gagal keluar.' };
    authState.user = null;
    authState.session = null;
    authState.error = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Gagal keluar.' };
  }
}

/**
 * Ubah password pengguna.
 * Validasi password lama terlebih dahulu sebelum mengUbah ke password baru.
 * @param {string} currentPassword - Password saat ini.
 * @param {string} newPassword - Password baru yang diinginkan.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function changePassword(currentPassword, newPassword) {
  if (!authState.session?.user) {
    return { success: false, error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' };
  }
  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Password saat ini dan password baru wajib diisi.' };
  }

  try {
    // Verifikasi password lama terlebih dahulu.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authState.session.user.email,
      password: currentPassword
    });
    if (verifyError) return { success: false, error: 'Password sekarang tidak sesuai.' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message || 'Gagal memperbarui password.' };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Gagal memperbarui password.' };
  }
}

/**
 * Bagian 4: User Management
 * Operasi CRUD untuk manajemen user (khusus admin/owner).
 */

/**
 * Ambil semua pengguna dari tabel app_users.
 * Hanya untuk pengguna dengan role admin/owner.
 * @returns {Promise<Array>} Array objek pengguna.
 */
export async function fetchAppUsers() {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Gagal mengambil app_users:', error);
    throw new Error(error.message || 'Gagal memuat daftar pengguna.');
  }
}

/**
 * Ekstrak pesan error dari respons Edge Function.
 * Mencoba parse JSON dari response, jika gagal gunakan fallback.
 * @param {object} error - Error dari Supabase function invoke.
 * @param {string} fallback - Pesan default jika parsing gagal.
 * @returns {Promise<string>} Pesan error yang sudah di-extract.
 */
async function getEdgeFunctionErrorMessage(error, fallback) {
  const response = error?.context;
  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json();
      if (payload?.error || payload?.message) return payload.error || payload.message;
    } catch (parseError) {
      // Response mungkin tidak berisi JSON; fallback ke error SDK.
    }
  }
  return error?.message || fallback;
}

/**
 * Buat user baru melalui Edge Function 'create-user'.
 * Memerlukan role owner atau admin.
 * @param {object} data - Data user baru.
 * @param {string} data.nama - Nama lengkap pengguna.
 * @param {string} data.email - Email pengguna.
 * @param {string} data.role - Peran pengguna (owner/admin).
 * @param {string} data.password - Password awal pengguna.
 * @returns {Promise<{success: boolean, error?: string, data?: object}>}
 */
export async function createNewUser({
  nama,
  email,
  role,
  password
}) {
  const body = {
    nama: (nama || '').trim(),
    email: (email || '').trim().toLowerCase(),
    role: role === 'owner' ? 'owner' : 'admin',
    password
  };

  if (!body.nama || !body.email || !body.password) {
    return {
      success: false,
      error: 'Nama, email, dan password wajib diisi.'
    };
  }

  try {
    // Panggil Edge Function untuk membuat user baru di Supabase Auth dan app_users.
    const { data, error } =
      await supabase.functions.invoke('create-user', {
        body
      });

    if (error) {
      console.error('Supabase Function Error:', error);
      throw error;
    }

    if (data?.success === false) {
      throw new Error(
        data.error ||
        data.message ||
        'Gagal membuat pengguna.'
      );
    }

    return {
      success: true,
      data
    };

  } catch (error) {
    // Tangani error dari Edge Function dengan menampilkan pesan yang lebih informative.
    console.error(
      'Edge Function create-user gagal:',
      error
    );

    return {
      success: false,
      error: error?.message || 'Gagal membuat pengguna.'
    };
  }
}

/**
 * Update role pengguna melalui Edge Function 'update-user-role'.
 * Tidak dapat mengubah role akun sendiri (menghindari lockout).
 * @param {string} email - Email pengguna yang akan diUbah.
 * @param {string} newRole - Role baru (owner/admin).
 * @returns {Promise<{success: boolean, error?: string, user?: object}>}
 */
export async function updateAppUserRole(email, newRole) {
  const normEmail = (email || '').trim().toLowerCase();

  if (!normEmail || !['owner', 'admin'].includes(newRole)) {
    return {
      success: false,
      error: 'Email atau peran pengguna tidak valid.'
    };
  }

  // Jangan izinkan mengubah role akun sendiri.
  if (authState.user?.email === normEmail) {
    return {
      success: false,
      error: 'Tidak dapat mengubah peran akun yang sedang Anda gunakan.'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'update-user-role',
      {
        body: {
          email: normEmail,
          role: newRole
        }
      }
    );

    if (error) {
      console.error('Supabase Function Error:', error);
      throw error;
    }

    if (data?.success === false) {
      throw new Error(
        data.error ||
        data.message ||
        'Edge Function gagal mengubah role pengguna.'
      );
    }

    return {
      success: true,
      user: data.data
    };

  } catch (error) {
    // Tangani error dengan try parsing response JSON, jika gagal gunakan pesan error SDK.
    console.error(
      'Edge Function update-user-role gagal:',
      error
    );

    return {
      success: false,
      error: await getEdgeFunctionErrorMessage(
        error,
        'Gagal mengubah peran pengguna.'
      )
    };
  }
}

/**
 * Hapus pengguna melalui Edge Function 'delete-user'.
 * Tidak dapat menghapus akun sendiri.
 * @param {string} email - Email pengguna yang akan dihapus.
 * @returns {Promise<{success: boolean, error?: string, data?: object}>}
 */
export async function deleteAppUser(email) {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail) return { success: false, error: 'Email pengguna tidak valid.' };
  if (authState.user?.email === normEmail) {
    return { success: false, error: 'Tidak dapat menghapus akun yang sedang Anda gunakan.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { email: normEmail }
    });
    if (error) throw error;
    if (data?.success === false) throw new Error(data.error || data.message || 'Edge Function gagal menghapus pengguna.');
    return { success: true, data };
  } catch (error) {
    // Ekstrak pesan error dari response Edge Function untuk informasi yang lebih jelas.
    console.error('Edge Function delete-user gagal:', error);
    return { success: false, error: await getEdgeFunctionErrorMessage(error, 'Gagal menghapus pengguna.') };
  }
}