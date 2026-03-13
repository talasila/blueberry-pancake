import { cn } from '@/lib/utils';

/**
 * ListCard Component
 *
 * A lightweight card for list items in drawers and tables.
 * Supports an optional left-side "handle" strip (e.g., rank number, item ID).
 * When no handle is present, a left accent border provides visual anchoring.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} [props.handle] - Optional content for the left handle strip
 * @param {string} [props.className] - Additional classes for the outer container
 * @param {string} [props.as='div'] - Element type ('div' or 'button')
 */
function ListCard({ children, handle, className, as: Element = 'div', ...props }) {
  return (
    <Element
      className={cn(
        'flex items-stretch rounded-lg bg-muted/40 overflow-hidden',
        !handle && 'border-l-2 border-l-muted-foreground/20',
        className
      )}
      {...props}
    >
      {handle && (
        <span className="w-8 flex-shrink-0 flex items-center justify-center bg-muted-foreground/20 text-xs font-bold text-muted-foreground">
          {handle}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </Element>
  );
}

export default ListCard;
