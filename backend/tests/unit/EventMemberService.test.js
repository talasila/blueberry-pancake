import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing module under test
vi.mock('../../src/data/DynamoDBRepository.js', () => ({
  default: {
    registerUserAtomic: vi.fn(),
    readEventConfig: vi.fn(),
    writeEventConfig: vi.fn(),
    listEvents: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../src/services/EventService.js', () => ({
  default: {
    getEvent: vi.fn(),
    updateEvent: vi.fn(),
    isAdministrator: vi.fn(() => false)
  }
}));

vi.mock('../../src/utils/userIdUtils.js', () => ({
  generateUserId: vi.fn(() => 'u_mockedID01')
}));

vi.mock('../../src/logging/Logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import eventMemberService from '../../src/services/EventMemberService.js';
import eventService from '../../src/services/EventService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';
import { generateUserId } from '../../src/utils/userIdUtils.js';

describe('EventMemberService.registerUser email privacy', () => {
  const eventId = 'TEST1234';
  const email = 'alice@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registerUser returns userId for new registration', async () => {
    dataRepository.registerUserAtomic.mockResolvedValue({
      registered: true,
      alreadyExists: false
    });

    // Event returned after atomic registration has the user but no userId yet
    eventService.getEvent.mockResolvedValue({
      eventId,
      users: {
        [email]: {
          registeredAt: '2026-03-22T10:00:00.000Z'
        }
      }
    });
    eventService.updateEvent.mockResolvedValue();

    const result = await eventMemberService.registerUser(eventId, email);

    expect(result.userId).toMatch(/^u_/);
    expect(result.userId).toBe('u_mockedID01');
    expect(result.eventId).toBe(eventId);
    expect(result.email).toBe(email);
    expect(result.registered).toBe(true);
    expect(result.alreadyExists).toBe(false);
    expect(generateUserId).toHaveBeenCalled();
    expect(eventService.updateEvent).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({
        users: expect.objectContaining({
          [email]: expect.objectContaining({ userId: 'u_mockedID01' })
        })
      })
    );
  });

  it('registerUser preserves existing userId on re-registration', async () => {
    dataRepository.registerUserAtomic.mockResolvedValue({
      registered: false,
      alreadyExists: true
    });

    // Event already has a userId assigned
    eventService.getEvent.mockResolvedValue({
      eventId,
      users: {
        [email]: {
          registeredAt: '2026-03-20T10:00:00.000Z',
          userId: 'u_existingID',
          name: 'Alice'
        }
      }
    });

    const result = await eventMemberService.registerUser(eventId, email);

    expect(result.userId).toBe('u_existingID');
    expect(result.alreadyExists).toBe(true);
    expect(result.registered).toBe(false);
    // generateUserId is called for pre-generation, but existing userId is preserved
    expect(generateUserId).toHaveBeenCalled();
    // updateEvent should NOT be called since nothing needs backfilling
    expect(eventService.updateEvent).not.toHaveBeenCalled();
  });

  it('registerUser backfills name from email prefix for pre-existing user without name', async () => {
    dataRepository.registerUserAtomic.mockResolvedValue({
      registered: false,
      alreadyExists: true
    });

    // Pre-existing user (from before the email privacy feature) has no name or userId
    eventService.getEvent.mockResolvedValue({
      eventId,
      users: {
        [email]: {
          registeredAt: '2026-01-01T10:00:00.000Z'
        }
      }
    });
    eventService.updateEvent.mockResolvedValue();

    const result = await eventMemberService.registerUser(eventId, email);

    // Name backfilled from email prefix
    expect(result.name).toBe('alice');
    // userId generated via lazy backfill
    expect(result.userId).toBe('u_mockedID01');
    // updateEvent should be called to persist the backfilled name
    expect(eventService.updateEvent).toHaveBeenCalledWith(
      eventId,
      expect.objectContaining({
        users: expect.objectContaining({
          [email]: expect.objectContaining({ name: 'alice' })
        })
      })
    );
  });
});
