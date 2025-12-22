import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  Users, 
  Star, 
  FolderOpen,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import systemApi from '@/services/systemApi.js';

/**
 * SystemStats Component
 * 
 * Displays aggregate platform statistics for root administrators.
 * Shows total events, users, ratings, and event distribution by state.
 */
export default function SystemStats() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await systemApi.getStats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Stat card component
  const StatCard = ({ icon: Icon, label, value, className = '' }) => (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value ?? '-'}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // State breakdown card
  const StateBreakdown = ({ eventsByState }) => {
    const states = [
      { key: 'created', label: 'Created', icon: Clock, color: 'text-blue-500' },
      { key: 'started', label: 'Started', icon: PlayCircle, color: 'text-green-500' },
      { key: 'paused', label: 'Paused', icon: PauseCircle, color: 'text-yellow-500' },
      { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-gray-500' },
    ];

    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Events by State</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {states.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <div>
                  <p className="font-semibold">{eventsByState?.[key] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-6 w-12 bg-muted rounded"></div>
                  <div className="h-4 w-16 bg-muted rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="mb-8 border-destructive">
        <CardContent className="p-4 text-center">
          <p className="text-destructive text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mb-8">
      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={FolderOpen} 
          label="Total Events" 
          value={stats?.totalEvents} 
        />
        <StatCard 
          icon={Users} 
          label="Total Users" 
          value={stats?.totalUsers} 
        />
        <StatCard 
          icon={Star} 
          label="Total Ratings" 
          value={stats?.totalRatings} 
        />
        <StatCard 
          icon={Calendar} 
          label="Last 7 Days" 
          value={stats?.eventsLast7Days} 
        />
      </div>

      {/* State breakdown */}
      <StateBreakdown eventsByState={stats?.eventsByState} />
    </div>
  );
}
