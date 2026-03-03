import { describe, it, expect, beforeEach, vi } from 'vitest';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret';
const EVENT_ID = 'A5B1CD2E';

vi.mock('../../src/config/configLoader.js', () => {
  const mockConfig = {
    environment: 'development',
    dataDirectory: './test-data',
    server: { port: 3001, host: 'localhost' },
    cache: { enabled: true, ttl: 3600, maxSize: 100 },
    security: { jwtSecret: 'test-secret', xsrfEnabled: true },
    frontend: { apiBaseUrl: 'http://localhost:3001/api' },
  };
  return {
    default: {
      get: vi.fn((key) => {
        const keys = key.split('.');
        let value = mockConfig;
        for (const k of keys) value = value?.[k];
        return value;
      }),
      getAll: vi.fn(() => mockConfig),
      has: vi.fn(() => true),
      onHotReload: vi.fn(),
      enableHotReload: vi.fn(),
    },
  };
});

import app from '../../src/app.js';
import itemService from '../../src/services/ItemService.js';
import ratingService from '../../src/services/RatingService.js';
import eventService from '../../src/services/EventService.js';

const request = supertest(app);

vi.mock('../../src/services/ItemService.js', () => ({
  default: {
    registerItem: vi.fn(),
    getItems: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

vi.mock('../../src/services/RatingService.js', () => ({
  default: {
    submitRating: vi.fn(),
    deleteRating: vi.fn(),
    getRatings: vi.fn(),
    getRating: vi.fn(),
  },
}));

vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn(),
    isAdministrator: vi.fn(),
    isEventMember: vi.fn(),
    getItemConfiguration: vi.fn(),
    getRatingConfiguration: vi.fn(),
  },
}));

function generateToken(email, opts = {}) {
  return jwt.sign(
    { email, events: [EVENT_ID], iat: Math.floor(Date.now() / 1000), ...opts },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

const activeEvent = {
  eventId: EVENT_ID,
  name: 'Test Event',
  state: 'started',
  users: { 'guest@example.com': { name: 'Guest' } },
  administrators: { 'admin@example.com': { assignedAt: '2024-01-01', owner: true } },
  items: [],
};

// ──────────────────────────────────────────────────────────
// Phase 2 — US1: Deleted guest cannot register new items
// ──────────────────────────────────────────────────────────

describe('US1: Membership enforcement on POST /items', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 403 EVENT_MEMBERSHIP_REQUIRED when deleted guest POSTs an item', async () => {
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(false);

    const token = generateToken('deleted-guest@example.com');
    const response = await request
      .post(`/api/events/${EVENT_ID}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Orphan Bottle' })
      .expect(403);

    expect(response.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
    expect(response.body.error).toMatch(/not registered/);
    expect(itemService.registerItem).not.toHaveBeenCalled();
  });

  it('should allow active guest to register an item (no regression)', async () => {
    const mockItem = { id: 'aB3xY9mKpQrS', name: 'Good Bottle', ownerEmail: 'guest@example.com' };
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(true);
    itemService.registerItem.mockResolvedValue(mockItem);

    const token = generateToken('guest@example.com');
    const response = await request
      .post(`/api/events/${EVENT_ID}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Good Bottle', price: 25 })
      .expect(201);

    expect(response.body.name).toBe('Good Bottle');
    expect(itemService.registerItem).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────
// Phase 3 — US2: Deleted guest cannot submit ratings
// ──────────────────────────────────────────────────────────

describe('US2: Membership enforcement on POST /ratings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 403 EVENT_MEMBERSHIP_REQUIRED when deleted guest POSTs a rating', async () => {
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(false);

    const token = generateToken('deleted-guest@example.com');
    const response = await request
      .post(`/api/events/${EVENT_ID}/ratings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ itemId: 1, rating: 5 })
      .expect(403);

    expect(response.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
    expect(ratingService.submitRating).not.toHaveBeenCalled();
  });

  it('should allow active guest to submit a rating (no regression)', async () => {
    const savedRating = { email: 'guest@example.com', itemId: 1, rating: 5, note: '' };
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(true);
    ratingService.submitRating.mockResolvedValue(savedRating);

    const token = generateToken('guest@example.com');
    const response = await request
      .post(`/api/events/${EVENT_ID}/ratings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ itemId: 1, rating: 5 })
      .expect(201);

    expect(response.body.rating).toBe(5);
    expect(ratingService.submitRating).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────
// Phase 4 — US6: Administrator access is unaffected
// ──────────────────────────────────────────────────────────

describe('US6: Administrator bypass on guarded endpoints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should allow admin who is also in users to POST items', async () => {
    const eventWithAdminInUsers = {
      ...activeEvent,
      users: {
        'guest@example.com': { name: 'Guest' },
        'admin@example.com': { name: 'Admin' },
      },
    };
    eventService.getEvent.mockResolvedValue(eventWithAdminInUsers);
    eventService.isEventMember.mockReturnValue(true);
    itemService.registerItem.mockResolvedValue({ id: 'x', name: 'Admin Item' });

    const token = generateToken('admin@example.com');
    const response = await request
      .post(`/api/events/${EVENT_ID}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Admin Item' })
      .expect(201);

    expect(response.body.name).toBe('Admin Item');
  });

  it('should allow admin NOT in users list to POST items', async () => {
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(true);
    itemService.registerItem.mockResolvedValue({ id: 'y', name: 'Admin Only' });

    const token = generateToken('admin@example.com');
    const response = await request
      .post(`/api/events/${EVENT_ID}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Admin Only' })
      .expect(201);

    expect(response.body.name).toBe('Admin Only');
  });

  it('should allow admin NOT in users list to POST ratings', async () => {
    const savedRating = { email: 'admin@example.com', itemId: 1, rating: 4, note: '' };
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(true);
    ratingService.submitRating.mockResolvedValue(savedRating);

    const token = generateToken('admin@example.com');
    const response = await request
      .post(`/api/events/${EVENT_ID}/ratings`)
      .set('Authorization', `Bearer ${token}`)
      .send({ itemId: 1, rating: 4 })
      .expect(201);

    expect(response.body.rating).toBe(4);
  });
});

// ──────────────────────────────────────────────────────────
// Phase 5 — US3: Deleted guest cannot modify/delete items
// ──────────────────────────────────────────────────────────

describe('US3: Membership enforcement on PATCH/DELETE /items/:itemId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 403 when deleted guest PATCHes an item', async () => {
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(false);

    const token = generateToken('deleted-guest@example.com');
    const response = await request
      .patch(`/api/events/${EVENT_ID}/items/aB3xY9mKpQrS`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' })
      .expect(403);

    expect(response.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
    expect(itemService.updateItem).not.toHaveBeenCalled();
  });

  it('should return 403 when deleted guest DELETEs an item', async () => {
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(false);

    const token = generateToken('deleted-guest@example.com');
    const response = await request
      .delete(`/api/events/${EVENT_ID}/items/aB3xY9mKpQrS`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
    expect(itemService.deleteItem).not.toHaveBeenCalled();
  });

  it('should allow active guest to PATCH their own item (no regression)', async () => {
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(true);
    itemService.updateItem.mockResolvedValue({ id: 'aB3xY9mKpQrS', name: 'Updated' });

    const token = generateToken('guest@example.com');
    const response = await request
      .patch(`/api/events/${EVENT_ID}/items/aB3xY9mKpQrS`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' })
      .expect(200);

    expect(response.body.name).toBe('Updated');
  });
});

// ──────────────────────────────────────────────────────────
// Phase 6 — US4: Deleted guest cannot delete ratings
// ──────────────────────────────────────────────────────────

describe('US4: Membership enforcement on DELETE /ratings/:itemId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 403 when deleted guest DELETEs a rating', async () => {
    eventService.getEvent.mockResolvedValue(activeEvent);
    eventService.isEventMember.mockReturnValue(false);

    const token = generateToken('deleted-guest@example.com');
    const response = await request
      .delete(`/api/events/${EVENT_ID}/ratings/1`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
    expect(ratingService.deleteRating).not.toHaveBeenCalled();
  });
});
