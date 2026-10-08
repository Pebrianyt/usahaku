import { reactive } from 'vue';
import { supabase } from '@/services/supabase';

export const DEFAULT_ADMIN_PASSWORD = 'adm1nusahaku';
export const DEFAULT_OWNER_PASSWORD = 'ownerusahaku';
export const DEFAULT_PASSWORD = DEFAULT_ADMIN_PASSWORD;

export const INITIAL_USERS = {
  'yangpunya@gmail.com': { name: 'OWNER USAHAKU', role: 'owner', defaultPw: DEFAULT_OWNER_PASSWORD },
  'kholan.childs404@gmail.com': { name: 'KHOLAN MUSTAQIM', role: 'admin', defaultPw: DEFAULT_ADMIN_PASSWORD },
  'kartikaniadewi@gmail.com': { name: 'NIA DEWI KARTIKA', role: 'admin', defaultPw: DEFAULT_ADMIN_PASSWORD },
  'muhammadridhaby@gmail.com': { name: 'M RIDHABY', role: 'admin', defaultPw: DEFAULT_ADMIN_PASSWORD },
  'pebrianyrstn@gmail.com': { name: 'PEBRIAN YURISTIANA', role: 'admin', defaultPw: DEFAULT_ADMIN_PASSWORD },
  'siswanto7612@gmail.com': { name: 'SISWANTO', role: 'admin', defaultPw: DEFAULT_ADMIN_PASSWORD }
};
export const REGISTERED_USERS = INITIAL_USERS;

export function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* =========================================================
   STORAGE
========================================================= */

const safeStorage = {
  getItem(key) {
    try {
      return typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(key)
        : null;
    } catch (e) {
      return null;
    }
  },
  setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}
  },
  removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
  }
};

/* =========================================================
   AUTH STATE
========================================================= */

function getStoredCustomUsers() {
  try {
    const raw = safeStorage.getItem('usahaku_custom_users');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveStoredCustomUsers(usersMap) {
  safeStorage.setItem('usahaku_custom_users', JSON.stringify(usersMap));
}

export function getAllKnownUsers() {
  const custom = getStoredCustomUsers();
  return { ...INITIAL_USERS, ...custom };
}

function resolveUserRole(email, userMetadata) {
  const normalized = (email || '').toLowerCase();
  if (userMetadata?.role) return userMetadata.role;

  const allKnown = getAllKnownUsers();
  if (allKnown[normalized]?.role) return allKnown[normalized].role;

  return 'admin';
}

function buildUserObject(user) {
  if (!user) return null;

  const email = user.email?.toLowerCase() || '';
  const allKnown = getAllKnownUsers();
  const known = allKnown[email];

  const name =
    user.user_metadata?.full_name ||
    known?.name ||
    email.split('@')[0].toUpperCase();

  const role = resolveUserRole(email, user.user_metadata);

  return {
    id: user.id,
    email,
    name,
    role,
    initials: getInitials(name)
  };
}

export const authState = reactive({
  user: null,
  session: null,
  isLoaded: false
});

/* =========================================================
   INITIAL SESSION
========================================================= */

async function initializeAuth() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Gagal mengambil session Supabase:', error);
      authState.session = null;
      authState.user = null;
      return;
    }

    const session = data?.session || null;
    authState.session = session;

    if (session?.user) {
      const userObj = buildUserObject(session.user);
      
      // Attempt to load role from public.app_users if available
      try {
        const { data: dbUser } = await supabase
          .from('app_users')
          .select('role, nama')
          .eq('email', userObj.email)
          .maybeSingle();

        if (dbUser?.role) {
          userObj.role = dbUser.role;
          if (dbUser.nama) userObj.name = dbUser.nama;
          userObj.initials = getInitials(userObj.name);
        }
      } catch (err) {
        // Fallback to resolved role
      }

      authState.user = userObj;
      safeStorage.setItem('usahaku_auth_user', JSON.stringify(userObj));
    } else {
      authState.user = null;
      safeStorage.removeItem('usahaku_auth_user');
    }
  } catch (error) {
    console.error('Error initializeAuth:', error);
    authState.session = null;
    authState.user = null;
  } finally {
    authState.isLoaded = true;
  }
}

// Run on module load
initializeAuth();

/* =========================================================
   AUTH STATE CHANGE
========================================================= */

supabase.auth.onAuthStateChange(async (event, session) => {
  authState.session = session;

  if (session?.user) {
    const userObj = buildUserObject(session.user);

    try {
      const { data: dbUser } = await supabase
        .from('app_users')
        .select('role, nama')
        .eq('email', userObj.email)
        .maybeSingle();

      if (dbUser?.role) {
        userObj.role = dbUser.role;
        if (dbUser.nama) userObj.name = dbUser.nama;
        userObj.initials = getInitials(userObj.name);
      }
    } catch (err) {}

    authState.user = userObj;
    safeStorage.setItem('usahaku_auth_user', JSON.stringify(userObj));
  } else {
    authState.user = null;
    safeStorage.removeItem('usahaku_auth_user');
  }
});

/* =========================================================
   LOGIN
========================================================= */

export async function loginUser(emailInput, passwordInput) {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput;

  if (!email || !password) {
    return {
      success: false,
      error: 'Email dan password wajib diisi.'
    };
  }

  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  const allKnown = getAllKnownUsers();
  const known = allKnown[email];

  // Auto sign-up / register fallback if user not in auth yet
  if (error && known) {
    const expectedPw = known.defaultPw || DEFAULT_ADMIN_PASSWORD;
    const storedPw = safeStorage.getItem(`usahaku_pwd_${email}`);
    const isCorrectPw = password === expectedPw || password === storedPw;

    if (isCorrectPw || password.length >= 6) {
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: known.name,
              role: known.role
            }
          }
        });

        if (!signUpError && signUpData?.user) {
          data = signUpData;
          error = null;
          if (!signUpData.session) {
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (!retry.error) {
              data = retry.data;
              error = null;
            }
          }
        }
      } catch (e) {}
    }
  }

  // Local fallback if Supabase auth fails (offline / unmigrated)
  if (error) {
    if (known) {
      const expectedPw = known.defaultPw || DEFAULT_ADMIN_PASSWORD;
      const storedPw = safeStorage.getItem(`usahaku_pwd_${email}`);
      if (password === expectedPw || password === storedPw) {
        const userObj = {
          id: 'local_' + email.replace(/[^a-z0-9]/g, '_'),
          email,
          name: known.name,
          role: known.role || 'admin',
          initials: getInitials(known.name)
        };
        authState.user = userObj;
        safeStorage.setItem('usahaku_auth_user', JSON.stringify(userObj));
        return { success: true, user: userObj };
      }
    }
    return {
      success: false,
      error: error.message || 'Email atau password salah.'
    };
  }

  const userObj = buildUserObject(data.user);

  // Sync role from app_users table
  try {
    const { data: dbUser } = await supabase
      .from('app_users')
      .select('role, nama')
      .eq('email', email)
      .maybeSingle();

    if (dbUser?.role) {
      userObj.role = dbUser.role;
      if (dbUser.nama) userObj.name = dbUser.nama;
      userObj.initials = getInitials(userObj.name);
    }
  } catch (e) {}

  authState.user = userObj;
  authState.session = data.session;
  safeStorage.setItem('usahaku_auth_user', JSON.stringify(userObj));

  return {
    success: true,
    user: userObj,
    session: data.session
  };
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logoutUser() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Sign out error:', e);
  } finally {
    authState.user = null;
    authState.session = null;
    safeStorage.removeItem('usahaku_auth_user');
  }
}

/* =========================================================
   CHANGE PASSWORD
========================================================= */

export async function changePassword(currentPassword, newPassword) {
  if (!authState.user) {
    return { success: false, error: 'Pengguna belum login.' };
  }

  const email = authState.user.email;
  const known = getAllKnownUsers()[email];
  const expectedDefault = known?.defaultPw || DEFAULT_ADMIN_PASSWORD;
  const storedLocal = safeStorage.getItem(`usahaku_pwd_${email}`);

  // Verify current password via Supabase
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  const isLocalMatch = currentPassword === expectedDefault || currentPassword === storedLocal;

  if (verifyError && !isLocalMatch) {
    return { success: false, error: 'Password sekarang tidak sesuai.' };
  }

  // Update password in Supabase
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    if (isLocalMatch) {
      safeStorage.setItem(`usahaku_pwd_${email}`, newPassword);
      return { success: true };
    }
    return { success: false, error: updateError.message };
  }

  safeStorage.setItem(`usahaku_pwd_${email}`, newPassword);
  return { success: true };
}

/* =========================================================
   USER MANAGEMENT (Halaman Users)
========================================================= */

export async function fetchAppUsers() {
  // 1. Try to fetch from Supabase app_users table
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      // Merge with custom local additions if any
      const custom = getStoredCustomUsers();
      const existingEmails = new Set(data.map(u => u.email.toLowerCase()));
      
      const combined = [...data];
      Object.keys(custom).forEach(email => {
        if (!existingEmails.has(email)) {
          combined.push({
            id: 'local_' + email.replace(/[^a-z0-9]/g, '_'),
            email,
            nama: custom[email].name,
            role: custom[email].role,
            created_at: new Date().toISOString()
          });
        }
      });
      return combined;
    }
  } catch (e) {
    console.warn('Fetch from app_users table failed, falling back to local list:', e);
  }

  // 2. Fallback to INITIAL_USERS + custom users
  const allKnown = getAllKnownUsers();
  return Object.keys(allKnown).map((email, idx) => ({
    id: 'user_' + (idx + 1),
    email,
    nama: allKnown[email].name,
    role: allKnown[email].role || 'admin',
    created_at: new Date().toISOString()
  }));
}

export async function createNewUser({ nama, email, role, password }) {
  const normEmail = email.trim().toLowerCase();
  const cleanNama = nama.trim();
  const userRole = role === 'owner' ? 'owner' : 'admin';

  // 1. Try creating via Supabase signUp
  try {
    await supabase.auth.signUp({
      email: normEmail,
      password,
      options: {
        data: {
          full_name: cleanNama,
          role: userRole
        }
      }
    });
  } catch (e) {
    console.warn('Supabase signUp error (might need admin token):', e);
  }

  // 2. Try inserting into app_users table
  try {
    await supabase.from('app_users').upsert({
      email: normEmail,
      nama: cleanNama,
      role: userRole
    }, { onConflict: 'email' });
  } catch (e) {
    console.warn('Insert to app_users table error:', e);
  }

  // 3. Save to local custom users storage so login works right away
  const custom = getStoredCustomUsers();
  custom[normEmail] = {
    name: cleanNama,
    role: userRole,
    defaultPw: password
  };
  saveStoredCustomUsers(custom);
  safeStorage.setItem(`usahaku_pwd_${normEmail}`, password);

  return { success: true };
}

export async function updateAppUserRole(email, newRole) {
  const normEmail = email.trim().toLowerCase();
  const validRole = newRole === 'owner' ? 'owner' : 'admin';

  // 1. Update in Supabase app_users table
  try {
    await supabase
      .from('app_users')
      .update({ role: validRole })
      .eq('email', normEmail);
  } catch (e) {
    console.warn('Update role in app_users failed:', e);
  }

  // 2. Update in local storage
  const custom = getStoredCustomUsers();
  if (custom[normEmail]) {
    custom[normEmail].role = validRole;
    saveStoredCustomUsers(custom);
  } else if (INITIAL_USERS[normEmail]) {
    custom[normEmail] = {
      ...INITIAL_USERS[normEmail],
      role: validRole
    };
    saveStoredCustomUsers(custom);
  }

  // If updating current logged in user
  if (authState.user && authState.user.email === normEmail) {
    authState.user.role = validRole;
    safeStorage.setItem('usahaku_auth_user', JSON.stringify(authState.user));
  }

  return { success: true };
}

export async function deleteAppUser(email) {
  const normEmail = email.trim().toLowerCase();

  // Cannot delete currently logged in user
  if (authState.user && authState.user.email === normEmail) {
    return { success: false, error: 'Tidak dapat menghapus akun yang sedang Anda gunakan.' };
  }

  // 1. Delete from app_users table
  try {
    await supabase
      .from('app_users')
      .delete()
      .eq('email', normEmail);
  } catch (e) {
    console.warn('Delete from app_users table failed:', e);
  }

  // 2. Delete from custom storage
  const custom = getStoredCustomUsers();
  delete custom[normEmail];
  saveStoredCustomUsers(custom);
  safeStorage.removeItem(`usahaku_pwd_${normEmail}`);

  return { success: true };
}
