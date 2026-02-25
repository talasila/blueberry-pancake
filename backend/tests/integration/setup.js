/**
 * Integration test setup
 * Manages test data directory for isolation between test runs
 */
import { beforeAll, afterEach, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDataDir = join(__dirname, '../../test-data');

async function cleanupTestData() {
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch {
    // Ignore if directory doesn't exist
  }
}

beforeAll(async () => {
  await cleanupTestData();
  await fs.mkdir(testDataDir, { recursive: true });
  await fs.mkdir(join(testDataDir, 'events'), { recursive: true });
});

afterEach(async () => {
  try {
    const eventsDir = join(testDataDir, 'events');
    const entries = await fs.readdir(eventsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await fs.rm(join(eventsDir, entry.name), { recursive: true, force: true });
      }
    }
  } catch {
    // Ignore errors
  }
});

afterAll(async () => {
  await cleanupTestData();
});
