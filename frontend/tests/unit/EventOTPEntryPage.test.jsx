import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EventOTPEntryPage from '../../src/pages/EventOTPEntryPage.jsx';
import apiClient from '../../src/services/apiClient.js';
import useEventPublicInfo from '../../src/hooks/useEventPublicInfo';
import { useTurnstile } from '../../src/hooks/useTurnstile';

// --- Mocks ---

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ eventId: 'TestEvt1' })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    requestOTP: vi.fn(),
    verifyOTP: vi.fn(),
    setUserSession: vi.fn(),
  },
}));

const mockResetWidget = vi.fn();
let mockTurnstileReturn = {
  token: null,
  isLoading: true,
  error: null,
  resetWidget: mockResetWidget,
  containerRef: { current: null },
};

vi.mock('../../src/hooks/useTurnstile.js', () => ({
  default: vi.fn(() => mockTurnstileReturn),
  useTurnstile: vi.fn(() => mockTurnstileReturn),
}));

vi.mock('../../src/hooks/useEventPublicInfo', () => ({
  default: vi.fn(() => ({
    name: null, typeOfItem: null, theme: null,
    state: null, loading: true, error: false, notFound: false,
  })),
}));

vi.mock('../../src/hooks/useDarkMode', () => ({
  default: vi.fn(() => ({ isDark: false, toggleDark: vi.fn() })),
}));

vi.mock('../../src/utils/themePresets', () => ({
  getThemeVars: vi.fn(() => ({})),
}));

// --- Storage mocks ---

const sessionStore = {};
const sessionStorageMock = {
  getItem: vi.fn((key) => sessionStore[key] ?? null),
  setItem: vi.fn((key, value) => { sessionStore[key] = value; }),
  removeItem: vi.fn((key) => { delete sessionStore[key]; }),
  clear: vi.fn(() => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); }),
};
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true });

// --- Helpers ---

function setTurnstile(overrides) {
  mockTurnstileReturn = {
    token: null,
    isLoading: true,
    error: null,
    resetWidget: mockResetWidget,
    containerRef: { current: null },
    ...overrides,
  };
  useTurnstile.mockReturnValue(mockTurnstileReturn);
}

function renderPage() {
  return render(
    <BrowserRouter>
      <EventOTPEntryPage />
    </BrowserRouter>,
  );
}

function seedEmail(email = 'admin@example.com', name = 'Admin') {
  sessionStore['event:TestEvt1:email'] = email;
  sessionStore['event:TestEvt1:name'] = name;
}

// --- Tests ---

describe('EventOTPEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    setTurnstile({ token: null, isLoading: true, error: null });
    apiClient.requestOTP.mockResolvedValue({ message: 'OTP sent' });
    apiClient.verifyOTP.mockResolvedValue({ user: { email: 'admin@example.com', exp: 9999999999 } });
  });

  // ------------------------------------------------------------------
  // Phase 3 — User Story 1: Auto-send waits for Turnstile, fires once
  // ------------------------------------------------------------------

  describe('US1 — Auto-send OTP', () => {
    it('T006: does NOT send OTP when turnstileToken is null', async () => {
      seedEmail();
      setTurnstile({ token: null, isLoading: true, error: null });

      renderPage();

      // Give effects a chance to run
      await waitFor(() => {});
      expect(apiClient.requestOTP).not.toHaveBeenCalled();
    });

    it('T007: sends OTP exactly once when turnstileToken becomes available, and does NOT call resetWidget', async () => {
      seedEmail();
      setTurnstile({ token: 'tok-abc', isLoading: false, error: null });

      renderPage();

      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
        expect(apiClient.requestOTP).toHaveBeenCalledWith('admin@example.com', 'tok-abc');
      });

      // FR-004: auto-send must NOT call resetWidget
      expect(mockResetWidget).not.toHaveBeenCalled();
    });

    it('T008: changing turnstileToken after initial send does NOT trigger another OTP request', async () => {
      seedEmail();
      setTurnstile({ token: 'tok-1', isLoading: false, error: null });

      const { rerender } = renderPage();

      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
      });

      // Simulate Turnstile token change (e.g., expiry + re-solve)
      setTurnstile({ token: 'tok-2', isLoading: false, error: null });
      rerender(
        <BrowserRouter>
          <EventOTPEntryPage />
        </BrowserRouter>,
      );

      // Still only 1 call
      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
      });
    });

    it('T009: shows loading indicator while turnstileToken is null (before auto-send)', () => {
      seedEmail();
      setTurnstile({ token: null, isLoading: true, error: null });

      renderPage();

      expect(screen.getByText('Sending verification code...')).toBeInTheDocument();
    });
  });

  // ------------------------------------------------------------------
  // Phase 4 — User Story 2: Manual resend
  // ------------------------------------------------------------------

  describe('US2 — Manual resend', () => {
    it('T013: clicking Resend sends OTP and calls resetWidget afterward', async () => {
      seedEmail();
      setTurnstile({ token: 'tok-abc', isLoading: false, error: null });

      renderPage();

      // Wait for auto-send to complete (shows resend button)
      await waitFor(() => {
        expect(screen.getByText(/Didn't receive code/)).toBeInTheDocument();
      });

      mockResetWidget.mockClear();
      apiClient.requestOTP.mockClear();

      fireEvent.click(screen.getByText(/Didn't receive code/));

      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
        expect(apiClient.requestOTP).toHaveBeenCalledWith('admin@example.com', 'tok-abc');
        expect(mockResetWidget).toHaveBeenCalledTimes(1);
      });
    });

    it('T014: Resend button is disabled when turnstileToken is null', async () => {
      seedEmail();
      // Start with token so auto-send fires, then simulate token becoming null
      setTurnstile({ token: 'tok-abc', isLoading: false, error: null });

      const { rerender } = renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Didn't receive code/)).toBeInTheDocument();
      });

      // Token goes null (e.g., after expiry)
      setTurnstile({ token: null, isLoading: true, error: null });
      rerender(
        <BrowserRouter>
          <EventOTPEntryPage />
        </BrowserRouter>,
      );

      const resendButton = screen.getByRole('button', { name: /Didn't receive code/i });
      expect(resendButton).toBeDisabled();
    });

    it('T015: rate limit error from resend is displayed inline', async () => {
      seedEmail();
      setTurnstile({ token: 'tok-abc', isLoading: false, error: null });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Didn't receive code/)).toBeInTheDocument();
      });

      // Make resend fail with rate limit
      apiClient.requestOTP.mockRejectedValueOnce(new Error('Rate limit exceeded. Please try again in 12 minutes.'));

      fireEvent.click(screen.getByText(/Didn't receive code/));

      await waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/)).toBeInTheDocument();
      });
    });
  });

  // ------------------------------------------------------------------
  // Phase 5 — User Story 3: Turnstile failure
  // ------------------------------------------------------------------

  describe('US3 — Turnstile failure', () => {
    it('T019: when Turnstile errors, OTP send proceeds with null token (backend decides)', async () => {
      seedEmail();
      setTurnstile({ token: null, isLoading: false, error: 'Turnstile script not available' });

      renderPage();

      // Auto-send should proceed despite null token (backend accepts in dev, rejects in prod)
      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
        expect(apiClient.requestOTP).toHaveBeenCalledWith('admin@example.com', null);
      });
    });

    it('T019: when Turnstile errors and backend rejects, error is shown inline', async () => {
      seedEmail();
      setTurnstile({ token: null, isLoading: false, error: 'Turnstile script not available' });
      apiClient.requestOTP.mockRejectedValueOnce(new Error('Request could not be processed. Please try again.'));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Request could not be processed/)).toBeInTheDocument();
      });
    });

    it('T019b: after Turnstile failure, remounting starts fresh and sends with new token', async () => {
      seedEmail();
      // First mount: Turnstile fails, send proceeds with null
      setTurnstile({ token: null, isLoading: false, error: 'Turnstile script not available' });

      const { unmount } = renderPage();
      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
        expect(apiClient.requestOTP).toHaveBeenCalledWith('admin@example.com', null);
      });

      unmount();
      apiClient.requestOTP.mockClear();

      // Second mount (reload): Turnstile succeeds
      setTurnstile({ token: 'tok-fresh', isLoading: false, error: null });
      renderPage();

      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
        expect(apiClient.requestOTP).toHaveBeenCalledWith('admin@example.com', 'tok-fresh');
      });
    });
  });

  // ------------------------------------------------------------------
  // Phase 6 — User Story 4: Page reload safety
  // ------------------------------------------------------------------

  describe('US4 — Reload does not burn rate limits', () => {
    it('T021: remounting the component sends exactly one OTP request per mount', async () => {
      seedEmail();
      setTurnstile({ token: 'tok-1', isLoading: false, error: null });

      // Mount 1
      const { unmount: unmount1 } = renderPage();
      await waitFor(() => expect(apiClient.requestOTP).toHaveBeenCalledTimes(1));
      unmount1();

      // Mount 2
      setTurnstile({ token: 'tok-2', isLoading: false, error: null });
      const { unmount: unmount2 } = renderPage();
      await waitFor(() => expect(apiClient.requestOTP).toHaveBeenCalledTimes(2));
      unmount2();

      // Mount 3
      setTurnstile({ token: 'tok-3', isLoading: false, error: null });
      renderPage();
      await waitFor(() => expect(apiClient.requestOTP).toHaveBeenCalledTimes(3));

      // Exactly 3 calls — one per mount, no loops
      expect(apiClient.requestOTP).toHaveBeenCalledTimes(3);
    });
  });

  // ------------------------------------------------------------------
  // Phase 7 — Polish: regression checks
  // ------------------------------------------------------------------

  describe('Regression checks', () => {
    it('T022: redirects to /email when no email in sessionStorage', () => {
      // Do NOT seed email
      setTurnstile({ token: null, isLoading: true, error: null });

      renderPage();

      expect(mockNavigate).toHaveBeenCalledWith('/event/TestEvt1/email', { replace: true });
    });

    it('T023: OTP verify flow works correctly', async () => {
      seedEmail();
      setTurnstile({ token: 'tok-abc', isLoading: false, error: null });

      renderPage();

      // Wait for auto-send
      await waitFor(() => {
        expect(apiClient.requestOTP).toHaveBeenCalledTimes(1);
      });

      // Enter OTP code
      const otpInput = screen.getByPlaceholderText('Enter 6-digit code');
      fireEvent.change(otpInput, { target: { value: '123456' } });

      // Submit form
      const signInButton = screen.getByRole('button', { name: /Sign in/i });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(apiClient.verifyOTP).toHaveBeenCalledWith('admin@example.com', '123456', 'Admin', 'TestEvt1');
        expect(apiClient.setUserSession).toHaveBeenCalled();
        expect(screen.getByText(/Authentication successful/)).toBeInTheDocument();
      });
    });
  });
});
