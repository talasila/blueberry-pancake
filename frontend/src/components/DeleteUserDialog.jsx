import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * DeleteUserDialog Component
 * 
 * A modal dialog for confirming deletion of a single user with a confirmation phrase.
 * Requires the user to type "DELETE USER" to confirm the destructive action.
 * 
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {function} onClose - Function to call when dialog should be closed
 * @param {function} onConfirm - Function to call when deletion is confirmed
 * @param {string} userEmail - Email of the user being deleted
 * @param {string} userName - Name of the user being deleted (optional)
 * @param {number} itemsCount - Number of items registered by the user
 * @param {number} ratingsCount - Number of ratings submitted by the user
 * @param {boolean} isAdministrator - Whether the user is an administrator
 * @param {boolean} isDeleting - Whether deletion is in progress
 */
function DeleteUserDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userEmail, 
  userName, 
  itemsCount = 0, 
  ratingsCount = 0,
  isAdministrator = false,
  isDeleting 
}) {
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const CONFIRMATION_TEXT = 'DELETE USER';

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
        aria-labelledby="delete-user-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h2 
              id="delete-user-dialog-title"
              className="text-xl font-semibold text-destructive"
            >
              Delete User
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
              This action cannot be undone. This will permanently delete the user{' '}
              <strong className="font-semibold">{userEmail}</strong>
              {userName && (
                <> ({userName})</>
              )}
              {' '}and all of their associated data, including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>User registration information</li>
              <li>All items registered by the user ({itemsCount} item{itemsCount !== 1 ? 's' : ''})</li>
              <li>All ratings submitted by the user ({ratingsCount} rating{ratingsCount !== 1 ? 's' : ''})</li>
              <li>All bookmarks</li>
              <li>User profile and name</li>
              <li>All other user-specific data</li>
            </ul>
            {isAdministrator && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong className="font-semibold text-foreground">Note:</strong> This user is an administrator and will also be removed from the administrators list.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmation-input" className="text-sm font-medium">
              Type <strong className="font-mono text-destructive">{CONFIRMATION_TEXT}</strong> to confirm:
            </label>
            <Input
              id="confirmation-input"
              data-testid="confirm-input"
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
            data-testid="confirm-delete-button"
          >
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteUserDialog;
