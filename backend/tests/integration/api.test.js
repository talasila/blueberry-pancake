import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import app from '../../src/app.js';

const request = supertest(app);

/**
 * Integration tests for API endpoints
 * Tests API routes with Express app
 */
describe('API Integration Tests', () => {
  it('should respond to health check endpoint', async () => {
    const response = await request
      .get('/api/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('cache');
  });

  it('should return CSRF token when XSRF is enabled', async () => {
    const response = await request
      .get('/api/csrf-token')
      .expect(200);

    // Response should contain csrfToken or message
    expect(response.body).toHaveProperty('csrfToken');
  });

  it('should handle 404 for unknown routes', async () => {
    await request
      .get('/api/unknown')
      .expect(404);
  });
});
