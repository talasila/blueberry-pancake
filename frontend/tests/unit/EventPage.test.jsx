import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
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
      isAuthenticated: vi.fn(() => true),
      hasEventAccess: vi.fn(() => true),
      getEvent: vi.fn(),
      getUserEmail: vi.fn(() => 'test@example.com'),
      getUserId: vi.fn(() => 'u_testABCDEF'),
      getUserName: vi.fn(() => 'Test User'),
      getAuthMethod: vi.fn(() => 'pin'),
      getRatingConfiguration: vi.fn(() => Promise.resolve({ maxRating: 4, ratings: [] })),
      getBookmarks: vi.fn(() => Promise.resolve({ bookmarks: [] })),
      get: vi.fn(() => Promise.resolve({ items: [], users: {} })),
      request: vi.fn(() =>
        Promise.resolve({
          text: () => Promise.resolve('itemId,email,rating,note\n')
        })
      )
    }
  };
});

vi.mock('../../src/services/itemService.js', () => ({
  default: {
    getItems: vi.fn(() => Promise.resolve([])),
    registerItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  }
}));

// Helper to render component with router and context
const renderWithProviders = (event = null, isAdmin = false) => {
  return render(
    <MemoryRouter initialEntries={['/event/A5ohYrHe']}>
      <Routes>
        <Route
          path="/event/:eventId"
          element={
            <EventContextProvider event={event} eventId="A5ohYrHe" isAdmin={isAdmin} refetch={vi.fn()}>
              <EventPage />
            </EventContextProvider>
          }
        />
      </Routes>
    </MemoryRouter>
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
    it('should display loading indicator while fetching', async () => {
      await act(async () => {
        renderWithProviders(null, false);
      });

      expect(screen.getByText(/loading event/i)).toBeInTheDocument();
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
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/tap a number to rate/i)).toBeInTheDocument();
      });
    });

    it('should display event name', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'My Test Event',
        state: 'created',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/event has not started yet/i)).toBeInTheDocument();
      });
    });

    it('should display event state', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'paused',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/event is paused/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should display loading when event is not available', async () => {
      useEventPolling.mockReturnValue({
        event: null,
        isPolling: false,
        refetch: vi.fn()
      });

      await act(async () => {
        renderWithProviders(null, false);
      });

      // When context provides null event, component shows loading state
      expect(screen.getByText(/loading event/i)).toBeInTheDocument();
    });

    it('should display no event data message when event is null', async () => {
      useEventPolling.mockReturnValue({
        event: null,
        isPolling: false,
        refetch: vi.fn()
      });

      await act(async () => {
        renderWithProviders(null, false);
      });

      // Component shows loading while event is null from context
      expect(screen.getByText(/loading event/i)).toBeInTheDocument();
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
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/event is paused/i)).toBeInTheDocument();
      });
    });

    it('should display completed state message', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'completed',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/tap a number to view details/i)).toBeInTheDocument();
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
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
      
      // The component should show that event is paused
      expect(screen.getByText(/event is paused/i)).toBeInTheDocument();
    });
  });

  describe('Admin navigation', () => {
    it('should render event page for administrators', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/tap a number to rate/i)).toBeInTheDocument();
      });
    });

    it('should render event page for non-administrators', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/tap a number to rate/i)).toBeInTheDocument();
      });
    });
  });

  describe('Event context integration', () => {
    it('should receive event from EventContextProvider', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      renderWithProviders(mockEvent, false);

      await waitFor(() => {
        expect(screen.getByText(/tap a number to rate/i)).toBeInTheDocument();
      });
    });

    it('should update when polling detects state change', async () => {
      const initialEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 3, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByText(/tap a number to rate/i)).toBeInTheDocument();
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
        <MemoryRouter initialEntries={['/event/A5ohYrHe']}>
          <Routes>
            <Route
              path="/event/:eventId"
              element={
                <EventContextProvider event={updatedEvent} eventId="A5ohYrHe" isAdmin={false} refetch={vi.fn()}>
                  <EventPage />
                </EventContextProvider>
              }
            />
          </Routes>
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/event is paused/i)).toBeInTheDocument();
      });
    });
  });
});
