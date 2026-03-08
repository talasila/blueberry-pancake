import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemePicker from '../../src/components/ThemePicker.jsx';
import { getAllPresets } from '../../src/utils/themePresets.js';

describe('ThemePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 10 preset cards', () => {
    render(<ThemePicker selectedTheme="classic" onSelect={vi.fn()} />);
    const presets = getAllPresets();
    presets.forEach((preset) => {
      expect(screen.getByTestId(`theme-card-${preset.id}`)).toBeInTheDocument();
    });
  });

  it('classic pre-selected shows ring class', () => {
    render(<ThemePicker selectedTheme="classic" onSelect={vi.fn()} />);
    const classicCard = screen.getByTestId('theme-card-classic');
    expect(classicCard).toHaveClass('ring-2');
    expect(classicCard).toHaveClass('ring-primary');
    expect(classicCard).toHaveClass('ring-offset-2');
  });

  it('tapping a card calls onSelect with the preset ID', () => {
    const onSelect = vi.fn();
    render(<ThemePicker selectedTheme="classic" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('theme-card-cellar'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('cellar');
  });

  it('disabled mode prevents onSelect from firing', () => {
    const onSelect = vi.fn();
    render(
      <ThemePicker selectedTheme="classic" onSelect={onSelect} disabled />
    );
    fireEvent.click(screen.getByTestId('theme-card-cellar'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('each card shows the preset name', () => {
    render(<ThemePicker selectedTheme="classic" onSelect={vi.fn()} />);
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Cellar')).toBeInTheDocument();
    expect(screen.getByText('Garden')).toBeInTheDocument();
    expect(screen.getByText('Golden')).toBeInTheDocument();
    expect(screen.getByText('Midnight')).toBeInTheDocument();
    expect(screen.getByText('Rosé')).toBeInTheDocument();
    expect(screen.getByText('Terracotta')).toBeInTheDocument();
    expect(screen.getByText('Olive')).toBeInTheDocument();
    expect(screen.getByText('Ocean')).toBeInTheDocument();
    expect(screen.getByText('Lavender')).toBeInTheDocument();
  });
});
