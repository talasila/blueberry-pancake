import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * DeleteRatingsDialog Component
 * 
 * A modal dialog for confirming deletion of all ratings and bookmarks with a confirmation phrase.
 * Requires the user to type "DELETE RATINGS" to confirm the destructive action.
 * 
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {function} onClose - Function to call when dialog should be closed
 * @param {function} onConfirm - Function to call when deletion is confirmed
 * @param {string} eventName - Name of the event (for display)
 * @param {boolean} isDeleting - Whether deletion is in progress
 */
function DeleteRatingsDialog({ isOpen, onClose, onConfirm, eventName, isDeleting }) {
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const CONFIRMATION_TEXT = 'DELETE RATINGS';

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirmationPhrase === CONFIRMATION_TEXT && !isDeleting) {
      onConfirm();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && confirmationPhrase === CONFIRMATION_TEXT && !isDeleting) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const isConfirmEnabled = confirmationPhrase === CONFIRMATION_TEXT && !isDeleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div 
        className="relative z-50 w-full max-w-md mx-4 bg-background border border-destructive/20 rounded-lg shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-ratings-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h2 
              id="delete-ratings-dialog-title"
              className="text-xl font-semibold text-destructive"
            >
              Delete All Ratings
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
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              This action cannot be undone. This will permanently delete all ratings and bookmarks for the event{' '}
              <strong className="font-semibold">&quot;{eventName}&quot;</strong>, including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>All ratings from all users</li>
              <li>All bookmarks from all users</li>
              <li>All rating statistics and cache</li>
              <li>All similarity calculations</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              The event configuration, items, and user profiles will remain unchanged.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmation-input" className="text-sm font-medium">
              Type <strong className="font-mono text-destructive">{CONFIRMATION_TEXT}</strong> to confirm:
            </label>
            <Input
              id="confirmation-input"
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDeleting}
              placeholder={CONFIRMATION_TEXT}
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
          >
            {isDeleting ? 'Deleting...' : 'Delete All Ratings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteRatingsDialog;
