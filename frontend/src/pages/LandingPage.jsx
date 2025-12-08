import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * LandingPage Component
 * 
 * A view-only landing page component that displays:
 * 1. Join an event card with event ID input and Join button
 * 2. Create an event card with Create button
 * 
 * Note: The header is now handled by the App component and is reusable across all pages.
 * 
 * All buttons provide visual feedback but no functional behavior (no navigation,
 * API calls, or state changes beyond visual feedback).
 * 
 * @returns {JSX.Element} The landing page component
 */
function LandingPage() {
  // State for event ID input field (controlled input)
  const [eventId, setEventId] = useState('');

  /**
   * Handle Join button click - provides visual feedback only, no functional behavior
   */
  const handleJoinClick = (e) => {
    e.preventDefault();
    // No functional action - visual feedback handled by CSS
  };

  /**
   * Handle Create button click - provides visual feedback only, no functional behavior
   */
  const handleCreateClick = (e) => {
    e.preventDefault();
    // No functional action - visual feedback handled by CSS
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full max-w-md">
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
                <Input
                  id="event-id"
                  type="text"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="Enter event ID"
                  maxLength={1000}
                />
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  onClick={handleJoinClick}
                  className="w-full"
                  aria-label="Join event button"
                >
                  Join
                </Button>
              </CardFooter>
            </Card>

            {/* Create an Event Card - User Story 2 */}
            <Card>
              <CardHeader>
                <CardTitle>Create an event</CardTitle>
                <CardDescription>
                  Start a new blind tasting event
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  type="button"
                  onClick={handleCreateClick}
                  className="w-full"
                  aria-label="Create event button"
                >
                  Create
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
