import * as icons from 'lucide-react';

/**
 * Renders a single guide step: icon, heading, and short description.
 * Centred layout designed to fit inside the bottom sheet at 320px without scrolling.
 *
 * @param {object} props
 * @param {object} props.step - { id, heading, description, icon }
 */
export default function GuideStepCard({ step }) {
  const IconComponent = icons[step.icon] || icons.HelpCircle;

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
