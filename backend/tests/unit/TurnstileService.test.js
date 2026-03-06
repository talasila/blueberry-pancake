import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

describe('TurnstileService', () => {
  let turnstileService;
  let fetchMock;
  let logSpy;
  let warnSpy;

  beforeEach(async () => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await import('../../src/services/TurnstileService.js');
    turnstileService = mod.default;
    turnstileService._resetCircuitBreaker();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verify — missing token (non-production)', () => {
    it('returns success:true with failOpen when token is null/undefined/empty', async () => {
      expect(await turnstileService.verify(null)).toEqual({ success: true, failOpen: true });
      expect(await turnstileService.verify(undefined)).toEqual({ success: true, failOpen: true });
      expect(await turnstileService.verify('')).toEqual({ success: true, failOpen: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('verify — missing token (production)', () => {
    let origNodeEnv;
    let origKey;

    beforeEach(() => {
      origNodeEnv = process.env.NODE_ENV;
      origKey = process.env.TURNSTILE_SECRET_KEY;
    });

    afterEach(() => {
      process.env.NODE_ENV = origNodeEnv;
      if (origKey !== undefined) process.env.TURNSTILE_SECRET_KEY = origKey;
      else delete process.env.TURNSTILE_SECRET_KEY;
      vi.resetModules();
    });

    it('returns success:false when token is missing in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TURNSTILE_SECRET_KEY = 'real-secret-key-for-test';
      vi.resetModules();
      const mod = await import('../../src/services/TurnstileService.js');
      const prodService = mod.default;

      const result = await prodService.verify(null, '1.2.3.4');
      expect(result).toEqual({ success: false, errorCodes: ['missing-input-response'] });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('verify — valid/invalid tokens', () => {
    it('returns success:true when Cloudflare returns success:true', async () => {
      fetchMock.mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
      const result = await turnstileService.verify('valid-token', '1.2.3.4');
      expect(result).toEqual({ success: true, errorCodes: [] });
      expect(fetchMock).toHaveBeenCalledWith(
        SITEVERIFY_URL,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({
        secret: expect.any(String),
        response: 'valid-token',
        remoteip: '1.2.3.4'
      });
    });

    it('returns success:false with errorCodes when Cloudflare returns success:false', async () => {
      const errorCodes = ['invalid-input-response'];
      fetchMock.mockResolvedValue({
        json: () => Promise.resolve({ success: false, 'error-codes': errorCodes })
      });
      const result = await turnstileService.verify('bad-token', '1.2.3.4');
      expect(result).toEqual({ success: false, errorCodes });
    });
  });

  describe('verify — circuit breaker', () => {
    it('fails open for the first consecutive failure', async () => {
      fetchMock.mockRejectedValue(new Error('The operation was aborted'));
      const result = await turnstileService.verify('token', '1.2.3.4');
      expect(result).toEqual({ success: true, failOpen: true });
    });

    it('fails open up to the threshold (5 failures)', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      for (let i = 0; i < 5; i++) {
        const result = await turnstileService.verify('token', '1.2.3.4');
        expect(result).toEqual({ success: true, failOpen: true });
      }
    });

    it('fails closed after exceeding the threshold', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      for (let i = 0; i < 5; i++) {
        await turnstileService.verify('token', '1.2.3.4');
      }
      const result = await turnstileService.verify('token', '1.2.3.4');
      expect(result).toEqual({ success: false, errorCodes: ['siteverify-unreachable'] });
    });

    it('resets after a successful verification', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      for (let i = 0; i < 4; i++) {
        await turnstileService.verify('token', '1.2.3.4');
      }

      fetchMock.mockResolvedValue({ json: () => Promise.resolve({ success: true }) });
      const ok = await turnstileService.verify('valid-token', '1.2.3.4');
      expect(ok.success).toBe(true);

      fetchMock.mockRejectedValue(new Error('Network error'));
      const afterReset = await turnstileService.verify('token', '1.2.3.4');
      expect(afterReset).toEqual({ success: true, failOpen: true });
    });
  });
});

describe('TurnstileService constructor', () => {
  it('throws when NODE_ENV=production and TURNSTILE_SECRET_KEY is missing', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origKey = process.env.TURNSTILE_SECRET_KEY;
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    delete process.env.TURNSTILE_SECRET_KEY;
    try {
      await expect(
        import('../../src/services/TurnstileService.js')
      ).rejects.toThrow('TURNSTILE_SECRET_KEY is required in production');
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      if (origKey !== undefined) process.env.TURNSTILE_SECRET_KEY = origKey;
    }
  });

  it('throws when NODE_ENV=production and secret equals test key', async () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origKey = process.env.TURNSTILE_SECRET_KEY;
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
    try {
      await expect(
        import('../../src/services/TurnstileService.js')
      ).rejects.toThrow('Turnstile test secret key is not allowed in production');
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      if (origKey !== undefined) process.env.TURNSTILE_SECRET_KEY = origKey;
      else delete process.env.TURNSTILE_SECRET_KEY;
    }
  });
});
