import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/services/apiClient';
import { useTurnstile } from '@/hooks/useTurnstile';
import useEventPublicInfo from '@/hooks/useEventPublicInfo';
import useDarkMode from '@/hooks/useDarkMode';
import { getThemeVars } from '@/utils/themePresets';

/**
 * EmailEntryPage Component
 *
 * First step of event access:
 * 1. User enters name and email address
 * 2. System checks if email is an event administrator
 * 3. Routes to PIN entry (regular user) or OTP entry (admin)
 */
function EmailEntryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Fetch public event info for theming and display
  const eventInfo = useEventPublicInfo(eventId);
  const { isDark } = useDarkMode();
  const themeVars = useMemo(
    () => eventInfo.theme ? getThemeVars(eventInfo.theme, isDark) : {},
    [eventInfo.theme, isDark]
  );

  // Mirror theme vars onto document root so Header and portals pick them up
  const appliedVarsRef = useRef([]);
  useEffect(() => {
    const root = document.documentElement;
    appliedVarsRef.current.forEach((key) => root.style.removeProperty(key));
    const keys = Object.keys(themeVars);
    keys.forEach((key) => root.style.setProperty(key, themeVars[key]));
    appliedVarsRef.current = keys;
    return () => { keys.forEach((key) => root.style.removeProperty(key)); };
  }, [themeVars]);

  // Initialize state from localStorage for returning users (graceful degradation)
  const getRemembered = (key) => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  };

  const [name, setName] = useState(() => getRemembered('remembered:name'));
  const [email, setEmail] = useState(() => getRemembered('remembered:email'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token: turnstileToken, containerRef: turnstileRef } = useTurnstile(
    import.meta.env.VITE_TURNSTILE_SITE_KEY
  );

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkAdminStatus = async (email) => {
    try {
      const response = await apiClient.checkEventAdmin(eventId, email.trim(), turnstileToken);
      return response.isAdmin || false;
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Your name is required');
      return;
    }

    if (!trimmedEmail) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const isAdmin = await checkAdminStatus(trimmedEmail);

      try {
        localStorage.setItem('remembered:name', trimmedName);
        localStorage.setItem('remembered:email', trimmedEmail);
      } catch { /* private browsing or storage full */ }

      sessionStorage.setItem(`event:${eventId}:email`, trimmedEmail);
      sessionStorage.setItem(`event:${eventId}:name`, trimmedName);

      if (isAdmin) {
        navigate(`/event/${eventId}/otp`, { replace: true });
      } else {
        navigate(`/event/${eventId}/pin`, { replace: true });
      }
    } catch (err) {
      sessionStorage.setItem(`event:${eventId}:email`, trimmedEmail);
      sessionStorage.setItem(`event:${eventId}:name`, trimmedName);
      navigate(`/event/${eventId}/pin`, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Derive display text from event info
  const title = eventInfo.name || 'Join Event';
  const description = eventInfo.typeOfItem
    ? `Enter your details to join the ${eventInfo.typeOfItem} tasting`
    : 'Enter your name and email address to continue';

  // Event not found
  if (eventInfo.notFound) {
    return (
      <div className="w-full h-full" style={themeVars} data-event-theme={eventInfo.theme || undefined}>
        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4 min-h-full">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Event Not Found</CardTitle>
                <CardDescription>
                  This event doesn't exist or may have been removed. Please check the link and try again.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={themeVars} data-event-theme={eventInfo.theme || undefined}>
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4 min-h-full">
        <div className="w-full max-w-md">
          {/* Event ended banner */}
          {eventInfo.state === 'completed' && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md mb-4">
              This event has ended. You can still sign in to view results.
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. Sarah"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                      className="mt-1"
                      autoFocus
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      className="mt-1"
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !name.trim() || !email.trim()}
                    className="w-full"
                  >
                    {loading ? 'Checking...' : 'Continue'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <div ref={turnstileRef} />
        </div>
      </div>
    </div>
  );
}

export default EmailEntryPage;
