import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/services/apiClient';
import { clearAllBookmarks } from '@/utils/bookmarkStorage';
import { useTurnstile } from '@/hooks/useTurnstile';

/**
 * AuthPage Component
 * 
 * Handles OTP-based authentication:
 * 1. User enters email and requests OTP
 * 2. User enters OTP code and verifies
 * 3. On success, stores JWT token and redirects
 */
function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('remembered:email') || ''; } catch { return ''; }
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('request'); // 'request' or 'verify'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { token: turnstileToken, isLoading: turnstileLoading, error: turnstileError, resetWidget, containerRef: turnstileRef } = useTurnstile(
    import.meta.env.VITE_TURNSTILE_SITE_KEY
  );

  const from = location.state?.from?.pathname || '/';

  // If already authenticated, redirect immediately without showing sign-in form
  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      navigate(from, { replace: true });
    }
  }, [from, navigate]);

  /**
   * Handle OTP request
   */
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!turnstileToken && !turnstileError) {
      resetWidget();
      setError('Security verification is loading. Please wait a moment and try again.');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.requestOTP(email, turnstileToken);
      setSuccess(response.message || 'OTP code has been sent to your email. Please check your inbox.');
      setStep('verify');
      resetWidget();
    } catch (err) {
      const errorMessage = err.message || 'Unable to send OTP code. Please check your email address and try again.';
      setError(errorMessage);
      resetWidget();
    } finally {
      setLoading(false);
    }
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
      const response = await apiClient.verifyOTP(email, otp);
      
      // Clear local bookmark cache (bookmarks are persisted on server, will be loaded on event page)
      clearAllBookmarks();
      
      if (response.user) {
        apiClient.setUserSession(response.user);
      }

      setSuccess('Authentication successful! Redirecting...');
      
      // Redirect to originally requested page or landing page
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    } catch (err) {
      // Show user-friendly error message
      const errorMessage = err.message || 'Invalid OTP code. Please check the code and try again.';
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
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                {step === 'request' 
                  ? 'Enter your email address to receive an OTP code'
                  : 'Enter the 6-digit OTP code sent to your email'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={step === 'request' ? handleRequestOTP : handleVerifyOTP}>
                <div className="space-y-4">
                  {/* Email input - always visible */}
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={loading || step === 'verify'}
                      className={step === 'verify' ? 'opacity-60' : ''}
                    />
                  </div>

                  {/* OTP input - visible only in verify step */}
                  {step === 'verify' && (
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
                        disabled={loading}
                        placeholder="Enter 6-digit OTP"
                        className="text-center text-lg tracking-widest"
                      />
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

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {step === 'verify' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setStep('request');
                          setOtp('');
                          setError('');
                          setSuccess('');
                        }}
                        disabled={loading}
                        className="flex-1"
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={loading || (step === 'request' && (!email || (turnstileLoading && !turnstileError))) || (step === 'verify' && otp.length !== 6)}
                      className="flex-1"
                    >
                      {loading 
                        ? 'Processing...' 
                        : step === 'request' 
                          ? 'Request OTP'
                          : 'Verify OTP'}
                    </Button>
                  </div>
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

export default AuthPage;
