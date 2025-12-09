import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PINProvider, usePIN } from '../../src/contexts/PINContext.jsx';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ eventId: 'A5ohYrHe' }))
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Test component that uses PIN context
function TestComponent() {
  const { pinVerified, sessionId, setPinVerified, clearPINSession } = usePIN();
  
  return (
    <div>
      <div data-testid="pin-verified">{pinVerified ? 'true' : 'false'}</div>
      <div data-testid="session-id">{sessionId || 'none'}</div>
      <button onClick={() => setPinVerified(true, 'test-session-id')}>
        Set Verified
      </button>
      <button onClick={clearPINSession}>
        Clear Session
      </button>
    </div>
  );
}

describe('PINContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('Session management', () => {
    it('should initialize with no PIN verification', () => {
      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('pin-verified')).toHaveTextContent('false');
      expect(screen.getByTestId('session-id')).toHaveTextContent('none');
    });

    it('should load PIN session from localStorage on mount', () => {
      const storedSessionId = 'stored-session-id';
      localStorageMock.getItem.mockReturnValue(storedSessionId);

      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      expect(localStorageMock.getItem).toHaveBeenCalledWith('pin:session:A5ohYrHe');
    });

    it('should set PIN verification state', async () => {
      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      const setButton = screen.getByText('Set Verified');
      fireEvent.click(setButton);

      await waitFor(() => {
        expect(screen.getByTestId('pin-verified')).toHaveTextContent('true');
        expect(screen.getByTestId('session-id')).toHaveTextContent('test-session-id');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pin:session:A5ohYrHe',
        'test-session-id'
      );
    });

    it('should clear PIN session', async () => {
      // First set a session
      localStorageMock.getItem.mockReturnValue('existing-session');

      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      const clearButton = screen.getByText('Clear Session');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('pin:session:A5ohYrHe');
      });
    });
  });

  describe('Persistence', () => {
    it('should persist session to localStorage when verified', async () => {
      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      const setButton = screen.getByText('Set Verified');
      fireEvent.click(setButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'pin:session:A5ohYrHe',
          'test-session-id'
        );
      });
    });

    it('should remove session from localStorage when cleared', async () => {
      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      const clearButton = screen.getByText('Clear Session');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('pin:session:A5ohYrHe');
      });
    });

    it('should handle eventId changes', () => {
      const { rerender } = render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      // Change eventId by updating useParams mock
      const { useParams } = await import('react-router-dom');
      useParams.mockReturnValue({ eventId: 'NEWEVENT' });

      rerender(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      // Should check localStorage for new eventId
      expect(localStorageMock.getItem).toHaveBeenCalledWith('pin:session:NEWEVENT');
    });
  });

  describe('Context provider', () => {
    it('should provide PIN context to children', () => {
      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      expect(screen.getByTestId('pin-verified')).toBeInTheDocument();
      expect(screen.getByTestId('session-id')).toBeInTheDocument();
    });

    it('should update context when session changes', async () => {
      render(
        <BrowserRouter>
          <PINProvider>
            <TestComponent />
          </PINProvider>
        </BrowserRouter>
      );

      const setButton = screen.getByText('Set Verified');
      fireEvent.click(setButton);

      await waitFor(() => {
        expect(screen.getByTestId('pin-verified')).toHaveTextContent('true');
      });
    });
  });
});
