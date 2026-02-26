import { describe, it, expect, beforeEach, vi } from 'vitest';
import systemService from '../../src/services/SystemService.js';
import dataRepository from '../../src/data/DynamoDBRepository.js';
import loggerService from '../../src/logging/Logger.js';

vi.mock('../../src/data/DynamoDBRepository.js', () => {
  return {
    default: {
      listEvents: vi.fn(),
      readEventConfig: vi.fn(),
      getRatings: vi.fn(() => [])
    }
  };
});

vi.mock('../../src/logging/Logger.js', () => {
  return {
    default: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  };
});

vi.mock('../../src/services/PINService.js', () => {
  return {
    default: {
      invalidatePINSessions: vi.fn()
    }
  };
});

function makeConfig(overrides = {}) {
  return {
    name: 'Test Event',
    state: 'created',
    typeOfItem: 'wine',
    createdAt: new Date().toISOString(),
    administrators: { 'owner@test.com': { owner: true } },
    itemConfiguration: { numberOfItems: 0, excludedItemIds: [] },
    users: {},
    pin: null,
    ...overrides
  };
}

describe('SystemService.listAllEventsForAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return pin field in event summaries', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1']);
    dataRepository.readEventConfig.mockResolvedValue(makeConfig({ pin: '123456' }));

    const result = await systemService.listAllEventsForAdmin({ limit: 25 });

    expect(result.events[0]).toHaveProperty('pin', '123456');
  });

  it('should return null pin for events without one', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1']);
    dataRepository.readEventConfig.mockResolvedValue(makeConfig({ pin: null }));

    const result = await systemService.listAllEventsForAdmin({ limit: 25 });

    expect(result.events[0]).toHaveProperty('pin', null);
  });

  it('should OR-match search across eventId, name, and ownerEmail', async () => {
    dataRepository.listEvents.mockResolvedValue(['ABC123', 'XYZ789', 'DEF456']);
    dataRepository.readEventConfig
      .mockResolvedValueOnce(makeConfig({ name: 'Wine Tasting' }))
      .mockResolvedValueOnce(makeConfig({ name: 'Beer Festival', administrators: { 'abc123@test.com': { owner: true } } }))
      .mockResolvedValueOnce(makeConfig({ name: 'Cheese Night' }));

    // Search for "abc123" — should match eventId "ABC123" and ownerEmail "abc123@test.com"
    const result = await systemService.listAllEventsForAdmin({ search: 'abc123' });

    expect(result.events).toHaveLength(2);
    const ids = result.events.map(e => e.eventId);
    expect(ids).toContain('ABC123');
    expect(ids).toContain('XYZ789');
  });

  it('should be case-insensitive when searching', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1']);
    dataRepository.readEventConfig.mockResolvedValue(makeConfig({ name: 'Wine TASTING' }));

    const result = await systemService.listAllEventsForAdmin({ search: 'wine tasting' });

    expect(result.events).toHaveLength(1);
  });

  it('should treat whitespace-only search as empty (returns all events)', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1', 'EVT2']);
    dataRepository.readEventConfig
      .mockResolvedValueOnce(makeConfig({ name: 'Event A' }))
      .mockResolvedValueOnce(makeConfig({ name: 'Event B' }));

    const result = await systemService.listAllEventsForAdmin({ search: '   ' });

    expect(result.events).toHaveLength(2);
  });

  it('should ignore name and owner filters when search is provided', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1', 'EVT2']);
    dataRepository.readEventConfig
      .mockResolvedValueOnce(makeConfig({ name: 'Wine Tasting' }))
      .mockResolvedValueOnce(makeConfig({ name: 'Beer Festival' }));

    // search matches both, but name filter would only match "Wine"
    const result = await systemService.listAllEventsForAdmin({
      search: 'festival',
      name: 'Wine',
      owner: 'nonexistent'
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Beer Festival');
  });

  it('should still apply state filter alongside search', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1', 'EVT2']);
    dataRepository.readEventConfig
      .mockResolvedValueOnce(makeConfig({ name: 'Wine Tasting', state: 'started' }))
      .mockResolvedValueOnce(makeConfig({ name: 'Wine Night', state: 'completed' }));

    const result = await systemService.listAllEventsForAdmin({
      search: 'wine',
      state: 'started'
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Wine Tasting');
  });

  it('should apply legacy name filter when search is absent', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1', 'EVT2']);
    dataRepository.readEventConfig
      .mockResolvedValueOnce(makeConfig({ name: 'Wine Tasting' }))
      .mockResolvedValueOnce(makeConfig({ name: 'Beer Festival' }));

    const result = await systemService.listAllEventsForAdmin({ name: 'Beer' });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Beer Festival');
  });

  it('should paginate results correctly', async () => {
    dataRepository.listEvents.mockResolvedValue(['EVT1', 'EVT2', 'EVT3']);
    dataRepository.readEventConfig
      .mockResolvedValueOnce(makeConfig({ name: 'A', createdAt: '2026-03-03T00:00:00Z' }))
      .mockResolvedValueOnce(makeConfig({ name: 'B', createdAt: '2026-03-02T00:00:00Z' }))
      .mockResolvedValueOnce(makeConfig({ name: 'C', createdAt: '2026-03-01T00:00:00Z' }));

    const result = await systemService.listAllEventsForAdmin({ limit: 2, offset: 0 });

    expect(result.events).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.events[0].name).toBe('A');
    expect(result.events[1].name).toBe('B');
  });
});
