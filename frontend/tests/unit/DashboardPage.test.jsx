import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from '../../src/pages/DashboardPage.jsx';
import dashboardService from '../../src/services/dashboardService.js';
import { useEventContext } from '../../src/contexts/EventContext.jsx';

vi.mock('../../src/services/dashboardService.js', () => ({
  default: {
    getDashboardData: vi.fn()
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
    plural: 'Bottles',
    pluralLower: 'bottles'
  }))
}));

vi.mock('../../src/utils/personalityContent.js', () => ({
  getPersonalityName: vi.fn((id) => {
    const names = {
      'golden-retriever': 'The Golden Retriever',
      'simon-cowell': 'The Simon Cowell',
      'rollercoaster': 'The Rollercoaster'
    };
    return names[id] || null;
  })
}));

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/event/test123/dashboard']}>
      <Routes>
        <Route path="/event/:eventId/dashboard" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>
  );

const DASHBOARD_WITH_PERSONALITIES = {
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
    }
  ],
  itemSummaries: [],
  ratingConfiguration: { ratings: [] }
};

describe('DashboardPage – Summary tab no longer shows Tasting Personalities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEventContext.mockReturnValue({
      event: { typeOfItem: 'wine', state: 'completed' },
      isAdmin: false
    });
  });

  it('does not render a Tasting Personalities section when users have personalities', async () => {
    dashboardService.getDashboardData.mockResolvedValue(DASHBOARD_WITH_PERSONALITIES);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText('Tasting Personalities')).not.toBeInTheDocument();
  });

  it('does not render a Tasting Personalities section for non-wine events', async () => {
    useEventContext.mockReturnValue({
      event: { typeOfItem: 'beer', state: 'completed' },
      isAdmin: false
    });

    const dataWithNullPersonality = {
      ...DASHBOARD_WITH_PERSONALITIES,
      userSummaries: DASHBOARD_WITH_PERSONALITIES.userSummaries.map((u) => ({
        ...u,
        personality: null
      }))
    };
    dashboardService.getDashboardData.mockResolvedValue(dataWithNullPersonality);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText('Tasting Personalities')).not.toBeInTheDocument();
  });
});
