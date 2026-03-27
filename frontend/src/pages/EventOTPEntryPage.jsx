import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/services/apiClient';
import { useTurnstile } from '@/hooks/useTurnstile';
import useEventPublicInfo from '@/hooks/useEventPublicInfo';
import useDarkMode from '@/hooks/useDarkMode';
import { getThemeVars } from '@/utils/themePresets';

/**
 * EventOTPEntryPage Component
 *
 * Handles OTP-based event access for administrators (Step 2 for admins):
 * 1. Gets email from previous step (sessionStorage)
 * 2. Waits for Turnstile bot-protection check to complete
 * 3. Auto-sends OTP code exactly once per page mount
 * 4. User enters 6-digit OTP code
 * 5. On success, stores JWT token and redirects to event page
 */
function EventOTPEntryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestingOTP, setRequestingOTP] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  // Refs to decouple auto-send from Turnstile token identity changes
  const hasAutoRequested = useRef(false);
  const turnstileTokenRef = useRef(null);

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

  const {
    token: turnstileToken,
    isLoading: turnstileLoading,
    error: turnstileError,
    resetWidget,
    containerRef: turnstileRef
  } = useTurnstile(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  // Keep ref in sync with latest Turnstile token (for manual resend reads)
  useEffect(() => {
    turnstileTokenRef.current = turnstileToken;
  }, [turnstileToken]);

  /**
   * Shared OTP send helper — does NOT call resetWidget (caller decides)
   */
  const sendOTPRequest = async (emailToUse, token) => {
    if (!emailToUse) return;

    setRequestingOTP(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.requestOTP(emailToUse, token);
      setSuccess(response.message || 'Verification code has been sent to your email. Please check your inbox.');
      setOtpRequested(true);
    } catch (err) {
      const errorMessage = err.message || 'Unable to send verification code. Please check your email address and try again.';
      setError(errorMessage);
    } finally {
      setRequestingOTP(false);
    }
  };

  // Auto-request OTP once per mount: waits for email + Turnstile token
  useEffect(() => {
    if (hasAutoRequested.current) return;

    const storedEmail = sessionStorage.getItem(`event:${eventId}:email`);
    const storedName = sessionStorage.getItem(`event:${eventId}:name`);

    if (!storedEmail) {
      navigate(`/event/${eventId}/email`, { replace: true });
      return;
    }

    setEmail(storedEmail);
    if (storedName) setName(storedName);

    // Wait for Turnstile to finish: either token available or error (failed to load).
    // When Turnstile errors (e.g., script not available in dev/E2E), proceed with
    // null token — the backend decides whether to accept it per environment.
    if (!turnstileToken && !turnstileError) return;

    hasAutoRequested.current = true;
    sendOTPRequest(storedEmail, turnstileToken);
  }, [eventId, navigate, turnstileToken, turnstileError]);

  /**
   * Manual resend handler — resets Turnstile widget after send
   */
  const handleResend = async () => {
    const token = turnstileTokenRef.current;
    if (!token) return;
    await sendOTPRequest(email, token);
    resetWidget();
  };

  /**
   * Handle OTP verification
   */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.verifyOTP(email, otp, name || undefined, eventId);

      if (response.user) {
        apiClient.setUserSession(response.user);
      }

      // Clear email and name from sessionStorage
      sessionStorage.removeItem(`event:${eventId}:email`);
      sessionStorage.removeItem(`event:${eventId}:name`);

      setSuccess('Authentication successful! Redirecting...');
      
      // Redirect to event page
      setTimeout(() => {
        navigate(`/event/${eventId}`, { replace: true });
      }, 1000);
    } catch (err) {
      // Show user-friendly error message
      const errorMessage = err.message || 'Invalid verification code. Please check the code and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="w-full h-full" style={themeVars} data-event-theme={eventInfo.theme || undefined}>
      <div className="flex items-start pt-8 sm:items-center sm:pt-4 justify-center px-4 sm:px-6 lg:px-8 min-h-full">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>{eventInfo.name || 'Admin Authentication'}</CardTitle>
              <CardDescription>
                {email
                  ? <>Enter the verification code sent to <span className="font-medium text-foreground">{email}</span></>
                  : 'Enter the verification code sent to your email'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOTP}>
                <div className="space-y-4">
                  {/* OTP input */}
                  <div>
                    <label htmlFor="otp" className="sr-only">
                      Verification code
                    </label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={loading || requestingOTP}
                      autoFocus
                      placeholder="Enter 6-digit code"
                      className="text-center text-lg tracking-widest"
                    />
                  </div>

                  {/* Waiting for Turnstile before auto-send */}
                  {!turnstileToken && !turnstileError && !hasAutoRequested.current && (
                    <div className="text-sm text-muted-foreground p-3 rounded-md text-center">
                      Sending verification code...
                    </div>
                  )}

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

                  {/* Resend OTP button */}
                  {otpRequested && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResend}
                        disabled={requestingOTP || loading || !turnstileToken}
                        className="text-sm"
                      >
                        {requestingOTP ? 'Sending...' : "Didn't receive code? Resend"}
                      </Button>
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
                      disabled={loading || requestingOTP}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || requestingOTP || otp.length !== 6}
                      className="flex-1"
                    >
                      {loading 
                        ? 'Verifying...' 
                        : 'Sign in'}
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

export default EventOTPEntryPage;

