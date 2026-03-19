import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';

vi.mock('../../src/services/PINService.js', () => ({
  default: {
    validatePINFormat: vi.fn(() => ({ valid: true })),
    verifyPIN: vi.fn().mockResolvedValue({ valid: true, sessionId: 'mock-session-id' }),
  },
}));

vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn().mockResolvedValue({
      eventId: 'A1B2C3D4',
      name: 'Test Event',
      state: 'started',
      users: {},
      administrators: { 'admin@example.com': { assignedAt: '2024-01-01', owner: true } },
      items: [],
    }),
    isAdministrator: vi.fn().mockReturnValue(false),
    isEventMember: vi.fn().mockReturnValue(true),
    getItemConfiguration: vi.fn(),
    getRatingConfiguration: vi.fn(),
  },
}));

vi.mock('../../src/services/EventMemberService.js', () => ({
  default: {
    registerUser: vi.fn().mockResolvedValue({ registered: true, alreadyExists: false }),
    getEventsByAdministrator: vi.fn().mockResolvedValue([]),
    getEventSummariesByAdministrator: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../src/services/EventConfigService.js', () => ({
  default: {
    updateUserName: vi.fn().mockResolvedValue({ email: 'guest@example.com', name: 'Test User' }),
  },
}));

vi.mock('../../src/middleware/jwtAuth.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    generateRefreshToken: vi.fn().mockResolvedValue('mock-refresh-token'),
  };
});

import app from '../../src/app.js';
import eventMemberService from '../../src/services/EventMemberService.js';
import eventConfigService from '../../src/services/EventConfigService.js';

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
    expect(response.body).toHaveProperty('storage');
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

/**
 * T011: verify-pin with name parameter
 */
describe('POST /api/events/:eventId/verify-pin (name parameter)', () => {
  const EVENT_ID = 'A1B2C3D4';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verify-pin with name stores name for new user', async () => {
    eventMemberService.registerUser.mockResolvedValue({ registered: true, alreadyExists: false });

    const response = await request
      .post(`/api/events/${EVENT_ID}/verify-pin`)
      .send({ pin: '123456', email: 'guest@example.com', name: 'Alice' })
      .expect(200);

    expect(response.body).toHaveProperty('message', 'PIN verified successfully');
    expect(response.body).toHaveProperty('eventId', EVENT_ID);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', 'guest@example.com');

    // Name should be passed to registerUser
    expect(eventMemberService.registerUser).toHaveBeenCalledWith(
      EVENT_ID,
      'guest@example.com',
      'Alice'
    );
  });

  it('verify-pin without name still works (backward compatibility)', async () => {
    eventMemberService.registerUser.mockResolvedValue({ registered: true, alreadyExists: false });

    const response = await request
      .post(`/api/events/${EVENT_ID}/verify-pin`)
      .send({ pin: '123456', email: 'guest@example.com' })
      .expect(200);

    expect(response.body).toHaveProperty('message', 'PIN verified successfully');
    expect(response.body).toHaveProperty('eventId', EVENT_ID);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', 'guest@example.com');

    // registerUser should be called with undefined name
    expect(eventMemberService.registerUser).toHaveBeenCalledWith(
      EVENT_ID,
      'guest@example.com',
      undefined
    );
  });
});
