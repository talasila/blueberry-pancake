import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StatisticsCard Component
 * 
 * Displays a single statistic with title and value.
 * Handles null values by displaying "N/A" with optional tooltip.
 * Supports optional progress fill background (left to right).
 * 
 * @param {string} title - Title of the statistic
 * @param {number|null} value - Value to display (null shows "N/A")
 * @param {string} tooltipMessage - Optional tooltip message for "N/A" values
 * @param {number} progressPercentage - Optional progress percentage (0-100) for fill background
 * @param {function} onClick - Optional click handler for interactive cards
 * @param {string} subtitle - Optional subtitle text shown below the value in muted style
 */
function StatisticsCard({ title, value, tooltipMessage, progressPercentage, onClick, subtitle }) {
  const isNullValue = value === null || value === undefined;
  const displayValue = isNullValue ? 'N/A' : value;
  
  // Clamp progress percentage between 0 and 100
  const clampedProgress = progressPercentage !== undefined && progressPercentage !== null
    ? Math.max(0, Math.min(100, progressPercentage))
    : null;

  const isClickable = !!onClick;

  return (
    <Card 
      className={cn(
        "h-full relative overflow-hidden",
        isClickable && "cursor-pointer hover:bg-accent/50 transition-colors"
      )}
      onClick={onClick}
    >
      {/* Progress fill background - fills from left to right */}
      {clampedProgress !== null && (
        <div
          className="absolute inset-0 bg-primary/10 dark:bg-primary/20 transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
          aria-label={`${clampedProgress.toFixed(0)}% progress`}
        />
      )}
      {/* Vertical lines at 25%, 50%, 75% */}
      {clampedProgress !== null && (
        <>
          <div className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: '25%' }} />
          <div className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: '50%' }} />
          <div className="absolute top-0 bottom-0 w-px bg-border/30" style={{ left: '75%' }} />
        </>
      )}
      <CardContent className="pt-6 pb-4 relative z-10">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <div className="text-4xl font-bold tracking-tight">
              {displayValue}
            </div>
            {isNullValue && tooltipMessage && (
              <div className="group relative">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border whitespace-nowrap">
                    {tooltipMessage}
                  </div>
                </div>
              </div>
            )}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
          <CardTitle className="text-sm font-medium text-muted-foreground text-center">
            {title}
          </CardTitle>
        </div>
      </CardContent>
    </Card>
  );
}

export default StatisticsCard;
