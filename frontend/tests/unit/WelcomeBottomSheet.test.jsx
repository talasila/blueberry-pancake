import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeBottomSheet from '../../src/components/WelcomeBottomSheet.jsx';

const makeEvent = (overrides = {}) => ({
  pin: 'AB12CD34',
  itemConfiguration: {
    numberOfItems: 20,
    excludedItemIds: [],
  },
  ratingConfiguration: {
    maxRating: 4,
    noteSuggestionsEnabled: true,
  },
  administrators: { 'admin@example.com': { role: 'owner' } },
  ...overrides,
});

const defaultProps = {
  isOpen: true,
  onDismiss: vi.fn(),
  onOpenAdminGuide: vi.fn(),
  event: makeEvent(),
};

describe('WelcomeBottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Visibility ----

  it('renders content when isOpen is true', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    expect(screen.getByText('Your event is ready!')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<WelcomeBottomSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Your event is ready!')).not.toBeInTheDocument();
  });

  it('does not render when event is null (FR-015)', () => {
    render(<WelcomeBottomSheet {...defaultProps} event={null} />);
    expect(screen.queryByText('Your event is ready!')).not.toBeInTheDocument();
  });

  it('does not render when event is missing PIN (FR-015)', () => {
    const event = makeEvent({ pin: undefined });
    render(<WelcomeBottomSheet {...defaultProps} event={event} />);
    expect(screen.queryByText('Your event is ready!')).not.toBeInTheDocument();
  });

  it('does not render when event is missing ratingConfiguration (FR-015)', () => {
    const event = makeEvent({ ratingConfiguration: undefined });
    render(<WelcomeBottomSheet {...defaultProps} event={event} />);
    expect(screen.queryByText('Your event is ready!')).not.toBeInTheDocument();
  });

  it('does not render when event is missing itemConfiguration (FR-015)', () => {
    const event = makeEvent({ itemConfiguration: undefined });
    render(<WelcomeBottomSheet {...defaultProps} event={event} />);
    expect(screen.queryByText('Your event is ready!')).not.toBeInTheDocument();
  });

  // ---- Sharing section ----

  it('displays sharing instructions with the PIN', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    expect(screen.getByTestId('welcome-sharing')).toBeInTheDocument();
    expect(screen.getByTestId('welcome-pin')).toHaveTextContent('AB12CD34');
    const sharing = screen.getByTestId('welcome-sharing');
    expect(sharing.textContent).toContain('event link');
    expect(sharing.textContent).toContain('PIN');
  });

  // ---- Defaults summary ----

  it('displays pre-configured defaults', () => {
    const { container } = render(<WelcomeBottomSheet {...defaultProps} />);
    const defaults = screen.getByTestId('welcome-defaults');
    expect(defaults.textContent).toContain('20');
    expect(defaults.textContent).toContain('wines');
    expect(defaults.textContent).toContain('1–4');
    expect(defaults.textContent).toContain('enabled');
  });

  it('displays correct active item count when items are excluded', () => {
    const event = makeEvent({
      itemConfiguration: { numberOfItems: 20, excludedItemIds: ['a', 'b', 'c'] },
    });
    render(<WelcomeBottomSheet {...defaultProps} event={event} />);
    const defaults = screen.getByTestId('welcome-defaults');
    expect(defaults.textContent).toContain('17');
  });

  it('shows "disabled" when note suggestions are off', () => {
    const event = makeEvent({
      ratingConfiguration: { maxRating: 4, noteSuggestionsEnabled: false },
    });
    render(<WelcomeBottomSheet {...defaultProps} event={event} />);
    const defaults = screen.getByTestId('welcome-defaults');
    expect(defaults.textContent).toContain('disabled');
  });

  it('mentions Items, Ratings, and Administrators sections for customizing', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    const defaults = screen.getByTestId('welcome-defaults');
    expect(defaults.textContent).toContain('Items');
    expect(defaults.textContent).toContain('Ratings');
    expect(defaults.textContent).toContain('Administrators');
  });

  // ---- Start info ----

  it('tells user to go to the State section to start', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    const startInfo = screen.getByTestId('welcome-start-info');
    expect(startInfo.textContent).toContain('State');
    expect(startInfo.textContent).toContain('section on this page');
  });

  // ---- Dismiss ----

  it('calls onDismiss when "Got it" is clicked', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('welcome-got-it'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when overlay is clicked', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('welcome-backdrop'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  // ---- Guide link ----

  it('renders "Show me the setup guide" link', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    expect(screen.getByTestId('welcome-open-guide')).toHaveTextContent(
      'Show me the setup guide'
    );
  });

  it('calls onOpenAdminGuide when guide link is tapped', () => {
    render(<WelcomeBottomSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('welcome-open-guide'));
    expect(defaultProps.onOpenAdminGuide).toHaveBeenCalledTimes(1);
  });
});
