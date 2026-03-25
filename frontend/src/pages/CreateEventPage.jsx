import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/services/apiClient';
import ThemePicker from '@/components/ThemePicker';
import useDarkMode from '@/hooks/useDarkMode';

/**
 * CreateEventPage Component
 * 
 * Allows authenticated users to create new events.
 * Form includes event name and type of item (wine).
 * On success, redirects to the event's admin page.
 */
function CreateEventPage() {
  const navigate = useNavigate();
  const { isDark } = useDarkMode();

  const gradientColor = isDark
    ? 'oklch(0.20 0.04 350)'
    : 'oklch(0.95 0.03 350)';

  const ctaBg = isDark
    ? 'oklch(0.65 0.15 350)'
    : 'oklch(0.45 0.15 350)';
  const [name, setName] = useState('');
  const [typeOfItem, setTypeOfItem] = useState('wine');
  const [theme, setTheme] = useState('classic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
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
      const response = await apiClient.createEvent({
        name: trimmedName,
        typeOfItem,
        theme
      });
      
      if (response.user) {
        apiClient.setUserSession(response.user);
      }

      navigate(`/event/${response.eventId}/admin`, {
        replace: true,
        state: { eventCreated: true }
      });
    } catch (err) {
      setError(err.message || 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="w-full min-h-full"
      style={{
        background: `radial-gradient(ellipse at top center, ${gradientColor}, transparent 85%)`,
      }}
    >
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-[65px] pb-4 sm:pt-[73px]">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-semibold text-foreground mb-2">Create Event</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Set up a blind tasting event in seconds. Tap the help icon above for a full walkthrough.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Event Name Field */}
              <div className="space-y-2">
                <Label htmlFor="event-name">Event Name</Label>
                <Input
                  id="event-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
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
                  className="bg-background"
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
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                >
                  <option value="wine">Wine</option>
                </select>
              </div>

              {/* Mood / Theme Picker */}
              <div className="space-y-2">
                <Label>Mood</Label>
                <ThemePicker
                  selectedTheme={theme}
                  onSelect={setTheme}
                  disabled={isSubmitting}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                aria-label="Create event button"
                style={{ backgroundColor: ctaBg, color: 'white' }}
              >
                {isSubmitting ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateEventPage;
