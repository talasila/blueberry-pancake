import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDataRepository, createTestEvent } from './setup.js';
import configLoader from '../../src/config/configLoader.js';

/**
 * Integration test for data directory access
 * Validates SC-005: Data directory structure is accessible
 */
describe('Data Directory Access Integration', () => {
  let repo;

  beforeEach(async () => {
    repo = getTestDataRepository();
    await repo.initialize();
  });

  it('should access data directory from configuration', () => {
    const dataDir = configLoader.get('dataDirectory');
    expect(dataDir).toBeDefined();
    expect(typeof dataDir).toBe('string');
  });

  it('should create and access event directories', async () => {
    const eventId = 'integration-test-event';
    await createTestEvent(eventId);

    const events = await repo.listEvents();
    expect(events).toContain(eventId);
  });

  it('should read and write event configuration files', async () => {
    const eventId = 'config-test-event';
    const config = {
      eventId,
      name: 'Integration Test Event',
      createdAt: new Date().toISOString(),
    };

    await repo.writeEventConfig(eventId, config);
    const readConfig = await repo.readEventConfig(eventId);

    expect(readConfig).toEqual(config);
  });

  it('should handle CSV data files', async () => {
    const eventId = 'csv-test-event';
    await createTestEvent(eventId);

    const csvRow = 'user-001,2025-01-27T10:00:00Z,item-001,8,"Test note"';
    await repo.appendEventData(eventId, csvRow);

    const data = await repo.readEventData(eventId);
    expect(data).toContain('user-001');
    expect(data).toContain('item-001');
  });
});
