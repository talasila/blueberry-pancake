import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExportCard from '../../src/components/ExportCard.jsx';

describe('ExportCard', () => {
  const defaultProps = {
    title: 'Raw Ratings Data',
    description: 'Export all ratings data.',
    buttonLabel: 'Export Ratings Data',
    isLoading: false,
    disabled: false,
    onClick: vi.fn(),
  };

  it('renders title and description', () => {
    render(<ExportCard {...defaultProps} />);
    expect(screen.getByText('Raw Ratings Data')).toBeInTheDocument();
    expect(screen.getByText('Export all ratings data.')).toBeInTheDocument();
  });

  it('renders button with label', () => {
    render(<ExportCard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /export ratings data/i })).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(<ExportCard {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows spinner and "Exporting..." when loading', () => {
    render(<ExportCard {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    expect(screen.queryByText('Export Ratings Data')).not.toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<ExportCard {...defaultProps} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('button is enabled when disabled is false and not loading', () => {
    render(<ExportCard {...defaultProps} disabled={false} isLoading={false} />);
    expect(screen.getByRole('button')).toBeEnabled();
  });
});
