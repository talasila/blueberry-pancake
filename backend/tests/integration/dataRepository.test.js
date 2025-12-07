import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDataRepository, createTestEvent } from './setup.js';

/**
 * Integration tests for FileDataRepository
 * Tests data access layer with file system operations
 */
describe('FileDataRepository Integration', () => {
  let repo;

  beforeEach(async () => {
    repo = getTestDataRepository();
    await repo.initialize();
  });

  it('should create and read event configuration', async () => {
    const eventId = 'test-event-001';
    const config = {
      eventId,
      name: 'Test Event',
      createdAt: new Date().toISOString(),
    };

    await repo.writeEventConfig(eventId, config);
    const readConfig = await repo.readEventConfig(eventId);

    expect(readConfig).toEqual(config);
  });

  it('should list all events', async () => {
    await createTestEvent('event-1');
    await createTestEvent('event-2');
    await createTestEvent('event-3');

    const events = await repo.listEvents();

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events).toContain('event-1');
    expect(events).toContain('event-2');
    expect(events).toContain('event-3');
  });

  it('should handle event data CSV operations', async () => {
    const eventId = 'test-event-csv';
    await createTestEvent(eventId);

    // Append data
    await repo.appendEventData(eventId, 'user-001,2025-01-27T10:00:00Z,item-001,8,"Great"');

    // Read data
    const data = await repo.readEventData(eventId);
    expect(data).toContain('user-001');
    expect(data).toContain('item-001');
  });

  it('should return empty CSV with header if data file does not exist', async () => {
    const eventId = 'test-event-empty';
    await createTestEvent(eventId);

    const data = await repo.readEventData(eventId);
    expect(data).toBe('participantId,timestamp,itemId,rating,notes\n');
  });
});
