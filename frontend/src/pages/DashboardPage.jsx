import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatisticsCard from '@/components/StatisticsCard';
import ItemRatingsTable from '@/components/ItemRatingsTable';
import UserRatingsTable from '@/components/UserRatingsTable';
import ItemDetailsDrawer from '@/components/ItemDetailsDrawer';
import UserDetailsDrawer from '@/components/UserDetailsDrawer';
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
  const navigate = useNavigate();
  const { event, isAdmin } = useEventContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openItemDetailsItemId, setOpenItemDetailsItemId] = useState(null);
  const [openUserDetailsEmail, setOpenUserDetailsEmail] = useState(null);
  const isHandlingPopStateRef = useRef(false); // Prevent infinite loops when handling popstate

  useEffect(() => {
    loadDashboardData();
  }, [eventId]);

  // Handle browser back/forward navigation (popstate) to sync drawer state
  useEffect(() => {
    const handlePopState = (event) => {
      if (isHandlingPopStateRef.current) return;
      
      isHandlingPopStateRef.current = true;
      
      // If history state has drawer info, open that drawer
      if (event.state?.drawer) {
        const { drawer, itemId, userEmail: stateUserEmail } = event.state;
        
        // Close all drawers first
        setOpenItemDetailsItemId(null);
        setOpenUserDetailsEmail(null);
        
        // Open the drawer from history state
        setTimeout(() => {
          if (drawer === 'item' && itemId) {
            setOpenItemDetailsItemId(itemId);
          } else if (drawer === 'user' && stateUserEmail) {
            setOpenUserDetailsEmail(stateUserEmail);
          }
          isHandlingPopStateRef.current = false;
        }, 10);
      } else {
        // No drawer in history state - close all drawers
        setOpenItemDetailsItemId(null);
        setOpenUserDetailsEmail(null);
        isHandlingPopStateRef.current = false;
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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

  // Calculate progress percentage for Total Ratings
  // Progress = (totalRatings / expectedRatings) * 100
  // Expected ratings = totalUsers * totalItems
  const calculateRatingsProgress = () => {
    const totalUsers = statistics?.totalUsers ?? 0;
    const totalItems = statistics?.totalItems ?? 0;
    const totalRatings = statistics?.totalRatings ?? 0;
    
    if (totalUsers === 0 || totalItems === 0) {
      return null; // Can't calculate progress if no users or items
    }
    
    const expectedRatings = totalUsers * totalItems;
    if (expectedRatings === 0) {
      return null;
    }
    
    const progress = (totalRatings / expectedRatings) * 100;
    return Math.max(0, Math.min(100, progress)); // Clamp between 0 and 100
  };

  const ratingsProgress = calculateRatingsProgress();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
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
      <div className="grid grid-cols-2 gap-4 py-4">
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
          progressPercentage={ratingsProgress}
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

      {/* Tabs and Ratings Tables */}
      <div className="mt-6">
        <Tabs defaultValue="bottles" className="w-full">
          <TabsList>
            <TabsTrigger value="bottles">{singular} Ratings</TabsTrigger>
            <TabsTrigger value="users">User Ratings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bottles">
            <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 border border-border rounded-md space-y-1">
              <div><strong>Progress:</strong> Percentage of users who have rated this item.</div>
              <div><strong>Avg.:</strong> Arithmetic mean of all ratings.</div>
              <div><strong>Wt. Avg.:</strong> Bayesian weighted average that accounts for items with fewer ratings.</div>
            </div>
            <ItemRatingsTable 
              itemSummaries={dashboardData?.itemSummaries || []}
              ratingConfiguration={dashboardData?.ratingConfiguration?.ratings || []}
              onRowClick={(itemId) => {
                // Allow admins to open drawer at any time, or anyone when event is completed
                if (event?.state === 'completed' || isAdmin) {
                  setOpenItemDetailsItemId(itemId);
                  // Add to history for browser back navigation
                  history.pushState({ drawer: 'item', itemId }, '', window.location.pathname);
                }
              }}
            />
          </TabsContent>
          
          <TabsContent value="users">
            <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 border border-border rounded-md space-y-1">
              <div><strong>Progress:</strong> Three charts showing number of {pluralLower} rated, rating distribution, and sparkline of all ratings.</div>
              <div><strong>Avg. Rating:</strong> Average rating across all {pluralLower} the user has rated.</div>
            </div>
            <UserRatingsTable 
              userSummaries={dashboardData?.userSummaries || []}
              ratingConfiguration={dashboardData?.ratingConfiguration?.ratings || []}
              onRowClick={(userEmail) => {
                setOpenUserDetailsEmail(userEmail);
                // Add to history for browser back navigation
                history.pushState({ drawer: 'user', userEmail }, '', window.location.pathname);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Item Details Drawer - render when event is completed OR for admins */}
      {(event?.state === 'completed' || isAdmin) && (
        <ItemDetailsDrawer
          isOpen={!!openItemDetailsItemId}
          onClose={() => {
            // Check if current history state has a drawer
            if (history.state?.drawer) {
              history.back();
            } else {
              setOpenItemDetailsItemId(null);
            }
          }}
          eventId={eventId}
          itemId={openItemDetailsItemId || 0}
          eventState={event?.state}
          isAdmin={isAdmin}
        />
      )}

      {/* User Details Drawer */}
      <UserDetailsDrawer
        isOpen={!!openUserDetailsEmail}
        onClose={() => {
          // Check if current history state has a drawer
          if (history.state?.drawer) {
            history.back();
          } else {
            setOpenUserDetailsEmail(null);
          }
        }}
        eventId={eventId}
        userEmail={openUserDetailsEmail}
        ratingConfig={dashboardData?.ratingConfiguration || null}
        availableItemIds={dashboardData?.itemSummaries?.map(item => item.itemId) || []}
      />
    </div>
  );
}

export default DashboardPage;
