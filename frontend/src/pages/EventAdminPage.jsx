import { useParams, useNavigate } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Copy, Check, Trash2 } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * Message component for displaying error/success messages
 */
function Message({ type, children, className = '' }) {
  const isError = type === 'error';
  return (
    <div className={`text-sm p-3 rounded-md ${isError 
      ? 'text-destructive bg-destructive/10' 
      : 'text-green-600 bg-green-50 dark:bg-green-900/20'
    } ${className}`}>
      {children}
    </div>
  );
}

/**
 * InfoField component for displaying labeled information
 */
function InfoField({ label, value, className = '' }) {
  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <p className={`mt-1 ${className}`}>{value}</p>
    </div>
  );
}

/**
 * Validates email format
 */
function isValidEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * EventAdminPage Component
 * 
 * Displays the admin page for event administration.
 * Only accessible to event administrators.
 * 
 * Features:
 * - Displays event data
 * - PIN management (regenerate, copy)
 * - Administrators management (add, delete, view)
 * - Shows loading and error states
 */

function EventAdminPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event: contextEvent } = useEventContext();
  const { event: polledEvent } = useEventPolling(eventId);
  const [event, setEvent] = useState(contextEvent);
  const [isLoading, setIsLoading] = useState(!contextEvent);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState('');
  const [regenerateSuccess, setRegenerateSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [administrators, setAdministrators] = useState({});
  const [isLoadingAdministrators, setIsLoadingAdministrators] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');
  const [addAdminSuccess, setAddAdminSuccess] = useState('');
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [deleteAdminError, setDeleteAdminError] = useState('');
  const [deleteAdminSuccess, setDeleteAdminSuccess] = useState('');

  // Check for OTP authentication (JWT token) - admin pages require OTP even if accessed via PIN
  useEffect(() => {
    const jwtToken = apiClient.getJWTToken();
    if (!jwtToken) {
      // Redirect to OTP auth, preserving intended destination
      navigate('/auth', { 
        state: { from: { pathname: `/event/${eventId}/admin` } },
        replace: true 
      });
    }
  }, [eventId, navigate]);

  // Update event when context or polling updates
  useEffect(() => {
    if (polledEvent) {
      setEvent(polledEvent);
      setIsLoading(false);
    } else if (contextEvent) {
      setEvent(contextEvent);
      setIsLoading(false);
    }
  }, [contextEvent, polledEvent]);

  // Fetch administrators list
  const fetchAdministrators = useCallback(async () => {
    if (!eventId) return;
    
    setIsLoadingAdministrators(true);
    try {
      const response = await apiClient.getAdministrators(eventId);
      setAdministrators(response.administrators || {});
    } catch (error) {
      console.error('Failed to fetch administrators:', error);
      // Don't show error if it's just that the endpoint doesn't exist yet
      if (!error.message?.includes('404')) {
        setAddAdminError('Failed to load administrators list');
      }
    } finally {
      setIsLoadingAdministrators(false);
    }
  }, [eventId]);

  // Fetch administrators list on load
  useEffect(() => {
    fetchAdministrators();
  }, [fetchAdministrators]);

  // Handle add administrator
  const handleAddAdministrator = async () => {
    const trimmedEmail = newAdminEmail.trim();
    if (!trimmedEmail) {
      setAddAdminError('Email address is required');
      return;
    }

    if (!isValidEmailFormat(trimmedEmail)) {
      setAddAdminError('Invalid email format');
      return;
    }

    setIsAddingAdmin(true);
    setAddAdminError('');
    setAddAdminSuccess('');

    try {
      await apiClient.addAdministrator(eventId, trimmedEmail);
      setNewAdminEmail('');
      setAddAdminSuccess('Administrator added successfully');
      setTimeout(() => setAddAdminSuccess(''), 3000);
      
      // Refresh administrators list
      await fetchAdministrators();
    } catch (error) {
      setAddAdminError(error.message || 'Failed to add administrator. Please try again.');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Handle delete administrator
  const handleDeleteAdministrator = async (email) => {
    if (!email) return;

    setIsDeletingAdmin(true);
    setDeleteAdminError('');
    setDeleteAdminSuccess('');

    try {
      await apiClient.deleteAdministrator(eventId, email);
      setDeleteAdminSuccess('Administrator deleted successfully');
      setTimeout(() => setDeleteAdminSuccess(''), 3000);
      
      // Refresh administrators list
      await fetchAdministrators();
    } catch (error) {
      setDeleteAdminError(error.message || 'Failed to delete administrator. Please try again.');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-muted-foreground">Loading event...</div>
        </div>
      </div>
    );
  }

  // Event data loaded
  if (!event) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] px-4">
        <div className="max-w-md w-full">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">
              Event not found. Please check the event ID.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-md mx-auto w-full">
        <div className="space-y-4">
          <div>
            <h4 className="text-xl font-semibold">Event Administration</h4>
            <p className="text-muted-foreground mt-2">
              {event.name} ({event.eventId})
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <InfoField label="Event ID" value={event.eventId} className="font-mono text-sm" />
            <InfoField label="Name" value={event.name} />
            <InfoField label="Type" value={event.typeOfItem} className="capitalize" />
            <InfoField label="Status" value={event.state} className="capitalize" />
          </div>

          {/* PIN Management Section */}
          <Card>
            <CardHeader>
              <CardTitle>PIN</CardTitle>
              <CardDescription>
                Share this PIN with users to grant access to this event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PIN Display Section */}
              {event.pin && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-lg font-semibold">{event.pin}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(event.pin);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="h-8 w-8 p-0"
                      aria-label="Copy PIN"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Regenerate the event PIN to revoke access for all users. Users will need to enter the new PIN to access the event.
                  </p>
                  
                  {regenerateError && (
                    <Message type="error" className="mb-4">
                      {regenerateError}
                    </Message>
                  )}

                  {regenerateSuccess && (
                    <Message type="success" className="mb-4">
                      {regenerateSuccess}
                    </Message>
                  )}

                  <Button
                    onClick={async () => {
                      setIsRegenerating(true);
                      setRegenerateError('');
                      setRegenerateSuccess('');

                      try {
                        const result = await apiClient.regeneratePIN(eventId);
                        setRegenerateSuccess(`PIN regenerated successfully! New PIN: ${result.pin}`);
                        
                        // Update event state with new PIN
                        setEvent(prev => ({
                          ...prev,
                          pin: result.pin,
                          pinGeneratedAt: result.pinGeneratedAt,
                          updatedAt: result.pinGeneratedAt
                        }));
                      } catch (err) {
                        setRegenerateError(err.message || 'Failed to regenerate PIN. Please try again.');
                      } finally {
                        setIsRegenerating(false);
                      }
                    }}
                    disabled={isRegenerating}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                    {isRegenerating ? 'Regenerating...' : 'Regenerate PIN'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Administrators Management Section */}
          <Card>
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
              <CardDescription>
                Manage administrators for this event. The owner cannot be removed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Administrators list */}
              {isLoadingAdministrators ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.keys(administrators).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No administrators found</p>
                  ) : (
                    Object.entries(administrators).map(([email, data]) => (
                      <div key={email} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium break-words">{email}</span>
                            {data.owner && (
                              <Badge variant="outline" className="flex-shrink-0">Owner</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Added {new Date(data.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!data.owner && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to remove ${email} as an administrator?`)) {
                                handleDeleteAdministrator(email);
                              }
                            }}
                            disabled={isDeletingAdmin}
                            aria-label={`Delete administrator ${email}`}
                            className="self-start sm:self-center flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add administrator form */}
              <div className="space-y-2 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add an administrator to this event
                  </p>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newAdminEmail}
                    onChange={(e) => {
                      setNewAdminEmail(e.target.value);
                      setAddAdminError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isAddingAdmin) {
                        handleAddAdministrator();
                      }
                    }}
                    disabled={isAddingAdmin}
                    aria-label="New administrator email"
                  />
                </div>

                {addAdminError && (
                  <Message type="error">{addAdminError}</Message>
                )}

                {addAdminSuccess && (
                  <Message type="success">{addAdminSuccess}</Message>
                )}

                {deleteAdminError && (
                  <Message type="error">{deleteAdminError}</Message>
                )}

                {deleteAdminSuccess && (
                  <Message type="success">{deleteAdminSuccess}</Message>
                )}

                <Button
                  onClick={handleAddAdministrator}
                  disabled={!newAdminEmail.trim() || isAddingAdmin}
                  className="w-full"
                >
                  {isAddingAdmin ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Administrator'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Navigation back to event main page */}
          <div className="flex justify-center">
            <Button
              onClick={() => navigate(`/event/${eventId}`)}
              variant="secondary"
              aria-label="Back to event page"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Event
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventAdminPage;
