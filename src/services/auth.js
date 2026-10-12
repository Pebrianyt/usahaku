import { reactive } from 'vue';
import { supabase } from '@/services/supabase';

export function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return (parts.length === 1
    ? parts[0].slice(0, 2)
    : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Remove credentials and user records saved by older client-side auth flows.
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

clearLegacyAuthStorage();

export const authState = reactive({
  user: null,
  session: null,
  isLoaded: false,
  error: null
});

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

async function applySession(session) {
  authState.session = session || null;
  authState.error = null;

  if (!session?.user) {
    authState.user = null;
    return null;
  }

  try {
    const profile = await loadAppUser(session.user);
    authState.user = profile;
    return profile;
  } catch (error) {
    authState.user = null;
    authState.error = error.message || 'Gagal memuat profil pengguna.';
    console.error('Gagal memuat profil app_users:', error);
    return null;
  }
}

export const authReady = (async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    await applySession(data?.session);
  } catch (error) {
    authState.session = null;
    authState.user = null;
    authState.error = error.message || 'Gagal memulihkan sesi Supabase.';
    console.error('Gagal memulihkan sesi Supabase:', error);
  } finally {
    authState.isLoaded = true;
  }
})();

// Supabase JS persists and refreshes the session in its configured storage.
// Keep Vue's reactive state in sync with sign-in, refresh, and sign-out events.
supabase.auth.onAuthStateChange((event, session) => {
  authState.session = session || null;
  if (!session?.user) {
    authState.user = null;
    authState.error = null;
    authState.isLoaded = true;
    return;
  }

  // Defer database work until after the auth callback to avoid blocking the
  // Supabase client's internal auth lock.
  Promise.resolve().then(() => applySession(session));
});

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

export async function changePassword(currentPassword, newPassword) {
  if (!authState.session?.user) {
    return { success: false, error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' };
  }
  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Password saat ini dan password baru wajib diisi.' };
  }

  try {
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

async function getEdgeFunctionErrorMessage(error, fallback) {
  const response = error?.context;
  if (response && typeof response.clone === 'function') {
    try {
      const payload = await response.clone().json();
      if (payload?.error || payload?.message) return payload.error || payload.message;
    } catch (parseError) {
      // The response may not contain JSON; fall back to the SDK error below.
    }
  }
  return error?.message || fallback;
}

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

export async function updateAppUserRole(email, newRole) {
  const normEmail = (email || '').trim().toLowerCase();

  if (!normEmail || !['owner', 'admin'].includes(newRole)) {
    return {
      success: false,
      error: 'Email atau peran pengguna tidak valid.'
    };
  }

  // Jangan izinkan mengubah role akun sendiri
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
    console.error('Edge Function delete-user gagal:', error);
    return { success: false, error: await getEdgeFunctionErrorMessage(error, 'Gagal menghapus pengguna.') };
  }
}
