import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmailEntryPage from '../../src/pages/EmailEntryPage.jsx';
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
    checkEventAdmin: vi.fn(),
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
      <EmailEntryPage />
    </BrowserRouter>
  );
}

describe('EmailEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    localStorageMock.clear();
    apiClient.checkEventAdmin.mockResolvedValue({ isAdmin: false });
  });

  describe('T009 (US1) - Core name field behavior', () => {
    it('renders name field above email field (DOM order)', () => {
      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      // Verify name appears before email in DOM order
      const result = nameInput.compareDocumentPosition(emailInput);
      // Node.DOCUMENT_POSITION_FOLLOWING === 4
      expect(result & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('prevents submission when name is empty', async () => {
      renderComponent();

      const emailInput = screen.getByLabelText(/Email Address/i);
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

      // Name is empty, so button should be disabled
      const button = screen.getByRole('button', { name: /Continue/i });
      expect(button).toBeDisabled();
    });

    it('prevents submission when name is only whitespace', async () => {
      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

      // Button disabled because name.trim() is empty
      const button = screen.getByRole('button', { name: /Continue/i });
      expect(button).toBeDisabled();
    });

    it('disables button when both name and email are empty (both required)', () => {
      renderComponent();

      const button = screen.getByRole('button', { name: /Continue/i });
      expect(button).toBeDisabled();
    });

    it('disables button when only name is provided but email is empty', () => {
      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      fireEvent.change(nameInput, { target: { value: 'Alice' } });

      const button = screen.getByRole('button', { name: /Continue/i });
      expect(button).toBeDisabled();
    });

    it('stores name and email in sessionStorage on successful submit', async () => {
      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });

      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('event:A5ohYrHe:email', 'alice@example.com');
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('event:A5ohYrHe:name', 'Alice');
      });
    });

    it('navigates to PIN page for non-admin user', async () => {
      apiClient.checkEventAdmin.mockResolvedValue({ isAdmin: false });
      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });

      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe/pin', { replace: true });
      });
    });

    it('navigates to OTP page for admin user', async () => {
      apiClient.checkEventAdmin.mockResolvedValue({ isAdmin: true });
      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      fireEvent.change(nameInput, { target: { value: 'Admin' } });
      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });

      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe/otp', { replace: true });
      });
    });
  });

  describe('T016 (US3) - localStorage pre-fill', () => {
    it('pre-fills name and email fields from localStorage on mount', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'remembered:name') return 'Returning User';
        if (key === 'remembered:email') return 'returning@example.com';
        return null;
      });

      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      expect(nameInput.value).toBe('Returning User');
      expect(emailInput.value).toBe('returning@example.com');
    });

    it('writes name and email to localStorage on successful submit', async () => {
      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });

      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('remembered:name', 'Alice');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('remembered:email', 'alice@example.com');
      });
    });

    it('works normally when localStorage throws (private browsing)', async () => {
      // Simulate localStorage throwing on both getItem (mount) and setItem (submit)
      localStorageMock.getItem.mockImplementation(() => { throw new Error('SecurityError'); });
      localStorageMock.setItem.mockImplementation(() => { throw new Error('SecurityError'); });

      renderComponent();

      // Fields should be empty (graceful degradation from getItem throwing)
      const nameInput = screen.getByLabelText(/Your Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');

      // Form should still function
      fireEvent.change(nameInput, { target: { value: 'Alice' } });
      fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });

      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      // Should still navigate despite localStorage throwing on setItem
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe/pin', { replace: true });
      });
    });

    it('accepts pre-filled values on submit without changes', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'remembered:name') return 'Returning User';
        if (key === 'remembered:email') return 'returning@example.com';
        return null;
      });

      renderComponent();

      // Do NOT change any field values - just submit as-is
      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(apiClient.checkEventAdmin).toHaveBeenCalledWith(
          'A5ohYrHe',
          'returning@example.com',
          'mock-turnstile-token'
        );
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('event:A5ohYrHe:email', 'returning@example.com');
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('event:A5ohYrHe:name', 'Returning User');
        expect(mockNavigate).toHaveBeenCalledWith('/event/A5ohYrHe/pin', { replace: true });
      });
    });
  });

  describe('T017 (US4) - Name change', () => {
    it('saves the NEW name to localStorage when a pre-filled name is edited', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'remembered:name') return 'Old Name';
        if (key === 'remembered:email') return 'user@example.com';
        return null;
      });

      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      expect(nameInput.value).toBe('Old Name');

      // Edit the pre-filled name
      fireEvent.change(nameInput, { target: { value: 'New Name' } });

      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('remembered:name', 'New Name');
      });
    });

    it('writes the new name to sessionStorage for downstream PIN/OTP page', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'remembered:name') return 'Old Name';
        if (key === 'remembered:email') return 'user@example.com';
        return null;
      });

      renderComponent();

      const nameInput = screen.getByLabelText(/Your Name/i);
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      const form = screen.getByRole('button', { name: /Continue/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith('event:A5ohYrHe:name', 'Updated Name');
      });
    });
  });
});
