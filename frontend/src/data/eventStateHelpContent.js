/**
 * Static help content for the event state management section (inline help).
 * Explains what admins and guests can do in each event state.
 * Button help under Start/Pause/Complete shows the full content for the target state (same as in "What each state means").
 * @see specs/021-event-state-help-guide/data-model.md
 */

export const eventStateHelpContent = {
  created: {
    adminCan: [
      'Update various settings like event name, items, rating scale/labels/colors, etc.',
      'Start the event when ready'
    ],
    adminCannot: [],
    guestCan: ['Register for the event using pin, register item(s), and view the event'],
    guestCannot: ['Rate items or provide feedback']
  },
  started: {
    adminCan: ['Monitor participation', 'Pause or complete the event'],
    adminCannot: [],
    guestCan: ['Rate items and provide feedback'],
    guestCannot: ['View the results (via dashboard)']
  },
  paused: {
    adminCan: [
      'Prepare to reveal results',
      'Assign item IDs to registered items',
      'If needed resume the event to allow ratings again',
      'Restart or complete the event'
    ],
    adminCannot: [],
    guestCan: ['View the event'],
    guestCannot: ['Rate items or provide feedback']
  },
  completed: {
    adminCan: [
      'Export data (ratings, users, items)',
      'Restart or pause the event (very rare)'
    ],
    adminCannot: [],
    guestCan: ['View the event and results (via dashboard)'],
    guestCannot: ['Rate items or provide feedback']
  }
};

export default eventStateHelpContent;
