import { PlayCircle, PauseCircle, CheckCircle2, CircleDot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * State configuration mapping states to icons, colors, labels, and descriptions
 */
export const STATE_CONFIG = {
  created: {
    icon: CircleDot,
    className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    iconClassName: 'text-gray-700 dark:text-gray-300',
    label: 'Created',
    description: 'Event is in preparation, not yet started. Users cannot provide feedback.'
  },
  started: {
    icon: PlayCircle,
    className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    iconClassName: 'text-green-700 dark:text-green-400',
    label: 'Started',
    description: 'Event is active. Users can provide feedback and ratings.'
  },
  paused: {
    icon: PauseCircle,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    iconClassName: 'text-yellow-700 dark:text-yellow-400',
    label: 'Paused',
    description: 'Event is temporarily paused. Users cannot provide feedback.'
  },
  completed: {
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    iconClassName: 'text-blue-700 dark:text-blue-400',
    label: 'Completed',
    description: 'Event is finished. Users cannot provide feedback. Results are available.'
  }
};

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
    label: state,
    description: 'Unknown state'
  };
}

/**
 * Get state description (what the state means)
 * @param {string} state - Event state
 * @returns {string} Description of what the state means
 */
export function getStateDescription(state) {
  return getStateConfig(state).description;
}

/**
 * StateBadge component for displaying event state with icon and color
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
 * StateIcon component for displaying just the event state icon (smaller, for header)
 * Uses the same color as the state badge
 */
export function StateIcon({ state, className = '' }) {
  const config = getStateConfig(state);
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`capitalize flex items-center gap-1.5 ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
    </Badge>
  );
}

