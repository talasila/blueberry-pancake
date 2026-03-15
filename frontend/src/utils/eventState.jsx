import { PlayCircle, PauseCircle, CheckCircle2, CircleDot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const PHASE_ORDER = ['created', 'started', 'paused', 'completed'];

export const STATE_CONFIG = {
  created: {
    icon: CircleDot,
    className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    iconClassName: 'text-gray-700 dark:text-gray-300',
    dotColor: 'bg-gray-500',
    label: 'Setup',
    contextSentence: "Configure your event. When you're ready, start the tasting.",
    description: 'Event is in preparation, not yet started. Users cannot provide feedback.'
  },
  started: {
    icon: PlayCircle,
    className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    iconClassName: 'text-green-700 dark:text-green-400',
    dotColor: 'bg-green-500',
    label: 'Tasting',
    contextSentence: "Guests are rating. Pause when it's time to reveal.",
    description: 'Event is active. Users can provide feedback and ratings.'
  },
  paused: {
    icon: PauseCircle,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    iconClassName: 'text-yellow-700 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
    label: 'Reveal',
    contextSentence: 'Assign {plural} to item numbers and prepare the big reveal.',
    description: 'Event is temporarily paused. Users cannot provide feedback.'
  },
  completed: {
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    iconClassName: 'text-blue-700 dark:text-blue-400',
    dotColor: 'bg-blue-500',
    label: 'Results',
    contextSentence: 'The event is over. Everyone can see how the {plural} did.',
    description: 'Event is finished. Users cannot provide feedback. Results are available.'
  }
};

const TRANSITIONS = {
  created: [
    { targetState: 'started', label: 'Start Tasting', isPrimary: true, requiresConfirmation: false }
  ],
  started: [
    { targetState: 'paused', label: 'Pause for Reveal', isPrimary: true, requiresConfirmation: false },
    { targetState: 'completed', label: 'Complete Event', isPrimary: false, requiresConfirmation: false }
  ],
  paused: [
    { targetState: 'completed', label: 'Announce Results', isPrimary: true, requiresConfirmation: false },
    { targetState: 'started', label: 'Resume Tasting', isPrimary: false, requiresConfirmation: true }
  ],
  completed: [
    { targetState: 'started', label: 'Reopen Tasting', isPrimary: false, requiresConfirmation: true },
    { targetState: 'paused', label: 'Back to Reveal', isPrimary: false, requiresConfirmation: true }
  ]
};

/**
 * Get valid transitions from a given state with metadata for UI rendering.
 * @param {string} currentState
 * @returns {Array<{targetState: string, label: string, isPrimary: boolean, requiresConfirmation: boolean}>}
 */
export function getValidTransitions(currentState) {
  return TRANSITIONS[currentState] || [];
}

/**
 * Get state configuration with fallback for unknown states
 * @param {string} state - Event state
 * @returns {object} State configuration object
 */
export function getStateConfig(state) {
  return STATE_CONFIG[state] || {
    icon: CircleDot,
    className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    iconClassName: 'text-gray-700 dark:text-gray-300',
    dotColor: 'bg-gray-500',
    label: state,
    contextSentence: '',
    description: 'Unknown state'
  };
}

/**
 * StateBadge component — icon + label badge for lists (MyEventsPage, etc.)
 */
export function StateBadge({ state }) {
  const config = getStateConfig(state);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`capitalize flex items-center gap-1.5 ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

/**
 * StateDot component — small colored dot for ambient state awareness (Header)
 */
export function StateDot({ state, className = '' }) {
  const config = getStateConfig(state);
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${config.dotColor} ${className}`}
      title={config.label}
      aria-label={`Event state: ${config.label}`}
    />
  );
}
