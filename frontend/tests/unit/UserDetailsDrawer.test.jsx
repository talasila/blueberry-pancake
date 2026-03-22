import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserDetailsDrawer from '../../src/components/UserDetailsDrawer.jsx';
import { ratingService } from '../../src/services/ratingService.js';
import { detectPersonality } from '../../src/utils/personalityDetection.js';
import { getPersonalityName, getPersonalityDisplay } from '../../src/utils/personalityContent.js';
import { useEventContext } from '../../src/contexts/EventContext.jsx';

vi.mock('../../src/services/ratingService.js', () => ({
  ratingService: {
    getRatings: vi.fn(),
    getMyRatings: vi.fn(),
  },
}));

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    getUserId: vi.fn(() => 'u_testABCDEF'),
    getUserEmail: vi.fn(() => 'test@example.com'),
    getUserName: vi.fn(() => 'Test User'),
    getRatingConfiguration: vi.fn(() =>
      Promise.resolve({ maxRating: 4, ratings: [] })
    ),
  },
}));

vi.mock('../../src/contexts/EventContext.jsx', () => ({
  useEventContext: vi.fn(() => ({
    event: { typeOfItem: 'wine', state: 'started' },
  })),
}));

vi.mock('../../src/utils/bookmarkStorage.js', () => ({
  loadBookmarksFromServer: vi.fn(() => Promise.resolve([])),
  getBookmarks: vi.fn(() => []),
}));

vi.mock('../../src/utils/personalityDetection.js', () => ({
  detectPersonality: vi.fn(),
}));

vi.mock('../../src/utils/personalityContent.js', () => ({
  getPersonalityName: vi.fn(),
  getPersonalityDisplay: vi.fn(),
}));

vi.mock('../../src/utils/itemTerminology.js', () => ({
  useItemTerminology: vi.fn(() => ({
    singular: 'Bottle',
    singularLower: 'bottle',
    plural: 'Bottles',
    pluralLower: 'bottles',
  })),
}));

const defaultRatings = [
  { userId: 'u_testABCDEF', itemId: '1', rating: '4', note: '', timestamp: '2026-01-01T12:00:00Z' },
  { userId: 'u_testABCDEF', itemId: '2', rating: '4', note: '', timestamp: '2026-01-01T12:01:00Z' },
  { userId: 'u_testABCDEF', itemId: '3', rating: '4', note: '', timestamp: '2026-01-01T12:02:00Z' },
  { userId: 'u_testABCDEF', itemId: '4', rating: '4', note: '', timestamp: '2026-01-01T12:03:00Z' },
];

const ratingConfig = {
  maxRating: 4,
  ratings: [
    { value: 1, color: 'red' },
    { value: 2, color: 'orange' },
    { value: 3, color: 'yellow' },
    { value: 4, color: 'green' },
  ],
};

const renderDrawer = (props = {}) =>
  render(
    <BrowserRouter>
      <UserDetailsDrawer
        isOpen={true}
        onClose={vi.fn()}
        eventId="test123"
        userId="u_testABCDEF"
        ratingConfig={ratingConfig}
        availableItemIds={[1, 2, 3, 4, 5, 6, 7, 8]}
        {...props}
      />
    </BrowserRouter>
  );

describe('UserDetailsDrawer personality integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    ratingService.getRatings.mockResolvedValue(defaultRatings);
    ratingService.getMyRatings.mockResolvedValue(defaultRatings);
    useEventContext.mockReturnValue({
      event: { typeOfItem: 'wine', state: 'started' },
    });
    detectPersonality.mockReturnValue('golden-retriever');
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      quote: 'Everything is amazing.',
    });
    getPersonalityName.mockImplementation((id) =>
      id === 'simon-cowell' ? 'The Simon Cowell' : null
    );
  });

  it('shows personality card when threshold met and wine event', async () => {
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText('The Golden Retriever')).toBeInTheDocument();
    });
  });

  it('hides card when below threshold', async () => {
    const belowThresholdRatings = [
      { userId: 'u_testABCDEF', itemId: '1', rating: '4', note: '', timestamp: '2026-01-01T12:00:00Z' },
      { userId: 'u_testABCDEF', itemId: '2', rating: '4', note: '', timestamp: '2026-01-01T12:01:00Z' },
    ];
    ratingService.getRatings.mockResolvedValue(belowThresholdRatings);
    ratingService.getMyRatings.mockResolvedValue(belowThresholdRatings);
    detectPersonality.mockReturnValue(null);

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText('Rating Timeline')).toBeInTheDocument();
    });

    expect(screen.queryByText('The Golden Retriever')).not.toBeInTheDocument();
  });

  it('hides card for non-wine events', async () => {
    useEventContext.mockReturnValue({
      event: { typeOfItem: 'beer', state: 'started' },
    });

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText('Rating Timeline')).toBeInTheDocument();
    });

    expect(screen.queryByText('The Golden Retriever')).not.toBeInTheDocument();
  });

  it('hides card in created state', async () => {
    useEventContext.mockReturnValue({
      event: { typeOfItem: 'wine', state: 'created' },
    });

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText('Rating Timeline')).toBeInTheDocument();
    });

    expect(screen.queryByText('The Golden Retriever')).not.toBeInTheDocument();
  });

  it('shows "Previously" line when personality shifted', async () => {
    sessionStorage.setItem('personality-test123', 'simon-cowell');
    getPersonalityName.mockReturnValue('The Simon Cowell');

    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText(/Previously: The Simon Cowell/)).toBeInTheDocument();
    });
  });

  it('does not show "Previously" on first visit', async () => {
    sessionStorage.clear();
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText('The Golden Retriever')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Previously:/)).not.toBeInTheDocument();
  });
});
