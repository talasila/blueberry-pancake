import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/services/apiClient';

/**
 * CreateEventPage Component
 * 
 * Allows authenticated users to create new events.
 * Form includes event name and type of item (wine).
 * Displays success popup with event ID after creation.
 */
function CreateEventPage() {
  const [name, setName] = useState('');
  const [typeOfItem, setTypeOfItem] = useState('wine');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successEvent, setSuccessEvent] = useState(null);
  const [nameError, setNameError] = useState('');

  /**
   * Validate event name on blur
   */
  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Event name is required');
    } else if (trimmed.length > 100) {
      setNameError('Event name must be 100 characters or less');
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      setNameError('Event name can only contain letters, numbers, spaces, hyphens, and underscores');
    } else {
      setNameError('');
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    // Clear previous errors
    setError('');
    setNameError('');

    // Client-side validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Event name is required');
      return;
    }

    if (trimmedName.length > 100) {
      setNameError('Event name must be 100 characters or less');
      return;
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
      setNameError('Event name can only contain letters, numbers, spaces, hyphens, and underscores');
      return;
    }

    if (!typeOfItem) {
      setError('Please select a type of item');
      return;
    }

    setIsSubmitting(true);

    try {
      const event = await apiClient.createEvent({
        name: trimmedName,
        typeOfItem
      });
      
      setSuccessEvent(event);
      // Reset form
      setName('');
      setTypeOfItem('wine');
    } catch (err) {
      setError(err.message || 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Close success popup
   */
  const handleCloseSuccess = () => {
    setSuccessEvent(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Create Event</CardTitle>
              <CardDescription>
                Create a new blind tasting event
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Event Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="event-name">Event Name</Label>
                  <Input
                    id="event-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      // Clear error when user starts typing
                      if (nameError) {
                        setNameError('');
                      }
                    }}
                    onBlur={handleNameBlur}
                    placeholder="Enter event name"
                    maxLength={100}
                    disabled={isSubmitting}
                    aria-invalid={!!nameError}
                    aria-describedby={nameError ? 'name-error' : undefined}
                    aria-required="true"
                    required
                  />
                  {nameError && (
                    <p id="name-error" className="text-sm text-destructive" role="alert">
                      {nameError}
                    </p>
                  )}
                </div>

                {/* Type of Item Field */}
                <div className="space-y-2">
                  <Label htmlFor="type-of-item">Type of Item</Label>
                  <select
                    id="type-of-item"
                    value={typeOfItem}
                    onChange={(e) => setTypeOfItem(e.target.value)}
                    disabled={isSubmitting}
                    aria-required="true"
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  >
                    <option value="wine">Wine</option>
                  </select>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-destructive" role="alert">
                    {error}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  aria-label="Create event button"
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Success Popup */}
          {successEvent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Event Created Successfully!</CardTitle>
                  <CardDescription>
                    Your event has been created
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Event ID:</p>
                    <p className="text-2xl font-mono font-bold text-center p-4 bg-muted rounded-md">
                      {successEvent.eventId}
                    </p>
                    <p className="text-sm text-muted-foreground text-center">
                      Save this ID to share with participants
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={handleCloseSuccess}
                    className="w-full"
                    aria-label="Close success popup"
                  >
                    Close
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateEventPage;
