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

import { clearAuthCookies, JWT_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../../src/middleware/jwtAuth.js';
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
