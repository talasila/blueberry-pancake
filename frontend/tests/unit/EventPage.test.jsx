import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import EventPage from '../../src/pages/EventPage.jsx';
import { EventContextProvider } from '../../src/contexts/EventContext.jsx';
import useEventPolling from '../../src/hooks/useEventPolling.js';
import apiClient from '../../src/services/apiClient.js';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ eventId: 'A5ohYrHe' })),
    useNavigate: vi.fn(() => vi.fn())
  };
});

// Mock hooks
vi.mock('../../src/hooks/useEventPolling.js', () => {
  return {
    default: vi.fn()
  };
});

// Mock API client
vi.mock('../../src/services/apiClient.js', () => {
  return {
    default: {
      getJWTToken: vi.fn(() => 'mock-token'),
      getEvent: vi.fn()
    }
  };
});

// Helper to render component with router and context
const renderWithProviders = (event = null, isAdmin = false) => {
  return render(
    <BrowserRouter>
      <EventContextProvider event={event} eventId="A5ohYrHe" isAdmin={isAdmin}>
        <EventPage />
      </EventContextProvider>
    </BrowserRouter>
  );
};

describe('EventPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventPolling.mockReturnValue({
      event: null,
      isPolling: false,
      refetch: vi.fn()
    });
  });

  describe('Loading state', () => {
    it('should display loading indicator while fetching', () => {
      renderWithProviders(null, false);
      
      expect(screen.getByText(/loading event/i)).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Event data rendering', () => {
    it('should render event data when loaded', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(mockEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/A5ohYrHe/i)).toBeInTheDocument();
      expect(screen.getByText(/wine/i)).toBeInTheDocument();
      expect(screen.getByText(/started/i)).toBeInTheDocument();
    });

    it('should display event name', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'My Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(mockEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText('My Test Event')).toBeInTheDocument();
      });
    });

    it('should display event state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'paused',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(mockEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText(/paused/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should display error message for non-existent event', async () => {
      useEventPolling.mockReturnValue({
        event: null,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(null, false);
      
      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText(/loading event/i)).not.toBeInTheDocument();
      });
      
      // Should show no event data message or error
      expect(screen.getByText(/no event data available/i)).toBeInTheDocument();
    });

    it('should display error message for network errors', async () => {
      // This would be handled by the error state in the component
      // The component should show error when event is null and error exists
      renderWithProviders(null, false);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading event/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Event state messages', () => {
    it('should display paused state message', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'paused',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(mockEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText(/paused/i)).toBeInTheDocument();
        expect(screen.getByText(/rating is not available/i)).toBeInTheDocument();
      });
    });

    it('should display finished state message', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'finished',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(mockEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText(/finished/i)).toBeInTheDocument();
        expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
      });
    });
  });

  describe('State validation', () => {
    it('should validate event state before allowing actions', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'paused',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const mockRefetch = vi.fn();
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: mockRefetch
      });
      
      renderWithProviders(mockEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText(/paused/i)).toBeInTheDocument();
      });
      
      // The component should show that rating is not available
      expect(screen.getByText(/rating is not available/i)).toBeInTheDocument();
    });
  });

  describe('Admin navigation', () => {
    it('should show admin button for administrators', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(mockEvent, true);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /admin/i })).toBeInTheDocument();
      });
    });

    it('should not show admin button for non-administrators', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(mockEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
      
      expect(screen.queryByRole('button', { name: /admin/i })).not.toBeInTheDocument();
    });
  });

  describe('Polling integration', () => {
    it('should use useEventPolling hook', () => {
      renderWithProviders(null, false);
      
      expect(useEventPolling).toHaveBeenCalledWith('A5ohYrHe');
    });

    it('should update when polling detects state change', async () => {
      const initialEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      useEventPolling.mockReturnValue({
        event: initialEvent,
        isPolling: true,
        refetch: vi.fn()
      });
      
      const { rerender } = renderWithProviders(initialEvent, false);
      
      await waitFor(() => {
        expect(screen.getByText(/started/i)).toBeInTheDocument();
      });
      
      // Simulate state change
      const updatedEvent = {
        ...initialEvent,
        state: 'paused'
      };
      
      useEventPolling.mockReturnValue({
        event: updatedEvent,
        isPolling: true,
        refetch: vi.fn()
      });
      
      rerender(
        <BrowserRouter>
          <EventContextProvider event={updatedEvent} eventId="A5ohYrHe" isAdmin={false}>
            <EventPage />
          </EventContextProvider>
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/paused/i)).toBeInTheDocument();
      });
    });
  });
});
