import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, List } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Message from '@/components/Message';
import { clearSuccessMessage } from '@/utils/helpers';
import apiClient from '@/services/apiClient';

/**
 * LandingPage Component
 * 
 * Landing page with a Join card (event ID input + button) and
 * lightweight icon links for Create an Event and My Events.
 * 
 * @returns {JSX.Element} The landing page component
 */
function LandingPage() {
  // State for event ID input field (controlled input)
  const [eventId, setEventId] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState('');

  // Display success message from navigation state
  useEffect(() => {
    if (location.state?.message && location.state?.messageType === 'success') {
      setSuccessMessage(location.state.message);
      clearSuccessMessage(setSuccessMessage);
      // Clear location state to prevent message from showing again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  /**
   * Handle Join button click or form submission
   * Navigates to event page, which will redirect to email entry if not authenticated
   */
  const handleJoinClick = (e) => {
    e.preventDefault();
    // Only navigate if eventId has a value
    if (eventId && eventId.length > 0) {
      navigate(`/event/${eventId.trim().toUpperCase()}`);
    }
  };

  /**
   * Handle Create button click
   * Navigates directly to create-event if already authenticated,
   * otherwise goes through the auth flow first
   */
  const handleCreateClick = (e) => {
    e.preventDefault();
    if (apiClient.isAuthenticated()) {
      navigate('/create-event');
    } else {
      navigate('/auth', { state: { from: { pathname: '/create-event' } } });
    }
  };

  const handleMyEventsClick = (e) => {
    e.preventDefault();
    if (apiClient.isAuthenticated()) {
      navigate('/my-events');
    } else {
      navigate('/auth', { state: { from: { pathname: '/my-events' } } });
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full max-w-md">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4">
              <Message type="success">{successMessage}</Message>
            </div>
          )}

          {/* Intro Text */}
          <div className="text-left mb-6 sm:mb-8">
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Organize and participate in blind tasting events. Join an event to compare notes with others, or create your own event to curate a tasting experience.
            </p>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Join an Event Card - User Story 1 */}
            <Card>
              <CardHeader>
                <CardTitle>Join an event</CardTitle>
                <CardDescription>
                  Enter an event ID to join an existing event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinClick}>
                  <Input
                    id="event-id"
                    type="text"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    placeholder="Enter event ID"
                    maxLength={1000}
                    autoComplete="off"
                  />
                </form>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  onClick={handleJoinClick}
                  className="w-full"
                  aria-label="Join event button"
                  disabled={!eventId || eventId.length === 0}
                >
                  Join
                </Button>
              </CardFooter>
            </Card>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateClick}
                aria-label="Create an event"
              >
                <PlusCircle />
                Create an Event
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMyEventsClick}
                aria-label="My events"
              >
                <List />
                My Events
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
