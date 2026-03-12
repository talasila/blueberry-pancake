import { useState, useEffect, useRef } from 'react';
import { getPersonalityDisplay } from '@/utils/personalityContent';

const PARTICLE_COUNT = 6;

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
 * Themed card showing a tasting personality emoji, name, humorous quote,
 * and optional "Previously" shift indicator. Features an accent-colored
 * left border, personality-specific emoji, and a one-time confetti burst.
 *
 * The display (including randomly selected quote) is "sticky" — it only
 * re-selects when personalityId changes, not on polling-driven re-renders.
 *
 * @param {object} props
 * @param {string} props.personalityId - Personality type ID (e.g., "simon-cowell")
 * @param {object} props.templateVars - Token values for quote interpolation
 * @param {string|null} [props.previousPersonality] - Previous personality display name for shift line
 * @param {string|null} [props.ownerName] - When set, shows "{name}'s tasting personality" attribution above the name
 */
function PersonalityCard({ personalityId, templateVars = {}, previousPersonality = null, ownerName = null }) {
  const displayRef = useRef(null);
  const trackedIdRef = useRef(null);

  if (personalityId !== trackedIdRef.current) {
    trackedIdRef.current = personalityId;
    displayRef.current = personalityId
      ? getPersonalityDisplay(personalityId, templateVars)
      : null;
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

      {ownerLabel && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium block mb-1">
          {ownerLabel}
        </span>
      )}
      <strong className="text-sm font-semibold flex items-center gap-1.5">
        <span className="text-base leading-none" role="img" aria-hidden="true">{display.emoji}</span>
        {display.name}
      </strong>
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
