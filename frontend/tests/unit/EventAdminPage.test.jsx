import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import EventAdminPage from '../../src/pages/EventAdminPage.jsx';
import { EventContextProvider } from '../../src/contexts/EventContext.jsx';
import useEventPolling from '../../src/hooks/useEventPolling.js';

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

// Helper to render component with router and context
const renderWithProviders = (event = null) => {
  return render(
    <BrowserRouter>
      <EventContextProvider event={event} eventId="A5ohYrHe" isAdmin={true}>
        <EventAdminPage />
      </EventContextProvider>
    </BrowserRouter>
  );
};

describe('EventAdminPage Component', () => {
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
      renderWithProviders(null);
      
      expect(screen.getByText(/loading event/i)).toBeInTheDocument();
    });
  });

  describe('Event data rendering', () => {
    it('should render admin page content when event is loaded', async () => {
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
      
      renderWithProviders(mockEvent);
      
      await waitFor(() => {
        expect(screen.getByText('Event Administration')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByText(/A5ohYrHe/i)).toBeInTheDocument();
    });

    it('should display event details', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'My Admin Event',
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
      
      renderWithProviders(mockEvent);
      
      await waitFor(() => {
        expect(screen.getByText('My Admin Event')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/A5ohYrHe/i)).toBeInTheDocument();
      expect(screen.getByText(/wine/i)).toBeInTheDocument();
      expect(screen.getByText(/paused/i)).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should display error message for non-existent event', async () => {
      useEventPolling.mockReturnValue({
        event: null,
        isPolling: false,
        refetch: vi.fn()
      });
      
      renderWithProviders(null);
      
      await waitFor(() => {
        expect(screen.queryByText(/loading event/i)).not.toBeInTheDocument();
      });
      
      expect(screen.getByText(/event not found/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should display back to event button', async () => {
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
      
      renderWithProviders(mockEvent);
      
      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /back to event/i })).toBeInTheDocument();
    });
  });

  describe('Polling integration', () => {
    it('should use useEventPolling hook', () => {
      renderWithProviders(null);
      
      expect(useEventPolling).toHaveBeenCalledWith('A5ohYrHe');
    });

    it('should update when polling detects changes', async () => {
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
      
      const { rerender } = renderWithProviders(initialEvent);
      
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
          <EventContextProvider event={updatedEvent} eventId="A5ohYrHe" isAdmin={true}>
            <EventAdminPage />
          </EventContextProvider>
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/paused/i)).toBeInTheDocument();
      });
    });
  });
});
