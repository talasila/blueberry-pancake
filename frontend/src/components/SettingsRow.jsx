import { ChevronRight } from 'lucide-react';

/**
 * A tappable row for the Settings page that opens a drawer.
 * Renders icon, label, optional badge/extra content, and a chevron.
 *
 * @param {object}  props
 * @param {React.ReactNode} props.icon - Lucide icon element
 * @param {string}  props.label - Row label text
 * @param {React.ReactNode} [props.badge] - Optional content rendered after the label
 * @param {Function} props.onClick - Click handler
 * @param {string}  [props.variant] - 'destructive' for Danger Zone styling
 * @param {string}  [props.className] - Extra classes on the outer button
 */
export default function SettingsRow({ icon, label, badge, onClick, variant, className = '' }) {
  const isDestructive = variant === 'destructive';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between py-4 border-b hover:bg-muted/50 transition-colors text-left ${className}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={isDestructive ? 'text-destructive' : undefined}>{icon}</span>
        <span className={`font-medium ${isDestructive ? 'text-destructive' : ''}`}>{label}</span>
        {badge}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
