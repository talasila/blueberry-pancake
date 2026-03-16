import { describe, it, expect } from 'vitest';
import { appendWithCharLimit } from '../../../src/utils/appendWithCharLimit.js';

describe('appendWithCharLimit', () => {
  it('appends text with space separator', () => {
    const result = appendWithCharLimit('Hello', 'world', 100);
    expect(result).toBe('Hello world');
  });

  it('returns newText when existingText is empty', () => {
    const result = appendWithCharLimit('', 'hello', 100);
    expect(result).toBe('hello');
  });

  it('returns newText truncated when existingText is empty and newText exceeds limit', () => {
    const result = appendWithCharLimit('', 'hello world foo', 11);
    expect(result).toBe('hello world');
  });

  it('returns existing text unchanged when newText is empty', () => {
    const result = appendWithCharLimit('hello', '', 100);
    expect(result).toBe('hello');
  });

  it('returns existing text unchanged when newText is null', () => {
    const result = appendWithCharLimit('hello', null, 100);
    expect(result).toBe('hello');
  });

  it('handles both inputs empty', () => {
    const result = appendWithCharLimit('', '', 100);
    expect(result).toBe('');
  });

  it('returns combined text when exactly at limit', () => {
    // "ab cd" = 5 chars
    const result = appendWithCharLimit('ab', 'cd', 5);
    expect(result).toBe('ab cd');
  });

  it('truncates at word boundary when over limit', () => {
    // existing "Hello" (5) + " " (1) + "beautiful world" (15) = 21, limit 16
    // available for addition = 16 - 5 - 1 = 10
    // "beautiful world" truncated to 10 = "beautiful " -> word boundary = "beautiful"
    const result = appendWithCharLimit('Hello', 'beautiful world', 16);
    expect(result).toBe('Hello beautiful');
  });

  it('hard truncates when no word boundary found in addition', () => {
    // existing "Hi" (2) + " " (1) + "abcdefghij" = 13, limit 8
    // available for addition = 8 - 2 - 1 = 5
    // "abcdefghij" truncated to 5 = "abcde" (no space => hard truncate)
    const result = appendWithCharLimit('Hi', 'abcdefghij', 8);
    expect(result).toBe('Hi abcde');
  });

  it('returns existing text when no space available for addition', () => {
    const result = appendWithCharLimit('Hello', 'world', 5);
    expect(result).toBe('Hello');
  });

  it('trims trailing whitespace from existing text', () => {
    const result = appendWithCharLimit('Hello   ', 'world', 100);
    expect(result).toBe('Hello world');
  });

  it('handles null existingText', () => {
    const result = appendWithCharLimit(null, 'hello', 100);
    expect(result).toBe('hello');
  });

  it('handles undefined existingText', () => {
    const result = appendWithCharLimit(undefined, 'hello', 100);
    expect(result).toBe('hello');
  });

  it('handles the 500-character note limit scenario', () => {
    const existingNote = 'A'.repeat(490);
    const suggestion = 'This is a long suggestion';
    const result = appendWithCharLimit(existingNote, suggestion, 500);
    // 490 + 1 space + up to 9 chars = 500
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result.startsWith(existingNote)).toBe(true);
  });

  it('preserves full text when combined is under limit', () => {
    const result = appendWithCharLimit(
      'Rich fruit flavors.',
      'Long finish with oak notes.',
      500
    );
    expect(result).toBe('Rich fruit flavors. Long finish with oak notes.');
  });
});
