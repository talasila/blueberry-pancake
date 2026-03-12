import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemButton from '../../src/components/ItemButton.jsx';

const defaultProps = {
  itemId: 3,
  ratingColor: null,
  isBookmarked: false,
  isWinner: false,
  onClick: () => {},
};

describe('ItemButton participation ring', () => {
  it('renders ring when showRing=true, totalParticipants>0, ratedCount defined', () => {
    render(<ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={4} />);
    expect(screen.getByTestId('participation-ring')).toBeInTheDocument();
  });

  it('does not render ring when showRing=false', () => {
    render(<ItemButton {...defaultProps} showRing={false} totalParticipants={8} ratedCount={4} />);
    expect(screen.queryByTestId('participation-ring')).not.toBeInTheDocument();
  });

  it('does not render ring when totalParticipants=0', () => {
    render(<ItemButton {...defaultProps} showRing={true} totalParticipants={0} ratedCount={0} />);
    expect(screen.queryByTestId('participation-ring')).not.toBeInTheDocument();
  });

  it('does not render ring when ratedCount is undefined', () => {
    render(<ItemButton {...defaultProps} showRing={true} totalParticipants={8} />);
    expect(screen.queryByTestId('participation-ring')).not.toBeInTheDocument();
  });

  it('calculates 0% progress correctly (full dashoffset)', () => {
    const { container } = render(
      <ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={0} />
    );
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    const circumference = 2 * Math.PI * 26; // radius = (60/2) - 4 = 26
    expect(parseFloat(progressCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference, 0);
  });

  it('calculates 50% progress correctly', () => {
    const { container } = render(
      <ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={4} />
    );
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    const circumference = 2 * Math.PI * 26;
    expect(parseFloat(progressCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.5, 0);
  });

  it('calculates 100% progress correctly (zero dashoffset)', () => {
    const { container } = render(
      <ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={8} />
    );
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(parseFloat(progressCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 0);
  });

  it('clamps progress at 100% when ratedCount > totalParticipants', () => {
    const { container } = render(
      <ItemButton {...defaultProps} showRing={true} totalParticipants={5} ratedCount={10} />
    );
    const circles = container.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(parseFloat(progressCircle.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 0);
  });

  it('applies Tailwind classes for unrated items (no ratingColor)', () => {
    const { container } = render(
      <ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={3} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles[0].getAttribute('class')).toContain('stroke-gray-100');
    expect(circles[1].getAttribute('class')).toContain('stroke-gray-300');
  });

  it('applies correct inline styles for rated items', () => {
    const { container } = render(
      <ItemButton {...defaultProps} ratingColor="#22c55e" showRing={true} totalParticipants={8} ratedCount={3} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles[0].style.stroke).toBe('#22c55e');
    expect(circles[1].style.stroke).toContain('color-mix');
    expect(circles[1].style.stroke).toContain('#22c55e');
  });

  it('sets aria-hidden="true" on the SVG', () => {
    render(<ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={3} />);
    const svg = screen.getByTestId('participation-ring');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets pointer-events:none on the SVG via className', () => {
    render(<ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={3} />);
    const svg = screen.getByTestId('participation-ring');
    expect(svg.getAttribute('class')).toContain('pointer-events-none');
  });
});

describe('ItemButton aria-label', () => {
  it('includes participation count when showRing=true', () => {
    render(<ItemButton {...defaultProps} showRing={true} totalParticipants={8} ratedCount={6} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Item 3, 6 of 8 rated');
  });

  it('omits participation count when showRing=false', () => {
    render(<ItemButton {...defaultProps} showRing={false} totalParticipants={8} ratedCount={6} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Item 3');
  });

  it('composes with bookmark label', () => {
    render(<ItemButton {...defaultProps} isBookmarked={true} showRing={true} totalParticipants={8} ratedCount={6} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Item 3 (bookmarked), 6 of 8 rated');
  });

  it('composes with winner label', () => {
    render(<ItemButton {...defaultProps} isWinner={true} showRing={true} totalParticipants={8} ratedCount={6} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Item 3 (winner), 6 of 8 rated');
  });

  it('composes with both bookmark and winner labels', () => {
    render(<ItemButton {...defaultProps} isBookmarked={true} isWinner={true} showRing={true} totalParticipants={8} ratedCount={6} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Item 3 (bookmarked) (winner), 6 of 8 rated');
  });
});
