import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemRatingsTable from '../../src/components/ItemRatingsTable.jsx';

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
    singularLower: 'bottle',
    pluralLower: 'bottles'
  }))
}));

vi.mock('../../src/components/ProgressBar.jsx', () => ({
  default: ({ percentage }) => <div data-testid="progress-bar" data-percentage={percentage} />
}));

vi.mock('../../src/components/RatingDistribution.jsx', () => ({
  default: ({ totalRatings }) => <div data-testid="rating-distribution" data-total={totalRatings} />
}));

const ITEMS = [
  {
    itemId: 1,
    ratingProgression: 80,
    averageRating: 3.50,
    weightedAverage: 3.42,
    numberOfRaters: 4,
    ratingDistribution: { 3: 2, 4: 2 }
  },
  {
    itemId: 2,
    ratingProgression: 40,
    averageRating: 2.00,
    weightedAverage: 2.10,
    numberOfRaters: 2,
    ratingDistribution: { 1: 1, 3: 1 }
  },
  {
    itemId: 3,
    ratingProgression: 0,
    averageRating: null,
    weightedAverage: null,
    numberOfRaters: 0,
    ratingDistribution: {}
  }
];

const RATING_CONFIG = [
  { value: 1, label: '1', color: '#ef4444' },
  { value: 2, label: '2', color: '#f97316' },
  { value: 3, label: '3', color: '#eab308' },
  { value: 4, label: '4', color: '#22c55e' }
];

describe('ItemRatingsTable – card layout', () => {
  it('renders item cards with handle and avg/wt values', () => {
    render(<ItemRatingsTable itemSummaries={ITEMS} ratingConfiguration={RATING_CONFIG} />);

    expect(screen.getByText('Avg: 3.50')).toBeInTheDocument();
    expect(screen.getByText('Wt: 3.42')).toBeInTheDocument();
    expect(screen.getByText('Avg: 2.00')).toBeInTheDocument();
    expect(screen.getByText('Wt: 2.10')).toBeInTheDocument();
  });

  it('shows N/A for items with no ratings', () => {
    render(<ItemRatingsTable itemSummaries={ITEMS} ratingConfiguration={RATING_CONFIG} />);

    expect(screen.getByText('Avg: N/A')).toBeInTheDocument();
    expect(screen.getByText('Wt: N/A')).toBeInTheDocument();
  });

  it('renders ProgressBar and RatingDistribution in each card', () => {
    render(<ItemRatingsTable itemSummaries={ITEMS} ratingConfiguration={RATING_CONFIG} />);

    expect(screen.getAllByTestId('progress-bar')).toHaveLength(3);
    expect(screen.getAllByTestId('rating-distribution')).toHaveLength(3);
  });

  it('renders sort pills for ID, Progress, Avg., and Wt.Avg.', () => {
    render(<ItemRatingsTable itemSummaries={ITEMS} ratingConfiguration={RATING_CONFIG} />);

    expect(screen.getByRole('button', { name: /^ID/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^avg\.$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^wt\.avg\.$/i })).toBeInTheDocument();
  });

  it('sorts by Wt.Avg descending by default', () => {
    render(<ItemRatingsTable itemSummaries={ITEMS} ratingConfiguration={RATING_CONFIG} />);

    const cards = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    );
    // desc: 3.42, 2.10, then null (-1)
    expect(cards[0]).toHaveTextContent('Wt: 3.42');
    expect(cards[1]).toHaveTextContent('Wt: 2.10');
    expect(cards[2]).toHaveTextContent('Wt: N/A');
  });

  it('toggles sort direction when clicking the active pill', () => {
    render(<ItemRatingsTable itemSummaries={ITEMS} ratingConfiguration={RATING_CONFIG} />);

    // Default is Wt.Avg. desc → click to toggle to asc
    const wtPill = screen.getByRole('button', { name: /^wt\.avg\.$/i });
    fireEvent.click(wtPill);

    const cards = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    );
    // asc: null (-1) first, then 2.10, 3.42
    expect(cards[0]).toHaveTextContent('Wt: N/A');
    expect(cards[2]).toHaveTextContent('Wt: 3.42');
  });

  it('sorts by Avg. when that pill is clicked', () => {
    render(<ItemRatingsTable itemSummaries={ITEMS} ratingConfiguration={RATING_CONFIG} />);

    fireEvent.click(screen.getByRole('button', { name: /^avg\.$/i }));

    const cards = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    );
    // -1 (null coerced) sorts first, then 2.00, 3.50
    expect(cards[0]).toHaveTextContent('Avg: N/A');
    expect(cards[1]).toHaveTextContent('Avg: 2.00');
    expect(cards[2]).toHaveTextContent('Avg: 3.50');
  });

  it('calls onRowClick with item ID when card is clicked', () => {
    const onRowClick = vi.fn();
    render(
      <ItemRatingsTable
        itemSummaries={ITEMS}
        ratingConfiguration={RATING_CONFIG}
        onRowClick={onRowClick}
      />
    );

    const firstCard = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    )[0];
    fireEvent.click(firstCard);
    expect(onRowClick).toHaveBeenCalledWith(1);
  });

  it('shows empty state when no items', () => {
    render(<ItemRatingsTable itemSummaries={[]} ratingConfiguration={[]} />);

    expect(screen.getByText('No bottles available')).toBeInTheDocument();
  });
});
