import { HelpCircle } from 'lucide-react';

/**
 * Floating action button that opens the hosting guide.
 * Fixed bottom-right, 48×48 touch target, z-30, hidden when guide is open.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the guide drawer is currently open
 * @param {function} props.onOpen - Callback to open the guide drawer
 */
export default function GuideButton({ isOpen, onOpen }) {
  if (isOpen) return null;

  return (
    <button
      data-testid="guide-button"
      onClick={onOpen}
      aria-label="Open hosting guide"
      className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
    >
      <HelpCircle className="h-6 w-6" />
    </button>
  );
}
