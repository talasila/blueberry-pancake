/**
 * Walkthrough content: end-to-end overview of how a blind tasting event works.
 * Displayed in WalkthroughDrawer, accessible from Create Event page,
 * Welcome bottom sheet, and Admin guide drawer.
 *
 * Each step uses a lucide-react icon name resolved at render time.
 */
export const walkthroughSteps = [
  {
    id: 'wt-1',
    heading: 'Create Your Event',
    description:
      'Give your event a name, pick a mood, and you\'re set. Sensible defaults are already in place for ratings, items, and more — you can tweak everything later.',
    icon: 'PlusCircle',
  },
  {
    id: 'wt-2',
    heading: 'Invite Your Guests',
    description:
      'Every event gets a unique PIN and shareable link. Send it to your guests so they can join on their phones — no app download needed.',
    icon: 'Share2',
  },
  {
    id: 'wt-3',
    heading: 'Start the Tasting',
    description:
      'When everyone is ready, start the event. Guests see a number grid and tap to rate each item blind — they won\'t know who brought what.',
    icon: 'PlayCircle',
  },
  {
    id: 'wt-4',
    heading: 'Guests Register Items',
    description:
      'If a guest brought an item, they can optionally register it from their phone. This step is entirely optional and happens while the event is live.',
    icon: 'ClipboardList',
  },
  {
    id: 'wt-5',
    heading: 'Pause & Match Items',
    description:
      'Pause the event and open the Assignment tab. Here you match each registered item to its blind tasting number — this is how results reveal who brought what.',
    icon: 'Tag',
  },
  {
    id: 'wt-6',
    heading: 'Reveal the Results',
    description:
      'Complete the event to reveal scores, rankings, and — if items were matched — who brought each one. Export the data any time for your records.',
    icon: 'Trophy',
  },
];
