import { useState, useCallback, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * DestructiveActionDialog Component
 *
 * A reusable modal dialog for confirming destructive actions with a confirmation phrase.
 * Extracts the shared pattern from DeleteEventDialog, DeleteRatingsDialog,
 * DeleteAllUsersDialog, and DeleteUserDialog.
 *
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {function} onClose - Function to call when dialog should be closed
 * @param {function} onConfirm - Function to call when action is confirmed
 * @param {boolean} isDeleting - Whether the action is in progress
 * @param {string} title - Dialog title displayed in the header
 * @param {string} confirmationText - Phrase the user must type to confirm (e.g. "DELETE")
 * @param {string} confirmButtonLabel - Label for the confirm button (e.g. "Delete Event")
 * @param {React.ReactNode} icon - Icon component for the header (defaults to AlertTriangle)
 * @param {string} dialogId - Unique ID for aria-labelledby (defaults to "destructive-action-dialog-title")
 * @param {React.ReactNode} children - Custom content rendered between header and confirmation input
 */
function DestructiveActionDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  title,
  confirmationText,
  confirmButtonLabel,
  icon,
  dialogId = 'destructive-action-dialog-title',
  children,
}) {
  const [confirmationPhrase, setConfirmationPhrase] = useState('');

  // Reset confirmation phrase when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationPhrase('');
    }
  }, [isOpen]);

  const isConfirmEnabled = confirmationPhrase === confirmationText && !isDeleting;

  const handleConfirm = useCallback(() => {
    if (confirmationPhrase === confirmationText && !isDeleting) {
      onConfirm();
    }
  }, [confirmationPhrase, confirmationText, isDeleting, onConfirm]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && confirmationPhrase === confirmationText && !isDeleting) {
      onConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [confirmationPhrase, confirmationText, isDeleting, onConfirm, onClose]);

  if (!isOpen) return null;

  const IconComponent = icon || AlertTriangle;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative z-[110] w-full max-w-md mx-4 bg-background border border-destructive/20 rounded-lg shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <IconComponent className="h-5 w-5 text-destructive" />
            </div>
            <h2
              id={dialogId}
              className="text-xl font-semibold text-destructive"
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {children}

          <div className="space-y-2">
            <label htmlFor="confirmation-input" className="text-sm font-medium">
              Type <strong className="font-mono text-destructive">{confirmationText}</strong> to confirm:
            </label>
            <Input
              id="confirmation-input"
              data-testid="confirm-input"
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDeleting}
              placeholder={confirmationText}
              className="font-mono"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-destructive/20 bg-muted/30">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            data-testid="confirm-delete-button"
          >
            {isDeleting ? 'Deleting...' : confirmButtonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DestructiveActionDialog;
