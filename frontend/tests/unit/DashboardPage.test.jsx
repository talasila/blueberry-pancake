import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from '../../src/pages/DashboardPage.jsx';
import apiClient from '../../src/services/apiClient.js';
import { useEventContext } from '../../src/contexts/EventContext.jsx';

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    get: vi.fn(),
    getUserEmail: vi.fn(() => 'test@example.com')
  }
}));

vi.mock('../../src/contexts/EventContext.jsx', () => ({
  useEventContext: vi.fn(() => ({
    event: { typeOfItem: 'wine', state: 'completed' },
    isAdmin: false
  }))
}));

vi.mock('../../src/utils/itemTerminology.js', () => ({
  useItemTerminology: vi.fn(() => ({
    singular: 'Bottle',
    singularLower: 'bottle',
    plural: 'Bottles',
    pluralLower: 'bottles'
  }))
}));

vi.mock('../../src/utils/personalityContent.js', () => {
  const content = {
    'golden-retriever': { name: 'The Golden Retriever', icon: 'Heart', quotes: ['Everything is amazing and you love everyone.'] },
    'simon-cowell': { name: 'The Simon Cowell', icon: 'ThumbsDown', quotes: ['Tough crowd.'] },
    'rollercoaster': { name: 'The Rollercoaster', icon: 'TrendingUpDown', quotes: ['Up, down, up, down.'] }
  };
  return {
    getPersonalityName: vi.fn((id) => content[id]?.name || null),
    getPersonalityDisplay: vi.fn((id, vars, idx) => {
      const entry = content[id];
      if (!entry) return null;
      const qi = idx !== undefined ? Math.min(idx, entry.quotes.length - 1) : 0;
      return { name: entry.name, icon: entry.icon, quote: entry.quotes[qi], quoteIndex: qi };
    }),
    PERSONALITY_CONTENT: content
  };
});

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/event/test123/dashboard']}>
      <Routes>
        <Route path="/event/:eventId/dashboard" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>
  );

const DASHBOARD_WITH_RATINGS = {
  statistics: {
    totalUsers: 4,
    totalItems: 8,
    totalRatings: 30,
    averageRatingsPerItem: 3.75
  },
  userSummaries: [
    {
      email: 'sarah@test.com',
      name: 'Sarah',
      personality: 'golden-retriever',
      numberOfBottlesRated: 5,
      ratingProgression: 62.5,
      averageRating: 3.5,
      ratings: [3, 4, 3, 4, 4],
      ratingDistribution: { 1: 0, 2: 0, 3: 2, 4: 3 },
      totalRatings: 5,
      noteCount: 0
    },
    {
      email: 'mike@test.com',
      name: 'Mike',
      personality: 'simon-cowell',
      numberOfBottlesRated: 4,
      ratingProgression: 50,
      averageRating: 1.5,
      ratings: [1, 2, 1, 2],
      ratingDistribution: { 1: 2, 2: 2, 3: 0, 4: 0 },
      totalRatings: 4,
      noteCount: 0
    },
    {
      email: 'alex@test.com',
      name: 'Alex',
      personality: 'golden-retriever',
      numberOfBottlesRated: 3,
      ratingProgression: 37.5,
      averageRating: 3.8,
      ratings: [4, 4, 3],
      ratingDistribution: { 3: 1, 4: 2 },
      totalRatings: 3,
      noteCount: 0
    }
  ],
  itemSummaries: [
    { itemId: 1, numberOfRaters: 2, averageRating: 3.0, weightedAverage: 2.8, standardDeviation: 0.5, ratingProgression: 25, ratingDistribution: {} },
    { itemId: 2, numberOfRaters: 2, averageRating: 3.5, weightedAverage: 3.2, standardDeviation: 1.2, ratingProgression: 25, ratingDistribution: {} }
  ],
  ratingConfiguration: { maxRating: 4, ratings: [] },
  globalAverage: 2.9,
  mostControversial: { itemId: 2, standardDeviation: 1.2, numberOfRaters: 2, averageRating: 3.5 },
  leastControversial: { itemId: 1, standardDeviation: 0.5, numberOfRaters: 2, averageRating: 3.0 }
};

const DASHBOARD_EMPTY = {
  statistics: {
    totalUsers: 0,
    totalItems: 0,
    totalRatings: 0,
    averageRatingsPerItem: 0
  },
  userSummaries: [],
  itemSummaries: [],
  ratingConfiguration: { maxRating: 4, ratings: [] },
  globalAverage: null,
  mostControversial: null,
  leastControversial: null
};

describe('DashboardPage – Summary tab redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventContext.mockReturnValue({
      event: { typeOfItem: 'wine', state: 'completed' },
      isAdmin: false
    });
  });

  it('renders the top-rated bottle hero card when ratings exist', async () => {
    apiClient.get.mockResolvedValue(DASHBOARD_WITH_RATINGS);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText(/Bottle #2/)).toBeInTheDocument();
    expect(screen.getByText('Top Rated')).toBeInTheDocument();
    expect(screen.getByText('3.5 / 4')).toBeInTheDocument();
  });

  it('shows "No ratings yet" hero card when no ratings exist', async () => {
    apiClient.get.mockResolvedValue(DASHBOARD_EMPTY);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getAllByText('No ratings yet').length).toBeGreaterThan(0);
  });

  it('renders ratings progress bar with actual/expected', async () => {
    apiClient.get.mockResolvedValue(DASHBOARD_WITH_RATINGS);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('30 / 32')).toBeInTheDocument();
    expect(screen.getByText(/94% complete/)).toBeInTheDocument();
  });

  it('renders global average rating card', async () => {
    apiClient.get.mockResolvedValue(DASHBOARD_WITH_RATINGS);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Avg Rating')).toBeInTheDocument();
    expect(screen.getByText('2.9')).toBeInTheDocument();
  });

  it('renders Most Divisive card with item ID', async () => {
    apiClient.get.mockResolvedValue(DASHBOARD_WITH_RATINGS);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Most Divisive')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('renders personality strip with dominant hero and secondary pills', async () => {
    apiClient.get.mockResolvedValue(DASHBOARD_WITH_RATINGS);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Tasting Personalities')).toBeInTheDocument();
    expect(screen.getByText('The Golden Retriever')).toBeInTheDocument();
    expect(screen.getByText('2 of 3 people')).toBeInTheDocument();
    expect(screen.getByText(/The Simon Cowell/)).toBeInTheDocument();
  });

  it('does not render personality strip when no personalities exist', async () => {
    const dataNoPersonalities = {
      ...DASHBOARD_WITH_RATINGS,
      userSummaries: DASHBOARD_WITH_RATINGS.userSummaries.map(u => ({ ...u, personality: null }))
    };
    apiClient.get.mockResolvedValue(dataNoPersonalities);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText('Tasting Personalities')).not.toBeInTheDocument();
  });

  it('does not render personality strip for non-wine events', async () => {
    useEventContext.mockReturnValue({
      event: { typeOfItem: 'beer', state: 'completed' },
      isAdmin: false
    });

    const dataWithNullPersonality = {
      ...DASHBOARD_WITH_RATINGS,
      userSummaries: DASHBOARD_WITH_RATINGS.userSummaries.map(u => ({ ...u, personality: null }))
    };
    apiClient.get.mockResolvedValue(dataWithNullPersonality);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText('Tasting Personalities')).not.toBeInTheDocument();
  });
});
