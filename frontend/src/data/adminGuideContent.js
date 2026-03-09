/**
 * Static admin guide content keyed by event lifecycle state.
 *
 * Four state paths: created (8 steps), started (5), paused (3), completed (4).
 * Each step has an id, heading, description (≤3 sentences), and a lucide-react icon name.
 *
 * Content topics sourced from spec.md "Guide Content Steps".
 * Data shape per data-model.md — identical to guideContent.js for GuideStepCard reuse.
 * Language follows FR-013: plain, conversational, non-technical.
 * Locked-settings warnings per FR-008 included in relevant steps.
 */
export const adminGuideContent = {
  created: [
    {
      id: 'created-1',
      heading: 'How a Tasting Works',
      description:
        'Guests join with a PIN, taste items by number, and rate them blind. If someone brought an item they can optionally register it. Later, you match registered items to their tasting numbers so the results reveal who brought what.',
      icon: 'Wine',
    },
    {
      id: 'created-2',
      heading: 'Name Your Event',
      description:
        'Give your event a name that your guests will recognize — something like "Friday Wine Night" or "Holiday Tasting." You can always change it later before you start.',
      icon: 'Edit3',
    },
    {
      id: 'created-3',
      heading: 'Set Up Your Items',
      description:
        'Choose how many items to include and exclude any you don\'t need. Each item gets a tasting number that guests will use when rating. You can adjust this any time before starting.',
      icon: 'List',
    },
    {
      id: 'created-4',
      heading: 'Configure Ratings',
      description:
        'Pick your rating scale and customize the labels and colors for each score. This is your only chance — rating settings lock permanently once you start the event!',
      icon: 'Star',
    },
    {
      id: 'created-5',
      heading: 'Enable Note Suggestions',
      description:
        'Turn on tasting note hints so guests get helpful prompts while rating. This works great for wine events where guests might not know tasting terminology.',
      icon: 'MessageSquare',
    },
    {
      id: 'created-6',
      heading: 'Add Co-Administrators',
      description:
        'Invite others to help manage the event by adding them as co-administrators. They\'ll have the same admin access as you and can help run things on the day.',
      icon: 'UserPlus',
    },
    {
      id: 'created-7',
      heading: 'Share the PIN',
      description:
        'Copy the event PIN or link and send it to your guests so they can join. They\'ll need this to access the event on their phones.',
      icon: 'Share2',
    },
    {
      id: 'created-8',
      heading: 'Ready to Go!',
      description:
        'Once everyone has arrived and you\'re ready for the first pour, start the event. Look for the Start Event button in the state management section below.',
      icon: 'Rocket',
    },
  ],
  started: [
    {
      id: 'started-1',
      heading: 'Your Event is Live',
      description:
        'Guests can now rate items on their phones. As the host, you can sit back and let everyone taste at their own pace — ratings come in automatically.',
      icon: 'PlayCircle',
    },
    {
      id: 'started-2',
      heading: 'Guests Can Register Bottles',
      description:
        'If a guest brought an item, they can register it from their phone. This is optional — it just means the results can later show which item was which and who brought it.',
      icon: 'ClipboardList',
    },
    {
      id: 'started-3',
      heading: 'What Guests See',
      description:
        'Each guest sees a number grid and taps to rate each item. They can also leave tasting notes if you enabled that feature. Everything happens in real time.',
      icon: 'Smartphone',
    },
    {
      id: 'started-4',
      heading: 'Need a Break?',
      description:
        'Pause the event to temporarily stop ratings and match registered items to their tasting numbers. Guests will see a "paused" message until you resume.',
      icon: 'PauseCircle',
    },
    {
      id: 'started-5',
      heading: 'Time to Wrap Up',
      description:
        'Complete the event when all items have been tasted and rated. Don\'t worry — you can always reopen it later if needed. Look for the Complete Event button in the state management section below.',
      icon: 'CheckCircle2',
    },
  ],
  paused: [
    {
      id: 'paused-1',
      heading: 'Event is Paused',
      description:
        'Ratings are temporarily disabled for your guests. They\'ll see a paused message on their screens. You can take as long as you need here.',
      icon: 'PauseCircle',
    },
    {
      id: 'paused-2',
      heading: 'Match Bottles to Numbers',
      description:
        'Go to the Items section and open the Assignment tab. Match each registered item to its blind tasting number — this is how results will show who brought what when scores are revealed.',
      icon: 'Tag',
    },
    {
      id: 'paused-3',
      heading: 'Resume or Finish',
      description:
        'Resume the event to continue tasting, or complete it if you\'re done. Once you resume, assignments will be locked again. Use Resume or Complete in the state management section below.',
      icon: 'Play',
    },
  ],
  completed: [
    {
      id: 'completed-1',
      heading: "It's a Wrap!",
      description:
        'Your event is complete and the results are in. Guests can no longer submit ratings, but everyone can still view the results.',
      icon: 'PartyPopper',
    },
    {
      id: 'completed-2',
      heading: 'View the Dashboard',
      description:
        'Head to the dashboard to see how everyone rated each item and which ones came out on top. It\'s a great conversation starter!',
      icon: 'BarChart3',
    },
    {
      id: 'completed-3',
      heading: 'Export Your Data',
      description:
        'Download ratings, user data, and item details as spreadsheets. Great for keeping a record or sharing detailed results with your guests.',
      icon: 'Download',
    },
    {
      id: 'completed-4',
      heading: 'Want to Reopen?',
      description:
        'You can restart or pause the event again if you need to — maybe a late guest wants to rate, or you want to do another round. Use the state management section below to reopen.',
      icon: 'RotateCcw',
    },
  ],
};
