import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EyeOff, Star, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Message from '@/components/Message';
import { clearSuccessMessage } from '@/utils/helpers';
import apiClient from '@/services/apiClient';
import useDarkMode from '@/hooks/useDarkMode';

/**
 * Progress ring constants — matches ItemButton sizing for visual consistency.
 */
const CIRCLE_SIZE = 60;
const RING_INSET = 4;
const STROKE_WIDTH = 2;
const RADIUS = (CIRCLE_SIZE / 2) - RING_INSET;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Three-step visual strip data — icons, labels, default rating colors, and
 * decorative progress values that tell the tasting story.
 */
const STEPS = [
  {
    icon: EyeOff,
    label: 'Cover',
    color: '#FF3B30',
    progress: 0.25,
  },
  {
    icon: Star,
    label: 'Taste',
    color: '#FFCC00',
    progress: 0.65,
  },
  {
    icon: Trophy,
    label: 'Reveal',
    color: '#34C759',
    progress: 1.0,
  },
];

/**
 * LandingPage Component
 *
 * Warm, inviting home page with a gradient hero section, three-step visual strip
 * (styled with rating colors and progress rings), host-focused CTAs, and a
 * demoted event-code input.
 */
function LandingPage() {
  const [eventId, setEventId] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useDarkMode();
  const codeInputRef = useRef(null);

  // Display success message from navigation state
  useEffect(() => {
    if (location.state?.message && location.state?.messageType === 'success') {
      setSuccessMessage(location.state.message);
      clearSuccessMessage(setSuccessMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-focus event code input when revealed
  useEffect(() => {
    if (showCodeInput) {
      codeInputRef.current?.focus();
    }
  }, [showCodeInput]);

  const handleCreateClick = (e) => {
    e.preventDefault();
    if (apiClient.isAuthenticated()) {
      navigate('/create-event');
    } else {
      navigate('/auth', { state: { from: { pathname: '/create-event' } } });
    }
  };

  const handleMyEventsClick = (e) => {
    e.preventDefault();
    if (apiClient.isAuthenticated()) {
      navigate('/my-events');
    } else {
      navigate('/auth', { state: { from: { pathname: '/my-events' } } });
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (eventId && eventId.trim().length > 0) {
      navigate(`/event/${eventId.trim().toUpperCase()}`);
    }
  };

  const gradientColor = isDark
    ? 'oklch(0.20 0.04 350)'
    : 'oklch(0.95 0.03 350)';

  const ctaBg = isDark
    ? 'oklch(0.65 0.15 15)'
    : 'oklch(0.45 0.15 15)';

  return (
    <div className="w-full">
      {/* Gradient wash — full-width, bleeds under header shadow */}
      <div
        className="w-full"
        style={{
          background: `radial-gradient(ellipse at top center, ${gradientColor}, transparent 65%)`,
        }}
      >
        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-6 pb-4 sm:pt-8 sm:pb-5">
          <div className="w-full max-w-md text-center">
            {/* Success Message — above hero per FR-012 */}
            {successMessage && (
              <div className="mb-4">
                <Message type="success">{successMessage}</Message>
              </div>
            )}

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Blind tastings, scored together.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Host a tasting party, rate the mystery bottles, and see who has the best palate.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Three-step visual strip with rating colors and progress rings */}
          <div className="flex items-start justify-around mb-6 sm:mb-8 mt-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const dashOffset = CIRCUMFERENCE * (1 - step.progress);
              return (
                <div key={step.label} className="flex flex-col items-center gap-2">
                  <div className="relative" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
                    {/* Colored circle */}
                    <div
                      className="absolute inset-0 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: step.color }}
                    >
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                    {/* Progress ring overlay */}
                    <svg
                      width={CIRCLE_SIZE}
                      height={CIRCLE_SIZE}
                      className="absolute inset-0 -rotate-90 pointer-events-none"
                      aria-hidden="true"
                    >
                      {/* Track ring */}
                      <circle
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        strokeWidth={STROKE_WIDTH}
                        style={{ stroke: step.color }}
                      />
                      {/* Progress arc */}
                      <circle
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        style={{ stroke: `color-mix(in srgb, ${step.color} 40%, white)` }}
                      />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            {/* Primary CTA — Host a Tasting */}
            <Button
              className="w-full"
              onClick={handleCreateClick}
              aria-label="Host a Tasting"
              style={{ backgroundColor: ctaBg, color: 'white' }}
            >
              Host a Tasting
            </Button>

            {/* Secondary CTA — My Events */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleMyEventsClick}
              aria-label="My Events"
            >
              My Events
            </Button>
          </div>

          {/* Demoted event code join */}
          <div className="mt-6 text-center">
            {!showCodeInput ? (
              <button
                type="button"
                onClick={() => setShowCodeInput(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Have an event code?
              </button>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-2">Enter your event code</p>
                <form onSubmit={handleCodeSubmit} className="flex gap-2">
                  <Input
                    ref={codeInputRef}
                    type="text"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    placeholder="e.g. ABCD1234"
                    autoComplete="off"
                    className="flex-1 h-9 text-center font-mono tracking-wider uppercase"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-4"
                    disabled={!eventId || eventId.trim().length === 0}
                  >
                    Go
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
