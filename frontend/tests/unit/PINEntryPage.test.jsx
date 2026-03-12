import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PINEntryPage from '../../src/pages/PINEntryPage.jsx';
import apiClient from '../../src/services/apiClient.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ eventId: 'A5ohYrHe' })),
    useNavigate: vi.fn(() => mockNavigate)
  };
});

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    verifyPIN: vi.fn(),
    checkEventAdmin: vi.fn(),
    setUserSession: vi.fn(),
  }
}));

vi.mock('../../src/utils/bookmarkStorage', () => ({
  clearAllBookmarks: vi.fn(),
}));

vi.mock('../../src/hooks/useTurnstile.js', () => ({
  default: vi.fn(() => ({
    token: 'mock-turnstile-token',
    isLoading: false,
    error: null,
    resetWidget: vi.fn(),
    containerRef: { current: null }
  })),
  useTurnstile: vi.fn(() => ({
    token: 'mock-turnstile-token',
    isLoading: false,
    error: null,
    resetWidget: vi.fn(),
    containerRef: { current: null }
  }))
}));

const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

function renderComponent() {
  return render(
    <BrowserRouter>
      <PINEntryPage />
    </BrowserRouter>
  );
}

describe('PINEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    apiClient.checkEventAdmin.mockResolvedValue({ isAdmin: false });
  });

  describe('Rendering', () => {
    it('renders PIN input and submit button', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Access Event/i })).toBeInTheDocument();
    });

    it('redirects to email entry when no email in sessionStorage', async () => {
      renderComponent();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe/email', { replace: true });
      });
    });

    it('redirects admin users to OTP entry', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'admin@example.com');
      apiClient.checkEventAdmin.mockResolvedValue({ isAdmin: true });
      renderComponent();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe/otp', { replace: true });
      });
    });
  });

  describe('Button state', () => {
    it('disables submit button when PIN is less than 6 digits', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      const pinInput = screen.getByPlaceholderText(/Enter 6-digit PIN/i);
      fireEvent.change(pinInput, { target: { value: '123' } });

      expect(screen.getByRole('button', { name: /Access Event/i })).toBeDisabled();
    });

    it('enables submit button when PIN is exactly 6 digits', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      const pinInput = screen.getByPlaceholderText(/Enter 6-digit PIN/i);
      fireEvent.change(pinInput, { target: { value: '123456' } });

      expect(screen.getByRole('button', { name: /Access Event/i })).not.toBeDisabled();
    });
  });

  describe('PIN verification', () => {
    it('calls verifyPIN API on form submit', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      apiClient.verifyPIN.mockResolvedValue({
        sessionId: 'test-session-id',
        eventId: 'A5ohYrHe',
        user: { email: 'user@example.com', exp: 9999999999 },
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      const pinInput = screen.getByPlaceholderText(/Enter 6-digit PIN/i);
      fireEvent.change(pinInput, { target: { value: '123456' } });

      const form = screen.getByRole('button', { name: /Access Event/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(apiClient.verifyPIN).toHaveBeenCalledWith('A5ohYrHe', '123456', 'user@example.com');
      });
    });

    it('stores user session on successful verification', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      apiClient.verifyPIN.mockResolvedValue({
        sessionId: 'test-session-id',
        user: { email: 'user@example.com', exp: 9999999999 },
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/Enter 6-digit PIN/i), { target: { value: '123456' } });
      fireEvent.submit(screen.getByRole('button', { name: /Access Event/i }).closest('form'));

      await waitFor(() => {
        expect(apiClient.setUserSession).toHaveBeenCalledWith({ email: 'user@example.com', exp: 9999999999 });
      });
    });

    it('shows success message and navigates on successful verification', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
        apiClient.verifyPIN.mockResolvedValue({
          sessionId: 'test-session-id',
          user: { email: 'user@example.com', exp: 9999999999 },
        });
        renderComponent();

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/Enter 6-digit PIN/i), { target: { value: '123456' } });
        fireEvent.submit(screen.getByRole('button', { name: /Access Event/i }).closest('form'));

        await waitFor(() => {
          expect(screen.getByText(/PIN verified successfully/i)).toBeInTheDocument();
        });

        vi.advanceTimersByTime(1100);

        expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe', { state: { guestJustLoggedIn: true }, replace: true });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Error handling', () => {
    it('displays error message for invalid PIN', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      apiClient.verifyPIN.mockRejectedValue(new Error('Invalid PIN'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/Enter 6-digit PIN/i), { target: { value: '000000' } });
      fireEvent.submit(screen.getByRole('button', { name: /Access Event/i }).closest('form'));

      await waitFor(() => {
        expect(screen.getByText(/Invalid PIN/i)).toBeInTheDocument();
      });
    });

    it('displays rate limit error message', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      apiClient.verifyPIN.mockRejectedValue(new Error('Too many attempts. Please try again in 15 minutes.'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/Enter 6-digit PIN/i), { target: { value: '000000' } });
      fireEvent.submit(screen.getByRole('button', { name: /Access Event/i }).closest('form'));

      await waitFor(() => {
        expect(screen.getByText(/Too many attempts/i)).toBeInTheDocument();
      });
    });

    it('displays network error message', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      apiClient.verifyPIN.mockRejectedValue(new Error('Failed to fetch'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/Enter 6-digit PIN/i), { target: { value: '000000' } });
      fireEvent.submit(screen.getByRole('button', { name: /Access Event/i }).closest('form'));

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect to the server/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('shows loading text and disables input during verification', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      let resolveVerify;
      apiClient.verifyPIN.mockImplementation(() => new Promise(resolve => { resolveVerify = resolve; }));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/Enter 6-digit PIN/i), { target: { value: '123456' } });
      fireEvent.submit(screen.getByRole('button', { name: /Access Event/i }).closest('form'));

      await waitFor(() => {
        expect(screen.getByText('Verifying...')).toBeInTheDocument();
      });
      expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeDisabled();

      resolveVerify({ sessionId: 'x', user: { email: 'user@example.com', exp: 9999999999 } });
    });
  });

  describe('Back button', () => {
    it('navigates back to email entry page', async () => {
      sessionStorageMock.setItem('event:A5ohYrHe:email', 'user@example.com');
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Enter 6-digit PIN/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Back/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe/email', { replace: true });
    });
  });
});
