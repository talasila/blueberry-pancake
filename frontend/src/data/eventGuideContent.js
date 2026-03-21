/**
 * Unified event guide content — 11 steps covering the full blind tasting
 * experience from planning the event through declaring a winner.
 *
 * Steps are organized into 4 phases and each is tagged as either a
 * real-world action or an in-app action.
 *
 * Data shape per data-model.md.
 * Language follows FR-013: plain, conversational, non-technical.
 */

export const phases = [
  { id: 'before-event', label: 'Before the Event', stepRange: [1, 2] },
  { id: 'event-day-setup', label: 'Event Day \u2014 Setup', stepRange: [3, 6] },
  { id: 'during-tasting', label: 'During the Tasting', stepRange: [7, 8] },
  { id: 'the-reveal', label: 'The Reveal', stepRange: [9, 11] },
];

export const eventGuideSteps = [
  // ── Before the Event (steps 1-2) ──────────────────────────────────
  {
    id: 'step-1',
    heading: 'Plan & Create Your Event',
    description:
      'Pick a date and let your guests know — each person or couple typically brings a bottle. Create your event in the app, set up your rating scale, and share the event link and PIN with your invitations so guests know how to join.',
    icon: 'PlusCircle',
    phase: 'before-event',
    stepType: 'in-app',
    position: 1,
  },
  {
    id: 'step-2',
    heading: 'Prepare Your Supplies',
    description:
      'Grab some brown paper bags or foil to cover bottles, and a set of numbered stickers or tags. Get more numbers than you expect bottles — you\'ll have leftovers and that\'s fine.',
    icon: 'Package',
    phase: 'before-event',
    stepType: 'real-world',
    position: 2,
  },

  // ── Event Day — Setup (steps 3-6) ─────────────────────────────────
  {
    id: 'step-3',
    heading: 'Set Out the QR Code',
    description:
      'Print the event QR code and place it somewhere visible at the venue. Guests who didn\'t get the link ahead of time can scan it to join on the spot — no app download needed.',
    icon: 'QrCode',
    phase: 'event-day-setup',
    stepType: 'real-world',
    position: 3,
  },
  {
    id: 'step-4',
    heading: 'Collect, Cover & Number the Bottles',
    description:
      'Have each guest register their bottle in the app before handing it over — this is how results later reveal who brought what. Once you\'ve collected a batch, cover them in brown paper bags and stick random numbered tags on them out of sight so no guest sees which number their bottle got.',
    icon: 'EyeOff',
    phase: 'event-day-setup',
    stepType: 'real-world',
    position: 4,
  },
  {
    id: 'step-5',
    heading: 'Configure Your Items',
    description:
      'Set the maximum item number to match your highest sticker. Then exclude the leftover numbers that weren\'t placed on any bottle.',
    icon: 'List',
    phase: 'event-day-setup',
    stepType: 'in-app',
    position: 5,
  },
  {
    id: 'step-6',
    heading: 'Start the Event',
    description:
      'Once the bottles are numbered and your guests have joined, hit Start. Everyone can now begin tasting and rating.',
    icon: 'PlayCircle',
    phase: 'event-day-setup',
    stepType: 'in-app',
    position: 6,
  },

  // ── During the Tasting (steps 7-8) ────────────────────────────────
  {
    id: 'step-7',
    heading: 'Guests Taste & Rate',
    description:
      'Guests taste each bottle, find its number in the app, and submit their rating. You can sit back and let everyone go at their own pace.',
    icon: 'Star',
    phase: 'during-tasting',
    stepType: 'real-world',
    position: 7,
  },
  {
    id: 'step-8',
    heading: 'Pause the Event',
    description:
      'When everyone is done tasting, pause the event so no more ratings come in. Guests will see a "paused" message on their screens.',
    icon: 'PauseCircle',
    phase: 'during-tasting',
    stepType: 'in-app',
    position: 8,
  },

  // ── The Reveal (steps 9-12) ───────────────────────────────────────
  {
    id: 'step-9',
    heading: 'Reveal & Match the Bottles',
    description:
      'Unwrap all the bottles so you can see which bottle has which number. Then open the Assignment tab in the app and match each registered bottle to its sticker number. This connects "who brought what" to the blind scores.',
    icon: 'Eye',
    phase: 'the-reveal',
    stepType: 'real-world',
    position: 9,
  },
  {
    id: 'step-10',
    heading: 'Declare the Winner',
    description:
      'Check the dashboard to see rankings and scores — guests can\'t see results yet. This is the dramatic moment: gather everyone and announce who brought the top-rated bottle!',
    icon: 'Trophy',
    phase: 'the-reveal',
    stepType: 'in-app',
    position: 10,
  },
  {
    id: 'step-11',
    heading: 'Complete the Event',
    description:
      'Mark the event as complete so all guests can see the dashboard and full results on their phones.',
    icon: 'CheckCircle2',
    phase: 'the-reveal',
    stepType: 'in-app',
    position: 11,
  },
];

/**
 * Maps event lifecycle state to step visual states (done / now / ahead).
 *
 * @param {string} eventState - One of 'created', 'started', 'paused', 'completed'
 * @param {number} position   - 1-based step position (1–11)
 * @returns {'done' | 'now' | 'ahead'}
 */
export function getStepVisualState(eventState, position) {
  const ranges = {
    created: { nowStart: 1, nowEnd: 6 },
    started: { nowStart: 7, nowEnd: 7 },
    paused: { nowStart: 8, nowEnd: 10 },
    completed: { nowStart: 11, nowEnd: 11 },
  };

  const range = ranges[eventState];
  if (!range) return 'ahead';

  if (position < range.nowStart) return 'done';
  if (position > range.nowEnd) return 'ahead';
  return 'now';
}
