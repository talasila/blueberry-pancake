import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/services/apiClient';
import { useTurnstile } from '@/hooks/useTurnstile';

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

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Check if email is an event administrator
   */
  const checkAdminStatus = async (email) => {
    try {
      const response = await apiClient.checkEventAdmin(eventId, email.trim(), turnstileToken);
      return response.isAdmin || false;
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Validate name
    if (!trimmedName) {
      setError('Your name is required');
      return;
    }

    // Validate email
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
      // Check if email is an administrator
      const isAdmin = await checkAdminStatus(trimmedEmail);

      // Persist to localStorage for future pre-fill (always overwrite with current values)
      try {
        localStorage.setItem('remembered:name', trimmedName);
        localStorage.setItem('remembered:email', trimmedEmail);
      } catch { /* private browsing or storage full — ignore */ }

      // Store in sessionStorage for PIN/OTP page handoff
      sessionStorage.setItem(`event:${eventId}:email`, trimmedEmail);
      sessionStorage.setItem(`event:${eventId}:name`, trimmedName);

      // Route based on admin status
      if (isAdmin) {
        navigate(`/event/${eventId}/otp`, { replace: true });
      } else {
        navigate(`/event/${eventId}/pin`, { replace: true });
      }
    } catch (err) {
      // If event fetch fails, still route to PIN entry
      sessionStorage.setItem(`event:${eventId}:email`, trimmedEmail);
      sessionStorage.setItem(`event:${eventId}:name`, trimmedName);
      navigate(`/event/${eventId}/pin`, { replace: true });
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
              <CardTitle>Access Event</CardTitle>
              <CardDescription>
                Enter your name and email address to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {/* Name input */}
                  <div>
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                      className="mt-1"
                      autoFocus
                    />
                  </div>

                  {/* Email input */}
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

                  {/* Error message */}
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  {/* Action button */}
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
