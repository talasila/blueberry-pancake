import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import app from '../../src/app.js';
import eventService from '../../src/services/EventService.js';
import pinService from '../../src/services/PINService.js';
import { createTestEvent, getTestDataRepository } from './setup.js';
import jwt from 'jsonwebtoken';

const request = supertest(app);

// Mock event service
vi.mock('../../src/services/EventService.js', () => {
  return {
    default: {
      getEvent: vi.fn(),
      createEvent: vi.fn(),
      regeneratePIN: vi.fn(),
      addAdministrator: vi.fn(),
      deleteAdministrator: vi.fn(),
      getAdministrators: vi.fn(),
      isAdministrator: vi.fn(),
      getItemConfiguration: vi.fn(),
      updateItemConfiguration: vi.fn()
    }
  };
});

// Mock PIN service
vi.mock('../../src/services/PINService.js', () => {
  return {
    default: {
      verifyPIN: vi.fn(),
      checkPINSession: vi.fn(),
      createPINSession: vi.fn()
    }
  };
});

// Helper to generate JWT token for testing
function generateTestToken(email = 'test@example.com') {
  // Use the same secret as the app (default for development)
  const secret = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR';
  return jwt.sign(
    { email, iat: Math.floor(Date.now() / 1000) },
    secret,
    { expiresIn: '1h' }
  );
}

describe('GET /api/events/:eventId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request
        .get('/api/events/A5ohYrHe')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(eventService.getEvent).not.toHaveBeenCalled();
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request
        .get('/api/events/A5ohYrHe')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(eventService.getEvent).not.toHaveBeenCalled();
    });

    it('should accept valid JWT token', async () => {
      const token = generateTestToken('user@example.com');
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const response = await request
        .get('/api/events/A5ohYrHe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockEvent);
      expect(eventService.getEvent).toHaveBeenCalledWith('A5ohYrHe');
    });
  });

  describe('Event ID validation', () => {
    it('should return 400 for invalid event ID format (too short)', async () => {
      const token = generateTestToken('user@example.com');

      const response = await request
        .get('/api/events/ABC123')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID format');
      expect(eventService.getEvent).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid event ID format (too long)', async () => {
      const token = generateTestToken('user@example.com');

      const response = await request
        .get('/api/events/ABCD12345')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID format');
    });

    it('should return 400 for invalid event ID format (special characters)', async () => {
      const token = generateTestToken('user@example.com');

      const response = await request
        .get('/api/events/ABC-1234')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID format');
    });
  });

  describe('Event retrieval', () => {
    it('should return 200 with event data for valid event ID', async () => {
      const token = generateTestToken('user@example.com');
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const response = await request
        .get('/api/events/A5ohYrHe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockEvent);
      expect(eventService.getEvent).toHaveBeenCalledWith('A5ohYrHe');
    });

    it('should return 404 for non-existent event', async () => {
      const token = generateTestToken('user@example.com');
      const error = new Error('Event not found: NONEXIST');
      eventService.getEvent.mockRejectedValue(error);

      const response = await request
        .get('/api/events/NONEXIST')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Event not found');
      expect(eventService.getEvent).toHaveBeenCalledWith('NONEXIST');
    });

    it('should return 500 for server errors', async () => {
      const token = generateTestToken('user@example.com');
      const error = new Error('Database connection failed');
      eventService.getEvent.mockRejectedValue(error);

      const response = await request
        .get('/api/events/ABCD1234')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to retrieve event');
    });

    it('should return 400 for validation errors from EventService', async () => {
      const token = generateTestToken('user@example.com');
      const error = new Error('Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.');
      eventService.getEvent.mockRejectedValue(error);

      const response = await request
        .get('/api/events/INVALID')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID format');
    });
  });

  describe('Event states', () => {
    it('should return event in created state', async () => {
      const token = generateTestToken('user@example.com');
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const response = await request
        .get('/api/events/A5ohYrHe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.state).toBe('created');
    });

    it('should return event in started state', async () => {
      const token = generateTestToken('user@example.com');
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const response = await request
        .get('/api/events/A5ohYrHe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.state).toBe('started');
    });

    it('should return event in paused state', async () => {
      const token = generateTestToken('user@example.com');
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'paused',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const response = await request
        .get('/api/events/A5ohYrHe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.state).toBe('paused');
    });

    it('should return event in finished state', async () => {
      const token = generateTestToken('user@example.com');
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'finished',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);

      const response = await request
        .get('/api/events/A5ohYrHe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.state).toBe('finished');
    });
  });

  describe('POST /api/events/:eventId/verify-pin', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 200 with sessionId for valid PIN', async () => {
      const eventId = 'A5ohYrHe';
      const pin = '123456';
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';

      pinService.verifyPIN.mockResolvedValue({
        valid: true,
        sessionId
      });

      const response = await request
        .post(`/api/events/${eventId}/verify-pin`)
        .send({ pin })
        .expect(200);

      expect(response.body).toHaveProperty('sessionId', sessionId);
      expect(response.body).toHaveProperty('eventId', eventId);
      expect(pinService.verifyPIN).toHaveBeenCalledWith(eventId, pin, expect.any(String));
    });

    it('should return 401 for invalid PIN', async () => {
      const eventId = 'A5ohYrHe';
      const pin = '999999';

      pinService.verifyPIN.mockResolvedValue({
        valid: false,
        error: 'Invalid PIN. Please try again.'
      });

      const response = await request
        .post(`/api/events/${eventId}/verify-pin`)
        .send({ pin })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid PIN. Please try again.');
    });

    it('should return 400 for invalid PIN format', async () => {
      const eventId = 'A5ohYrHe';
      const pin = '12345'; // Too short

      pinService.verifyPIN.mockResolvedValue({
        valid: false,
        error: 'PIN must be exactly 6 digits'
      });

      const response = await request
        .post(`/api/events/${eventId}/verify-pin`)
        .send({ pin })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'PIN must be exactly 6 digits');
    });

    it('should return 404 for non-existent event', async () => {
      const eventId = 'NONEXIST';
      const pin = '123456';

      pinService.verifyPIN.mockResolvedValue({
        valid: false,
        error: 'Event not found'
      });

      const response = await request
        .post(`/api/events/${eventId}/verify-pin`)
        .send({ pin })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Event not found');
    });

    it('should return 429 for rate limit exceeded', async () => {
      const eventId = 'A5ohYrHe';
      const pin = '123456';

      pinService.verifyPIN.mockResolvedValue({
        valid: false,
        error: 'Too many attempts. Please try again in 15 minutes.'
      });

      const response = await request
        .post(`/api/events/${eventId}/verify-pin`)
        .send({ pin })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Too many attempts');
    });

    it('should return 400 when PIN is missing', async () => {
      const eventId = 'A5ohYrHe';

      const response = await request
        .post(`/api/events/${eventId}/verify-pin`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/events/:eventId with PIN session', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 200 with event data when valid PIN session is provided', async () => {
      const eventId = 'A5ohYrHe';
      const sessionId = '550e8400-e29b-41d4-a716-446655440000';
      const mockEvent = {
        eventId,
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        pin: '123456',
        pinGeneratedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      pinService.checkPINSession.mockReturnValue(true);
      eventService.getEvent.mockResolvedValue(mockEvent);

      const response = await request
        .get(`/api/events/${eventId}`)
        .set('X-PIN-Session-Id', sessionId)
        .expect(200);

      expect(response.body).toEqual(mockEvent);
      expect(pinService.checkPINSession).toHaveBeenCalledWith(eventId, sessionId);
      expect(eventService.getEvent).toHaveBeenCalledWith(eventId);
    });

    it('should return 401 when PIN session is invalid', async () => {
      const eventId = 'A5ohYrHe';
      const sessionId = 'invalid-session';

      pinService.checkPINSession.mockReturnValue(false);

      const response = await request
        .get(`/api/events/${eventId}`)
        .set('X-PIN-Session-Id', sessionId)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'PIN verification expired or invalid');
    });

    it('should return 401 when PIN session is missing', async () => {
      const eventId = 'A5ohYrHe';

      const response = await request
        .get(`/api/events/${eventId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/events/:eventId/regenerate-pin', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 200 with new PIN for authorized administrator', async () => {
      const eventId = 'A5ohYrHe';
      const token = generateTestToken('admin@example.com');
      const mockEvent = {
        eventId,
        name: 'Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        pin: '123456',
        pinGeneratedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.regeneratePIN.mockResolvedValue({
        pin: '789012',
        eventId,
        pinGeneratedAt: new Date().toISOString(),
        message: 'PIN regenerated successfully'
      });

      const response = await request
        .post(`/api/events/${eventId}/regenerate-pin`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('pin', '789012');
      expect(response.body).toHaveProperty('eventId', eventId);
      expect(response.body).toHaveProperty('pinGeneratedAt');
      expect(eventService.regeneratePIN).toHaveBeenCalledWith(eventId, 'admin@example.com');
    });

    it('should return 401 for unauthorized user', async () => {
      const eventId = 'A5ohYrHe';
      const token = generateTestToken('other@example.com');
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrator: 'admin@example.com',
        pin: '123456'
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.regeneratePIN.mockRejectedValue(
        new Error('Only the event administrator can regenerate PINs')
      );

      const response = await request
        .post(`/api/events/${eventId}/regenerate-pin`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('administrator');
    });

    it('should return 401 when no token is provided', async () => {
      const eventId = 'A5ohYrHe';

      const response = await request
        .post(`/api/events/${eventId}/regenerate-pin`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
      expect(eventService.regeneratePIN).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent event', async () => {
      const eventId = 'NONEXIST';
      const token = generateTestToken('admin@example.com');

      eventService.regeneratePIN.mockRejectedValue(new Error('Event not found: NONEXIST'));

      const response = await request
        .post(`/api/events/${eventId}/regenerate-pin`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Event not found');
    });

    it('should return 400 for invalid event ID format', async () => {
      const token = generateTestToken('admin@example.com');

      const response = await request
        .post('/api/events/INVALID/regenerate-pin')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID format');
    });
  });

  describe('POST /api/events - Event creation with administrators object', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create event with administrators object structure', async () => {
      const token = generateTestToken('admin@example.com');
      const eventData = {
        name: 'Test Event',
        typeOfItem: 'wine'
      };

      const mockCreatedEvent = {
        eventId: 'TEST1234',
        name: 'Test Event',
        typeOfItem: 'wine',
        state: 'created',
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        },
        users: {
          'admin@example.com': {
            registeredAt: '2025-01-27T10:30:00.000Z'
          }
        },
        pin: '123456',
        pinGeneratedAt: '2025-01-27T10:30:00.000Z',
        createdAt: '2025-01-27T10:30:00.000Z',
        updatedAt: '2025-01-27T10:30:00.000Z'
      };

      eventService.createEvent.mockResolvedValue(mockCreatedEvent);

      const response = await request
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(eventData)
        .expect(201);

      expect(response.body).toHaveProperty('administrators');
      expect(response.body.administrators).toBeDefined();
      expect(response.body.administrators['admin@example.com']).toBeDefined();
      expect(response.body.administrators['admin@example.com'].owner).toBe(true);
      expect(response.body.administrators['admin@example.com']).toHaveProperty('assignedAt');
      expect(response.body).not.toHaveProperty('administrator');
      expect(response.body).toHaveProperty('users');
      expect(response.body.users['admin@example.com']).toBeDefined();
      expect(eventService.createEvent).toHaveBeenCalledWith(
        'Test Event',
        'wine',
        'admin@example.com'
      );
    });

    it('should verify owner flag is set to true for creator', async () => {
      const token = generateTestToken('creator@example.com');
      const eventData = {
        name: 'Test Event',
        typeOfItem: 'wine'
      };

      const mockCreatedEvent = {
        eventId: 'TEST1234',
        name: 'Test Event',
        typeOfItem: 'wine',
        state: 'created',
        administrators: {
          'creator@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        },
        users: {
          'creator@example.com': {
            registeredAt: '2025-01-27T10:30:00.000Z'
          }
        },
        pin: '123456',
        pinGeneratedAt: '2025-01-27T10:30:00.000Z',
        createdAt: '2025-01-27T10:30:00.000Z',
        updatedAt: '2025-01-27T10:30:00.000Z'
      };

      eventService.createEvent.mockResolvedValue(mockCreatedEvent);

      const response = await request
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(eventData)
        .expect(201);

      const admin = response.body.administrators['creator@example.com'];
      expect(admin.owner).toBe(true);
      expect(admin.assignedAt).toBeDefined();
      expect(typeof admin.assignedAt).toBe('string');
    });

    it('should verify assignedAt timestamp is ISO 8601 format', async () => {
      const token = generateTestToken('admin@example.com');
      const eventData = {
        name: 'Test Event',
        typeOfItem: 'wine'
      };

      const mockCreatedEvent = {
        eventId: 'TEST1234',
        name: 'Test Event',
        typeOfItem: 'wine',
        state: 'created',
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        },
        users: {
          'admin@example.com': {
            registeredAt: '2025-01-27T10:30:00.000Z'
          }
        },
        pin: '123456',
        pinGeneratedAt: '2025-01-27T10:30:00.000Z',
        createdAt: '2025-01-27T10:30:00.000Z',
        updatedAt: '2025-01-27T10:30:00.000Z'
      };

      eventService.createEvent.mockResolvedValue(mockCreatedEvent);

      const response = await request
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(eventData)
        .expect(201);

      const assignedAt = response.body.administrators['admin@example.com'].assignedAt;
      expect(assignedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(assignedAt).toISOString()).toBe(assignedAt);
    });
  });

  describe('POST /api/events/:eventId/administrators', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should add administrator successfully', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('admin@example.com');
      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        },
        users: {
          'admin@example.com': {
            registeredAt: '2025-01-27T10:30:00.000Z'
          }
        }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.addAdministrator.mockResolvedValue({
        ...mockEvent,
        administrators: {
          ...mockEvent.administrators,
          'newadmin@example.com': {
            assignedAt: '2025-01-27T12:00:00.000Z',
            owner: false
          }
        }
      });

      const response = await request
        .post(`/api/events/${eventId}/administrators`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newadmin@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('administrators');
      expect(response.body.administrators['newadmin@example.com']).toBeDefined();
      expect(response.body.administrators['newadmin@example.com'].owner).toBe(false);
    });

    it('should return 400 for duplicate administrator', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('admin@example.com');

      eventService.addAdministrator.mockRejectedValue(
        new Error('Administrator already exists')
      );

      const response = await request
        .post(`/api/events/${eventId}/administrators`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'admin@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Administrator already exists');
    });

    it('should return 400 for invalid email', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('admin@example.com');

      eventService.addAdministrator.mockRejectedValue(
        new Error('Invalid email address')
      );

      const response = await request
        .post(`/api/events/${eventId}/administrators`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid email address');
    });

    it('should return 403 for unauthorized access', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('unauthorized@example.com');

      eventService.addAdministrator.mockRejectedValue(
        new Error('Unauthorized: Only administrators can add administrators')
      );

      const response = await request
        .post(`/api/events/${eventId}/administrators`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'newadmin@example.com' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('DELETE /api/events/:eventId/administrators/:email', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should delete administrator successfully', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('admin@example.com');
      const emailToDelete = 'other@example.com';

      eventService.deleteAdministrator.mockResolvedValue({
        eventId,
        administrators: {
          'admin@example.com': {
            assignedAt: '2025-01-27T10:30:00.000Z',
            owner: true
          }
        }
      });

      const response = await request
        .delete(`/api/events/${eventId}/administrators/${encodeURIComponent(emailToDelete)}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(eventService.deleteAdministrator).toHaveBeenCalledWith(
        eventId,
        emailToDelete,
        'admin@example.com'
      );
    });

    it('should return 400 for owner deletion prevention', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('admin@example.com');
      const ownerEmail = 'admin@example.com';

      eventService.deleteAdministrator.mockRejectedValue(
        new Error('Cannot delete owner: The original administrator cannot be removed')
      );

      const response = await request
        .delete(`/api/events/${eventId}/administrators/${encodeURIComponent(ownerEmail)}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Cannot delete owner');
    });

    it('should return 403 for unauthorized access', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('unauthorized@example.com');
      const emailToDelete = 'other@example.com';

      eventService.deleteAdministrator.mockRejectedValue(
        new Error('Unauthorized: Only administrators can delete administrators')
      );

      const response = await request
        .delete(`/api/events/${eventId}/administrators/${encodeURIComponent(emailToDelete)}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('GET /api/events/:eventId/administrators', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return administrators list successfully', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('admin@example.com');
      const mockAdministrators = {
        'admin@example.com': {
          assignedAt: '2025-01-27T10:30:00.000Z',
          owner: true
        },
        'other@example.com': {
          assignedAt: '2025-01-27T11:00:00.000Z',
          owner: false
        }
      };

      eventService.getAdministrators.mockResolvedValue(mockAdministrators);

      const response = await request
        .get(`/api/events/${eventId}/administrators`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('administrators');
      expect(response.body.administrators).toEqual(mockAdministrators);
      expect(eventService.getAdministrators).toHaveBeenCalledWith(eventId, 'admin@example.com');
    });

    it('should return 403 for unauthorized access', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('unauthorized@example.com');

      eventService.getAdministrators.mockRejectedValue(
        new Error('Unauthorized: Only administrators can view administrators list')
      );

      const response = await request
        .get(`/api/events/${eventId}/administrators`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('GET /api/events/:eventId/item-configuration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return item configuration for authorized administrator', async () => {
      const eventId = 'TEST1234';
      const adminEmail = 'admin@example.com';
      const token = generateTestToken(adminEmail);

      const mockEvent = {
        eventId,
        name: 'Test Event',
        itemConfiguration: {
          numberOfItems: 25,
          excludedItemIds: [5, 10, 15]
        },
        administrators: { [adminEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);
      eventService.getItemConfiguration.mockResolvedValue({
        numberOfItems: 25,
        excludedItemIds: [5, 10, 15]
      });

      const response = await request
        .get(`/api/events/${eventId}/item-configuration`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        numberOfItems: 25,
        excludedItemIds: [5, 10, 15]
      });
    });

    it('should return default values when itemConfiguration not present', async () => {
      const eventId = 'TEST1234';
      const adminEmail = 'admin@example.com';
      const token = generateTestToken(adminEmail);

      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [adminEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);
      eventService.getItemConfiguration.mockResolvedValue({
        numberOfItems: 20,
        excludedItemIds: []
      });

      const response = await request
        .get(`/api/events/${eventId}/item-configuration`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        numberOfItems: 20,
        excludedItemIds: []
      });
    });

    it('should return 403 for non-administrator', async () => {
      const eventId = 'TEST1234';
      const token = generateTestToken('user@example.com');

      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { 'admin@example.com': { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.getItemConfiguration.mockRejectedValue(
        new Error('Only administrators can view item configuration')
      );

      const response = await request
        .get(`/api/events/${eventId}/item-configuration`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/events/:eventId/item-configuration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should update numberOfItems for authorized administrator', async () => {
      const eventId = 'TEST1234';
      const adminEmail = 'admin@example.com';
      const token = generateTestToken(adminEmail);

      const mockEvent = {
        eventId,
        name: 'Test Event',
        administrators: { [adminEmail]: { assignedAt: '2025-01-27T10:00:00.000Z', owner: true } }
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);
      eventService.updateItemConfiguration.mockResolvedValue({
        numberOfItems: 30,
        excludedItemIds: []
      });

      const response = await request
        .patch(`/api/events/${eventId}/item-configuration`)
        .set('Authorization', `Bearer ${token}`)
        .send({ numberOfItems: 30 })
        .expect(200);

      expect(response.body).toEqual({
        numberOfItems: 30,
        excludedItemIds: []
      });
      expect(eventService.updateItemConfiguration).toHaveBeenCalledWith(
        eventId,
        { numberOfItems: 30 },
        adminEmail
      );
    });

    it('should return 400 for invalid numberOfItems (too low)', async () => {
      const eventId = 'TEST1234';
      const adminEmail = 'admin@example.com';
      const token = generateTestToken(adminEmail);

      eventService.updateItemConfiguration.mockRejectedValue(
        new Error('Number of items must be an integer between 1 and 100')
      );

      const response = await request
        .patch(`/api/events/${eventId}/item-configuration`)
        .set('Authorization', `Bearer ${token}`)
        .send({ numberOfItems: 0 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('must be an integer between 1 and 100');
    });

    it('should return 400 for invalid numberOfItems (too high)', async () => {
      const eventId = 'TEST1234';
      const adminEmail = 'admin@example.com';
      const token = generateTestToken(adminEmail);

      eventService.updateItemConfiguration.mockRejectedValue(
        new Error('Number of items must be an integer between 1 and 100')
      );

      const response = await request
        .patch(`/api/events/${eventId}/item-configuration`)
        .set('Authorization', `Bearer ${token}`)
        .send({ numberOfItems: 101 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle excludedItemIds and return warning when IDs removed', async () => {
      const eventId = 'TEST1234';
      const adminEmail = 'admin@example.com';
      const token = generateTestToken(adminEmail);

      eventService.updateItemConfiguration.mockResolvedValue({
        numberOfItems: 12,
        excludedItemIds: [5, 10],
        warning: 'Item IDs 15, 25 were removed because they are outside the valid range (1-12)'
      });

      const response = await request
        .patch(`/api/events/${eventId}/item-configuration`)
        .set('Authorization', `Bearer ${token}`)
        .send({ numberOfItems: 12, excludedItemIds: '5,10,15,25' })
        .expect(200);

      expect(response.body).toHaveProperty('warning');
      expect(response.body.warning).toContain('Item IDs 15, 25 were removed');
    });
  });
});
