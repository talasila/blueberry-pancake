import DestructiveActionDialog from '@/components/DestructiveActionDialog';

/** Thin wrapper — delegates to DestructiveActionDialog with event-specific content. */
function DeleteEventDialog({ isOpen, onClose, onConfirm, eventName, isDeleting }) {
  return (
    <DestructiveActionDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      title="Delete Event"
      confirmationText="DELETE"
      confirmButtonLabel="Delete Event"
      dialogId="delete-dialog-title"
    >
      <div className="space-y-2">
        <p className="text-sm text-foreground">
          This action cannot be undone. This will permanently delete the event{' '}
          <strong className="font-semibold">&quot;{eventName}&quot;</strong> and all of its data, including:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>Event configuration</li>
          <li>All ratings and feedback</li>
          <li>All user profiles</li>
          <li>All item registrations</li>
          <li>All associated data files</li>
        </ul>
      </div>
    </DestructiveActionDialog>
  );
}

export default DeleteEventDialog;
