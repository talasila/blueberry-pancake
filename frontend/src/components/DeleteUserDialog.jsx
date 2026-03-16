import DestructiveActionDialog from '@/components/DestructiveActionDialog';

/** Thin wrapper — delegates to DestructiveActionDialog with single-user-specific content. */
function DeleteUserDialog({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  userName,
  itemsCount = 0,
  ratingsCount = 0,
  isAdministrator = false,
  isDeleting,
}) {
  return (
    <DestructiveActionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      title="Delete User"
      confirmationText="DELETE USER"
      confirmButtonLabel="Delete User"
      dialogId="delete-user-dialog-title"
    >
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
    </DestructiveActionDialog>
  );
}

export default DeleteUserDialog;
