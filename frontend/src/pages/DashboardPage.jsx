import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatisticsCard from '@/components/StatisticsCard';
import ItemRatingsTable from '@/components/ItemRatingsTable';
import dashboardService from '@/services/dashboardService';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * DashboardPage Component
 * 
 * Displays event statistics and item rating details.
 * Features:
 * - Summary statistics (Total Users, Total Items, Total Ratings, Average Ratings per Item)
 * - Item ratings table with sortable columns
 * - Loading and error states
 */
function DashboardPage() {
  const { eventId } = useParams();
  const { event } = useEventContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [eventId]);

  const loadDashboardData = async (showLoading = true) => {
    if (!eventId) {
      setError('Event ID is required');
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await dashboardService.getDashboardData(eventId);
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      
      // Handle specific error cases
      if (err.message?.includes('403') || err.message?.includes('Access denied')) {
        // Redirect handled by DashboardRoute, but show error message
        setError('Access denied. Dashboard is only available when the event is completed.');
      } else if (err.message?.includes('404') || err.message?.includes('not found')) {
        setError('Event not found');
      } else {
        setError(err.message || 'Failed to load dashboard data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadDashboardData(false); // Don't show full loading state on refresh
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => loadDashboardData(true)}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // No data state
  if (!dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Render dashboard content
  const { statistics } = dashboardData;
  const isRefreshing = isLoading && dashboardData; // Refreshing if loading but data exists

  // Get item terminology based on event type
  const { singular, plural, pluralLower } = useItemTerminology(event);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with title and refresh button */}
      <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold">Dashboard</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Statistics - 2 columns grid (always 2 columns) */}
      <div className="grid grid-cols-2 gap-4">
        <StatisticsCard
          title="Total Users"
          value={statistics?.totalUsers ?? null}
        />
        <StatisticsCard
          title={`Total ${plural}`}
          value={statistics?.totalItems ?? null}
        />
        <StatisticsCard
          title="Total Ratings"
          value={statistics?.totalRatings ?? null}
        />
        <StatisticsCard
          title={`Average Ratings per ${singular}`}
          value={statistics?.averageRatingsPerItem ?? null}
          tooltipMessage={statistics?.totalItems === 0 ? `No ${pluralLower} configured` : undefined}
        />
      </div>

      {/* Error message overlay (if error occurred but data exists) */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Item Ratings Table */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">{singular} Ratings</h2>
        <div className="text-sm text-muted-foreground mb-4 space-y-1">
          <div><strong>Progress:</strong> Percentage of users who have rated this item.</div>
          <div><strong>Avg.:</strong> Arithmetic mean of all ratings.</div>
          <div><strong>Wt. Avg.:</strong> Bayesian weighted average that accounts for items with fewer ratings.</div>
        </div>
        <ItemRatingsTable 
          itemSummaries={dashboardData?.itemSummaries || []}
          ratingConfiguration={dashboardData?.ratingConfiguration?.ratings || []}
        />
      </div>
    </div>
  );
}

export default DashboardPage;
