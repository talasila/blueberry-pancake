import { describe, it, expect, beforeEach, vi } from 'vitest';
import requireEventMembership from '../../src/middleware/requireEventMembership.js';
import eventService from '../../src/services/EventService.js';

vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn(),
    isEventMember: vi.fn(),
  },
}));

function mockReq(overrides = {}) {
  return {
    params: { eventId: 'ABCD1234' },
    user: { email: 'guest@example.com' },
    ...overrides,
  };
}

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

describe('requireEventMembership middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next and attach req.event when user is a member', async () => {
    const event = { users: { 'guest@example.com': {} }, administrators: {} };
    eventService.getEvent.mockResolvedValue(event);
    eventService.isEventMember.mockReturnValue(true);

    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await requireEventMembership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.event).toBe(event);
    expect(res.statusCode).toBeNull();
  });

  it('should return 403 with EVENT_MEMBERSHIP_REQUIRED when user is not a member', async () => {
    const event = { users: {}, administrators: {} };
    eventService.getEvent.mockResolvedValue(event);
    eventService.isEventMember.mockReturnValue(false);

    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await requireEventMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
    expect(res.body.error).toMatch(/not registered/);
  });

  it('should return 403 when email is missing from req.user', async () => {
    const req = mockReq({ user: {} });
    const res = mockRes();
    const next = vi.fn();

    await requireEventMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
  });

  it('should return 403 when eventId is missing from params', async () => {
    const req = mockReq({ params: {} });
    const res = mockRes();
    const next = vi.fn();

    await requireEventMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('EVENT_MEMBERSHIP_REQUIRED');
  });

  it('should allow admin-only users (not in event.users) through', async () => {
    const event = { users: {}, administrators: { 'admin@example.com': { owner: true } } };
    eventService.getEvent.mockResolvedValue(event);
    eventService.isEventMember.mockReturnValue(true);

    const req = mockReq({ user: { email: 'admin@example.com' } });
    const res = mockRes();
    const next = vi.fn();

    await requireEventMembership(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.event).toBe(event);
  });

  it('should return 500 when getEvent throws', async () => {
    eventService.getEvent.mockRejectedValue(new Error('DB down'));

    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    await requireEventMembership(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
  });
});
