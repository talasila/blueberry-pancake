import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MyProgressButton({ onClick, ratingProgression = 0, totalRatings = 0, showPersonalityBadge = false }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className="flex items-center gap-2 relative overflow-hidden"
    >
      {/* Full-height progress fill from left */}
      {totalRatings > 0 && (
        <div
          className="absolute inset-y-0 left-0 transition-all"
          style={{
            width: `${ratingProgression}%`,
            backgroundColor: 'var(--event-header-bg)'
          }}
          role="progressbar"
          aria-valuenow={ratingProgression}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${ratingProgression.toFixed(0)}% complete`}
        />
      )}
      <div className="relative z-10 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        <span>My Progress</span>
      </div>
      {showPersonalityBadge && (
        <span
          className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary z-20"
          data-testid="personality-badge"
          aria-label="New personality available"
        />
      )}
    </Button>
  );
}

export default MyProgressButton;
