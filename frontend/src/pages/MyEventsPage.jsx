import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, Calendar } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { StateBadge } from '@/utils/eventState.jsx';

function MyEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getMyEvents();
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || 'Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const formatDate = (isoString) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">My Events</h1>
            <p className="text-muted-foreground mt-1">
              Events you've created or administer
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <p className="text-sm text-destructive" role="alert">{error}</p>
                  <Button variant="outline" onClick={fetchEvents}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && events.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    You haven't created any events yet.
                  </p>
                  <Button onClick={() => navigate('/create-event')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create an Event
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="space-y-3">
              {events.map((event) => (
                <Link
                  key={event.eventId}
                  to={`/event/${event.eventId}/admin`}
                  className="block"
                >
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">{event.name}</CardTitle>
                        <StateBadge state={event.state} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono">{event.eventId}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyEventsPage;
