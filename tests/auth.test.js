import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn()
    },
    from: vi.fn(),
    functions: { invoke: vi.fn() }
  }
}));

vi.mock('../src/services/supabase.js', () => ({ supabase: supabaseMock }));

describe('authentication service', () => {
  let auth;
  let profileQuery;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    profileQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn()
    };
    profileQuery.select.mockReturnValue(profileQuery);
    profileQuery.eq.mockReturnValue(profileQuery);
    supabaseMock.from.mockReturnValue(profileQuery);
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.test' }, session: { user: { id: 'user-1' } } },
      error: null
    });
    profileQuery.maybeSingle.mockResolvedValue({
      data: { email: 'owner@example.test', nama: 'Pemilik Usaha', role: 'owner' },
      error: null
    });
    auth = await import('../src/services/auth.js');
    await auth.authReady;
  });

  afterEach(() => vi.restoreAllMocks());

  it('rejects empty login inputs without calling Supabase', async () => {
    const result = await auth.loginUser('  ', '');

    expect(result).toEqual({ success: false, error: 'Email dan password wajib diisi.' });
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('normalizes email, loads the app profile, and updates auth state on login', async () => {
    const result = await auth.loginUser(' OWNER@EXAMPLE.TEST ', 'test-password');

    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'owner@example.test', password: 'test-password'
    });
    expect(supabaseMock.from).toHaveBeenCalledWith('app_users');
    expect(profileQuery.select).toHaveBeenCalledWith('email, nama, role');
    expect(profileQuery.eq).toHaveBeenCalledWith('email', 'owner@example.test');
    expect(result.success).toBe(true);
    expect(result.user).toMatchObject({ id: 'user-1', email: 'owner@example.test', name: 'Pemilik Usaha', role: 'owner', initials: 'PU' });
    expect(auth.authState.user).toEqual(result.user);
    expect(auth.authState.session).toEqual(result.session);
  });

  it('does not authenticate when the app profile query fails', async () => {
    profileQuery.maybeSingle.mockResolvedValue({ data: null, error: { message: 'database unavailable' } });

    const result = await auth.loginUser('owner@example.test', 'test-password');

    expect(result).toEqual({ success: false, error: 'database unavailable' });
    expect(auth.authState.user).toBeNull();
  });

  it('rejects a successful SDK response without a user and session', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

    const result = await auth.loginUser('owner@example.test', 'test-password');

    expect(result).toEqual({ success: false, error: 'Supabase tidak mengembalikan sesi login yang valid.' });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('clears local auth state after logout succeeds', async () => {
    auth.authState.user = { email: 'owner@example.test' };
    auth.authState.session = { user: { email: 'owner@example.test' } };
    auth.authState.error = 'stale error';

    await expect(auth.logoutUser()).resolves.toEqual({ success: true });
    expect(auth.authState).toMatchObject({ user: null, session: null, error: null });
  });

  it('preserves local auth state if Supabase logout fails', async () => {
    const user = { email: 'owner@example.test' };
    const session = { user };
    auth.authState.user = user;
    auth.authState.session = session;
    supabaseMock.auth.signOut.mockResolvedValue({ error: { message: 'sign out failed' } });

    await expect(auth.logoutUser()).resolves.toEqual({ success: false, error: 'sign out failed' });
    expect(auth.authState.user).toEqual(user);
    expect(auth.authState.session).toEqual(session);
  });

  it('requires a current session before attempting password changes', async () => {
    await expect(auth.changePassword('current', 'next')).resolves.toEqual({
      success: false, error: 'Sesi login tidak ditemukan. Silakan masuk kembali.'
    });
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('verifies the current password before updating it', async () => {
    auth.authState.session = { user: { email: 'owner@example.test' } };
    supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { message: 'invalid' } });

    await expect(auth.changePassword('wrong', 'next')).resolves.toEqual({
      success: false, error: 'Password sekarang tidak sesuai.'
    });
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it('blocks self role changes even when email casing differs', async () => {
    auth.authState.user = { email: 'owner@example.test' };

    await expect(auth.updateAppUserRole(' OWNER@EXAMPLE.TEST ', 'admin')).resolves.toEqual({
      success: false, error: 'Tidak dapat mengubah peran akun yang sedang Anda gunakan.'
    });
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
  });

  it('blocks deleting the current account', async () => {
    auth.authState.user = { email: 'owner@example.test' };

    await expect(auth.deleteAppUser('owner@example.test')).resolves.toEqual({
      success: false, error: 'Tidak dapat menghapus akun yang sedang Anda gunakan.'
    });
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
  });
});
