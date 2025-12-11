import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

// Mock configLoader before importing app
vi.mock('../../src/config/configLoader.js', () => {
  const mockConfig = {
    environment: 'development',
    dataDirectory: './test-data',
    server: { 
      port: 3001,
      host: 'localhost'
    },
    cache: { 
      enabled: true, 
      ttl: 3600, 
      maxSize: 100 
    },
    security: { 
      jwtSecret: 'test-secret',
      xsrfEnabled: true
    },
    frontend: { 
      apiBaseUrl: 'http://localhost:3001/api'
    }
  };
  return {
    default: {
      get: vi.fn((key) => {
        // Handle nested keys like 'server.port'
        const keys = key.split('.');
        let value = mockConfig;
        for (const k of keys) {
          value = value?.[k];
        }
        return value;
      }),
      getAll: vi.fn(() => mockConfig),
      has: vi.fn(() => true),
      onHotReload: vi.fn(),
      enableHotReload: vi.fn()
    }
  };
});

// Now import app after mocking config
import app from '../../src/app.js';
import itemService from '../../src/services/ItemService.js';
import eventService from '../../src/services/EventService.js';
import { createTestEvent, getTestDataRepository } from './setup.js';

const request = supertest(app);

// Mock item service
vi.mock('../../src/services/ItemService.js', () => ({
  default: {
    registerItem: vi.fn(),
    getItems: vi.fn()
  }
}));

// Mock event service
vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn(),
    isAdministrator: vi.fn()
  }
}));

// Helper to generate JWT token for testing
function generateTestToken(email = 'test@example.com') {
  const secret = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR';
  return jwt.sign(
    { email, iat: Math.floor(Date.now() / 1000) },
    secret,
    { expiresIn: '1h' }
  );
}

describe('POST /api/events/:eventId/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request
        .post('/api/events/A5ohYrHe/items')
        .send({ name: 'Test Item' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(itemService.registerItem).not.toHaveBeenCalled();
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request
        .post('/api/events/A5ohYrHe/items')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test Item' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(itemService.registerItem).not.toHaveBeenCalled();
    });
  });

  describe('Event ID validation', () => {
    it('should return 400 for invalid event ID format', async () => {
      const token = generateTestToken('user@example.com');

      const response = await request
        .post('/api/events/invalid/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Item' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID format');
    });
  });

  describe('Item registration', () => {
    it('should register item successfully', async () => {
      const token = generateTestToken('user@example.com');
      const mockItem = {
        id: 'aB3xY9mKpQrS',
        name: 'Test Item',
        price: 50.99,
        description: 'Test description',
        ownerEmail: 'user@example.com',
        registeredAt: new Date().toISOString(),
        itemId: null
      };

      itemService.registerItem.mockResolvedValue(mockItem);

      const response = await request
        .post('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Item',
          price: '50.99',
          description: 'Test description'
        })
        .expect(201);

      expect(response.body).toEqual(mockItem);
      expect(itemService.registerItem).toHaveBeenCalledWith(
        'A5ohYrHe',
        expect.objectContaining({
          name: 'Test Item',
          price: '50.99',
          description: 'Test description'
        }),
        'user@example.com'
      );
    });

    it('should return 400 for missing name', async () => {
      const token = generateTestToken('user@example.com');

      itemService.registerItem.mockRejectedValue(new Error('Item name is required'));

      const response = await request
        .post('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ price: '50' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Item name is required');
    });

    it('should return 400 for invalid price', async () => {
      const token = generateTestToken('user@example.com');

      itemService.registerItem.mockRejectedValue(new Error('Price cannot be negative'));

      const response = await request
        .post('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Item', price: '-50' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Price cannot be negative');
    });

    it('should return 403 when event state does not allow registration', async () => {
      const token = generateTestToken('user@example.com');

      itemService.registerItem.mockRejectedValue(
        new Error('Item registration is not allowed when event is in "paused" state')
      );

      const response = await request
        .post('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Item' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not allowed');
    });

    it('should return 404 when event does not exist', async () => {
      const token = generateTestToken('user@example.com');

      itemService.registerItem.mockRejectedValue(new Error('Event not found: A5ohYrHe'));

      const response = await request
        .post('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Item' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });
});

describe('GET /api/events/:eventId/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request
        .get('/api/events/A5ohYrHe/items')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(itemService.getItems).not.toHaveBeenCalled();
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request
        .get('/api/events/A5ohYrHe/items')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(itemService.getItems).not.toHaveBeenCalled();
    });
  });

  describe('Event ID validation', () => {
    it('should return 400 for invalid event ID format', async () => {
      const token = generateTestToken('user@example.com');

      const response = await request
        .get('/api/events/invalid/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID format');
    });
  });

  describe('Get items', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks();
    });

    it('should return user\'s items for regular users', async () => {
      const token = generateTestToken('user@example.com');
      const mockItems = [
        {
          id: 'item1',
          name: 'Item 1',
          price: 50.99,
          description: 'Description 1',
          ownerEmail: 'user@example.com',
          registeredAt: new Date().toISOString(),
          itemId: null
        }
      ];

      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started'
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(false);
      itemService.getItems.mockResolvedValue(mockItems);

      const response = await request
        .get('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockItems);
      expect(itemService.getItems).toHaveBeenCalledWith('A5ohYrHe', 'user@example.com', false);
    });

    it('should return all items for administrators', async () => {
      const token = generateTestToken('admin@example.com');
      const mockItems = [
        {
          id: 'item1',
          name: 'Item 1',
          ownerEmail: 'user1@example.com',
          registeredAt: new Date().toISOString(),
          itemId: null
        },
        {
          id: 'item2',
          name: 'Item 2',
          ownerEmail: 'user2@example.com',
          registeredAt: new Date().toISOString(),
          itemId: null
        }
      ];

      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started'
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(true);
      itemService.getItems.mockResolvedValue(mockItems);

      const response = await request
        .get('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual(mockItems);
      expect(itemService.getItems).toHaveBeenCalledWith('A5ohYrHe', 'admin@example.com', true);
    });

    it('should return empty array when user has no items', async () => {
      const token = generateTestToken('user@example.com');
      const mockEvent = {
        eventId: 'A5ohYrHe',
        state: 'started'
      };

      eventService.getEvent.mockResolvedValue(mockEvent);
      eventService.isAdministrator.mockReturnValue(false);
      itemService.getItems.mockResolvedValue([]);

      const response = await request
        .get('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return 404 when event does not exist', async () => {
      const token = generateTestToken('user@example.com');

      eventService.getEvent.mockRejectedValue(new Error('Event not found: A5ohYrHe'));

      const response = await request
        .get('/api/events/A5ohYrHe/items')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });
});
