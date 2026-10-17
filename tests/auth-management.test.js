import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn()
    },
    from: vi.fn(),
    functions: { invoke: vi.fn() }
  }
}));

vi.mock('../src/services/supabase.js', () => ({ supabase: supabaseMock }));

describe('user management service', () => {
  let auth;
  let query;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    supabaseMock.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    query = { select: vi.fn(), order: vi.fn() };
    query.select.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [{ email: 'a@example.test' }], error: null });
    supabaseMock.from.mockReturnValue(query);
    supabaseMock.functions.invoke.mockResolvedValue({ data: { success: true, data: { id: 'new-user' } }, error: null });
    auth = await import('../src/services/auth.js');
    await auth.authReady;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('normalizes create-user input and restricts roles to owner or admin', async () => {
    const result = await auth.createNewUser({ nama: '  Nia Dewi ', email: ' NIA@EXAMPLE.TEST ', role: 'unknown', password: 'secret' });

    expect(result).toEqual({ success: true, data: { success: true, data: { id: 'new-user' } } });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('create-user', {
      body: { nama: 'Nia Dewi', email: 'nia@example.test', role: 'admin', password: 'secret' }
    });
  });

  it('rejects incomplete create-user input without invoking the Edge Function', async () => {
    await expect(auth.createNewUser({ nama: 'Nia', email: 'nia@example.test', password: '' })).resolves.toEqual({
      success: false, error: 'Nama, email, dan password wajib diisi.'
    });
    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
  });

  it('returns Edge Function payload errors when creating a user', async () => {
    supabaseMock.functions.invoke.mockResolvedValue({ data: { success: false, error: 'Email sudah terdaftar.' }, error: null });

    await expect(auth.createNewUser({ nama: 'Nia', email: 'nia@example.test', role: 'owner', password: 'secret' })).resolves.toEqual({
      success: false, error: 'Email sudah terdaftar.'
    });
  });

  it('lists app users in creation order and surfaces query failures', async () => {
    await expect(auth.fetchAppUsers()).resolves.toEqual([{ email: 'a@example.test' }]);
    expect(supabaseMock.from).toHaveBeenCalledWith('app_users');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true });

    query.order.mockResolvedValueOnce({ data: null, error: { message: 'query failed' } });
    await expect(auth.fetchAppUsers()).rejects.toThrow('query failed');
  });

  it('normalizes and invokes role updates for another user', async () => {
    await expect(auth.updateAppUserRole(' OTHER@EXAMPLE.TEST ', 'owner')).resolves.toEqual({
      success: true, user: { id: 'new-user' }
    });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('update-user-role', {
      body: { email: 'other@example.test', role: 'owner' }
    });
  });

  it('normalizes and invokes user deletion, and reports Edge Function errors', async () => {
    await expect(auth.deleteAppUser(' OTHER@EXAMPLE.TEST ')).resolves.toEqual({
      success: true, data: { success: true, data: { id: 'new-user' } }
    });
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith('delete-user', { body: { email: 'other@example.test' } });

    supabaseMock.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'request failed' } });
    await expect(auth.deleteAppUser('other@example.test')).resolves.toEqual({ success: false, error: 'request failed' });
  });

  it('verifies the current password and updates it only after verification succeeds', async () => {
    auth.authState.session = { user: { email: 'owner@example.test' } };
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });

    await expect(auth.changePassword('old', 'new')).resolves.toEqual({ success: true });
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'owner@example.test', password: 'old' });
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: 'new' });
  });
});
