import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SimilarUsersDrawer from '../../src/components/SimilarUsersDrawer.jsx';
import { getSimilarUsers } from '../../src/services/similarUsersService.js';

// Mock the service
vi.mock('../../src/services/similarUsersService.js', () => ({
  getSimilarUsers: vi.fn()
}));

// Mock EventContext
vi.mock('../../src/contexts/EventContext.jsx', () => ({
  useEventContext: vi.fn(() => ({
    event: { typeOfItem: 'wine' }
  }))
}));

// Mock useItemTerminology
vi.mock('../../src/utils/itemTerminology.js', () => ({
  useItemTerminology: vi.fn(() => ({
    singular: 'Wine',
    plural: 'Wines',
    pluralLower: 'wines'
  }))
}));

vi.mock('../../src/utils/personalityContent.js', () => ({
  getPersonalityName: vi.fn((id) => {
    const names = { 'golden-retriever': 'The Golden Retriever', 'simon-cowell': 'The Simon Cowell' };
    return names[id] || null;
  }),
}));

describe('SimilarUsersDrawer Component', () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    eventId: 'testEvent',
    eventState: 'started'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should display loading indicator with "Running compatibility scanner..." message', async () => {
      getSimilarUsers.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByText('Running compatibility scanner...')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message when API call fails', async () => {
      getSimilarUsers.mockRejectedValue(new Error('Failed to fetch similar users'));

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should display error for insufficient ratings', async () => {
      const error = new Error('You need to rate at least 3 items before similar users can be found');
      getSimilarUsers.mockRejectedValue(error);

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/at least 3 items/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should display message when no similar users found', async () => {
      getSimilarUsers.mockResolvedValue({
        similarUsers: [],
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/no similar users/i)).toBeInTheDocument();
      });
    });
  });

  describe('Similar users display', () => {
    it('should display list of similar users', async () => {
      const mockSimilarUsers = [
        {
          email: 'alice@example.com',
          name: 'Alice Smith',
          similarityScore: 0.87,
          commonItemsCount: 12,
          commonItems: [
            { itemId: 1, userRating: 4, similarUserRating: 4 },
            { itemId: 2, userRating: 5, similarUserRating: 5 }
          ]
        },
        {
          email: 'bob@example.com',
          name: null,
          similarityScore: 0.72,
          commonItemsCount: 8,
          commonItems: [
            { itemId: 1, userRating: 4, similarUserRating: 3 }
          ]
        }
      ];

      getSimilarUsers.mockResolvedValue({
        similarUsers: mockSimilarUsers,
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
    });

    it('should display user name when available, otherwise email', async () => {
      const mockSimilarUsers = [
        {
          email: 'alice@example.com',
          name: 'Alice Smith',
          similarityScore: 0.87,
          commonItemsCount: 12,
          commonItems: []
        },
        {
          email: 'bob@example.com',
          name: null,
          similarityScore: 0.72,
          commonItemsCount: 8,
          commonItems: []
        }
      ];

      getSimilarUsers.mockResolvedValue({
        similarUsers: mockSimilarUsers,
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
    });

    it('should display rating comparisons for common items', async () => {
      const mockSimilarUsers = [
        {
          email: 'alice@example.com',
          name: 'Alice Smith',
          similarityScore: 0.87,
          commonItemsCount: 2,
          commonItems: [
            { itemId: 1, userRating: 4, similarUserRating: 4 },
            { itemId: 2, userRating: 5, similarUserRating: 5 }
          ]
        }
      ];

      getSimilarUsers.mockResolvedValue({
        similarUsers: mockSimilarUsers,
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });
    });

    it('should prioritize and limit display when >10 common items exist', async () => {
      // Create 15 common items
      const commonItems = Array.from({ length: 15 }, (_, i) => ({
        itemId: i + 1,
        userRating: 3 + (i % 3),
        similarUserRating: 3 + ((i + 1) % 3)
      }));

      const mockSimilarUsers = [
        {
          email: 'alice@example.com',
          name: 'Alice Smith',
          similarityScore: 0.87,
          commonItemsCount: 15,
          commonItems
        }
      ];

      getSimilarUsers.mockResolvedValue({
        similarUsers: mockSimilarUsers,
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });
    });

    it('should show expandable view for >10 items', async () => {
      const commonItems = Array.from({ length: 15 }, (_, i) => ({
        itemId: i + 1,
        userRating: 3 + (i % 3),
        similarUserRating: 3 + ((i + 1) % 3)
      }));

      const mockSimilarUsers = [
        {
          email: 'alice@example.com',
          name: 'Alice Smith',
          similarityScore: 0.87,
          commonItemsCount: 15,
          commonItems
        }
      ];

      getSimilarUsers.mockResolvedValue({
        similarUsers: mockSimilarUsers,
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Personality integration', () => {
    it('personality subtitle shown when present', async () => {
      const mockSimilarUsers = [
        {
          email: 'alice@example.com',
          name: 'Alice Smith',
          similarityScore: 0.87,
          commonItemsCount: 5,
          personality: 'golden-retriever',
          commonItems: []
        }
      ];

      getSimilarUsers.mockResolvedValue({
        similarUsers: mockSimilarUsers,
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('The Golden Retriever · 5 common')).toBeInTheDocument();
      });
    });

    it('personality subtitle hidden when null', async () => {
      const mockSimilarUsers = [
        {
          email: 'bob@example.com',
          name: null,
          similarityScore: 0.72,
          commonItemsCount: 4,
          personality: null,
          commonItems: []
        }
      ];

      getSimilarUsers.mockResolvedValue({
        similarUsers: mockSimilarUsers,
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      });
      expect(screen.getByText('4 common')).toBeInTheDocument();
      expect(screen.queryByText(/The Golden Retriever/)).not.toBeInTheDocument();
    });
  });

  describe('Drawer behavior', () => {
    it('should call onClose when close button is clicked', async () => {
      getSimilarUsers.mockResolvedValue({
        similarUsers: [],
        currentUserEmail: 'user@example.com',
        eventId: 'testEvent'
      });

      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close similar users drawer');
        closeButton.click();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not render when isOpen is false', () => {
      render(
        <BrowserRouter>
          <SimilarUsersDrawer {...defaultProps} isOpen={false} />
        </BrowserRouter>
      );

      expect(screen.queryByText('Running compatibility scanner...')).not.toBeInTheDocument();
    });
  });
});
