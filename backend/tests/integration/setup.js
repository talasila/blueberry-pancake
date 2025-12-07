/**
 * Integration test setup
 * Ensures test isolation: cleanup between tests, mock external dependencies, independent test state
 */
import { beforeAll, afterEach, afterAll } from 'vitest';
import cacheService from '../../src/cache/CacheService.js';
import FileDataRepository from '../../src/data/FileDataRepository.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test data directory
const testDataDir = join(__dirname, '../../test-data');

/**
 * Cleanup test data directory
 */
async function cleanupTestData() {
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore if directory doesn't exist
  }
}

/**
 * Setup before all tests
 */
beforeAll(async () => {
  // Clean cache
  cacheService.flush();
  
  // Clean test data
  await cleanupTestData();
  
  // Create test data directory
  await fs.mkdir(testDataDir, { recursive: true });
  await fs.mkdir(join(testDataDir, 'events'), { recursive: true });
});

/**
 * Cleanup after each test
 */
afterEach(async () => {
  // Clear cache between tests
  cacheService.flush();
  
  // Clean test data (but keep directory structure)
  try {
    const eventsDir = join(testDataDir, 'events');
    const entries = await fs.readdir(eventsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await fs.rm(join(eventsDir, entry.name), { recursive: true, force: true });
      }
    }
  } catch (error) {
    // Ignore errors
  }
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  // Final cleanup
  cacheService.flush();
  await cleanupTestData();
});

/**
 * Get test data repository instance
 * Uses test data directory instead of production data directory
 */
export function getTestDataRepository() {
  const repo = new FileDataRepository();
  // Override data directory for tests
  repo.dataDirectory = testDataDir;
  return repo;
}

/**
 * Create test event data
 * @param {string} eventId - Event identifier
 * @param {object} config - Event configuration
 */
export async function createTestEvent(eventId, config = {}) {
  const repo = getTestDataRepository();
  await repo.initialize();
  await repo.writeEventConfig(eventId, {
    eventId,
    name: `Test Event ${eventId}`,
    createdAt: new Date().toISOString(),
    ...config,
  });
  return repo;
}
