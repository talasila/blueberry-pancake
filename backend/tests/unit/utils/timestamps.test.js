import { describe, it, expect } from 'vitest';
import { getCurrentTimestamp } from '../../../src/utils/timestamps.js';

describe('getCurrentTimestamp', () => {
  it('should return ISO 8601 formatted string by default', () => {
    const result = getCurrentTimestamp();

    // ISO 8601 format with milliseconds: 2024-01-01T00:00:00.000Z
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should return a parseable date string', () => {
    const result = getCurrentTimestamp();
    const parsed = new Date(result);

    expect(parsed.getTime()).not.toBeNaN();
  });

  it('should return a timestamp close to now', () => {
    const before = Date.now();
    const result = getCurrentTimestamp();
    const after = Date.now();

    const timestamp = new Date(result).getTime();
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should strip milliseconds when stripMs option is true', () => {
    const result = getCurrentTimestamp({ stripMs: true });

    // ISO 8601 format without milliseconds: 2024-01-01T00:00:00Z
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(result).not.toContain('.');
  });

  it('should keep milliseconds when stripMs is false', () => {
    const result = getCurrentTimestamp({ stripMs: false });

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should keep milliseconds when options is undefined', () => {
    const result = getCurrentTimestamp(undefined);

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
