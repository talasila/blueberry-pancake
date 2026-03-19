import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthPage from '../../src/pages/AuthPage.jsx';
import apiClient from '../../src/services/apiClient.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useLocation: vi.fn(() => ({ state: null, pathname: '/auth' }))
  };
});

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    requestOTP: vi.fn(),
    verifyOTP: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    setUserSession: vi.fn()
  }
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

vi.mock('../../src/utils/bookmarkStorage', () => ({
  clearAllBookmarks: vi.fn()
}));

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

function renderComponent() {
  return render(
    <BrowserRouter>
      <AuthPage />
    </BrowserRouter>
  );
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    apiClient.isAuthenticated.mockReturnValue(false);
  });

  describe('T013 - Request step (email entry)', () => {
    it('title reads "Welcome back"', () => {
      renderComponent();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('email step description reads "We\'ll send a verification code to your email"', () => {
      renderComponent();
      expect(screen.getByText("We'll send a verification code to your email")).toBeInTheDocument();
    });

    it('email step button reads "Send verification code"', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: 'Send verification code' })).toBeInTheDocument();
    });

    it('visible "Email Address" label exists (not sr-only)', () => {
      renderComponent();
      const label = screen.getByText('Email Address');
      expect(label).toBeVisible();
    });

    it('zero instances of "OTP" in rendered text', () => {
      const { container } = renderComponent();
      const allText = container.textContent;
      expect(allText).not.toContain('OTP');
    });

    it('no theme CSS vars present on the page', () => {
      const { container } = renderComponent();
      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        const style = el.getAttribute('style');
        if (style) {
          expect(style).not.toContain('--event-accent');
        }
      });
    });
  });

  describe('T013 - Verify step', () => {
    async function goToVerifyStep() {
      apiClient.requestOTP.mockResolvedValue({ message: 'Code sent' });

      renderComponent();

      const emailInput = screen.getByLabelText(/Email Address/i);
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

      const sendButton = screen.getByRole('button', { name: 'Send verification code' });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
      });
    }

    it('verify step button reads "Sign in"', async () => {
      await goToVerifyStep();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('verify step description includes email in the verification message', async () => {
      await goToVerifyStep();
      const description = screen.getByText(/Enter the verification code sent to/);
      expect(description).toBeInTheDocument();
      expect(description.textContent).toContain('user@example.com');
    });
  });
});
