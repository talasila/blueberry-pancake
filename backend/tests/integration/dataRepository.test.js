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

});
