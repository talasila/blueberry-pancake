import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import app from '../../src/app.js';
import eventService from '../../src/services/EventService.js';
import { createTestEvent, getTestDataRepository } from './setup.js';
import jwt from 'jsonwebtoken';

const request = supertest(app);

// Mock event service
vi.mock('../../src/services/EventService.js', () => {
  return {
    default: {
      getEvent: vi.fn(),
      createEvent: vi.fn()
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
});
