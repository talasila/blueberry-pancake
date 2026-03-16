import DestructiveActionDialog from '@/components/DestructiveActionDialog';

/** Thin wrapper — delegates to DestructiveActionDialog with ratings-specific content. */
function DeleteRatingsDialog({ isOpen, onClose, onConfirm, eventName, isDeleting }) {
  return (
    <DestructiveActionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      title="Delete All Ratings"
      confirmationText="DELETE RATINGS"
      confirmButtonLabel="Delete All Ratings"
      dialogId="delete-ratings-dialog-title"
    >
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
    </DestructiveActionDialog>
  );
}

export default DeleteRatingsDialog;
