import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import apiClient from '@/services/apiClient';
import { clearAllBookmarks } from '@/utils/bookmarkStorage';
import { useTurnstile } from '@/hooks/useTurnstile';
import useEventPublicInfo from '@/hooks/useEventPublicInfo';
import useDarkMode from '@/hooks/useDarkMode';
import { getThemeVars } from '@/utils/themePresets';

/**
 * PINEntryPage Component
 * 
 * Handles PIN-based event access (Step 2 for regular users):
 * 1. Gets email from previous step (sessionStorage)
 * 2. User enters 6-digit PIN for the event
 * 3. On success, user is registered for the event and granted access
 * 4. Stores PIN session and redirects to event page
 */
function PINEntryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { token: turnstileToken, containerRef: turnstileRef } = useTurnstile(
    import.meta.env.VITE_TURNSTILE_SITE_KEY
  );

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

  // Get email and name from sessionStorage (set in EmailEntryPage)
  useEffect(() => {
    const storedEmail = sessionStorage.getItem(`event:${eventId}:email`);
    const storedName = sessionStorage.getItem(`event:${eventId}:name`);
    if (storedEmail) {
      // Security check: Verify this is not an admin email
      // Admins should use OTP authentication, not PIN
      apiClient.checkEventAdmin(eventId, storedEmail, turnstileToken)
        .then(response => {
          if (response.isAdmin) {
            // Admin detected - redirect to OTP entry
            sessionStorage.removeItem(`event:${eventId}:email`);
            sessionStorage.removeItem(`event:${eventId}:name`);
            navigate(`/event/${eventId}/otp`, { replace: true });
          } else {
            // Regular user - proceed with PIN entry
            setEmail(storedEmail);
            if (storedName) setName(storedName);
          }
        })
        .catch(err => {
          // If check fails, proceed with PIN entry
          // Backend will enforce the security check
          console.error('Error checking admin status:', err);
          setEmail(storedEmail);
          if (storedName) setName(storedName);
        });
    } else {
      // If no email found, redirect back to email entry
      navigate(`/event/${eventId}/email`, { replace: true });
    }
  }, [eventId, navigate, turnstileToken]);

  /**
   * Handle PIN verification
   */
  const handleVerifyPIN = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate email (should already be set from previous step)
    if (!email || !email.trim()) {
      setError('Email address is required. Please go back and enter your email.');
      return;
    }
    
    // Validate PIN
    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    
    setLoading(true);

    try {
      const response = await apiClient.verifyPIN(eventId, pin, email.trim(), name || undefined);
      
      // Clear local bookmark cache (bookmarks are persisted on server, will be loaded on event page)
      clearAllBookmarks();
      
      if (response.user) {
        apiClient.setUserSession(response.user);
      }

      // Store PIN session ID so hasEventAccess() recognizes this event
      if (response.sessionId && eventId) {
        localStorage.setItem(`pin:session:${eventId}`, response.sessionId);
      }

      // Clear email and name from sessionStorage
      sessionStorage.removeItem(`event:${eventId}:email`);
      sessionStorage.removeItem(`event:${eventId}:name`);

      setSuccess('PIN verified successfully! Redirecting...');
      
      // Redirect to event page
      setTimeout(() => {
        navigate(`/event/${eventId}`, { state: { guestJustLoggedIn: true }, replace: true });
      }, 1000);
    } catch (err) {
      // Show user-friendly error message with better context
      let errorMessage = 'Invalid PIN. Please check the PIN and try again.';
      
      if (err.message) {
        if (err.message.includes('Too many attempts')) {
          errorMessage = err.message;
        } else if (err.message.includes('not found')) {
          errorMessage = 'Event not found. Please check the event ID.';
        } else if (err.message.includes('must be exactly 6 digits')) {
          errorMessage = 'PIN must be exactly 6 digits.';
        } else if (err.message.includes('email')) {
          errorMessage = err.message;
        } else if (err.message.includes('Network error') || err.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full" style={themeVars} data-event-theme={eventInfo.theme || undefined}>
      <div className="flex items-start pt-8 sm:items-center sm:pt-4 justify-center px-4 sm:px-6 lg:px-8 min-h-full">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>{eventInfo.name || 'Enter PIN'}</CardTitle>
              <CardDescription>
                Enter the 6-digit PIN provided by your host
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyPIN}>
                <div className="space-y-4">
                  {/* PIN input */}
                  <div>
                    <Input
                      id="pin"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      disabled={loading}
                      placeholder="Enter 6-digit PIN"
                      className="mt-1 text-center text-lg tracking-widest"
                    />
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  {/* Success message */}
                  {success && (
                    <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                      {success}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        sessionStorage.removeItem(`event:${eventId}:email`);
                        sessionStorage.removeItem(`event:${eventId}:name`);
                        navigate(`/event/${eventId}/email`, { replace: true });
                      }}
                      disabled={loading}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || pin.length !== 6 || !email.trim()}
                      className="flex-1"
                    >
                      {loading 
                        ? 'Verifying...' 
                        : 'Join Event'}
                    </Button>
                  </div>
                </div>
                <div ref={turnstileRef} />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PINEntryPage;
