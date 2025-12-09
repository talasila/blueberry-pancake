import { useParams, useNavigate } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Copy, Check, Trash2, PlayCircle, PauseCircle, CheckCircle2, CircleDot } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import InfoField from '@/components/InfoField';
import { isValidEmailFormat, clearSuccessMessage } from '@/utils/helpers';

/**
 * State configuration mapping states to icons, colors, labels, and descriptions
 */
const STATE_CONFIG = {
  created: {
    icon: CircleDot,
    className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    label: 'Created',
    description: 'Event is in preparation, not yet started. Users cannot provide feedback.'
  },
  started: {
    icon: PlayCircle,
    className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    label: 'Started',
    description: 'Event is active. Users can provide feedback and ratings.'
  },
  paused: {
    icon: PauseCircle,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
    label: 'Paused',
    description: 'Event is temporarily paused. Users cannot provide feedback.'
  },
  completed: {
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
    label: 'Completed',
    description: 'Event is finished. Users cannot provide feedback. Results are available.'
  }
};

/**
 * Get state configuration with fallback for unknown states
 * @param {string} state - Event state
 * @returns {object} State configuration object
 */
function getStateConfig(state) {
  return STATE_CONFIG[state] || {
    icon: CircleDot,
    className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    label: state,
    description: 'Unknown state'
  };
}

/**
 * Get state description (what the state means)
 * @param {string} state - Event state
 * @returns {string} Description of what the state means
 */
function getStateDescription(state) {
  return getStateConfig(state).description;
}

/**
 * StateBadge component for displaying event state with icon and color
 */
function StateBadge({ state }) {
  const config = getStateConfig(state);
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`capitalize flex items-center gap-1.5 ${config.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}


/**
 * Get transition description (what the transition will do)
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {string} Description of what the transition will do
 */
function getTransitionDescription(fromState, toState) {
  const descriptions = {
    'created→started': 'Will start the event, enabling user feedback and ratings.',
    'started→paused': 'Will pause the event, temporarily disabling user feedback.',
    'started→completed': 'Will complete the event, ending feedback collection and enabling results.',
    'paused→started': 'Will resume the event, re-enabling user feedback and ratings.',
    'paused→completed': 'Will complete the event, ending feedback collection and enabling results.',
    'completed→started': 'Will reopen the event, re-enabling user feedback and ratings.',
    'completed→paused': 'Will reopen the event in paused state, allowing preparation before enabling feedback.'
  };
  return descriptions[`${fromState}→${toState}`] || `Will transition event to "${toState}" state.`;
}

/**
 * Get valid state transitions for a given current state
 * @param {string} currentState - Current event state
 * @returns {string[]} Array of valid target states
 */
function getValidTransitions(currentState) {
  const transitions = {
    created: ['started'],
    started: ['paused', 'completed'],
    paused: ['started', 'completed'],
    completed: ['started', 'paused']
  };
  return transitions[currentState] || [];
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState('');
  const [transitionSuccess, setTransitionSuccess] = useState('');
  const [numberOfItems, setNumberOfItems] = useState(20);
  const [excludedItemIdsInput, setExcludedItemIdsInput] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [configWarning, setConfigWarning] = useState('');

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

  // Fetch item configuration on load
  useEffect(() => {
    const fetchItemConfiguration = async () => {
      if (!eventId) return;
      
      try {
        const config = await apiClient.getItemConfiguration(eventId);
        setNumberOfItems(config.numberOfItems || 20);
        setExcludedItemIdsInput((config.excludedItemIds || []).join(', '));
      } catch (error) {
        console.error('Failed to fetch item configuration:', error);
        // Use defaults if fetch fails
        setNumberOfItems(20);
        setExcludedItemIdsInput('');
      }
    };

    fetchItemConfiguration();
  }, [eventId]);

  // Handle save item configuration
  const handleSaveItemConfiguration = async () => {
    setIsSavingConfig(true);
    setConfigError('');
    setConfigSuccess('');
    setConfigWarning('');

    try {
      const configToSave = {
        numberOfItems: parseInt(numberOfItems, 10),
        excludedItemIds: excludedItemIdsInput
      };

      const result = await apiClient.updateItemConfiguration(eventId, configToSave);
      
      setNumberOfItems(result.numberOfItems);
      setExcludedItemIdsInput((result.excludedItemIds || []).join(', '));
      
      if (result.warning) {
        setConfigWarning(result.warning);
      }
      
      setConfigSuccess('Item configuration saved successfully');
      clearSuccessMessage(setConfigSuccess);
    } catch (error) {
      setConfigError(error.message || 'Failed to save item configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

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
      clearSuccessMessage(setAddAdminSuccess);
      
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
      clearSuccessMessage(setDeleteAdminSuccess);
      
      // Refresh administrators list
      await fetchAdministrators();
    } catch (error) {
      setDeleteAdminError(error.message || 'Failed to delete administrator. Please try again.');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  // Handle state transition
  const handleStateTransition = async (newState) => {
    if (!event) return;

    setIsTransitioning(true);
    setTransitionError('');
    setTransitionSuccess('');

    try {
      const updatedEvent = await apiClient.transitionEventState(
        eventId,
        newState,
        event.state
      );
      setEvent(updatedEvent);
      setTransitionSuccess(`Event state changed to ${newState} successfully`);
      clearSuccessMessage(setTransitionSuccess);
    } catch (error) {
      if (error.status === 409) {
        // Optimistic locking conflict - refresh event data
        setTransitionError('Event state has changed. Refreshing...');
        try {
          const refreshedEvent = await apiClient.getEvent(eventId);
          setEvent(refreshedEvent);
          setTimeout(() => {
            setTransitionError('Please try again with the updated state.');
          }, 2000);
        } catch (refreshError) {
          setTransitionError('Failed to refresh event. Please reload the page.');
        }
      } else {
        setTransitionError(error.message || 'Failed to transition state. Please try again.');
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
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
          </div>

          {/* Item Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle>Item Configuration</CardTitle>
              <CardDescription>
                Configure the number of items and specify which item IDs to exclude from the event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Number of items input */}
              <div>
                <label className="text-sm font-medium">Number of Items</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={numberOfItems}
                  onChange={(e) => {
                    setNumberOfItems(e.target.value);
                    setConfigError('');
                  }}
                  disabled={isSavingConfig}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Items will be numbered from 1 to {numberOfItems || 20} (default: 20, max: 100)
                </p>
              </div>

              {/* Excluded item IDs input */}
              <div>
                <label className="text-sm font-medium">Excluded Item IDs</label>
                <Input
                  type="text"
                  placeholder="5,10,15"
                  value={excludedItemIdsInput}
                  onChange={(e) => {
                    setExcludedItemIdsInput(e.target.value);
                    setConfigError('');
                  }}
                  disabled={isSavingConfig}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated list of item IDs to exclude (e.g., "5,10,15")
                </p>
              </div>

              {/* Messages */}
              {configError && (
                <Message type="error">{configError}</Message>
              )}
              {configWarning && (
                <Message type="warning">{configWarning}</Message>
              )}
              {configSuccess && (
                <Message type="success">{configSuccess}</Message>
              )}

              {/* Save button */}
              <Button
                onClick={handleSaveItemConfiguration}
                disabled={isSavingConfig || !numberOfItems}
                className="w-full"
              >
                {isSavingConfig ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* State Management Section */}
          <Card>
            <CardHeader>
              <CardTitle>State</CardTitle>
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StateBadge state={event.state} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getStateDescription(event.state)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {transitionError && (
                <Message type="error">{transitionError}</Message>
              )}
              {transitionSuccess && (
                <Message type="success">{transitionSuccess}</Message>
              )}

              {/* State Actions */}
              {(() => {
                const validTransitions = getValidTransitions(event.state);
                const stateLabels = {
                  started: 'Start',
                  paused: 'Pause',
                  completed: 'Complete'
                };

                if (validTransitions.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      No state transitions available from current state.
                    </p>
                  );
                }

                return (
                  <div className="space-y-2">
                    {validTransitions.map(transition => {
                      const config = getStateConfig(transition);
                      const Icon = config.icon;
                      
                      return (
                        <div key={transition} className="space-y-1">
                          <Button
                            onClick={() => handleStateTransition(transition)}
                            disabled={isTransitioning}
                            variant="default"
                            className="w-full sm:w-auto"
                          >
                            {isTransitioning ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Transitioning...
                              </>
                            ) : (
                              <>
                                <Icon className="h-4 w-4 mr-2" />
                                {stateLabels[transition] || transition}
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            {getTransitionDescription(event.state, transition)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

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
                    variant="default"
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
                  <LoadingSpinner />
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
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add administrator form */}
              <div className="space-y-2 pt-4">
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
