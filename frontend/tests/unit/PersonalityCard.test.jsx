import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalityCard from '../../src/components/PersonalityCard.jsx';
import { getPersonalityDisplay } from '../../src/utils/personalityContent.js';

vi.mock('../../src/utils/personalityContent.js', () => ({
  getPersonalityDisplay: vi.fn(),
}));

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('PersonalityCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders name and quote', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      icon: 'Heart',
      quote: 'Everything is amazing.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByText('The Golden Retriever')).toBeInTheDocument();
    expect(screen.getByText(/Everything is amazing/)).toBeInTheDocument();
  });

  it('shows "Previously" line when previousPersonality is passed', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      icon: 'Heart',
      quote: 'Everything is amazing.',
      quoteIndex: 0,
    });
    render(
      <PersonalityCard personalityId="golden-retriever" previousPersonality="The Simon Cowell" />
    );
    expect(screen.getByText(/Previously: The Simon Cowell/)).toBeInTheDocument();
  });

  it('does not show "Previously" line when previousPersonality is null', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      icon: 'Heart',
      quote: 'Everything is amazing.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="golden-retriever" previousPersonality={null} />);
    expect(screen.queryByText(/Previously:/)).not.toBeInTheDocument();
  });

  it('returns null for unknown personality', () => {
    getPersonalityDisplay.mockReturnValue(null);
    const { container } = render(<PersonalityCard personalityId="unknown" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows name but no quote paragraph when quote is empty', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Ghost',
      icon: 'EyeOff',
      quote: '',
      quoteIndex: -1,
    });
    const { container } = render(<PersonalityCard personalityId="ghost" />);
    expect(screen.getByText('The Ghost')).toBeInTheDocument();
    expect(container.querySelector('.italic')).toBeNull();
  });

  it('has section with aria-label for accessibility', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      icon: 'Heart',
      quote: 'Everything is amazing.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByRole('region', { name: /tasting personality/i })).toBeInTheDocument();
  });

  it('name uses strong element', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      icon: 'Heart',
      quote: 'Everything is amazing.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByText('The Golden Retriever').tagName).toBe('STRONG');
  });

  it('renders icon in a tinted circle', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      icon: 'Heart',
      quote: 'Everything is amazing.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByTestId('personality-icon')).toBeInTheDocument();
  });

  it('shows owner attribution when ownerName is provided', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Simon Cowell',
      icon: 'ThumbsDown',
      quote: 'Tough crowd.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="simon-cowell" ownerName="Sarah" />);
    expect(screen.getByText(/Sarah.s tasting personality/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Sarah.s tasting personality/i })).toBeInTheDocument();
  });

  it('uses possessive form without apostrophe-s for "Your"', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      icon: 'Heart',
      quote: 'Everything is amazing.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="golden-retriever" ownerName="Your" />);
    expect(screen.getByText(/Your tasting personality/i)).toBeInTheDocument();
    expect(screen.queryByText(/Your.s/i)).not.toBeInTheDocument();
  });

  it('does not show owner attribution when ownerName is null', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Simon Cowell',
      icon: 'ThumbsDown',
      quote: 'Tough crowd.',
      quoteIndex: 0,
    });
    render(<PersonalityCard personalityId="simon-cowell" />);
    expect(screen.queryByText(/tasting personality$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tasting personality' })).toBeInTheDocument();
  });

  describe('localStorage sticky quote', () => {
    it('stores quoteIndex in localStorage when eventId is provided', () => {
      getPersonalityDisplay.mockReturnValue({
        name: 'The Golden Retriever',
        icon: 'Heart',
        quote: 'Everything is amazing.',
        quoteIndex: 3,
      });
      render(<PersonalityCard personalityId="golden-retriever" eventId="evt-1" />);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'personality-quote-evt-1-golden-retriever',
        '3'
      );
    });

    it('reads stored quoteIndex from localStorage and passes it to getPersonalityDisplay', () => {
      localStorageMock.getItem.mockReturnValueOnce('5');
      getPersonalityDisplay.mockReturnValue({
        name: 'The Golden Retriever',
        icon: 'Heart',
        quote: 'Stored quote.',
        quoteIndex: 5,
      });
      render(<PersonalityCard personalityId="golden-retriever" eventId="evt-1" />);
      expect(getPersonalityDisplay).toHaveBeenCalledWith('golden-retriever', {}, 5);
    });

    it('does not write to localStorage when stored index already exists', () => {
      localStorageMock.getItem.mockReturnValueOnce('2');
      getPersonalityDisplay.mockReturnValue({
        name: 'The Golden Retriever',
        icon: 'Heart',
        quote: 'Stored quote.',
        quoteIndex: 2,
      });
      render(<PersonalityCard personalityId="golden-retriever" eventId="evt-1" />);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('does not use localStorage when eventId is not provided', () => {
      getPersonalityDisplay.mockReturnValue({
        name: 'The Golden Retriever',
        icon: 'Heart',
        quote: 'Random quote.',
        quoteIndex: 7,
      });
      render(<PersonalityCard personalityId="golden-retriever" />);
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('uses a new localStorage key when personalityId changes (shift)', () => {
      getPersonalityDisplay.mockReturnValue({
        name: 'The Simon Cowell',
        icon: 'ThumbsDown',
        quote: 'Tough crowd.',
        quoteIndex: 1,
      });
      const { rerender } = render(
        <PersonalityCard personalityId="simon-cowell" eventId="evt-2" />
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'personality-quote-evt-2-simon-cowell',
        '1'
      );

      localStorageMock.setItem.mockClear();
      getPersonalityDisplay.mockReturnValue({
        name: 'The Rollercoaster',
        icon: 'TrendingUpDown',
        quote: 'Plot twists.',
        quoteIndex: 4,
      });
      rerender(
        <PersonalityCard personalityId="rollercoaster" eventId="evt-2" />
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'personality-quote-evt-2-rollercoaster',
        '4'
      );
    });
  });
});
