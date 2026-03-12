import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalityCard from '../../src/components/PersonalityCard.jsx';
import { getPersonalityDisplay } from '../../src/utils/personalityContent.js';

vi.mock('../../src/utils/personalityContent.js', () => ({
  getPersonalityDisplay: vi.fn(),
}));

describe('PersonalityCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name and quote', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      emoji: '🐕',
      quote: 'Everything is amazing.',
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByText('The Golden Retriever')).toBeInTheDocument();
    expect(screen.getByText(/Everything is amazing/)).toBeInTheDocument();
  });

  it('shows "Previously" line when previousPersonality is passed', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      emoji: '🐕',
      quote: 'Everything is amazing.',
    });
    render(
      <PersonalityCard personalityId="golden-retriever" previousPersonality="The Simon Cowell" />
    );
    expect(screen.getByText(/Previously: The Simon Cowell/)).toBeInTheDocument();
  });

  it('does not show "Previously" line when previousPersonality is null', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      emoji: '🐕',
      quote: 'Everything is amazing.',
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
      emoji: '👻',
      quote: '',
    });
    const { container } = render(<PersonalityCard personalityId="ghost" />);
    expect(screen.getByText('The Ghost')).toBeInTheDocument();
    expect(container.querySelector('.italic')).toBeNull();
  });

  it('has section with aria-label for accessibility', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      emoji: '🐕',
      quote: 'Everything is amazing.',
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByRole('region', { name: /tasting personality/i })).toBeInTheDocument();
  });

  it('name uses strong element', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      emoji: '🐕',
      quote: 'Everything is amazing.',
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByText('The Golden Retriever').tagName).toBe('STRONG');
  });

  it('renders emoji next to name', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      emoji: '🐕',
      quote: 'Everything is amazing.',
    });
    render(<PersonalityCard personalityId="golden-retriever" />);
    expect(screen.getByText('🐕')).toBeInTheDocument();
  });

  it('shows owner attribution when ownerName is provided', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Simon Cowell',
      emoji: '🎤',
      quote: 'Tough crowd.',
    });
    render(<PersonalityCard personalityId="simon-cowell" ownerName="Sarah" />);
    expect(screen.getByText(/Sarah.s tasting personality/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Sarah.s tasting personality/i })).toBeInTheDocument();
  });

  it('uses possessive form without apostrophe-s for "Your"', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Golden Retriever',
      emoji: '🐕',
      quote: 'Everything is amazing.',
    });
    render(<PersonalityCard personalityId="golden-retriever" ownerName="Your" />);
    expect(screen.getByText(/Your tasting personality/i)).toBeInTheDocument();
    expect(screen.queryByText(/Your.s/i)).not.toBeInTheDocument();
  });

  it('does not show owner attribution when ownerName is null', () => {
    getPersonalityDisplay.mockReturnValue({
      name: 'The Simon Cowell',
      emoji: '🎤',
      quote: 'Tough crowd.',
    });
    render(<PersonalityCard personalityId="simon-cowell" />);
    expect(screen.queryByText(/tasting personality$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tasting personality' })).toBeInTheDocument();
  });
});
