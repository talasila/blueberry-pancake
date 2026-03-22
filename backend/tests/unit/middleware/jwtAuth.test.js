import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing module under test
vi.mock('../../../src/config/configLoader.js', () => ({
  default: {
    get: vi.fn((path) => {
      if (path === 'security.jwtExpiration') return '24h';
      if (path === 'security.jwtSecret') return 'test-secret';
      if (path === 'security.refreshTokenExpiration') return '7d';
      return null;
    })
  }
}));

vi.mock('../../../src/utils/environment.js', () => ({
  isProduction: vi.fn(() => false)
}));

vi.mock('../../../src/data/DynamoDBRepository.js', () => ({
  default: {
    storeRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
    deleteRefreshTokensByEmail: vi.fn()
  }
}));

vi.mock('../../../src/logging/Logger.js', () => ({
  default: {
    info: vi.fn(() => Promise.resolve()),
    warn: vi.fn(() => Promise.resolve()),
    error: vi.fn(() => Promise.resolve())
  }
}));

import jwt from 'jsonwebtoken';
import { clearAuthCookies, generateToken, jwtAuth, JWT_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../../src/middleware/jwtAuth.js';
import { isProduction } from '../../../src/utils/environment.js';

describe('clearAuthCookies', () => {
  let mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      clearCookie: vi.fn()
    };
  });

  it('should clear both JWT and refresh cookies in development', () => {
    isProduction.mockReturnValue(false);

    clearAuthCookies(mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);

    expect(mockRes.clearCookie).toHaveBeenCalledWith(JWT_COOKIE_NAME, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
    });

    expect(mockRes.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/api/auth',
    });
  });

  it('should clear both JWT and refresh cookies in production', () => {
    isProduction.mockReturnValue(true);

    clearAuthCookies(mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);

    expect(mockRes.clearCookie).toHaveBeenCalledWith(JWT_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    expect(mockRes.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/auth',
    });
  });
});

describe('generateToken email privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('generateToken with PIN auth includes userId and no email', () => {
    const token = generateToken({ userId: 'u_testABCDEF', events: ['EVT1'], authMethod: 'pin' });
    const decoded = jwt.decode(token);

    expect(decoded.userId).toBe('u_testABCDEF');
    expect(decoded.authMethod).toBe('pin');
    expect(decoded.events).toEqual(['EVT1']);
    expect(decoded.email).toBeUndefined();
  });

  it('generateToken with OTP auth includes email and no userId', () => {
    const token = generateToken({ email: 'admin@test.com', events: ['EVT1'], authMethod: 'otp' });
    const decoded = jwt.decode(token);

    expect(decoded.email).toBe('admin@test.com');
    expect(decoded.authMethod).toBe('otp');
    expect(decoded.events).toEqual(['EVT1']);
    expect(decoded.userId).toBeUndefined();
  });
});

describe('jwtAuth middleware legacy PIN detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('jwtAuth middleware detects legacy PIN token', () => {
    // Legacy format: PIN token with email but no userId
    const token = generateToken({ email: 'old@test.com', events: ['EVT1'], authMethod: 'pin' });

    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {}
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    jwtAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.legacyPinToken).toBe(true);
    expect(req.user.email).toBe('old@test.com');
    expect(req.user.authMethod).toBe('pin');
  });

  it('jwtAuth middleware does not flag new PIN token as legacy', () => {
    const token = generateToken({ userId: 'u_testABCDEF', events: ['EVT1'], authMethod: 'pin' });

    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {}
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    jwtAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.legacyPinToken).toBeUndefined();
    expect(req.user.userId).toBe('u_testABCDEF');
    expect(req.user.authMethod).toBe('pin');
  });
});
