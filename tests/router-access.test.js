import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authState, guardRegistration } = vi.hoisted(() => ({
  authState: { user: null },
  guardRegistration: { beforeEach: null }
}));

vi.mock('../src/services/auth.js', () => ({ authState, authReady: Promise.resolve() }));
vi.mock('vue-router', () => ({
  createWebHistory: vi.fn(() => ({})),
  createRouter: vi.fn(options => ({
    options,
    beforeEach: callback => { guardRegistration.beforeEach = callback; },
    afterEach: vi.fn()
  }))
}));

describe('route access guard', () => {
  let router;
  let routes;

  beforeEach(async () => {
    vi.resetModules();
    guardRegistration.beforeEach = null;
    authState.user = null;
    router = (await import('../src/router/index.js')).default;
    routes = router.options.routes;
  });

  async function navigate(path) {
    const route = routes.find(item => item.path === path);
    const next = vi.fn();
    await guardRegistration.beforeEach({ ...route, path }, {}, next);
    return next;
  }

  it('sends unauthenticated visitors to login for protected pages', async () => {
    expect(await navigate('/')).toHaveBeenCalledWith('/login');
    expect(await navigate('/master-data')).toHaveBeenCalledWith('/login');
  });

  it('allows public login and redirects signed-in users away from login', async () => {
    expect(await navigate('/login')).toHaveBeenCalledWith();
    authState.user = { email: 'owner@example.test', role: 'owner' };
    expect(await navigate('/login')).toHaveBeenCalledWith('/');
  });

  it('restricts owner routes and permits them to owners', async () => {
    authState.user = { email: 'staff@example.test', role: 'admin' };
    expect(await navigate('/master-data')).toHaveBeenCalledWith('/404');
    expect(await navigate('/')).toHaveBeenCalledWith();

    authState.user = { email: 'owner@example.test', role: 'owner' };
    expect(await navigate('/master-data')).toHaveBeenCalledWith();
    expect(await navigate('/users')).toHaveBeenCalledWith();
  });
});
