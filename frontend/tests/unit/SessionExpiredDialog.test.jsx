import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SessionExpiredDialog from '../../src/components/SessionExpiredDialog.jsx';

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    verifyPIN: vi.fn(),
    setUserSession: vi.fn(),
    getUserName: vi.fn(() => null),
  },
}));

import apiClient from '../../src/services/apiClient.js';

function dispatchSessionExpired(detail = {}) {
  act(() => {
    window.dispatchEvent(new CustomEvent('session-expired', {
      detail: { authMethod: 'pin', email: 'user@test.com', eventId: 'ABCD1234', ...detail },
    }));
  });
}

describe('SessionExpiredDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no session-expired event has been dispatched', () => {
    render(<SessionExpiredDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog when session-expired event fires', async () => {
    render(<SessionExpiredDialog />);
    dispatchSessionExpired();

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });

  it('should have aria-modal attribute for blocking interaction', async () => {
    render(<SessionExpiredDialog />);
    dispatchSessionExpired();

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('PIN re-auth flow', () => {
    it('should show PIN input when authMethod is pin', async () => {
      render(<SessionExpiredDialog />);
      dispatchSessionExpired({ authMethod: 'pin' });

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
      });
      expect(screen.getByText(/enter your pin/i)).toBeInTheDocument();
    });

    it('should show PIN input when authMethod is null (default)', async () => {
      render(<SessionExpiredDialog />);
      dispatchSessionExpired({ authMethod: null });

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
      });
    });

    it('should show error for PIN shorter than 6 digits', async () => {
      render(<SessionExpiredDialog />);
      dispatchSessionExpired();

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '123' } });
      fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-error')).toHaveTextContent('PIN must be exactly 6 digits');
      });
    });

    it('should strip non-numeric characters from PIN input', async () => {
      render(<SessionExpiredDialog />);
      dispatchSessionExpired();

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '12ab34' } });
      expect(screen.getByTestId('session-expired-pin-input').value).toBe('1234');
    });

    it('should call verifyPIN and dismiss on success', async () => {
      apiClient.verifyPIN.mockResolvedValue({
        user: { userId: 'u_testABCDEF', name: 'user', exp: 9999999999, authMethod: 'pin' },
        sessionId: 'sess-123',
      });

      render(<SessionExpiredDialog />);
      dispatchSessionExpired();

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '123456' } });
      fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

      await waitFor(() => {
        expect(apiClient.verifyPIN).toHaveBeenCalledWith('ABCD1234', '123456', 'user@test.com', expect.any(String));
      });

      await waitFor(() => {
        expect(apiClient.setUserSession).toHaveBeenCalledWith({
          userId: 'u_testABCDEF', name: 'user', exp: 9999999999, authMethod: 'pin',
        });
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show error on invalid PIN', async () => {
      apiClient.verifyPIN.mockRejectedValue(new Error('Invalid PIN'));

      render(<SessionExpiredDialog />);
      dispatchSessionExpired();

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '000000' } });
      fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-error')).toHaveTextContent('Invalid PIN. Please try again.');
      });
      // Dialog stays open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should show network error message', async () => {
      apiClient.verifyPIN.mockRejectedValue(new Error('Failed to fetch'));

      render(<SessionExpiredDialog />);
      dispatchSessionExpired();

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '123456' } });
      fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-error')).toHaveTextContent('Unable to connect');
      });
    });
  });

  describe('OTP redirect flow', () => {
    it('should show redirect button when authMethod is otp', async () => {
      render(<SessionExpiredDialog />);
      dispatchSessionExpired({ authMethod: 'otp' });

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-otp-continue')).toBeInTheDocument();
      });
      expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
      expect(screen.queryByTestId('session-expired-pin-input')).not.toBeInTheDocument();
    });

    it('should redirect to OTP page when Continue is clicked', async () => {
      const originalHref = window.location.href;
      delete window.location;
      window.location = { href: originalHref, pathname: '/event/ABCD1234' };

      render(<SessionExpiredDialog />);
      dispatchSessionExpired({ authMethod: 'otp', email: 'admin@test.com', eventId: 'ABCD1234' });

      await waitFor(() => {
        expect(screen.getByTestId('session-expired-otp-continue')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('session-expired-otp-continue'));

      expect(window.location.href).toBe('/event/ABCD1234/otp');

      // Restore
      window.location = new URL(originalHref);
    });
  });

  describe('deduplication', () => {
    it('should not show multiple dialogs for rapid session-expired events', async () => {
      render(<SessionExpiredDialog />);
      dispatchSessionExpired();
      dispatchSessionExpired();
      dispatchSessionExpired();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      // Only one dialog
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
    });
  });
});

describe('SessionExpiredDialog — recovery email from localStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads pin:email:{eventId} from localStorage when session email is null', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'pin:email:ABCD1234') return 'guest@test.com';
      return null;
    });

    apiClient.verifyPIN.mockResolvedValue({
      user: { userId: 'u_testABCDEF', name: 'Guest', exp: 9999999999, authMethod: 'pin' },
      sessionId: 'sess-456',
    });

    render(<SessionExpiredDialog />);
    dispatchSessionExpired({ email: null, authMethod: 'pin', eventId: 'ABCD1234' });

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

    await waitFor(() => {
      expect(apiClient.verifyPIN).toHaveBeenCalledWith('ABCD1234', '123456', 'guest@test.com', expect.any(String));
    });

    getItemSpy.mockRestore();
  });

  it('updates stored email after successful re-auth', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'pin:email:ABCD1234') return 'guest@test.com';
      return null;
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    apiClient.verifyPIN.mockResolvedValue({
      user: { userId: 'u_testABCDEF', name: 'Guest', exp: 9999999999, authMethod: 'pin' },
      sessionId: 'sess-456',
    });

    render(<SessionExpiredDialog />);
    dispatchSessionExpired({ email: null, authMethod: 'pin', eventId: 'ABCD1234' });

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

    await waitFor(() => {
      expect(apiClient.verifyPIN).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('pin:email:ABCD1234', 'guest@test.com');
    });

    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});

describe('SessionExpiredDialog — error message accuracy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Invalid PIN" for wrong PIN error', async () => {
    apiClient.verifyPIN.mockRejectedValue(new Error('Invalid PIN'));

    render(<SessionExpiredDialog />);
    dispatchSessionExpired();

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '000000' } });
    fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-error')).toHaveTextContent('Invalid PIN. Please try again.');
    });
  });

  it('shows rate limit message for Too many attempts error', async () => {
    apiClient.verifyPIN.mockRejectedValue(new Error('Too many attempts. Please try again later.'));

    render(<SessionExpiredDialog />);
    dispatchSessionExpired();

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '000000' } });
    fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-error')).toHaveTextContent('Too many attempts. Please try again later.');
    });
  });

  it('shows session data expired for Email-related error', async () => {
    apiClient.verifyPIN.mockRejectedValue(new Error('Email is required'));

    render(<SessionExpiredDialog />);
    dispatchSessionExpired();

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-error')).toHaveTextContent('Session data expired. Please reload the page to sign in again.');
    });
  });

  it('shows connection error for network failure', async () => {
    apiClient.verifyPIN.mockRejectedValue(new Error('Failed to fetch'));

    render(<SessionExpiredDialog />);
    dispatchSessionExpired();

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-pin-input')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('session-expired-pin-input'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByTestId('session-expired-pin-submit').closest('form'));

    await waitFor(() => {
      expect(screen.getByTestId('session-expired-error')).toHaveTextContent('Unable to connect. Please check your connection.');
    });
  });
});
