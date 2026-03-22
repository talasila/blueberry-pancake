import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw, ArrowLeft, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatisticsCard from '@/components/StatisticsCard';
import PersonalitySummaryStrip from '@/components/PersonalitySummaryStrip';
import ItemRatingsTable from '@/components/ItemRatingsTable';
import UserRatingsTable from '@/components/UserRatingsTable';
import ItemDetailsDrawer from '@/components/ItemDetailsDrawer';
import UserDetailsDrawer from '@/components/UserDetailsDrawer';
import apiClient from '@/services/apiClient';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * DashboardPage Component
 * 
 * Displays event statistics and item rating details.
 * Summary tab layout:
 * - Top-Rated Bottle hero card (full-width, accent background)
 * - People + Bottles stat cards (half-width, color-accented)
 * - Ratings progress bar (full-width, actual/expected)
 * - Avg Rating + Most Divisive cards (half-width, color-accented)
 * - Personality summary strip (full-width, conditional)
 */
function DashboardPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event, isAdmin } = useEventContext();
  const { singular, singularLower, plural, pluralLower } = useItemTerminology(event);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openItemDetailsItemId, setOpenItemDetailsItemId] = useState(null);
  const [openUserDetailsUserId, setOpenUserDetailsUserId] = useState(null);

  const loadDashboardData = useCallback(async (showLoading = true) => {
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
      const data = await apiClient.get(`/events/${eventId}/dashboard`);
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
  }, [eventId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle browser back/forward navigation (popstate) — always close all drawers
  useEffect(() => {
    const handlePopState = () => {
      setOpenItemDetailsItemId(null);
      setOpenUserDetailsUserId(null);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const maxRating = dashboardData.ratingConfiguration?.maxRating || 4;

  const ratingsProgress = (() => {
    const totalUsers = statistics?.totalUsers ?? 0;
    const totalItems = statistics?.totalItems ?? 0;
    const actual = statistics?.totalRatings ?? 0;
    const expected = totalUsers * totalItems;

    if (expected === 0) return { actual, expected, percentage: null, remaining: 0 };

    const percentage = Math.max(0, Math.min(100, (actual / expected) * 100));
    return { actual, expected, percentage, remaining: expected - actual };
  })();

  const topRatedItem = (() => {
    const rated = (dashboardData.itemSummaries || []).filter(i => i.numberOfRaters > 0);
    if (rated.length === 0) return null;
    return rated.sort((a, b) => b.weightedAverage - a.weightedAverage || a.itemId - b.itemId)[0];
  })();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      {/* Header with back button, title, and refresh */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/event/${eventId}`)}
            className="flex items-center justify-center h-8 w-8 -ml-1 rounded-md hover:bg-accent transition-colors touch-manipulation"
            aria-label="Back to event"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error message (if error occurred but data exists) */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="w-full justify-center">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="items">{plural}</TabsTrigger>
          <TabsTrigger value="users">People</TabsTrigger>
        </TabsList>
        
        {/* Tab 1: Summary - Narrative highlight reel */}
        <TabsContent value="summary">
          <div className="flex flex-col gap-4 py-4">
            {/* Hero: Top-Rated Bottle */}
            <Card
              className={`bg-primary/5 dark:bg-primary/10 ${topRatedItem && (event?.state === 'completed' || isAdmin) ? 'cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors' : ''}`}
              onClick={() => {
                if (topRatedItem && (event?.state === 'completed' || isAdmin)) {
                  setOpenItemDetailsItemId(topRatedItem.itemId);
                  history.pushState({ drawer: 'item', itemId: topRatedItem.itemId }, '', window.location.pathname);
                }
              }}
            >
              <CardContent className="pt-6 pb-4">
                {topRatedItem ? (
                  <div className="flex flex-col items-center gap-1">
                    <Trophy className="h-6 w-6 text-primary mb-1" />
                    <div className="text-2xl font-bold tracking-tight">{singular} #{topRatedItem.itemId}</div>
                    <div className="text-lg font-semibold text-primary">{topRatedItem.averageRating.toFixed(1)} / {maxRating}</div>
                    <p className="text-xs text-muted-foreground">Top Rated</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Trophy className="h-6 w-6 text-muted-foreground/40 mb-1" />
                    <p className="text-sm text-muted-foreground">No ratings yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Row: People + Bottles */}
            <div className="grid grid-cols-2 gap-4">
              <StatisticsCard
                title="People"
                value={statistics?.totalUsers ?? null}
                accentColor="border-l-4 border-l-[var(--chart-2)] bg-[var(--chart-2)]/5"
              />
              <StatisticsCard
                title={plural}
                value={statistics?.totalItems ?? null}
                accentColor="border-l-4 border-l-[var(--chart-4)] bg-[var(--chart-4)]/5"
              />
            </div>

            {/* Full-width: Ratings Progress (slim) */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Ratings</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {ratingsProgress.expected > 0 ? `${ratingsProgress.actual} / ${ratingsProgress.expected}` : '0'}
                  </span>
                </div>
                <Progress value={ratingsProgress.percentage ?? 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {ratingsProgress.expected === 0
                    ? 'No ratings possible yet'
                    : ratingsProgress.percentage >= 100
                      ? '100% complete'
                      : `${Math.round(ratingsProgress.percentage)}% complete · ${ratingsProgress.remaining} to go`}
                </p>
              </CardContent>
            </Card>

            {/* Row: Avg Rating + Most Divisive */}
            <div className="grid grid-cols-2 gap-4">
              <StatisticsCard
                title="Avg Rating"
                value={dashboardData.globalAverage != null ? dashboardData.globalAverage.toFixed(1) : null}
                accentColor="border-l-4 border-l-[var(--chart-1)] bg-[var(--chart-1)]/5"
              />
              {dashboardData.mostControversial && (
                <StatisticsCard
                  title="Most Divisive"
                  value={`#${dashboardData.mostControversial.itemId}`}
                  accentColor="border-l-4 border-l-[var(--chart-5)] bg-[var(--chart-5)]/5"
                  onClick={() => {
                    if (event?.state === 'completed' || isAdmin) {
                      setOpenItemDetailsItemId(dashboardData.mostControversial.itemId);
                      history.pushState(
                        { drawer: 'item', itemId: dashboardData.mostControversial.itemId },
                        '',
                        window.location.pathname
                      );
                    }
                  }}
                />
              )}
            </div>

            {/* Personality Summary Strip */}
            {dashboardData?.ratingConfiguration?.personalityEnabled !== false && (
              <PersonalitySummaryStrip
                userSummaries={dashboardData.userSummaries}
                itemTerms={{ singular: singularLower, plural: pluralLower }}
              />
            )}
          </div>
        </TabsContent>
        
        {/* Tab 2: Item Ratings */}
        <TabsContent value="items">
          <p className="text-[10px] text-muted-foreground mb-2 px-1 leading-relaxed">
            {plural} are ranked by weighted average (<strong>Wt</strong>), which adjusts scores for {pluralLower} with fewer ratings — giving a fairer ranking than a simple average (<strong>Avg</strong>). The top bar shows rating progress; the color bar shows the distribution of ratings. Tap any {singularLower} for details.
          </p>
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
        
        {/* Tab 3: User Ratings */}
        <TabsContent value="users">
          <UserRatingsTable
            userSummaries={dashboardData?.userSummaries || []}
            ratingConfiguration={dashboardData?.ratingConfiguration?.ratings || []}
            personalityEnabled={dashboardData?.ratingConfiguration?.personalityEnabled !== false}
            onRowClick={(userId) => {
              setOpenUserDetailsUserId(userId);
              // Add to history for browser back navigation
              history.pushState({ drawer: 'user', userId }, '', window.location.pathname);
            }}
          />
        </TabsContent>
      </Tabs>

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
        isOpen={!!openUserDetailsUserId}
        onClose={() => {
          // Check if current history state has a drawer
          if (history.state?.drawer) {
            history.back();
          } else {
            setOpenUserDetailsUserId(null);
          }
        }}
        eventId={eventId}
        userId={openUserDetailsUserId}
        ratingConfig={dashboardData?.ratingConfiguration || null}
        availableItemIds={dashboardData?.itemSummaries?.map(item => item.itemId) || []}
      />
    </div>
  );
}

export default DashboardPage;
