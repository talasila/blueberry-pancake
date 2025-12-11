import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import apiClient from '@/services/apiClient';
import { clearAllBookmarks } from '@/utils/bookmarkStorage';

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
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Get email from sessionStorage (set in EmailEntryPage)
  useEffect(() => {
    const storedEmail = sessionStorage.getItem(`event:${eventId}:email`);
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // If no email found, redirect back to email entry
      navigate(`/event/${eventId}/email`, { replace: true });
    }
  }, [eventId, navigate]);

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
      const response = await apiClient.verifyPIN(eventId, pin, email.trim());
      
      // Clear all bookmarks from previous user session
      clearAllBookmarks();
      
      // Store JWT token from PIN verification
      if (response.token) {
        apiClient.setJWTToken(response.token);
      }

      // Store PIN session ID in localStorage (for backward compatibility)
      if (response.sessionId) {
        localStorage.setItem(`pin:session:${eventId}`, response.sessionId);
      }

      // Clear email from sessionStorage
      sessionStorage.removeItem(`event:${eventId}:email`);

      setSuccess('PIN verified successfully! Redirecting...');
      
      // Redirect to event page
      setTimeout(() => {
        navigate(`/event/${eventId}`, { replace: true });
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
    <div className="w-full">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Enter PIN</CardTitle>
              <CardDescription>
                Enter the 6-digit PIN to access this event
                {email && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Email: {email}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyPIN}>
                <div className="space-y-4">
                  {/* PIN input */}
                  <div>
                    <Label htmlFor="pin">Event PIN</Label>
                    <div className="flex justify-center mt-1">
                      <InputOTP
                        maxLength={6}
                        value={pin}
                        onChange={(value) => setPin(value)}
                        disabled={loading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
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
                        : 'Access Event'}
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

export default PINEntryPage;
