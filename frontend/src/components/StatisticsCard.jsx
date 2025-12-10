import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

/**
 * StatisticsCard Component
 * 
 * Displays a single statistic with title and value.
 * Handles null values by displaying "N/A" with optional tooltip.
 * 
 * @param {string} title - Title of the statistic
 * @param {number|null} value - Value to display (null shows "N/A")
 * @param {string} tooltipMessage - Optional tooltip message for "N/A" values
 */
function StatisticsCard({ title, value, tooltipMessage }) {
  const isNullValue = value === null || value === undefined;
  const displayValue = isNullValue ? 'N/A' : value;

  return (
    <Card className="h-full">
      <CardContent className="pt-6 pb-4">
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
          <CardTitle className="text-sm font-medium text-muted-foreground text-center">
            {title}
          </CardTitle>
        </div>
      </CardContent>
    </Card>
  );
}

export default StatisticsCard;
