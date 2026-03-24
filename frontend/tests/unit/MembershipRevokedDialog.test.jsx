import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MembershipRevokedDialog from '../../src/components/MembershipRevokedDialog.jsx';

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    clearJWTToken: vi.fn().mockResolvedValue(),
  },
}));

import apiClient from '../../src/services/apiClient.js';

describe('MembershipRevokedDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no membership-revoked event has been dispatched', () => {
    render(<MembershipRevokedDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal when membership-revoked event fires', async () => {
    render(<MembershipRevokedDialog />);

    act(() => {
      window.dispatchEvent(new CustomEvent('membership-revoked', {
        detail: { message: 'User is not registered for this event' },
      }));
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Access Removed')).toBeInTheDocument();
    expect(screen.getByText('User is not registered for this event')).toBeInTheDocument();
  });

  it('should call clearJWTToken and redirect when OK is clicked', async () => {
    const originalHref = window.location.href;
    delete window.location;
    window.location = { href: originalHref };

    render(<MembershipRevokedDialog />);

    act(() => {
      window.dispatchEvent(new CustomEvent('membership-revoked', {
        detail: { message: 'Access removed' },
      }));
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('membership-revoked-ok'));

    await waitFor(() => {
      expect(apiClient.clearJWTToken).toHaveBeenCalled();
      expect(window.location.href).toBe('/');
    });
  });

  it('should have aria-modal attribute for blocking interaction', async () => {
    render(<MembershipRevokedDialog />);

    act(() => {
      window.dispatchEvent(new CustomEvent('membership-revoked', {
        detail: { message: 'Blocked' },
      }));
    });

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });
});
