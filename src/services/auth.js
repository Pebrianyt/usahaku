import { reactive } from 'vue';
import { supabase } from '@/services/supabase';

export const DEFAULT_PASSWORD = 'adm1nusahaku';

export const REGISTERED_USERS = {
  'kholan.childs404@gmail.com': { name: 'KHOLAN MUSTAQIM' },
  'kartikaniadewi@gmail.com': { name: 'NIA DEWI KARTIKA' },
  'muhammadridhaby@gmail.com': { name: 'M RIDHABY' },
  'pebrianyrstn@gmail.com': { name: 'PEBRIAN YURISTIANA' },
  'siswanto7612@gmail.com': { name: 'SISWANTO' }
};

export function getInitials(name) {
  if (!name) return 'U';

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


/* =========================================================
   STORAGE
========================================================= */

const safeStorage = {
  getItem(key) {
    try {
      return typeof window !== 'undefined' &&
        window.localStorage
        ? window.localStorage.getItem(key)
        : null;
    } catch (e) {
      return null;
    }
  },

  setItem(key, value) {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage
      ) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}
  },

  removeItem(key) {
    try {
      if (
        typeof window !== 'undefined' &&
        window.localStorage
      ) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
  }
};


/* =========================================================
   AUTH STATE
========================================================= */

function buildUserObject(user) {
  if (!user) return null;

  const email = user.email?.toLowerCase() || '';

  const registered = REGISTERED_USERS[email];

  const name =
    user.user_metadata?.full_name ||
    registered?.name ||
    email.split('@')[0].toUpperCase();

  return {
    id: user.id,
    email,
    name,
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
    const {
      data,
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error(
        'Gagal mengambil session Supabase:',
        error
      );

      authState.session = null;
      authState.user = null;
      return;
    }

    const session = data?.session || null;

    authState.session = session;

    if (session?.user) {
      const userObj = buildUserObject(session.user);

      authState.user = userObj;

      safeStorage.setItem(
        'usahaku_auth_user',
        JSON.stringify(userObj)
      );

      console.log(
        'Supabase session ditemukan:',
        userObj.email
      );
    } else {
      authState.user = null;
      safeStorage.removeItem(
        'usahaku_auth_user'
      );

      console.log(
        'Tidak ada Supabase session.'
      );
    }
  } catch (error) {
    console.error(
      'Error initializeAuth:',
      error
    );

    authState.session = null;
    authState.user = null;
  } finally {
    authState.isLoaded = true;
  }
}


/* Jalankan saat module dimuat */
initializeAuth();


/* =========================================================
   AUTH STATE CHANGE
========================================================= */

supabase.auth.onAuthStateChange(
  (event, session) => {

    console.log(
      'Supabase Auth Event:',
      event
    );

    authState.session = session;

    if (session?.user) {

      const userObj = buildUserObject(
        session.user
      );

      authState.user = userObj;

      safeStorage.setItem(
        'usahaku_auth_user',
        JSON.stringify(userObj)
      );

    } else {

      authState.user = null;

      safeStorage.removeItem(
        'usahaku_auth_user'
      );
    }
  }
);


/* =========================================================
   LOGIN
========================================================= */

export async function loginUser(
  emailInput,
  passwordInput
) {

  const email =
    emailInput.trim().toLowerCase();

  const password = passwordInput;

  if (!email || !password) {
    return {
      success: false,
      error: 'Email dan password wajib diisi.'
    };
  }

  console.log(
    'Mencoba login Supabase:',
    email
  );

  const {
    data,
    error
  } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {

    console.error(
      'Login Supabase gagal:',
      error
    );

    return {
      success: false,
      error:
        error.message ||
        'Email atau password salah.'
    };
  }

  if (!data?.session || !data?.user) {

    console.error(
      'Login berhasil tetapi session tidak ditemukan:',
      data
    );

    return {
      success: false,
      error:
        'Login berhasil tetapi session Supabase tidak terbentuk.'
    };
  }

  const userObj =
    buildUserObject(data.user);

  authState.user = userObj;
  authState.session = data.session;

  safeStorage.setItem(
    'usahaku_auth_user',
    JSON.stringify(userObj)
  );

  console.log(
    'Login berhasil:',
    userObj
  );

  console.log(
    'Session tersedia:',
    !!authState.session
  );

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

    const {
      error
    } = await supabase.auth.signOut();

    if (error) {
      console.error(
        'Supabase signOut error:',
        error
      );
    }

  } catch (e) {

    console.error(
      'Sign out error:',
      e
    );

  } finally {

    authState.user = null;
    authState.session = null;

    safeStorage.removeItem(
      'usahaku_auth_user'
    );
  }
}


/* =========================================================
   CHANGE PASSWORD
========================================================= */

export async function changePassword(
  currentPassword,
  newPassword
) {

  if (!authState.session || !authState.user) {
    return {
      success: false,
      error: 'Pengguna belum login ke Supabase.'
    };
  }

  const email = authState.user.email;

  if (!email) {
    return {
      success: false,
      error: 'Email pengguna tidak ditemukan.'
    };
  }

  /* -----------------------------------------
     Verifikasi password lama
  ----------------------------------------- */

  const {
    error: verifyError
  } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  if (verifyError) {

    return {
      success: false,
      error: 'Password sekarang tidak sesuai.'
    };
  }


  /* -----------------------------------------
     Update password
  ----------------------------------------- */

  const {
    error: updateError
  } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {

    console.error(
      'Gagal update password:',
      updateError
    );

    return {
      success: false,
      error: updateError.message
    };
  }


  return {
    success: true
  };
}