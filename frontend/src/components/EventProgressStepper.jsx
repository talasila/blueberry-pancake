import { useState } from 'react';
import { Check, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PHASE_ORDER, getStateConfig, getValidTransitions } from '@/utils/eventState.jsx';
import { useItemTerminology } from '@/utils/itemTerminology';

function interpolate(template, terminology) {
  return template
    .replace('{plural}', terminology.pluralLower)
    .replace('{singular}', terminology.singularLower)
    .replace('{Plural}', terminology.plural)
    .replace('{Singular}', terminology.singular);
}

function StepperSkeleton() {
  return (
    <div className="py-2 animate-pulse" aria-label="Loading event progress">
      <div className="flex items-center justify-between mb-3">
        {PHASE_ORDER.map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="h-7 w-7 rounded-full bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-4 w-3/4 mx-auto rounded bg-muted mt-2" />
    </div>
  );
}

function GuardrailNote({ event, terminology }) {
  if (event.state !== 'created') return null;

  const registered = event.items?.length || 0;
  const totalSlots = event.itemConfiguration?.numberOfItems ?? 0;
  const excludedCount = event.itemConfiguration?.excludedItemIds?.length ?? 0;
  const slots = Math.max(0, totalSlots - excludedCount);

  if (slots === 0 || registered === slots) return null;

  const itemWord = terminology.pluralLower;

  if (registered === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>No {itemWord} registered yet — you can still start, {itemWord} can be registered later.</span>
      </div>
    );
  }

  if (registered > slots) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{registered} {itemWord} registered but only {slots} slots available — adjust your item count in Items settings.</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{registered} {itemWord} registered, {slots} slots available — you can still start, {itemWord} can be registered later.</span>
    </div>
  );
}

export default function EventProgressStepper({ event, isTransitioning, onTransition }) {
  const [confirmTransition, setConfirmTransition] = useState(null);
  const terminology = useItemTerminology(event);

  if (!event) return <StepperSkeleton />;

  const currentIndex = PHASE_ORDER.indexOf(event.state);
  const transitions = getValidTransitions(event.state);

  const handleTransitionClick = (transition) => {
    if (transition.requiresConfirmation) {
      setConfirmTransition(transition);
    } else {
      onTransition(transition.targetState);
    }
  };

  const handleConfirm = () => {
    if (confirmTransition) {
      onTransition(confirmTransition.targetState);
      setConfirmTransition(null);
    }
  };

  const contextSentence = interpolate(
    getStateConfig(event.state).contextSentence,
    terminology
  );

  return (
    <div className="py-2 space-y-3">
      {/* Stepper phases */}
      <div className="flex items-start justify-between" role="list" aria-label="Event progress">
        {PHASE_ORDER.map((phase, i) => {
          const config = getStateConfig(phase);
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;

          return (
            <div key={phase} className="flex flex-col items-center flex-1 relative" role="listitem">
              {/* Connector line before this step */}
              {i > 0 && (
                <div
                  className={`absolute top-3.5 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                    i <= currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Circle */}
              <div
                className={`relative z-10 flex items-center justify-center h-7 w-7 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isActive
                      ? 'border-primary bg-background ring-2 ring-primary/20'
                      : 'border-muted bg-background text-muted-foreground'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className={`text-xs font-semibold ${isActive ? 'text-primary' : ''}`}>
                    {i + 1}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs mt-1.5 text-center leading-tight ${
                  isActive
                    ? 'font-semibold text-foreground'
                    : isCompleted
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Context sentence */}
      <p className="text-sm text-muted-foreground text-center">{contextSentence}</p>

      {/* Guardrail note */}
      <GuardrailNote event={event} terminology={terminology} />

      {/* Action buttons */}
      {transitions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {transitions.map((t) => (
            <Button
              key={t.targetState}
              variant={t.isPrimary ? 'default' : 'outline'}
              size="sm"
              disabled={isTransitioning}
              onClick={() => handleTransitionClick(t)}
            >
              {isTransitioning && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {/* Confirmation dialog for backward transitions */}
      <AlertDialog open={!!confirmTransition} onOpenChange={(open) => !open && setConfirmTransition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTransition?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the event state. Guests may be affected by this change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmTransition?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
