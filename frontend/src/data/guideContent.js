/**
 * Static guide content for "How to Host a Blind Wine Tasting Party"
 *
 * Two role paths: host (6 steps, overview of the full hosting journey) and guest (4 steps).
 * Each step has an id, heading, description (≤3 sentences), and a lucide-react icon name.
 *
 * Host path summarizes the 17-step real-world flow at overview depth.
 * Guest path is unchanged from original.
 * Data shape defined in data-model.md.
 * Language follows FR-014: plain, conversational, non-technical.
 */
export const guideContent = {
  host: [
    {
      id: 'host-1',
      heading: 'Invite & Prepare',
      description:
        'Pick a date and let your guests know. Ask each person or couple to bring a bottle. Grab some brown paper bags and numbered stickers to cover and label them.',
      icon: 'Megaphone',
    },
    {
      id: 'host-2',
      heading: 'Cover & Number the Bottles',
      description:
        'When guests arrive, collect the bottles and hide each label in a bag. Stick a random number on each one — the mystery is what makes it fun!',
      icon: 'EyeOff',
    },
    {
      id: 'host-3',
      heading: 'Set Up the App',
      description:
        'Create an event in the app, configure your rating scale, and share the PIN or link with your guests so they can join on their phones.',
      icon: 'PlusCircle',
    },
    {
      id: 'host-4',
      heading: 'Taste & Rate Together',
      description:
        'Start the event and let everyone taste each wine at their own pace. Guests rate each bottle in the app — no wine expertise needed.',
      icon: 'Star',
    },
    {
      id: 'host-5',
      heading: 'The Big Reveal',
      description:
        'Pause the event, unwrap the bottles, and match each one to its number in the app. Then check the dashboard to see the scores.',
      icon: 'Eye',
    },
    {
      id: 'host-6',
      heading: 'Declare the Winner',
      description:
        'Announce the results to your guests and complete the event. Everyone can then see the full dashboard and results on their phone.',
      icon: 'Trophy',
    },
  ],
  guest: [
    {
      id: 'guest-1',
      heading: "You're Invited!",
      description:
        "Your host is putting together a blind wine tasting — you'll try mystery wines and rate them without knowing what they are. No wine knowledge needed, just come ready to have fun!",
      icon: 'PartyPopper',
    },
    {
      id: 'guest-2',
      heading: 'Join the Event',
      description:
        'Your host will share a PIN or link. Use it to join the event in the app so you can rate wines from your phone.',
      icon: 'LogIn',
    },
    {
      id: 'guest-3',
      heading: 'Taste & Rate',
      description:
        "Try each wine and rate it in the app. There are no wrong answers — just go with what you like. It's quick and easy.",
      icon: 'Star',
    },
    {
      id: 'guest-4',
      heading: 'See the Results',
      description:
        "After everyone's rated, check out the dashboard to see how the group scored each wine. You might be surprised which ones come out on top!",
      icon: 'BarChart3',
    },
  ],
};
