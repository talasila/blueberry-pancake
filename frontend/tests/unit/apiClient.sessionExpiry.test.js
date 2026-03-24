import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We test the ApiClient class directly (not the singleton) so each test gets a fresh instance.
// This avoids cross-test pollution from the singleton's constructor side-effects.

let ApiClient;
// Collect every client created so we can tear down their listeners
let clients = [];

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('localStorage', {
    _store: {},
    getItem(key) { return this._store[key] ?? null; },
    setItem(key, val) { this._store[key] = val; },
    removeItem(key) { delete this._store[key]; },
    get length() { return Object.keys(this._store).length; },
    key(i) { return Object.keys(this._store)[i] ?? null; },
    clear() { this._store = {}; },
  });

  vi.resetModules();
  const mod = await import('../../src/services/apiClient.js');
  const OrigClass = mod.default.constructor;

  // Remove the module singleton's listener
  if (mod.default._onVisibilityChange) {
    document.removeEventListener('visibilitychange', mod.default._onVisibilityChange);
  }

  // Wrap constructor so we can track instances for cleanup
  ApiClient = function (...args) {
    const instance = new OrigClass(...args);
    clients.push(instance);
    return instance;
  };
});

afterEach(() => {
  for (const c of clients) {
    if (c._onVisibilityChange) {
      document.removeEventListener('visibilitychange', c._onVisibilityChange);
    }
  }
  clients = [];
  vi.restoreAllMocks();
});

describe('apiClient — session-expired dispatch on 401', () => {
  it('should dispatch session-expired when 401 occurs and refresh fails', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'user@test.com', exp: 9999999999, authMethod: 'pin' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    // First fetch: 401 response
    // Second fetch: refresh also fails (401)
    // Third fetch: CSRF token fetch
    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'tok' }) }) // CSRF
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ error: 'Unauthorized' }) }) // main request
      .mockResolvedValueOnce({ ok: false, status: 401 }); // refresh

    try {
      await client.post('/events/ABCD1234/ratings', { rating: 4 });
    } catch {
      // Expected to throw
    }

    const sessionExpiredEvents = dispatchSpy.mock.calls
      .filter(([e]) => e.type === 'session-expired');

    expect(sessionExpiredEvents).toHaveLength(1);
    expect(sessionExpiredEvents[0][0].detail).toEqual({
      authMethod: 'pin',
      email: 'user@test.com',
      eventId: 'ABCD1234',
    });
  });

  it('should NOT dispatch session-expired when refresh succeeds (OTP user)', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'user@test.com', exp: 9999999999, authMethod: 'otp' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'tok' }) }) // CSRF
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ error: 'Unauthorized' }) }) // main request 401
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { email: 'user@test.com', exp: 9999999999 } }) }) // refresh success
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // retry succeeds

    await client.post('/events/ABCD1234/ratings', { rating: 4 });

    const sessionExpiredEvents = dispatchSpy.mock.calls
      .filter(([e]) => e.type === 'session-expired');

    expect(sessionExpiredEvents).toHaveLength(0);
  });

  it('should include eventId extracted from endpoint URL', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'admin@test.com', exp: 9999999999, authMethod: 'otp' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fetch
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) }) // main request
      .mockResolvedValueOnce({ ok: false, status: 401 }); // refresh fails

    try {
      await client.get('/events/WXYZ5678/dashboard');
    } catch {
      // Expected
    }

    const event = dispatchSpy.mock.calls.find(([e]) => e.type === 'session-expired');
    expect(event[0].detail.eventId).toBe('WXYZ5678');
    expect(event[0].detail.authMethod).toBe('otp');
  });
});

describe('apiClient — credential vs session error code routing', () => {
  it('should NOT dispatch session-expired when 401 has INVALID_PIN code', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'guest@test.com', exp: 9999999999, authMethod: 'pin' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'tok' }) })
      .mockResolvedValueOnce({
        status: 401, ok: false,
        json: async () => ({ error: 'Invalid PIN', code: 'INVALID_PIN' })
      });

    try {
      await client.post('/events/ABCD1234/verify-pin', { pin: '000000' });
    } catch (err) {
      expect(err.message).toBe('Invalid PIN');
    }

    const sessionExpiredEvents = dispatchSpy.mock.calls.filter(([e]) => e.type === 'session-expired');
    expect(sessionExpiredEvents).toHaveLength(0);
  });

  it('should dispatch session-expired when 401 has TOKEN_EXPIRED code', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'user@test.com', exp: 9999999999, authMethod: 'pin' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fetch
      .mockResolvedValueOnce({
        status: 401, ok: false,
        json: async () => ({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
      });

    try {
      await client.get('/events/ABCD1234/ratings');
    } catch {
      // Expected
    }

    const sessionExpiredEvents = dispatchSpy.mock.calls.filter(([e]) => e.type === 'session-expired');
    expect(sessionExpiredEvents).toHaveLength(1);
    expect(sessionExpiredEvents[0][0].detail).toEqual({
      authMethod: 'pin',
      email: 'user@test.com',
      eventId: 'ABCD1234',
    });
  });

  it('should dispatch session-expired when 401 has no code (backward compat)', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'user@test.com', exp: 9999999999, authMethod: 'pin' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fetch
      .mockResolvedValueOnce({
        status: 401, ok: false,
        json: async () => ({ error: 'Unauthorized' })
      });

    try {
      await client.get('/events/ABCD1234/ratings');
    } catch {
      // Expected
    }

    const sessionExpiredEvents = dispatchSpy.mock.calls.filter(([e]) => e.type === 'session-expired');
    expect(sessionExpiredEvents).toHaveLength(1);
  });

  it('should NOT dispatch session-expired for /verify-pin URL regardless of code', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'guest@test.com', exp: 9999999999, authMethod: 'pin' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'tok' }) })
      .mockResolvedValueOnce({
        status: 401, ok: false,
        json: async () => ({ error: 'Some error' })
      });

    try {
      await client.post('/events/ABCD1234/verify-pin', { pin: '999999' });
    } catch {
      // Expected
    }

    const sessionExpiredEvents = dispatchSpy.mock.calls.filter(([e]) => e.type === 'session-expired');
    expect(sessionExpiredEvents).toHaveLength(0);
  });

  it('should NOT dispatch session-expired when 401 has SUSPENDED code', async () => {
    const client = new ApiClient();
    client.setUserSession({ email: 'user@test.com', exp: 9999999999, authMethod: 'otp' });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ csrfToken: 'tok' }) })
      .mockResolvedValueOnce({
        status: 401, ok: false,
        json: async () => ({ error: 'Account suspended', code: 'SUSPENDED' })
      });

    try {
      await client.post('/auth/otp/verify', { email: 'user@test.com', otp: '123456' });
    } catch (err) {
      expect(err.message).toBe('Account suspended');
    }

    const sessionExpiredEvents = dispatchSpy.mock.calls.filter(([e]) => e.type === 'session-expired');
    expect(sessionExpiredEvents).toHaveLength(0);
  });
});

describe('apiClient — visibilitychange listener', () => {
  it('should attempt refresh when tab becomes visible and token is expired', async () => {
    localStorage.setItem('userSession', JSON.stringify({
      email: 'user@test.com',
      exp: Math.floor(Date.now() / 1000) - 3600,
      authMethod: 'pin',
    }));

    const client = new ApiClient();

    // Refresh succeeds
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { email: 'user@test.com', exp: 9999999999, authMethod: 'pin' } }),
    });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    // Simulate tab becoming visible
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Wait for async refresh
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // No session-expired event since refresh succeeded
    const sessionExpiredEvents = dispatchSpy.mock.calls
      .filter(([e]) => e.type === 'session-expired');
    expect(sessionExpiredEvents).toHaveLength(0);
  });

  it('should dispatch session-expired when tab becomes visible and refresh fails', async () => {
    localStorage.setItem('userSession', JSON.stringify({
      email: 'user@test.com',
      exp: Math.floor(Date.now() / 1000) - 3600,
      authMethod: 'pin',
    }));

    const client = new ApiClient();

    // Refresh fails
    fetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await vi.waitFor(() => {
      const events = dispatchSpy.mock.calls.filter(([e]) => e.type === 'session-expired');
      expect(events).toHaveLength(1);
      expect(events[0][0].detail.authMethod).toBe('pin');
      expect(events[0][0].detail.email).toBe('user@test.com');
    });
  });

  it('should NOT attempt refresh when token is still valid', async () => {
    localStorage.setItem('userSession', JSON.stringify({
      email: 'user@test.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      authMethod: 'pin',
    }));

    const client = new ApiClient();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should NOT fire when tab is hidden', async () => {
    localStorage.setItem('userSession', JSON.stringify({
      email: 'user@test.com',
      exp: Math.floor(Date.now() / 1000) - 3600,
      authMethod: 'pin',
    }));

    const client = new ApiClient();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(fetch).not.toHaveBeenCalled();
  });
});
