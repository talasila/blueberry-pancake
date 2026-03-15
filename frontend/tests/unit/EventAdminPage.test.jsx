import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
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

// Mock API client
vi.mock('../../src/services/apiClient.js', () => {
  return {
    default: {
      isAuthenticated: vi.fn(() => true),
      hasEventAccess: vi.fn(() => true),
      getEvent: vi.fn(),
      getUserEmail: vi.fn(() => 'admin@example.com'),
      getAuthMethod: vi.fn(() => 'pin'),
      request: vi.fn(() =>
        Promise.resolve({
          text: () => Promise.resolve(''),
          json: () => Promise.resolve({})
        })
      ),
      get: vi.fn((endpoint) =>
        Promise.resolve(
          endpoint.includes('/items') && !endpoint.includes('by-item-id')
            ? []
            : {}
        )
      ),
      getAdministrators: vi.fn(() => Promise.resolve({ administrators: {} })),
      getItemConfiguration: vi.fn(() => Promise.resolve({ numberOfItems: 20, excludedItemIds: [] })),
      getRatingConfiguration: vi.fn(() => Promise.resolve({ maxRating: 4, ratings: [] }))
    }
  };
});

// Helper to render component with router and context
const renderWithProviders = (event = null) => {
  return render(
    <BrowserRouter>
      <EventContextProvider event={event} eventId="A5ohYrHe" isAdmin={true}>
        <EventAdminPage onOpenAdminGuide={vi.fn()} />
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
        itemConfiguration: { numberOfItems: 20, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
      });
    });

    it('should display event details', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'My Admin Event',
        state: 'paused',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 20, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByDisplayValue('My Admin Event')).toBeInTheDocument();
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
      
      renderWithProviders(null);
      
      // When context and polling both provide null, component shows loading
      expect(screen.getByText(/loading event/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should display event settings when event is loaded', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        itemConfiguration: { numberOfItems: 20, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
      });
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
        itemConfiguration: { numberOfItems: 20, excludedItemIds: [] },
        ratingConfiguration: { maxRating: 4, ratings: [] },
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
        expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
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
            <EventAdminPage onOpenAdminGuide={vi.fn()} />
          </EventContextProvider>
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Assign bottles to item numbers/)).toBeInTheDocument();
      });
    });
  });

  describe('Welcome bottom sheet integration', () => {
    const fullEvent = {
      eventId: 'A5ohYrHe',
      name: 'Test Event',
      state: 'created',
      typeOfItem: 'wine',
      pin: 'AB12CD34',
      administrator: 'admin@example.com',
      administrators: { 'admin@example.com': { role: 'owner' } },
      itemConfiguration: { numberOfItems: 20, excludedItemIds: [] },
      ratingConfiguration: { maxRating: 4, noteSuggestionsEnabled: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const renderWithLocationState = (event, locationState = {}) => {
      return render(
        <MemoryRouter initialEntries={[{ pathname: '/event/A5ohYrHe/admin', state: locationState }]}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <EventContextProvider event={event} eventId="A5ohYrHe" isAdmin={true}>
                <EventAdminPage onOpenAdminGuide={vi.fn()} />
              </EventContextProvider>
            } />
          </Routes>
        </MemoryRouter>
      );
    };

    it('renders WelcomeBottomSheet when location.state.eventCreated is true', async () => {
      useEventPolling.mockReturnValue({
        event: fullEvent,
        isPolling: false,
        refetch: vi.fn()
      });

      renderWithLocationState(fullEvent, { eventCreated: true });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-bottom-sheet')).toBeInTheDocument();
      });
      expect(screen.getByText('Your event is ready!')).toBeInTheDocument();
    });

    it('does NOT render WelcomeBottomSheet on normal admin page visit', () => {
      useEventPolling.mockReturnValue({
        event: fullEvent,
        isPolling: false,
        refetch: vi.fn()
      });

      renderWithLocationState(fullEvent);

      expect(screen.queryByTestId('welcome-bottom-sheet')).not.toBeInTheDocument();
    });
  });

  describe('Settings page layout', () => {
    const mockEvent = {
      eventId: 'A5ohYrHe',
      name: 'Layout Test Event',
      state: 'started',
      typeOfItem: 'wine',
      administrator: 'admin@example.com',
      itemConfiguration: { numberOfItems: 20, excludedItemIds: [] },
      ratingConfiguration: { maxRating: 4, ratings: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    beforeEach(() => {
      useEventPolling.mockReturnValue({
        event: mockEvent,
        isPolling: false,
        refetch: vi.fn()
      });
    });

    it('renders an editable event name input', async () => {
      renderWithProviders(mockEvent);

      await waitFor(() => {
        const input = screen.getByDisplayValue('Layout Test Event');
        expect(input).toBeInTheDocument();
        expect(input.tagName).toBe('INPUT');
      });
    });

    it('renders a Share button in the header area', async () => {
      renderWithProviders(mockEvent);

      await waitFor(() => {
        expect(screen.getByText('Share')).toBeInTheDocument();
      });
    });

    it('renders the event progress stepper', async () => {
      renderWithProviders(mockEvent);

      await waitFor(() => {
        expect(screen.getByRole('list', { name: 'Event progress' })).toBeInTheDocument();
        expect(screen.getByText('Setup')).toBeInTheDocument();
        expect(screen.getByText('Tasting')).toBeInTheDocument();
        expect(screen.getByText('Reveal')).toBeInTheDocument();
        expect(screen.getByText('Results')).toBeInTheDocument();
      });
    });

    it('does not render a State settings row', async () => {
      renderWithProviders(mockEvent);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Layout Test Event')).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /^State/ })).not.toBeInTheDocument();
    });
  });
});
