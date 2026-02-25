/**
 * Static guide content for "How to Host a Blind Wine Tasting Party"
 *
 * Two role paths: host (8 steps) and guest (4 steps).
 * Each step has an id, heading, description (≤3 sentences), and a lucide-react icon name.
 *
 * Content topics sourced from spec.md "Guide Content Steps".
 * Data shape defined in data-model.md.
 * Language follows FR-014: plain, conversational, non-technical.
 */
export const guideContent = {
  host: [
    {
      id: 'host-1',
      heading: 'Pick Your Wines',
      description:
        'Have your guests bring a bottle each (or more) or grab some bottles with some variety or pick a fun theme like "all under $15." The more different they are, the more interesting the tasting gets.',
      icon: 'Wine',
    },
    {
      id: 'host-2',
      heading: 'Cover the Bottles',
      description:
        'Hide every label with paper bags, foil, or even socks. Number each bottle so everyone knows which one they\'re tasting. The mystery is what makes it fun!',
      icon: 'EyeOff',
    },
    {
      id: 'host-3',
      heading: 'Set Up Your Space',
      description:
        'Set out glasses, water for rinsing, and some crackers or bread to cleanse palates between pours. No fancy equipment needed — keep it casual.',
      icon: 'LayoutGrid',
    },
    {
      id: 'host-4',
      heading: 'Invite Your Guests',
      description:
        'Send out invites and let everyone know what to expect — a relaxed, no-expertise-needed evening of tasting and rating wines together.',
      icon: 'Users',
    },
    {
      id: 'host-5',
      heading: 'Create Your Event',
      description:
        'Set up a tasting event in the app so your guests can rate each wine on their phones. It only takes a minute.',
      icon: 'PlusCircle',
    },
    {
      id: 'host-6',
      heading: 'Share the Event Link',
      description:
        'Give your guests easy access by sharing the event link or event code & PIN. They\'ll use it to join and start rating.',
      icon: 'Share2',
    },
    {
      id: 'host-7',
      heading: 'Taste & Rate',
      description:
        'Pour each wine and walk your guests through tasting it. Everyone rates it in the app — no wine knowledge required, just honest opinions!',
      icon: 'Star',
    },
    {
      id: 'host-8',
      heading: 'Reveal & Compare',
      description:
        'Unwrap the bottles and see how everyone rated them on the dashboard. The results are always surprising — and always a great conversation starter.',
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
