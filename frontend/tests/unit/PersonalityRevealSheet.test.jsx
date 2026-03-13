import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PersonalityRevealSheet from '../../src/components/PersonalityRevealSheet.jsx';

const defaultProps = {
  isOpen: true,
  onDismiss: vi.fn(),
  onReveal: vi.fn(),
};

describe('PersonalityRevealSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders content when isOpen is true', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    expect(screen.getByText('Your tasting personality is ready')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<PersonalityRevealSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Your tasting personality is ready')).not.toBeInTheDocument();
  });

  it('displays the teaser copy', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    const sheet = screen.getByTestId('personality-reveal-sheet');
    expect(sheet.textContent).toContain('ve tasted enough to have a type');
  });

  it('renders a Sparkles icon', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    const sheet = screen.getByTestId('personality-reveal-sheet');
    const svg = sheet.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onReveal when "Reveal My Personality" is clicked', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('personality-reveal-btn'));
    expect(defaultProps.onReveal).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when "Maybe later" is clicked', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('personality-reveal-dismiss-btn'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when the backdrop is clicked', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('personality-reveal-backdrop'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has role="dialog" and aria-modal="true"', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Tasting personality earned');
  });

  it('"Reveal My Personality" is a primary button', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    const btn = screen.getByTestId('personality-reveal-btn');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveTextContent('Reveal My Personality');
  });

  it('"Maybe later" is a text link', () => {
    render(<PersonalityRevealSheet {...defaultProps} />);
    const btn = screen.getByTestId('personality-reveal-dismiss-btn');
    expect(btn).toHaveTextContent('Maybe later');
  });
});
