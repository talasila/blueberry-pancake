import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { useEventContext } from '@/contexts/EventContext';

/**
 * ProfilePage Component
 * 
 * Displays and allows editing of user profile information for an event.
 * Features:
 * - Display user email
 * - Edit user name
 * - Edit blind item details
 * - Save changes
 */
function ProfilePage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useEventContext();
  const [name, setName] = useState('');
  const [blindItemDetails, setBlindItemDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const handleBack = () => {
    // Navigate back to previous page, or to event page if on event route
    if (eventId) {
      navigate(`/event/${eventId}`);
    } else {
      navigate(-1);
    }
  };

  const handleAdminClick = () => {
    if (eventId) {
      navigate(`/event/${eventId}/admin`);
    }
  };

  // Extract user email from JWT token or get from event user data
  useEffect(() => {
    // Try to get email from JWT token first (for admins)
    const token = apiClient.getJWTToken();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setUserEmail(payload.email || '');
        }
      } catch (error) {
        console.error('Error extracting email from token:', error);
      }
    }
    
    // TODO: Load user profile data from backend
    // For now, just initialize with empty values
  }, [eventId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // TODO: Implement API call to save profile data
      // await apiClient.updateUserProfile(eventId, { name, blindItemDetails });
      
      // Placeholder for now
      setTimeout(() => {
        setSuccess('Profile updated successfully!');
        setLoading(false);
      }, 500);
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-md mx-auto w-full">
        <div className="space-y-2">
          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="-ml-2 min-h-[44px] active:bg-accent active:opacity-70 touch-manipulation"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {/* Admin link (only for administrators) */}
            {isAdmin && eventId && (
              <Button
                variant="ghost"
                onClick={handleAdminClick}
                className="-ml-2 min-h-[44px] active:bg-accent active:opacity-70 touch-manipulation"
                aria-label="Go to admin page"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your profile details for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Email (read-only) */}
                {userEmail && (
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userEmail}
                      disabled
                      className="mt-1 bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed
                    </p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>

                {/* Blind Item Details */}
                <div>
                  <Label htmlFor="blindItemDetails">Blind Item Details</Label>
                  <textarea
                    id="blindItemDetails"
                    placeholder="Enter blind item details (e.g., tasting notes, preferences)"
                    value={blindItemDetails}
                    onChange={(e) => setBlindItemDetails(e.target.value)}
                    disabled={loading}
                    rows={4}
                    className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                {/* Save button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
