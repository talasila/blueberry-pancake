import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import EventThemeProvider from '../../src/components/EventThemeProvider.jsx';
import { useEventContext } from '@/contexts/EventContext';

vi.mock('@/contexts/EventContext', () => ({
  useEventContext: vi.fn(),
}));

describe('EventThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('style');
  });

  it('renders children', () => {
    useEventContext.mockReturnValue({ event: { theme: 'classic' } });
    render(
      <EventThemeProvider>
        <span data-testid="child">Child content</span>
      </EventThemeProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('sets CSS custom properties on wrapper div when event has a theme', () => {
    useEventContext.mockReturnValue({ event: { theme: 'cellar' } });
    const { container } = render(
      <EventThemeProvider>
        <span>Child</span>
      </EventThemeProvider>
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle({
      '--event-accent': 'oklch(0.45 0.15 15)',
    });
  });

  it('defaults to classic when event has no theme field', () => {
    useEventContext.mockReturnValue({ event: {} });
    const { container } = render(
      <EventThemeProvider>
        <span>Child</span>
      </EventThemeProvider>
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveAttribute('data-event-theme', 'classic');
    expect(wrapper).toHaveStyle({
      '--event-accent': 'oklch(0.205 0 0)',
    });
  });

  it('wrapper div has data-event-theme attribute', () => {
    useEventContext.mockReturnValue({ event: { theme: 'garden' } });
    const { container } = render(
      <EventThemeProvider>
        <span>Child</span>
      </EventThemeProvider>
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveAttribute('data-event-theme', 'garden');
  });

  it('mirrors CSS vars onto document.documentElement for portals', () => {
    useEventContext.mockReturnValue({ event: { theme: 'cellar' } });
    render(
      <EventThemeProvider>
        <span>Child</span>
      </EventThemeProvider>
    );
    const rootStyle = document.documentElement.style;
    expect(rootStyle.getPropertyValue('--event-accent')).toBe('oklch(0.45 0.15 15)');
    expect(rootStyle.getPropertyValue('--primary')).toBe('oklch(0.45 0.15 15)');
  });

  it('cleans up root CSS vars on unmount', () => {
    useEventContext.mockReturnValue({ event: { theme: 'cellar' } });
    const { unmount } = render(
      <EventThemeProvider>
        <span>Child</span>
      </EventThemeProvider>
    );
    expect(document.documentElement.style.getPropertyValue('--event-accent')).toBe('oklch(0.45 0.15 15)');

    unmount();
    expect(document.documentElement.style.getPropertyValue('--event-accent')).toBe('');
  });
});
