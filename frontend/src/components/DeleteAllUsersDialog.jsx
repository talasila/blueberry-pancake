import DestructiveActionDialog from '@/components/DestructiveActionDialog';

/** Thin wrapper — delegates to DestructiveActionDialog with delete-all-users content. */
function DeleteAllUsersDialog({ isOpen, onClose, onConfirm, eventName, userCount, isDeleting }) {
  return (
    <DestructiveActionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      title="Delete All Users"
      confirmationText="DELETE ALL USERS"
      confirmButtonLabel="Delete All Users"
      dialogId="delete-users-dialog-title"
    >
      <div className="space-y-2">
        <p className="text-sm text-foreground">
          This action cannot be undone. This will permanently delete <strong className="font-semibold">{userCount} user(s)</strong> from the event{' '}
          <strong className="font-semibold">&quot;{eventName}&quot;</strong> and all of their associated data, including:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>User registration information</li>
          <li>All items registered by users</li>
          <li>All ratings submitted by users</li>
          <li>All bookmarks</li>
          <li>User profiles and names</li>
          <li>All other user-specific data</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          <strong className="font-semibold text-foreground">Note:</strong> Administrators and the event owner will not be deleted.
        </p>
      </div>
    </DestructiveActionDialog>
  );
}

export default DeleteAllUsersDialog;
