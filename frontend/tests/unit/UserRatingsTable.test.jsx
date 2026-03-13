import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserRatingsTable from '../../src/components/UserRatingsTable.jsx';

vi.mock('../../src/utils/personalityContent.js', () => ({
  getPersonalityName: vi.fn((id) => {
    const names = {
      'golden-retriever': 'The Golden Retriever',
      'simon-cowell': 'The Simon Cowell'
    };
    return names[id] || null;
  })
}));

vi.mock('../../src/components/UserRatingProgress.jsx', () => ({
  default: ({ barHeight }) => <div data-testid="user-rating-progress" data-bar-height={barHeight} />
}));

const USERS = [
  {
    email: 'sarah@test.com',
    name: 'Sarah',
    personality: 'golden-retriever',
    numberOfBottlesRated: 5,
    ratingProgression: 62.5,
    averageRating: 3.5,
    ratings: [3, 4, 3, 4, 4],
    ratingDistribution: { 1: 0, 2: 0, 3: 2, 4: 3 },
    totalRatings: 5
  },
  {
    email: 'mike@test.com',
    name: 'Mike',
    personality: 'simon-cowell',
    numberOfBottlesRated: 2,
    ratingProgression: 25,
    averageRating: 1.5,
    ratings: [1, 2],
    ratingDistribution: { 1: 1, 2: 1 },
    totalRatings: 2
  },
  {
    email: 'jane@test.com',
    name: 'Jane',
    personality: null,
    numberOfBottlesRated: 4,
    ratingProgression: 50,
    averageRating: 4.0,
    ratings: [4, 4, 4, 4],
    ratingDistribution: { 4: 4 },
    totalRatings: 4
  }
];

describe('UserRatingsTable – card layout', () => {
  it('renders user cards with name, email, and average rating', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    expect(screen.getByText('Sarah')).toBeInTheDocument();
    expect(screen.getByText('sarah')).toBeInTheDocument();
    expect(screen.getByText('Avg: 3.50')).toBeInTheDocument();

    expect(screen.getByText('Mike')).toBeInTheDocument();
    expect(screen.getByText('Avg: 1.50')).toBeInTheDocument();
  });

  it('shows personality inline with email when present', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    expect(screen.getByText('· The Golden Retriever')).toBeInTheDocument();
    expect(screen.getByText('· The Simon Cowell')).toBeInTheDocument();
  });

  it('does not show personality when null', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    const janeCard = screen.getByText('Jane').closest('button');
    expect(janeCard).not.toHaveTextContent('·');
  });

  it('passes barHeight="h-2" to UserRatingProgress', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    const progressBars = screen.getAllByTestId('user-rating-progress');
    progressBars.forEach((bar) => {
      expect(bar).toHaveAttribute('data-bar-height', 'h-2');
    });
  });

  it('renders sort pills for Name, # Rated, and Avg. Rating', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    expect(screen.getByRole('button', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /# rated/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /avg\. rating/i })).toBeInTheDocument();
  });

  it('sorts by name ascending by default', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    const cards = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    );
    expect(cards[0]).toHaveTextContent('Jane');
    expect(cards[1]).toHaveTextContent('Mike');
    expect(cards[2]).toHaveTextContent('Sarah');
  });

  it('sorts by # Rated when pill is clicked', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /# rated/i }));

    const cards = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    );
    expect(cards[0]).toHaveTextContent('Mike');
    expect(cards[1]).toHaveTextContent('Jane');
    expect(cards[2]).toHaveTextContent('Sarah');
  });

  it('toggles sort direction when clicking the active pill', () => {
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} />);

    fireEvent.click(screen.getByRole('button', { name: /avg\. rating/i }));
    // ascending: 1.5, 3.5, 4.0
    let cards = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    );
    expect(cards[0]).toHaveTextContent('Mike');
    expect(cards[2]).toHaveTextContent('Jane');

    fireEvent.click(screen.getByRole('button', { name: /avg\. rating/i }));
    // descending: 4.0, 3.5, 1.5
    cards = screen.getAllByRole('button').filter(
      (btn) => btn.textContent.includes('Avg:')
    );
    expect(cards[0]).toHaveTextContent('Jane');
    expect(cards[2]).toHaveTextContent('Mike');
  });

  it('calls onRowClick with user email when card is clicked', () => {
    const onRowClick = vi.fn();
    render(<UserRatingsTable userSummaries={USERS} ratingConfiguration={[]} onRowClick={onRowClick} />);

    fireEvent.click(screen.getByText('Sarah').closest('button'));
    expect(onRowClick).toHaveBeenCalledWith('sarah@test.com');
  });

  it('shows empty state when no users', () => {
    render(<UserRatingsTable userSummaries={[]} ratingConfiguration={[]} />);

    expect(screen.getByText('No users available')).toBeInTheDocument();
  });
});
