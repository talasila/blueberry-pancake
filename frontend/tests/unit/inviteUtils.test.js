import { describe, it, expect } from 'vitest';
import { formatInvitationMessage } from '../../src/utils/inviteUtils.js';

describe('formatInvitationMessage', () => {
  it('returns a formatted invitation with event name, URL, and PIN', () => {
    const result = formatInvitationMessage(
      'Summer Wines',
      'https://example.com/event/ABC',
      '7842'
    );

    expect(result).toBe(
      'You\'re invited to "Summer Wines"!\n' +
      'Join here: https://example.com/event/ABC\n' +
      'PIN: 7842'
    );
  });

  it('handles event names with special characters', () => {
    const result = formatInvitationMessage(
      'John\'s "Best" Tasting',
      'https://example.com/event/X1',
      '1234'
    );

    expect(result).toContain('John\'s "Best" Tasting');
    expect(result).toContain('PIN: 1234');
  });
});
