import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
