import { useState } from 'react';

/**
 * LandingPage Component
 * 
 * A view-only landing page component that displays three interactive UI elements:
 * 1. Event ID input field with Join button
 * 2. Create button
 * 3. Sign in button
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

  /**
   * Handle Sign in button click - provides visual feedback only, no functional behavior
   */
  const handleSignInClick = (e) => {
    e.preventDefault();
    // No functional action - visual feedback handled by CSS
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto w-full max-w-md">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 text-center text-foreground">
          Blind Tasting Events
        </h1>
        
        <div className="space-y-4 sm:space-y-6">
          {/* Event ID Input with Join Button - User Story 1 */}
          <div className="space-y-2">
            <label 
              htmlFor="event-id" 
              className="block text-sm font-medium text-foreground"
              aria-label="Event ID input label"
            >
              Event ID
            </label>
            <div className="flex flex-col xs:flex-row gap-2">
              <input
                id="event-id"
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Enter event ID"
                maxLength={1000}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                aria-label="Event ID input field"
                aria-describedby="event-id-description"
              />
              <button
                type="button"
                onClick={handleJoinClick}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px]"
                aria-label="Join event button"
              >
                Join
              </button>
            </div>
            <span id="event-id-description" className="sr-only">
              Enter an event ID to join an existing event
            </span>
          </div>

          {/* Create Button - User Story 2 */}
          <div>
            <button
              type="button"
              onClick={handleCreateClick}
              className="w-full px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-md hover:bg-primary/90 active:scale-95 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px]"
              aria-label="Create event button"
            >
              Create
            </button>
          </div>

          {/* Sign In Button - User Story 3 */}
          <div>
            <button
              type="button"
              onClick={handleSignInClick}
              className="w-full px-4 sm:px-6 py-2 text-sm sm:text-base bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 active:scale-95 transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px]"
              aria-label="Sign in button"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
