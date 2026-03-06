import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyTurnstile } from '../../src/middleware/turnstileProtection.js';

const { mockVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn()
}));
vi.mock('../../src/services/TurnstileService.js', () => ({
  default: { verify: mockVerify }
}));

describe('verifyTurnstile', () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      body: {},
      query: {},
      ip: '1.2.3.4',
      headers: {},
      originalUrl: '/api/test'
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('returns success:true when token is valid', async () => {
    mockVerify.mockResolvedValue({ success: true });

    const result = await verifyTurnstile(req, res);

    expect(result).toEqual({ success: true });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns success:false and sends 400 with generic error when token is invalid', async () => {
    mockVerify.mockResolvedValue({ success: false, errorCodes: ['invalid-input-response'] });

    const result = await verifyTurnstile(req, res);

    expect(result).toEqual({ success: false });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Request could not be processed. Please try again.' });
  });

  it('returns success:true when token is missing in non-production (fail-open)', async () => {
    mockVerify.mockResolvedValue({ success: true, failOpen: true });

    const result = await verifyTurnstile(req, res);

    expect(result).toEqual({ success: true });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns success:false when token is missing in production (fail-closed)', async () => {
    mockVerify.mockResolvedValue({ success: false, errorCodes: ['missing-input-response'] });

    const result = await verifyTurnstile(req, res);

    expect(result).toEqual({ success: false });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Request could not be processed. Please try again.' });
  });

  it('returns success:false when circuit breaker is open', async () => {
    mockVerify.mockResolvedValue({ success: false, errorCodes: ['siteverify-unreachable'] });

    const result = await verifyTurnstile(req, res);

    expect(result).toEqual({ success: false });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('extracts token from req.body.turnstileToken', async () => {
    req.body.turnstileToken = 'body-token';
    mockVerify.mockResolvedValue({ success: true });

    await verifyTurnstile(req, res);

    expect(mockVerify).toHaveBeenCalledWith('body-token', '1.2.3.4');
  });

  it('extracts token from req.query.turnstileToken when body is empty', async () => {
    req.query.turnstileToken = 'query-token';
    mockVerify.mockResolvedValue({ success: true });

    await verifyTurnstile(req, res);

    expect(mockVerify).toHaveBeenCalledWith('query-token', '1.2.3.4');
  });

  it('body turnstileToken takes precedence over query param', async () => {
    req.body.turnstileToken = 'body-token';
    req.query.turnstileToken = 'query-token';
    mockVerify.mockResolvedValue({ success: true });

    await verifyTurnstile(req, res);

    expect(mockVerify).toHaveBeenCalledWith('body-token', '1.2.3.4');
  });

  it('sends 400 and logs rejection when verification fails with errorCodes', async () => {
    mockVerify.mockResolvedValue({
      success: false,
      errorCodes: ['invalid-input-response', 'timeout-or-duplicate']
    });

    const result = await verifyTurnstile(req, res);

    expect(result).toEqual({ success: false });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Request could not be processed. Please try again.' });
  });
});
