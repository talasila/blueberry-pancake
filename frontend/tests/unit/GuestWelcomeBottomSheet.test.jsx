import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuestWelcomeBottomSheet from '../../src/components/GuestWelcomeBottomSheet.jsx';

const makeEvent = (overrides = {}) => ({
  name: 'Friday Wine Night',
  typeOfItem: 'wine',
  state: 'started',
  ...overrides,
});

const defaultProps = {
  isOpen: true,
  onDismiss: vi.fn(),
  onRegister: vi.fn(),
  event: makeEvent(),
};

describe('GuestWelcomeBottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---- Visibility ----

  it('renders content when isOpen is true', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    expect(screen.getByText('Welcome to Friday Wine Night!')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Welcome to Friday Wine Night!')).not.toBeInTheDocument();
  });

  it('does not render when event is null', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} event={null} />);
    expect(screen.queryByTestId('guest-welcome-bottom-sheet')).not.toBeInTheDocument();
  });

  // ---- Content — Wine event ----

  it('displays event name in the heading', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Welcome to Friday Wine Night');
  });

  it('uses "bottle" terminology for wine events', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    const sheet = screen.getByTestId('guest-welcome-bottom-sheet');
    expect(sheet.textContent).toContain('Brought a bottle to share');
    expect(screen.getByTestId('guest-welcome-register-btn')).toHaveTextContent('Register My Bottle');
  });

  it('uses "item" terminology for generic events', () => {
    const event = makeEvent({ typeOfItem: 'generic' });
    render(<GuestWelcomeBottomSheet {...defaultProps} event={event} />);
    const sheet = screen.getByTestId('guest-welcome-bottom-sheet');
    expect(sheet.textContent).toContain('Brought an item to share');
    expect(screen.getByTestId('guest-welcome-register-btn')).toHaveTextContent('Register My Item');
  });

  // ---- "Why register?" section ----

  it('displays the "Why register?" section', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    const section = screen.getByTestId('guest-welcome-why-register');
    expect(section).toBeInTheDocument();
    expect(section.textContent).toContain('results are announced');
    expect(section.textContent).toContain('who brought them');
  });

  // ---- "Good to know" section ----

  it('displays all four good-to-know bullet points', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    const section = screen.getByTestId('guest-welcome-good-to-know');
    expect(section.textContent).toContain('optional');
    expect(section.textContent).toContain('more than one');
    expect(section.textContent).toContain('only one person');
    expect(section.textContent).toContain('any time');
  });

  it('mentions registration is optional — can rate without registering', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    const section = screen.getByTestId('guest-welcome-good-to-know');
    expect(section.textContent).toContain('rate without registering');
  });

  it('mentions group registration rule', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    const section = screen.getByTestId('guest-welcome-good-to-know');
    expect(section.textContent).toContain('group brought one');
    expect(section.textContent).toContain('only one person');
  });

  it('mentions registration window (until host pauses)', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    const section = screen.getByTestId('guest-welcome-good-to-know');
    expect(section.textContent).toContain('until the host pauses');
  });

  // ---- Actions ----

  it('calls onRegister when "Register My Bottle" is clicked', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('guest-welcome-register-btn'));
    expect(defaultProps.onRegister).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when "Skip for now" is clicked', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('guest-welcome-skip-btn'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when overlay backdrop is clicked', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    fireEvent.click(screen.getByTestId('guest-welcome-backdrop'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders "Skip for now" as a text link', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    expect(screen.getByTestId('guest-welcome-skip-btn')).toHaveTextContent('Skip for now');
  });

  // ---- Accessibility ----

  it('has role="dialog" and aria-modal="true"', () => {
    render(<GuestWelcomeBottomSheet {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
