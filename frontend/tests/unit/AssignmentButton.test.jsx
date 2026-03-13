import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssignmentButton from '../../src/components/AssignmentButton.jsx';

describe('AssignmentButton', () => {
  const defaultProps = {
    itemId: 3,
    isAssigned: false,
    onClick: vi.fn(),
  };

  it('renders the item number', () => {
    render(<AssignmentButton {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows gray background when unassigned', () => {
    render(<AssignmentButton {...defaultProps} isAssigned={false} />);
    const button = screen.getByTestId('assignment-button-3');
    expect(button.className).toMatch(/bg-gray-100/);
  });

  it('shows green background when assigned', () => {
    render(<AssignmentButton {...defaultProps} isAssigned={true} />);
    const button = screen.getByTestId('assignment-button-3');
    expect(button.className).toMatch(/bg-green-500/);
  });

  it('shows reduced opacity when disabled', () => {
    render(<AssignmentButton {...defaultProps} isDisabled={true} />);
    const button = screen.getByTestId('assignment-button-3');
    expect(button.className).toMatch(/opacity-50/);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<AssignmentButton {...defaultProps} onClick={onClick} isDisabled={true} />);
    fireEvent.click(screen.getByTestId('assignment-button-3'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not fire onClick when loading', () => {
    const onClick = vi.fn();
    render(<AssignmentButton {...defaultProps} onClick={onClick} isLoading={true} />);
    fireEvent.click(screen.getByTestId('assignment-button-3'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows spinner when loading', () => {
    render(<AssignmentButton {...defaultProps} isLoading={true} />);
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    const button = screen.getByTestId('assignment-button-3');
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('calls onClick with itemId on tap', () => {
    const onClick = vi.fn();
    render(<AssignmentButton {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('assignment-button-3'));
    expect(onClick).toHaveBeenCalledWith(3);
  });

  it('has correct aria-label for unassigned state', () => {
    render(<AssignmentButton {...defaultProps} />);
    expect(screen.getByLabelText('Number 3')).toBeInTheDocument();
  });

  it('has correct aria-label for assigned state', () => {
    render(<AssignmentButton {...defaultProps} isAssigned={true} />);
    expect(screen.getByLabelText('Number 3 (assigned)')).toBeInTheDocument();
  });
});
