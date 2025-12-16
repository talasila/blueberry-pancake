import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/services/apiClient';

/**
 * EventOTPEntryPage Component
 * 
 * Handles OTP-based event access for administrators (Step 2 for admins):
 * 1. Gets email from previous step (sessionStorage)
 * 2. Requests OTP code
 * 3. User enters 6-digit OTP code
 * 4. On success, stores JWT token and redirects to event page
 */
function EventOTPEntryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestingOTP, setRequestingOTP] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  /**
   * Request OTP code
   */
  const requestOTP = useCallback(async (emailToUse) => {
    if (!emailToUse) {
      return; // Can't request OTP without email
    }
    
    setRequestingOTP(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.requestOTP(emailToUse);
      // Use the message from the response (includes OTP in dev mode)
      setSuccess(response.message || 'OTP code has been sent to your email. Please check your inbox.');
      setOtpRequested(true);
    } catch (err) {
      // Show user-friendly error message
      const errorMessage = err.message || 'Unable to send OTP code. Please check your email address and try again.';
      setError(errorMessage);
    } finally {
      setRequestingOTP(false);
    }
  }, []);

  // Get email from sessionStorage (set in EmailEntryPage) and auto-request OTP
  useEffect(() => {
    const storedEmail = sessionStorage.getItem(`event:${eventId}:email`);
    if (storedEmail) {
      setEmail(storedEmail);
      // Automatically request OTP when email is available
      requestOTP(storedEmail);
    } else {
      // If no email found, redirect back to email entry
      navigate(`/event/${eventId}/email`, { replace: true });
    }
  }, [eventId, navigate, requestOTP]);

  /**
   * Handle OTP verification
   */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiClient.verifyOTP(email, otp);
      
      // Store JWT token in localStorage
      if (response.token) {
        localStorage.setItem('jwtToken', response.token);
        apiClient.setJWTToken(response.token);
      }

      // Clear email from sessionStorage
      sessionStorage.removeItem(`event:${eventId}:email`);

      setSuccess('Authentication successful! Redirecting...');
      
      // Redirect to event page
      setTimeout(() => {
        navigate(`/event/${eventId}`, { replace: true });
      }, 1000);
    } catch (err) {
      // Show user-friendly error message
      const errorMessage = err.message || 'Invalid OTP code. Please check the code and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Admin Authentication</CardTitle>
              <CardDescription>
                Enter the 6-digit OTP code sent to your email
                {email && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Email: {email}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOTP}>
                <div className="space-y-4">
                  {/* OTP input */}
                  <div>
                    <label htmlFor="otp" className="sr-only">
                      OTP code
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
                      placeholder="Enter 6-digit OTP"
                      className="text-center text-lg tracking-widest"
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

                  {/* Resend OTP button */}
                  {otpRequested && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => requestOTP(email)}
                        disabled={requestingOTP || loading}
                        className="text-sm"
                      >
                        {requestingOTP ? 'Sending...' : "Didn't receive code? Resend OTP"}
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
                        : 'Verify OTP'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EventOTPEntryPage;

