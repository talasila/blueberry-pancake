import { useState, useEffect, useRef } from 'react';
import {
  Repeat, Contrast, Zap, Heart, ThumbsDown, PenTool,
  TrendingUpDown, Scale, EyeOff, BrainCircuit, Compass, HelpCircle
} from 'lucide-react';

/** Map personality icon names to components — avoids importing all of lucide-react */
const PERSONALITY_ICONS = {
  Repeat, Contrast, Zap, Heart, ThumbsDown, PenTool,
  TrendingUpDown, Scale, EyeOff, BrainCircuit, Compass, HelpCircle,
};
import { getPersonalityDisplay } from '@/utils/personalityContent';

const PARTICLE_COUNT = 6;

function getStorageKey(eventId, personalityId) {
  return `personality-quote-${eventId}-${personalityId}`;
}

function ConfettiParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg" aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full opacity-0 animate-[confetti-burst_0.7s_ease-out_forwards]"
          style={{
            left: '50%',
            top: '50%',
            backgroundColor: 'var(--event-accent)',
            animationDelay: `${i * 0.06}s`,
            '--confetti-x': `${(Math.cos((i / PARTICLE_COUNT) * Math.PI * 2) * 60).toFixed(0)}px`,
            '--confetti-y': `${(Math.sin((i / PARTICLE_COUNT) * Math.PI * 2) * 40).toFixed(0)}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * PersonalityCard
 * Themed card showing a tasting personality icon, name, humorous quote,
 * and optional "Previously" shift indicator. Features an accent-colored
 * left border, monochrome Lucide icon in a tinted circle on the right,
 * and a one-time confetti burst.
 *
 * When eventId is provided the selected quote index is persisted to
 * localStorage so the same quote is shown for the duration of the event.
 * A personality shift naturally produces a new storage key, so a fresh
 * random quote is selected for the new personality.
 *
 * @param {object} props
 * @param {string} props.personalityId - Personality type ID (e.g., "simon-cowell")
 * @param {object} props.templateVars - Token values for quote interpolation
 * @param {string|null} [props.previousPersonality] - Previous personality display name for shift line
 * @param {string|null} [props.ownerName] - When set, shows "{name}'s tasting personality" attribution above the name
 * @param {string|null} [props.eventId] - Event ID for localStorage-based sticky quote selection
 */
function PersonalityCard({ personalityId, templateVars = {}, previousPersonality = null, ownerName = null, eventId = null }) {
  const displayRef = useRef(null);
  const trackedIdRef = useRef(null);

  if (personalityId !== trackedIdRef.current) {
    trackedIdRef.current = personalityId;

    if (!personalityId) {
      displayRef.current = null;
    } else {
      let storedIndex;
      if (eventId) {
        const key = getStorageKey(eventId, personalityId);
        const stored = localStorage.getItem(key);
        if (stored !== null) {
          storedIndex = parseInt(stored, 10);
          if (isNaN(storedIndex)) storedIndex = undefined;
        }
      }

      const result = getPersonalityDisplay(personalityId, templateVars, storedIndex);

      if (result && eventId && storedIndex === undefined) {
        localStorage.setItem(getStorageKey(eventId, personalityId), String(result.quoteIndex));
      }

      displayRef.current = result;
    }
  }

  const display = displayRef.current;

  const [showConfetti, setShowConfetti] = useState(false);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (display && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 900);
      return () => clearTimeout(timer);
    }
  }, [display]);

  if (!display) return null;

  const isPossessive = ownerName && /^(your|my|their|our)$/i.test(ownerName);
  const ownerLabel = ownerName
    ? isPossessive ? `${ownerName} tasting personality` : `${ownerName}\u2019s tasting personality`
    : null;

  const IconComponent = PERSONALITY_ICONS[display.icon] || HelpCircle;

  return (
    <section
      aria-label={ownerLabel || 'Tasting personality'}
      className="relative rounded-lg border-l-4 px-4 py-3 animate-[card-reveal_0.4s_ease-out_both]"
      style={{
        borderLeftColor: 'var(--event-accent)',
        backgroundColor: 'color-mix(in oklch, var(--event-accent) 8%, var(--background))',
      }}
    >
      {showConfetti && <ConfettiParticles />}

      <div
        className="absolute top-3 right-3 h-10 w-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in oklch, var(--event-accent) 12%, var(--background))' }}
        aria-hidden="true"
        data-testid="personality-icon"
      >
        <IconComponent className="h-5 w-5" style={{ color: 'var(--event-accent)' }} />
      </div>

      {ownerLabel && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium block mb-1">
          {ownerLabel}
        </span>
      )}
      <strong className="text-sm font-semibold">{display.name}</strong>
      {display.quote && (
        <p className="text-xs text-muted-foreground mt-1 italic leading-relaxed">
          &ldquo;{display.quote}&rdquo;
        </p>
      )}
      {previousPersonality && (
        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
          Previously: {previousPersonality}
        </p>
      )}
    </section>
  );
}

export default PersonalityCard;
