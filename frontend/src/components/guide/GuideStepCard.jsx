import * as icons from 'lucide-react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Renders a single guide step.
 *
 * Timeline variant (when isCollapsible): numbered circle matching the
 * EventProgressStepper style, connector line, heading, collapsible description.
 *
 * Legacy variant (no onToggle): centred icon + text used by GuideDrawer.
 *
 * @param {object} props
 * @param {object} props.step - { id, heading, description, icon, position }
 * @param {boolean} [props.isExpanded]
 * @param {function} [props.onToggle]
 * @param {string} [props.visualState] - 'done' | 'now' | 'ahead'
 * @param {boolean} [props.isLastInPhase] - hides bottom connector line
 */
export default function GuideStepCard({ step, isExpanded, onToggle, visualState, isLastInPhase }) {
  const IconComponent = icons[step.icon] || icons.HelpCircle;
  const isCollapsible = typeof onToggle === 'function';
  const showDescription = isCollapsible ? isExpanded : true;

  // ── Legacy (non-timeline) layout for GuideDrawer ───────────────────
  if (!isCollapsible) {
    return (
      <div className="flex flex-col items-center px-6 py-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <IconComponent className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{step.heading}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>
      </div>
    );
  }

  // ── Timeline layout (matches EventProgressStepper circle style) ────

  const isDone = visualState === 'done';
  const isNow = visualState === 'now';

  // Circle: same h-7 w-7 border-2 pattern as EventProgressStepper
  const circleClasses = isDone
    ? 'bg-primary border-primary text-primary-foreground'
    : isNow
      ? 'border-primary bg-background ring-2 ring-primary/20'
      : 'border-muted bg-background text-muted-foreground';

  // Connector line
  const connectorClass = isDone
    ? 'bg-primary'
    : isNow
      ? 'bg-primary'
      : 'bg-muted';

  // Row opacity
  const rowOpacity = isDone
    ? 'opacity-55'
    : visualState === 'ahead'
      ? 'opacity-45'
      : '';

  return (
    <div
      className={`flex gap-3 ${rowOpacity}`}
      data-testid={`guide-step-${step.id}`}
    >
      {/* Timeline column */}
      <div className="flex flex-col items-center w-7 shrink-0">
        {/* Numbered circle */}
        <div
          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${circleClasses}`}
          aria-current={isNow ? 'step' : undefined}
        >
          {isDone ? (
            <Check className="h-4 w-4" />
          ) : (
            <span className={`text-xs font-semibold ${isNow ? 'text-primary' : ''}`}>
              {step.position}
            </span>
          )}
        </div>
        {/* Connector line */}
        {!isLastInPhase && (
          <div className={`flex-1 w-0.5 min-h-4 ${connectorClass}`} />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0 pb-2.5">
        <button
          type="button"
          className="flex w-full items-center gap-1 text-left cursor-pointer h-7"
          onClick={onToggle}
          aria-expanded={isExpanded}
          tabIndex={0}
        >
          <h3 className={`flex-1 text-sm ${
            isNow ? 'font-semibold text-foreground' : isDone ? 'font-medium text-foreground' : 'text-muted-foreground'
          }`}>
            {step.heading}
          </h3>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {showDescription && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground pr-2">
            {step.description}
          </p>
        )}
      </div>
    </div>
  );
}
