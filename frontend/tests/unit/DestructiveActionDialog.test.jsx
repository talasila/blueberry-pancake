import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DestructiveActionDialog from '../../src/components/DestructiveActionDialog.jsx';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  isDeleting: false,
  title: 'Delete Item',
  confirmationText: 'DELETE',
  confirmButtonLabel: 'Delete Item',
};

function renderDialog(overrides = {}) {
  return render(
    <DestructiveActionDialog {...defaultProps} {...overrides}>
      <p>Are you sure you want to delete this item?</p>
    </DestructiveActionDialog>
  );
}

describe('DestructiveActionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    renderDialog({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog with title and children when isOpen is true', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete Item' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('should have aria-modal attribute', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should display confirmation text prompt', () => {
    renderDialog({ confirmationText: 'DELETE ALL' });
    expect(screen.getByText('DELETE ALL')).toBeInTheDocument();
  });

  it('should render the confirm button with the correct label', () => {
    renderDialog({ confirmButtonLabel: 'Remove Everything' });
    expect(screen.getByTestId('confirm-delete-button')).toHaveTextContent('Remove Everything');
  });

  describe('confirmation phrase matching', () => {
    it('should disable confirm button when phrase does not match', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'DELET' } });
      expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
    });

    it('should enable confirm button when phrase matches exactly', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      expect(screen.getByTestId('confirm-delete-button')).not.toBeDisabled();
    });

    it('should require exact case match for confirmation phrase', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'delete' } });
      expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
    });

    it('should call onConfirm when confirm button is clicked with matching phrase', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      fireEvent.click(screen.getByTestId('confirm-delete-button'));
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when confirm button is clicked with non-matching phrase', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'wrong' } });
      fireEvent.click(screen.getByTestId('confirm-delete-button'));
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('keyboard handlers', () => {
    it('should call onConfirm when Enter is pressed with matching phrase', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when Enter is pressed with non-matching phrase', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'wrong' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape is pressed', () => {
      renderDialog();
      const input = screen.getByTestId('confirm-input');
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading/disabled state during deletion', () => {
    it('should show "Deleting..." text when isDeleting is true', () => {
      renderDialog({ isDeleting: true });
      expect(screen.getByTestId('confirm-delete-button')).toHaveTextContent('Deleting...');
    });

    it('should disable confirm button when isDeleting is true even with matching phrase', () => {
      renderDialog({ isDeleting: true });
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      expect(screen.getByTestId('confirm-delete-button')).toBeDisabled();
    });

    it('should disable the confirmation input when isDeleting is true', () => {
      renderDialog({ isDeleting: true });
      expect(screen.getByTestId('confirm-input')).toBeDisabled();
    });

    it('should disable the close button when isDeleting is true', () => {
      renderDialog({ isDeleting: true });
      expect(screen.getByLabelText('Close dialog')).toBeDisabled();
    });

    it('should disable the cancel button when isDeleting is true', () => {
      renderDialog({ isDeleting: true });
      expect(screen.getByText('Cancel')).toBeDisabled();
    });

    it('should not call onConfirm on Enter when isDeleting is true', () => {
      renderDialog({ isDeleting: true });
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'DELETE' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('onClose callback', () => {
    it('should call onClose when backdrop is clicked', () => {
      renderDialog();
      // The backdrop is the first child div with aria-hidden
      const backdrop = screen.getByRole('dialog').parentElement.querySelector('[aria-hidden="true"]');
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button is clicked', () => {
      renderDialog();
      fireEvent.click(screen.getByLabelText('Close dialog'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Cancel button is clicked', () => {
      renderDialog();
      fireEvent.click(screen.getByText('Cancel'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-word confirmation text', () => {
    it('should work with multi-word confirmation phrases', () => {
      renderDialog({ confirmationText: 'DELETE ALL USERS' });
      const input = screen.getByTestId('confirm-input');
      fireEvent.change(input, { target: { value: 'DELETE ALL USERS' } });
      expect(screen.getByTestId('confirm-delete-button')).not.toBeDisabled();
    });
  });
});
