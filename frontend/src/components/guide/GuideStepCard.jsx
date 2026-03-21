import * as icons from 'lucide-react';
import { ChevronDown } from 'lucide-react';

/**
 * Renders a single guide step: icon, heading, and short description.
 * Supports optional expand/collapse and step-type indicator.
 *
 * Backward-compatible: when isExpanded / onToggle are not provided,
 * renders fully expanded with no toggle (existing GuideDrawer behavior).
 *
 * @param {object} props
 * @param {object} props.step - { id, heading, description, icon, stepType? }
 * @param {boolean} [props.isExpanded] - Whether the description is visible
 * @param {function} [props.onToggle] - Called when the step heading is tapped
 * @param {string} [props.stepType] - 'real-world' | 'in-app' (renders a badge)
 * @param {string} [props.visualState] - 'done' | 'now' | 'ahead' (affects styling)
 */
export default function GuideStepCard({ step, isExpanded, onToggle, stepType, visualState }) {
  const IconComponent = icons[step.icon] || icons.HelpCircle;
  const isCollapsible = typeof onToggle === 'function';
  const showDescription = isCollapsible ? isExpanded : true;
  const type = stepType || step.stepType;

  const stateClasses = {
    done: 'opacity-60',
    now: 'bg-primary/5 ring-1 ring-primary/20',
    ahead: 'opacity-40',
  };

  const iconBgClasses = {
    done: 'bg-muted',
    now: 'bg-primary/10',
    ahead: 'bg-muted/50',
  };

  return (
    <div
      className={`rounded-lg px-4 py-3 transition-all ${stateClasses[visualState] || ''}`}
      data-testid={`guide-step-${step.id}`}
    >
      <button
        type="button"
        className={`flex w-full items-center gap-3 text-left ${isCollapsible ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={isCollapsible ? onToggle : undefined}
        aria-expanded={isCollapsible ? isExpanded : undefined}
        tabIndex={isCollapsible ? 0 : -1}
      >
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBgClasses[visualState] || 'bg-primary/10'}`}>
          {visualState === 'done' ? (
            <icons.Check className="h-5 w-5 text-muted-foreground" />
          ) : (
            <IconComponent className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="flex flex-1 items-center gap-2">
          <h3 className="text-sm font-semibold">{step.heading}</h3>
          {type && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${
              type === 'in-app'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
            }`}>
              {type === 'in-app' ? 'In App' : 'Real World'}
            </span>
          )}
        </div>

        {isCollapsible && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {showDescription && (
        <div className={`mt-2 ${isCollapsible ? 'pl-[52px]' : 'px-6 py-4 text-center'}`}>
          <p className={`text-sm leading-relaxed text-muted-foreground ${!isCollapsible ? '' : ''}`}>
            {step.description}
          </p>
        </div>
      )}
    </div>
  );
}
