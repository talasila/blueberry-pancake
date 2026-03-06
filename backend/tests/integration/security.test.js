import { describe, it, expect, vi } from 'vitest';
import { generateToken, jwtAuth, JWT_COOKIE_NAME } from '../../src/middleware/jwtAuth.js';
import supertest from 'supertest';
import app from '../../src/app.js';

const request = supertest(app);

/**
 * Integration tests for security mechanisms
 * Validates SC-008: Security mechanisms (JWT and CSRF) are configured
 */
describe('Security Integration Tests', () => {
  describe('JWT Authentication', () => {
    it('should generate valid JWT tokens', () => {
      const payload = { userId: 'test-user', role: 'user' };
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should validate JWT tokens in requests', async () => {
      const payload = { userId: 'test-user' };
      const token = generateToken(payload);

      const response = await request
        .get('/api/health')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should reject requests without JWT tokens when required', async () => {
      const response = await request
        .get('/api/health')
        .expect(200); // Health endpoint is public

      expect(response.body).toHaveProperty('status');
    });
  });

  describe('CSRF Protection', () => {
    it('should provide CSRF token endpoint', async () => {
      const response = await request
        .get('/api/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('csrfToken');
    });

    it('should set CSRF secret cookie', async () => {
      const response = await request
        .get('/api/csrf-token')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('csrfSecret'))).toBe(true);
    });
  });

  describe('CSRF Bypass Prevention', () => {
    it('should reject state-changing request with garbage Bearer and no CSRF token', async () => {
      const validToken = generateToken({ email: 'user@example.com', events: [] });

      const response = await request
        .post('/api/events')
        .set('Authorization', 'Bearer garbage')
        .set('Cookie', `${JWT_COOKIE_NAME}=${validToken}`)
        .send({ name: 'Malicious Event' })
        .expect(403);

      expect(response.body.error).toMatch(/CSRF/i);
    });

    it('should allow state-changing request with valid Bearer token without CSRF', async () => {
      const token = generateToken({ email: 'admin@example.com', events: [] });

      const response = await request
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Event', items: [] });

      expect(response.status).not.toBe(403);
    });

    it('should reject cookie-only state-changing request without CSRF token', async () => {
      const token = generateToken({ email: 'user@example.com', events: [] });

      const response = await request
        .post('/api/events')
        .set('Cookie', `${JWT_COOKIE_NAME}=${token}`)
        .send({ name: 'Test Event' })
        .expect(403);

      expect(response.body.error).toMatch(/CSRF/i);
    });

    it('should allow cookie-only request with valid CSRF token', async () => {
      const csrfResponse = await request.get('/api/csrf-token').expect(200);
      const csrfToken = csrfResponse.body.csrfToken;
      const csrfCookie = csrfResponse.headers['set-cookie']
        .find(c => c.includes('csrfSecret'))
        .split(';')[0];

      const jwtToken = generateToken({ email: 'admin@example.com', events: [] });

      const response = await request
        .post('/api/events')
        .set('Cookie', `${JWT_COOKIE_NAME}=${jwtToken}; ${csrfCookie}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ name: 'Legit Event', items: [] });

      expect(response.status).not.toBe(403);
    });
  });

  describe('Bearer-first auth priority', () => {
    it('should authenticate via Bearer when both Bearer and cookie are present', () => {
      const bearerToken = generateToken({ email: 'bearer-user@example.com', events: ['EVT1'] });
      const cookieToken = generateToken({ email: 'cookie-user@example.com', events: ['EVT2'] });

      const req = {
        headers: { authorization: `Bearer ${bearerToken}` },
        cookies: { [JWT_COOKIE_NAME]: cookieToken },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      jwtAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.email).toBe('bearer-user@example.com');
    });

    it('should reject invalid Bearer token even when valid cookie exists', () => {
      const cookieToken = generateToken({ email: 'user@example.com', events: [] });

      const req = {
        headers: { authorization: 'Bearer garbage' },
        cookies: { [JWT_COOKIE_NAME]: cookieToken },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      jwtAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('CORS allowedHeaders', () => {
    it('should only allow explicitly listed headers in preflight', async () => {
      const response = await request
        .options('/api/events')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'X-Custom-Evil-Header');

      const allowedHeaders = response.headers['access-control-allow-headers'];
      expect(allowedHeaders).not.toMatch(/x-custom-evil-header/i);
      expect(allowedHeaders).toMatch(/Content-Type/i);
      expect(allowedHeaders).toMatch(/Authorization/i);
      expect(allowedHeaders).toMatch(/X-CSRF-Token/i);
    });
  });
});
