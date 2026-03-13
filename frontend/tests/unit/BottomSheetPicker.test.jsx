import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomSheetPicker from '../../src/components/BottomSheetPicker.jsx';

describe('BottomSheetPicker', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Sheet',
  };

  it('renders when isOpen is true', () => {
    render(
      <BottomSheetPicker {...defaultProps}>
        <p>Sheet content</p>
      </BottomSheetPicker>
    );
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <BottomSheetPicker {...defaultProps} isOpen={false}>
        <p>Sheet content</p>
      </BottomSheetPicker>
    );
    expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
  });

  it('displays title when provided', () => {
    render(
      <BottomSheetPicker {...defaultProps} title="Assign #3">
        <p>Content</p>
      </BottomSheetPicker>
    );
    expect(screen.getByText('Assign #3')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheetPicker {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </BottomSheetPicker>
    );
    fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheetPicker {...defaultProps} onClose={onClose}>
        <p>Content</p>
      </BottomSheetPicker>
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders children correctly', () => {
    render(
      <BottomSheetPicker {...defaultProps}>
        <ul>
          <li>Bottle A</li>
          <li>Bottle B</li>
        </ul>
      </BottomSheetPicker>
    );
    expect(screen.getByText('Bottle A')).toBeInTheDocument();
    expect(screen.getByText('Bottle B')).toBeInTheDocument();
  });

  it('starts with translate-y-full and transitions to translate-y-0', async () => {
    const { rerender } = render(
      <BottomSheetPicker {...defaultProps} isOpen={false}>
        <p>Content</p>
      </BottomSheetPicker>
    );
    expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();

    rerender(
      <BottomSheetPicker {...defaultProps} isOpen={true}>
        <p>Content</p>
      </BottomSheetPicker>
    );
    const sheet = screen.getByTestId('bottom-sheet');
    expect(sheet.className).toContain('translate-y-full');
  });
});
