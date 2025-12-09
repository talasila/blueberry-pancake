import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import apiClient from '@/services/apiClient';

/**
 * EmailEntryPage Component
 * 
 * First step of event access:
 * 1. User enters email address
 * 2. System checks if email is an event administrator
 * 3. Routes to PIN entry (regular user) or OTP entry (admin)
 */
function EmailEntryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      // Use the check-admin endpoint
      const response = await apiClient.checkEventAdmin(eventId, email.trim());
      return response.isAdmin || false;
    } catch (err) {
      // If we can't check (e.g., event not found), default to PIN entry
      // PIN entry will handle the error appropriately
      console.error('Error checking admin status:', err);
      return false;
    }
  };

  /**
   * Handle email submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate email
    if (!email || !email.trim()) {
      setError('Email address is required');
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);

    try {
      // Check if email is an administrator
      const isAdmin = await checkAdminStatus(email.trim());
      
      // Store email in sessionStorage for next step
      sessionStorage.setItem(`event:${eventId}:email`, email.trim());
      
      // Route based on admin status
      if (isAdmin) {
        // Admin: route to OTP entry
        navigate(`/event/${eventId}/otp`, { replace: true });
      } else {
        // Regular user: route to PIN entry
        navigate(`/event/${eventId}/pin`, { replace: true });
      }
    } catch (err) {
      // If event fetch fails, still route to PIN entry
      // PIN entry will handle the authentication error
      sessionStorage.setItem(`event:${eventId}:email`, email.trim());
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
                Enter your email address to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
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
                      autoFocus
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
                    disabled={loading || !email.trim()}
                    className="w-full"
                  >
                    {loading 
                      ? 'Checking...' 
                      : 'Continue'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EmailEntryPage;

