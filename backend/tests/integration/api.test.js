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
      typeOfItem: 'wine',
      theme: 'elegant',
      state: 'started',
      users: {},
      administrators: { 'admin@example.com': { assignedAt: '2024-01-01', owner: true } },
      items: [],
      pin: '123456',
      ratingConfiguration: { maxRating: 3 },
      itemConfiguration: { numberOfItems: 20 },
    }),
    isAdministrator: vi.fn().mockReturnValue(false),
    isEventMember: vi.fn().mockReturnValue(true),
    getItemConfiguration: vi.fn(),
    getRatingConfiguration: vi.fn(),
  },
}));

vi.mock('../../src/services/RateLimitService.js', () => ({
  default: {
    checkGlobalCheckAdminLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkGlobalLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkLimits: vi.fn().mockResolvedValue({ allowed: true }),
    checkEmailLimit: vi.fn().mockResolvedValue({ allowed: true }),
    checkIPLimit: vi.fn().mockResolvedValue({ allowed: true }),
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
import eventService from '../../src/services/EventService.js';
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
    eventMemberService.registerUser.mockResolvedValue({ registered: true, alreadyExists: false, userId: 'u_testABCDEF', name: 'Alice' });

    const response = await request
      .post(`/api/events/${EVENT_ID}/verify-pin`)
      .send({ pin: '123456', email: 'guest@example.com', name: 'Alice' })
      .expect(200);

    expect(response.body).toHaveProperty('message', 'PIN verified successfully');
    expect(response.body).toHaveProperty('eventId', EVENT_ID);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('userId', 'u_testABCDEF');
    expect(response.body.user).toHaveProperty('name', 'Alice');
    expect(response.body.user).not.toHaveProperty('email');

    // Name should be passed to registerUser
    expect(eventMemberService.registerUser).toHaveBeenCalledWith(
      EVENT_ID,
      'guest@example.com',
      'Alice'
    );
  });

  it('verify-pin without name returns 400 (name is mandatory)', async () => {
    const response = await request
      .post(`/api/events/${EVENT_ID}/verify-pin`)
      .send({ pin: '123456', email: 'guest@example.com' })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Display name is required');
    expect(eventMemberService.registerUser).not.toHaveBeenCalled();
  });
});

/**
 * T008: GET /api/events/:eventId/public-info
 */
describe('GET /api/events/:eventId/public-info', () => {
  const EVENT_ID = 'A1B2C3D4';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns public info for a valid event', async () => {
    const response = await request
      .get(`/api/events/${EVENT_ID}/public-info`)
      .expect(200);

    expect(response.body).toHaveProperty('name', 'Test Event');
    expect(response.body).toHaveProperty('typeOfItem', 'wine');
    expect(response.body).toHaveProperty('theme', 'elegant');
    expect(response.body).toHaveProperty('state', 'started');
  });

  it('returns 404 for a non-existent event', async () => {
    eventService.getEvent.mockRejectedValueOnce(new Error('Event not found: ZZZZZZZZ'));

    const response = await request
      .get('/api/events/ZZZZZZZZ/public-info')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('not found');
  });

  it('returns 400 for an invalid eventId format', async () => {
    const response = await request
      .get('/api/events/invalid!!!/public-info')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('does NOT return sensitive fields', async () => {
    const response = await request
      .get(`/api/events/${EVENT_ID}/public-info`)
      .expect(200);

    expect(response.body).not.toHaveProperty('pin');
    expect(response.body).not.toHaveProperty('administrators');
    expect(response.body).not.toHaveProperty('users');
    expect(response.body).not.toHaveProperty('ratingConfiguration');
    expect(response.body).not.toHaveProperty('itemConfiguration');
  });
});
