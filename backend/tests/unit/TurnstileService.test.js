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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verify', () => {
    it('returns success:true with failOpen when token is null/undefined/empty', async () => {
      expect(await turnstileService.verify(null)).toEqual({ success: true, failOpen: true });
      expect(await turnstileService.verify(undefined)).toEqual({ success: true, failOpen: true });
      expect(await turnstileService.verify('')).toEqual({ success: true, failOpen: true });
      expect(fetchMock).not.toHaveBeenCalled();
    });

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
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Turnstile verification rejected')
      );
    });

    it('returns success:true with failOpen on network timeout', async () => {
      fetchMock.mockRejectedValue(new Error('The operation was aborted'));
      const result = await turnstileService.verify('token', '1.2.3.4');
      expect(result).toEqual({ success: true, failOpen: true });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('fail-open')
      );
    });

    it('returns success:true with failOpen on fetch error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      const result = await turnstileService.verify('token', '1.2.3.4');
      expect(result).toEqual({ success: true, failOpen: true });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('fail-open')
      );
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
