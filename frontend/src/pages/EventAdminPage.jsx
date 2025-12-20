import { useParams, useNavigate } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Copy, Check, Trash2, Edit2, X, AlertTriangle, Download, Search, Filter, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import SideDrawer from '@/components/SideDrawer';
import { isValidEmailFormat, clearSuccessMessage, downloadCSV } from '@/utils/helpers';
import { calculateWeightedAverage } from '@/utils/bayesianAverage';
import { useItemTerminology } from '@/utils/itemTerminology';
import { getStateConfig, getStateDescription, StateBadge } from '@/utils/eventState.jsx';
import itemService from '@/services/itemService';
import { ratingService } from '@/services/ratingService';
import DeleteEventDialog from '@/components/DeleteEventDialog';
import DeleteRatingsDialog from '@/components/DeleteRatingsDialog';
import DeleteAllUsersDialog from '@/components/DeleteAllUsersDialog';
import DeleteUserDialog from '@/components/DeleteUserDialog';
import { toast } from 'sonner';

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
  const itemTerminology = useItemTerminology(event);
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [maxRating, setMaxRating] = useState(4);
  const [ratings, setRatings] = useState([]);
  const [noteSuggestionsEnabled, setNoteSuggestionsEnabled] = useState(true);
  const [isSavingRatingConfig, setIsSavingRatingConfig] = useState(false);
  const [ratingConfigError, setRatingConfigError] = useState('');
  const [ratingConfigSuccess, setRatingConfigSuccess] = useState('');
  const [maxRatingError, setMaxRatingError] = useState('');
  const [labelErrors, setLabelErrors] = useState({});
  const [colorErrors, setColorErrors] = useState({});
  const [openColorDropdowns, setOpenColorDropdowns] = useState({});
  
  // Items management state
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState('');
  
  // Drawer state
  const [openDrawer, setOpenDrawer] = useState(null);
  const isHandlingPopStateRef = useRef(false); // Prevent infinite loops when handling popstate
  const [itemsTab, setItemsTab] = useState('configuration'); // 'configuration' or 'assignment'
  
  // Item assignment state (for Items Management drawer)
  const [assigningItemId, setAssigningItemId] = useState(null);
  const [assignmentErrors, setAssignmentErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  // Delete event state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deleteEventError, setDeleteEventError] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  
  // Delete ratings state
  const [isDeleteRatingsDialogOpen, setIsDeleteRatingsDialogOpen] = useState(false);
  const [isDeletingRatings, setIsDeletingRatings] = useState(false);
  const [deleteRatingsError, setDeleteRatingsError] = useState('');
  const [deleteRatingsSuccess, setDeleteRatingsSuccess] = useState('');
  
  // Delete users state
  const [isDeleteUsersDialogOpen, setIsDeleteUsersDialogOpen] = useState(false);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [deleteUsersError, setDeleteUsersError] = useState('');
  const [deleteUsersSuccess, setDeleteUsersSuccess] = useState('');
  
  // Delete single user state
  const [deleteUserDialogState, setDeleteUserDialogState] = useState({
    isOpen: false,
    userEmail: null,
    userName: null,
    itemsCount: 0,
    ratingsCount: 0,
    isAdministrator: false
  });
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState('');
  const [deleteUserSuccess, setDeleteUserSuccess] = useState('');
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  
  // Export data state
  const [isExportingRatings, setIsExportingRatings] = useState(false);
  const [exportRatingsError, setExportRatingsError] = useState('');
  const [exportRatingsSuccess, setExportRatingsSuccess] = useState('');
  const [isExportingMatrix, setIsExportingMatrix] = useState(false);
  const [exportMatrixError, setExportMatrixError] = useState('');
  const [exportMatrixSuccess, setExportMatrixSuccess] = useState('');
  const [isExportingUsers, setIsExportingUsers] = useState(false);
  const [exportUsersError, setExportUsersError] = useState('');
  const [exportUsersSuccess, setExportUsersSuccess] = useState('');
  const [isExportingItems, setIsExportingItems] = useState(false);
  const [exportItemsError, setExportItemsError] = useState('');
  const [exportItemsSuccess, setExportItemsSuccess] = useState('');

  // Check for OTP authentication (JWT token) - admin pages require OTP even if accessed via PIN
  useEffect(() => {
    const jwtToken = apiClient.getJWTToken();
    if (!jwtToken) {
      // Redirect to OTP auth, preserving intended destination
      navigate('/auth', { 
        state: { from: { pathname: `/event/${eventId}/admin` } },
        replace: true 
      });
    } else {
      // Extract email from JWT token
      try {
        const parts = jwtToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          setCurrentUserEmail(payload.email || null);
        }
      } catch (error) {
        console.error('Error extracting email from token:', error);
      }
    }
  }, [eventId, navigate]);

  // Handle browser back/forward navigation (popstate) to sync drawer state
  useEffect(() => {
    const handlePopState = (event) => {
      if (isHandlingPopStateRef.current) return;
      
      isHandlingPopStateRef.current = true;
      
      // If history state has drawer info, open that drawer
      if (event.state?.drawer) {
        const { drawer } = event.state;
        setOpenDrawer(null);
        
        // Open the drawer from history state
        setTimeout(() => {
          setOpenDrawer(drawer);
          isHandlingPopStateRef.current = false;
        }, 10);
      } else {
        // No drawer in history state - close drawer
        setOpenDrawer(null);
        isHandlingPopStateRef.current = false;
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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

  // Initialize edited name when event changes
  useEffect(() => {
    if (event && !isEditingName) {
      setEditedName(event.name || '');
    }
  }, [event, isEditingName]);

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

  // Fetch items on load (admin sees all items)
  useEffect(() => {
    const fetchItems = async () => {
      if (!eventId) return;

      setIsLoadingItems(true);
      setItemsError('');

      try {
        const allItems = await itemService.getItems(eventId);
        setItems(allItems || []);
      } catch (error) {
        console.error('Failed to fetch items:', error);
        setItemsError(error.message || 'Failed to load items');
      } finally {
        setIsLoadingItems(false);
      }
    };

    if (eventId) {
      fetchItems();
    }
  }, [eventId]);

  // Calculate summary statistics
  const itemsSummary = {
    total: items.length,
    assigned: items.filter(item => item.itemId !== null && item.itemId !== undefined).length,
    unassigned: items.filter(item => item.itemId === null || item.itemId === undefined).length
  };

  // Fetch item configuration on load
  useEffect(() => {
    const fetchItemConfiguration = async () => {
      if (!eventId) return;
      
      try {
        const config = await apiClient.getItemConfiguration(eventId);
        // Backend guarantees these values at event creation - no frontend fallbacks needed
        setNumberOfItems(config.numberOfItems);
        setExcludedItemIdsInput((config.excludedItemIds || []).join(', '));
      } catch (error) {
        console.error('Failed to fetch item configuration:', error);
        // Don't set fallback defaults - backend should always provide item configuration
      }
    };

    fetchItemConfiguration();
  }, [eventId]);

  // Default rating presets (matching backend)
  const getDefaultRatings = (maxRating) => {
    const presets = {
      2: [
        { value: 1, label: 'Poor', color: '#FF3B30' },
        { value: 2, label: 'Good', color: '#28A745' }
      ],
      3: [
        { value: 1, label: 'Poor', color: '#FF3B30' },
        { value: 2, label: 'Average', color: '#FFCC00' },
        { value: 3, label: 'Good', color: '#34C759' }
      ],
      4: [
        { value: 1, label: 'What is this crap?', color: '#FF3B30' },
        { value: 2, label: 'Meh...', color: '#FFCC00' },
        { value: 3, label: 'Not bad...', color: '#34C759' },
        { value: 4, label: 'Give me more...', color: '#28A745' }
      ]
    };
    return presets[maxRating] || presets[4];
  };

  // Simple color palette for selection
  const COLOR_PALETTE = [
    { value: '#FF3B30', label: 'Red' },
    { value: '#FF9500', label: 'Orange' },
    { value: '#FFCC00', label: 'Yellow' },
    { value: '#34C759', label: 'Green' },
    { value: '#28A745', label: 'Dark Green' },
    { value: '#007AFF', label: 'Blue' },
    { value: '#5856D6', label: 'Purple' },
    { value: '#AF52DE', label: 'Pink' },
    { value: '#FF2D55', label: 'Pink Red' }
  ];

  // Fetch rating configuration on load
  useEffect(() => {
    const fetchRatingConfiguration = async () => {
      if (!eventId) return;
      
      try {
        const config = await apiClient.getRatingConfiguration(eventId);
        // Backend guarantees these values at event creation - no frontend fallbacks needed
        setMaxRating(config.maxRating);
        setRatings(config.ratings);
        if (event?.typeOfItem === 'wine') {
          setNoteSuggestionsEnabled(config.noteSuggestionsEnabled);
        }
      } catch (error) {
        console.error('Failed to fetch rating configuration:', error);
        // Don't set fallback defaults - backend should always provide rating configuration
      }
    };

    fetchRatingConfiguration();
  }, [eventId, event?.typeOfItem]);

  // Update ratings array when maxRating changes (only if user is editing)
  useEffect(() => {
    const maxRatingNum = parseInt(maxRating, 10);
    if (!isNaN(maxRatingNum) && maxRatingNum >= 2 && maxRatingNum <= 4) {
      const currentMaxRating = ratings.length > 0 ? Math.max(...ratings.map(r => r.value)) : 0;
      // Only update if maxRating actually changed and we have existing ratings
      if (ratings.length > 0 && currentMaxRating !== maxRatingNum) {
        // Generate new ratings array based on new maxRating
        setRatings(getDefaultRatings(maxRatingNum));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRating]);

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
      
      setConfigSuccess(`${itemTerminology.singular} configuration saved successfully`);
      clearSuccessMessage(setConfigSuccess);
    } catch (error) {
      setConfigError(error.message || `Failed to save ${itemTerminology.singularLower} configuration`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Validate label for a rating
  const validateLabel = (value, label) => {
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return 'Label is required';
    }
    if (label.length > 50) {
      return 'Label must be 50 characters or less';
    }
    return null;
  };

  // Validate color for a rating
  const validateColor = (value, color) => {
    if (!color || typeof color !== 'string') {
      return 'Color is required';
    }
    // Basic hex validation (backend will do full conversion)
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    const rgbPattern = /^rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i;
    const hslPattern = /^hsl\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/i;
    
    if (!hexPattern.test(color) && !rgbPattern.test(color) && !hslPattern.test(color)) {
      return 'Invalid color format. Use hex (#RRGGBB), RGB (rgb(r,g,b)), or HSL (hsl(h,s%,l%))';
    }
    return null;
  };

  // Handle label change
  const handleLabelChange = (value, newLabel) => {
    setRatings(prev => prev.map(r => r.value === value ? { ...r, label: newLabel } : r));
    setLabelErrors(prev => ({ ...prev, [value]: null }));
    setRatingConfigError('');
  };

  // Handle label blur (validate)
  const handleLabelBlur = (value, label) => {
    const error = validateLabel(value, label);
    if (error) {
      setLabelErrors(prev => ({ ...prev, [value]: error }));
    } else {
      setLabelErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[value];
        return newErrors;
      });
    }
  };

  // Handle color change
  const handleColorChange = (value, newColor) => {
    setRatings(prev => prev.map(r => r.value === value ? { ...r, color: newColor } : r));
    setColorErrors(prev => ({ ...prev, [value]: null }));
    setRatingConfigError('');
    setOpenColorDropdowns(prev => ({ ...prev, [value]: false }));
  };

  // Toggle color dropdown
  const toggleColorDropdown = (value) => {
    setOpenColorDropdowns(prev => ({ ...prev, [value]: !prev[value] }));
  };

  // Handle color blur (validate)
  const handleColorBlur = (value, color) => {
    const error = validateColor(value, color);
    if (error) {
      setColorErrors(prev => ({ ...prev, [value]: error }));
    } else {
      setColorErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[value];
        return newErrors;
      });
    }
  };

  // Handle reset to defaults
  const handleResetToDefaults = () => {
    const maxRatingNum = parseInt(maxRating, 10);
    if (!isNaN(maxRatingNum) && maxRatingNum >= 2 && maxRatingNum <= 4) {
      setRatings(getDefaultRatings(maxRatingNum));
      setLabelErrors({});
      setColorErrors({});
      setRatingConfigError('');
      setRatingConfigSuccess('Reset to defaults');
      clearSuccessMessage(setRatingConfigSuccess);
    }
  };

  // Handle save rating configuration
  const handleSaveRatingConfiguration = async () => {
    // Validate maxRating
    const maxRatingNum = parseInt(maxRating, 10);
    if (isNaN(maxRatingNum) || maxRatingNum < 2 || maxRatingNum > 4) {
      setMaxRatingError('Maximum rating must be between 2 and 4');
      return;
    }
    setMaxRatingError('');

    // Validate all labels
    const labelValidationErrors = {};
    ratings.forEach(rating => {
      const error = validateLabel(rating.value, rating.label);
      if (error) {
        labelValidationErrors[rating.value] = error;
      }
    });
    if (Object.keys(labelValidationErrors).length > 0) {
      setLabelErrors(labelValidationErrors);
      setRatingConfigError('Please fix label validation errors before saving');
      return;
    }

    // Validate all colors
    const colorValidationErrors = {};
    ratings.forEach(rating => {
      const error = validateColor(rating.value, rating.color);
      if (error) {
        colorValidationErrors[rating.value] = error;
      }
    });
    if (Object.keys(colorValidationErrors).length > 0) {
      setColorErrors(colorValidationErrors);
      setRatingConfigError('Please fix color validation errors before saving');
      return;
    }

    setIsSavingRatingConfig(true);
    setRatingConfigError('');
    setRatingConfigSuccess('');

    try {
      const expectedUpdatedAt = event?.updatedAt;
      const configToSave = {
        maxRating: maxRatingNum,
        ratings: ratings
      };
      
      // Include noteSuggestionsEnabled for wine events
      if (event?.typeOfItem === 'wine') {
        configToSave.noteSuggestionsEnabled = noteSuggestionsEnabled;
      }

      const result = await apiClient.updateRatingConfiguration(eventId, configToSave, expectedUpdatedAt);
      
      setMaxRating(result.maxRating);
      setRatings(result.ratings);
      
      // Update noteSuggestionsEnabled if returned in result
      if (event?.typeOfItem === 'wine' && result.noteSuggestionsEnabled !== undefined) {
        setNoteSuggestionsEnabled(result.noteSuggestionsEnabled);
      }
      
      setRatingConfigSuccess('Rating configuration saved successfully');
      clearSuccessMessage(setRatingConfigSuccess);
    } catch (error) {
      if (error.status === 409) {
        setRatingConfigError('Event has been modified by another administrator. Please refresh the page and try again.');
      } else {
        setRatingConfigError(error.message || 'Failed to save rating configuration');
      }
    } finally {
      setIsSavingRatingConfig(false);
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

  // Handle start editing name
  const handleStartEditName = () => {
    setEditedName(event.name);
    setIsEditingName(true);
    setNameError('');
    setNameSuccess('');
  };

  // Handle cancel editing name
  const handleCancelEditName = () => {
    setEditedName(event.name);
    setIsEditingName(false);
    setNameError('');
    setNameSuccess('');
  };

  // Handle save event name
  const handleSaveEventName = async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setNameError('Event name is required');
      return;
    }

    if (trimmedName.length > 100) {
      setNameError('Event name must be 100 characters or less');
      return;
    }

    setIsSavingName(true);
    setNameError('');
    setNameSuccess('');

    try {
      const updatedEvent = await apiClient.updateEventName(eventId, trimmedName);
      setEvent(updatedEvent);
      setIsEditingName(false);
      setNameSuccess('Event name updated successfully');
      clearSuccessMessage(setNameSuccess);
    } catch (error) {
      setNameError(error.message || 'Failed to update event name. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle copy event link
  const handleCopyEventLink = () => {
    const eventUrl = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(eventUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Check if current user is the owner
  const isCurrentUserOwner = () => {
    if (!currentUserEmail || !administrators || Object.keys(administrators).length === 0) {
      return false;
    }
    const normalizedEmail = currentUserEmail.trim().toLowerCase();
    return administrators[normalizedEmail]?.owner === true;
  };

  // Check if current user is an administrator (owner or regular admin)
  const isCurrentUserAdministrator = () => {
    if (!currentUserEmail || !administrators || Object.keys(administrators).length === 0) {
      return false;
    }
    const normalizedEmail = currentUserEmail.trim().toLowerCase();
    return administrators[normalizedEmail] !== undefined;
  };

  // Calculate number of non-admin users
  const getNonAdminUserCount = () => {
    if (!event?.users || typeof event.users !== 'object' || !administrators) {
      return 0;
    }
    
    const administratorEmails = new Set();
    Object.keys(administrators).forEach(email => {
      administratorEmails.add(email.trim().toLowerCase());
    });
    
    let count = 0;
    Object.keys(event.users).forEach(email => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!administratorEmails.has(normalizedEmail)) {
        count++;
      }
    });
    
    return count;
  };

  // Get all users with their stats
  const getAllUsersWithStats = () => {
    if (!event?.users || typeof event.users !== 'object') {
      return [];
    }

    const administratorEmails = new Set();
    if (administrators) {
      Object.keys(administrators).forEach(email => {
        administratorEmails.add(email.trim().toLowerCase());
      });
    }

    return Object.entries(event.users).map(([email, userData]) => {
      const normalizedEmail = email.trim().toLowerCase();
      const isAdmin = administratorEmails.has(normalizedEmail);
      const isOwner = administrators?.[normalizedEmail]?.owner === true;
      
      // Count items for this user
      const userItems = items.filter(item => {
        if (!item.ownerEmail) return false;
        return item.ownerEmail.trim().toLowerCase() === normalizedEmail;
      });

      // Note: We can't easily count ratings without fetching them all
      // For now, we'll show items count and leave ratings as "N/A" or fetch if needed
      // Actually, let's fetch ratings to show accurate count
      
      return {
        email,
        normalizedEmail,
        name: userData?.name || null,
        registeredAt: userData?.registeredAt || null,
        isAdministrator: isAdmin,
        isOwner,
        itemsCount: userItems.length
      };
    }).sort((a, b) => {
      // Sort: owners first, then admins, then regular users
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;
      if (a.isAdministrator && !b.isAdministrator) return -1;
      if (!a.isAdministrator && b.isAdministrator) return 1;
      // Then by email
      return a.email.localeCompare(b.email);
    });
  };

  // Get ratings count for a user (async, will be called when opening dialog)
  const getUserRatingsCount = async (userEmail) => {
    try {
      const allRatings = await ratingService.getRatings(eventId);
      const normalizedEmail = userEmail.trim().toLowerCase();
      return allRatings.filter(rating => {
        const ratingEmail = (rating.email || '').trim().toLowerCase();
        return ratingEmail === normalizedEmail;
      }).length;
    } catch (error) {
      console.error('Failed to fetch ratings count:', error);
      return 0;
    }
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    setIsDeletingEvent(true);
    setDeleteEventError('');

    try {
      await apiClient.deleteEvent(eventId);
      
      // Navigate to landing page with success message
      navigate('/', { 
        state: { 
          message: `Event "${event?.name || eventId}" has been deleted successfully.`,
          messageType: 'success'
        }
      });
    } catch (error) {
      setDeleteEventError(error.message || 'Failed to delete event. Please try again.');
      setIsDeletingEvent(false);
    }
  };

  // Handle delete all ratings and bookmarks
  const handleDeleteAllRatings = async () => {
    setIsDeletingRatings(true);
    setDeleteRatingsError('');
    setDeleteRatingsSuccess('');

    try {
      await apiClient.deleteAllRatings(eventId);
      
      setDeleteRatingsSuccess('All ratings and bookmarks deleted successfully');
      clearSuccessMessage(setDeleteRatingsSuccess);
      
      // Close dialog
      setIsDeleteRatingsDialogOpen(false);
      
      // Refresh event data to reflect changes
      try {
        const refreshedEvent = await apiClient.getEvent(eventId);
        setEvent(refreshedEvent);
      } catch (refreshError) {
        console.error('Failed to refresh event after deleting ratings:', refreshError);
      }
    } catch (error) {
      setDeleteRatingsError(error.message || 'Failed to delete ratings and bookmarks. Please try again.');
    } finally {
      setIsDeletingRatings(false);
    }
  };

  // Handle delete all users
  const handleDeleteAllUsers = async () => {
    setIsDeletingUsers(true);
    setDeleteUsersError('');
    setDeleteUsersSuccess('');

    try {
      const result = await apiClient.deleteAllUsers(eventId);
      
      setDeleteUsersSuccess(result.message || `Successfully deleted ${result.usersDeleted || 0} user(s) and all their associated data`);
      clearSuccessMessage(setDeleteUsersSuccess);
      
      // Close dialog
      setIsDeleteUsersDialogOpen(false);
      
      // Refresh event data to reflect changes
      try {
        const refreshedEvent = await apiClient.getEvent(eventId);
        setEvent(refreshedEvent);
        // Refresh administrators list
        await fetchAdministrators();
        // Refresh items list
        const allItems = await itemService.getItems(eventId);
        setItems(allItems || []);
      } catch (refreshError) {
        console.error('Failed to refresh event after deleting users:', refreshError);
      }
    } catch (error) {
      setDeleteUsersError(error.message || 'Failed to delete users. Please try again.');
    } finally {
      setIsDeletingUsers(false);
    }
  };

  // Handle delete single user
  const handleDeleteUser = async () => {
    if (!deleteUserDialogState.userEmail) return;

    setIsDeletingUser(true);
    setDeleteUserError('');
    setDeleteUserSuccess('');

    try {
      const result = await apiClient.deleteUser(eventId, deleteUserDialogState.userEmail);
      
      setDeleteUserSuccess(result.message || `User ${deleteUserDialogState.userEmail} deleted successfully`);
      clearSuccessMessage(setDeleteUserSuccess);
      
      // Close dialog
      setDeleteUserDialogState({
        isOpen: false,
        userEmail: null,
        userName: null,
        itemsCount: 0,
        ratingsCount: 0,
        isAdministrator: false
      });
      
      // Refresh event data to reflect changes
      try {
        const refreshedEvent = await apiClient.getEvent(eventId);
        setEvent(refreshedEvent);
        // Refresh administrators list
        await fetchAdministrators();
        // Refresh items list
        const allItems = await itemService.getItems(eventId);
        setItems(allItems || []);
      } catch (refreshError) {
        console.error('Failed to refresh event after deleting user:', refreshError);
      }
    } catch (error) {
      setDeleteUserError(error.message || 'Failed to delete user. Please try again.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Open delete user dialog
  const handleOpenDeleteUserDialog = async (userEmail, userName, isAdministrator) => {
    // Get user stats
    const userItems = items.filter(item => {
      if (!item.ownerEmail) return false;
      return item.ownerEmail.trim().toLowerCase() === userEmail.trim().toLowerCase();
    });
    
    // Get ratings count
    const ratingsCount = await getUserRatingsCount(userEmail);

    setDeleteUserDialogState({
      isOpen: true,
      userEmail,
      userName: userName || null,
      itemsCount: userItems.length,
      ratingsCount,
      isAdministrator
    });
    setDeleteUserError('');
    setDeleteUserSuccess('');
  };

  // Handle export ratings data
  const handleExportRatings = async () => {
    if (!eventId || !event) return;

    setIsExportingRatings(true);
    setExportRatingsError('');
    setExportRatingsSuccess('');

    try {
      // Fetch ratings data
      const ratings = await ratingService.getRatings(eventId);

      if (!ratings || ratings.length === 0) {
        setExportRatingsError('No ratings data available to export');
        setIsExportingRatings(false);
        return;
      }

      // Get user names from event.users
      const usersMap = event.users || {};
      
      // Transform ratings data to include username
      const exportData = ratings.map(rating => {
        const normalizedEmail = (rating.email || '').trim().toLowerCase();
        const userData = usersMap[normalizedEmail];
        const username = userData?.name || rating.email || '';

        return {
          username,
          userEmail: rating.email || '',
          ratingTimestamp: rating.timestamp || '',
          itemid: rating.itemId || '',
          rating: rating.rating || '',
          note: rating.note || ''
        };
      });

      // Generate filename with event ID and timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `ratings-export-${eventId}-${timestamp}.csv`;

      // Download CSV
      downloadCSV(exportData, ['username', 'userEmail', 'ratingTimestamp', 'itemid', 'rating', 'note'], filename);

      setExportRatingsSuccess('Ratings data exported successfully');
      clearSuccessMessage(setExportRatingsSuccess);
    } catch (error) {
      console.error('Error exporting ratings:', error);
      setExportRatingsError(error.message || 'Failed to export ratings data. Please try again.');
    } finally {
      setIsExportingRatings(false);
    }
  };

  // Handle export ratings matrix
  const handleExportMatrix = async () => {
    if (!eventId || !event) return;

    setIsExportingMatrix(true);
    setExportMatrixError('');
    setExportMatrixSuccess('');

    try {
      // Fetch ratings data
      const ratings = await ratingService.getRatings(eventId);

      if (!ratings || ratings.length === 0) {
        setExportMatrixError('No ratings data available to export');
        setIsExportingMatrix(false);
        return;
      }

      // Get user names from event.users
      const usersMap = event.users || {};
      
      // Get all unique itemIds and users
      const itemIds = new Set();
      const userEmails = new Set();
      const ratingMap = new Map(); // Map: "itemId|email" -> rating

      ratings.forEach(rating => {
        if (rating.itemId) {
          itemIds.add(rating.itemId);
          userEmails.add(rating.email);
          const key = `${rating.itemId}|${rating.email}`;
          ratingMap.set(key, rating.rating);
        }
      });

      // Sort itemIds numerically
      const sortedItemIds = Array.from(itemIds).sort((a, b) => a - b);
      
      // Sort users by email
      const sortedUserEmails = Array.from(userEmails).sort();

      // Calculate global average (average of all ratings across all items)
      // Match dashboard calculation: sum of all rating values / total ratings
      const globalAverage = ratings.length > 0
        ? ratings.reduce((sum, r) => {
            const ratingValue = parseInt(r.rating, 10);
            return sum + (isNaN(ratingValue) ? 0 : ratingValue);
          }, 0) / ratings.length
        : null;

      // Calculate total users (count of users in event.users object, same as dashboard)
      const totalUsers = event.users ? Object.keys(event.users).length : 0;

      // Build column headers with username (email) format for uniqueness
      const columnHeaders = new Map(); // Map: email -> column header
      sortedUserEmails.forEach(email => {
        const normalizedEmail = email.trim().toLowerCase();
        const userData = usersMap[normalizedEmail];
        const username = userData?.name || '';
        // Use "username (email)" format, or just email if no username
        const columnHeader = username ? `${username} (${email})` : email;
        columnHeaders.set(email, columnHeader);
      });

      // Build matrix data
      const matrixData = sortedItemIds.map(itemId => {
        const row = { itemId };
        
        // Add user ratings as columns
        sortedUserEmails.forEach(email => {
          const key = `${itemId}|${email}`;
          const rating = ratingMap.get(key);
          const columnHeader = columnHeaders.get(email);
          
          row[columnHeader] = rating || '';
        });

        // Calculate average rating for this item
        const itemRatings = ratings.filter(r => r.itemId === itemId);
        const averageRating = itemRatings.length > 0
          ? (itemRatings.reduce((sum, r) => sum + r.rating, 0) / itemRatings.length).toFixed(2)
          : '';

        // Calculate weighted average using Bayesian formula (same as dashboard)
        // Count unique raters for this item
        const uniqueRaters = new Set();
        itemRatings.forEach(rating => {
          if (rating.email) {
            uniqueRaters.add(rating.email.trim().toLowerCase());
          }
        });
        const numberOfRaters = uniqueRaters.size;

        // Calculate sum of ratings for this item (match dashboard calculation)
        const sumOfRatings = itemRatings.reduce((sum, r) => {
          const ratingValue = parseInt(r.rating, 10);
          return sum + (isNaN(ratingValue) ? 0 : ratingValue);
        }, 0);

        // Calculate weighted average using Bayesian formula
        const weightedAvg = calculateWeightedAverage(
          globalAverage,
          totalUsers,
          numberOfRaters,
          sumOfRatings
        );
        const weightedRating = weightedAvg !== null && weightedAvg !== undefined
          ? weightedAvg.toFixed(2)
          : '';

        row['Average Rating'] = averageRating;
        row['Weighted Rating'] = weightedRating;

        return row;
      });

      // Build column headers: itemId, user columns, Average Rating, Weighted Rating
      const columns = ['itemId'];
      sortedUserEmails.forEach(email => {
        columns.push(columnHeaders.get(email));
      });
      columns.push('Average Rating', 'Weighted Rating');

      // Generate filename with event ID and timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `ratings-matrix-${eventId}-${timestamp}.csv`;

      // Download CSV
      downloadCSV(matrixData, columns, filename);

      setExportMatrixSuccess('Ratings matrix exported successfully');
      clearSuccessMessage(setExportMatrixSuccess);
    } catch (error) {
      console.error('Error exporting matrix:', error);
      setExportMatrixError(error.message || 'Failed to export ratings matrix. Please try again.');
    } finally {
      setIsExportingMatrix(false);
    }
  };

  // Handle export user data
  const handleExportUsers = async () => {
    if (!eventId || !event) return;

    setIsExportingUsers(true);
    setExportUsersError('');
    setExportUsersSuccess('');

    try {
      // Get all users from event.users
      const usersMap = event.users || {};
      if (Object.keys(usersMap).length === 0) {
        setExportUsersError('No users found to export');
        setIsExportingUsers(false);
        return;
      }

      // Get all ratings
      const ratings = await ratingService.getRatings(eventId);

      // Get administrators map
      const administratorsMap = administrators || {};

      // Build user export data
      const userExportData = Object.entries(usersMap).map(([email, userData]) => {
        const normalizedEmail = email.trim().toLowerCase();
        
        // Get username
        const username = userData?.name || '';

        // Get registration date
        const registrationDate = userData?.registeredAt || '';

        // Determine administrator status
        const adminData = administratorsMap[normalizedEmail];
        let adminStatus = 'Regular User';
        if (adminData) {
          adminStatus = adminData.owner ? 'Owner' : 'Administrator';
        }

        // Get items registered by this user
        const userItems = items.filter(item => {
          if (!item.ownerEmail) return false;
          return item.ownerEmail.trim().toLowerCase() === normalizedEmail;
        });

        // Build item IDs and names (comma-separated)
        const itemIds = userItems
          .filter(item => item.itemId !== null && item.itemId !== undefined)
          .map(item => item.itemId)
          .sort((a, b) => a - b)
          .join(', ');
        const itemNames = userItems
          .map(item => item.name || '')
          .filter(name => name)
          .join(', ');

        // Get ratings given by this user
        const userRatings = ratings.filter(r => {
          const ratingEmail = (r.email || '').trim().toLowerCase();
          return ratingEmail === normalizedEmail;
        });

        // Calculate average rating given
        const averageRatingGiven = userRatings.length > 0
          ? (userRatings.reduce((sum, r) => {
              const ratingValue = parseInt(r.rating, 10);
              return sum + (isNaN(ratingValue) ? 0 : ratingValue);
            }, 0) / userRatings.length).toFixed(2)
          : '';

        return {
          email,
          username,
          registrationDate,
          administratorStatus: adminStatus,
          itemsRegisteredCount: userItems.length,
          itemIds: itemIds || '',
          itemNames: itemNames || '',
          ratingsGivenCount: userRatings.length,
          averageRatingGiven: averageRatingGiven || ''
        };
      });

      // Sort by email
      userExportData.sort((a, b) => a.email.localeCompare(b.email));

      // Build column headers
      const columns = [
        'email',
        'username',
        'registrationDate',
        'administratorStatus',
        'itemsRegisteredCount',
        'itemIds',
        'itemNames',
        'ratingsGivenCount',
        'averageRatingGiven'
      ];

      // Generate filename with event ID and timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `users-export-${eventId}-${timestamp}.csv`;

      // Download CSV
      downloadCSV(userExportData, columns, filename);

      setExportUsersSuccess('User data exported successfully');
      clearSuccessMessage(setExportUsersSuccess);
    } catch (error) {
      console.error('Error exporting users:', error);
      setExportUsersError(error.message || 'Failed to export user data. Please try again.');
    } finally {
      setIsExportingUsers(false);
    }
  };

  // Handle export item details
  const handleExportItems = async () => {
    if (!eventId || !event) return;

    setIsExportingItems(true);
    setExportItemsError('');
    setExportItemsSuccess('');

    try {
      // Get item configuration
      const itemConfig = event.itemConfiguration || {};
      const numberOfItems = itemConfig.numberOfItems || 0;
      const excludedItemIds = itemConfig.excludedItemIds || [];

      if (numberOfItems === 0) {
        setExportItemsError(`No ${itemTerminology.pluralLower} configured for this event`);
        setIsExportingItems(false);
        return;
      }

      // Get all ratings
      const ratings = await ratingService.getRatings(eventId);

      // Get user names from event.users
      const usersMap = event.users || {};

      // Create a map of registered items by itemId for quick lookup
      const itemsByItemId = new Map();
      (items || []).forEach(item => {
        if (item.itemId !== null && item.itemId !== undefined) {
          itemsByItemId.set(item.itemId, item);
        }
      });

      // Calculate global average (for weighted average calculation)
      const globalAverage = ratings.length > 0
        ? ratings.reduce((sum, r) => {
            const ratingValue = parseInt(r.rating, 10);
            return sum + (isNaN(ratingValue) ? 0 : ratingValue);
          }, 0) / ratings.length
        : null;

      // Calculate total users (for weighted average calculation)
      const totalUsers = event.users ? Object.keys(event.users).length : 0;

      // Get max rating from event configuration
      const maxRating = event.ratingConfiguration?.maxRating || 4;

      // Build item export data for all items (1 to numberOfItems, excluding excludedItemIds)
      const itemExportData = [];
      for (let itemId = 1; itemId <= numberOfItems; itemId++) {
        // Skip excluded item IDs
        if (excludedItemIds.includes(itemId)) {
          continue;
        }

        // Check if this itemId has a registered item
        const registeredItem = itemsByItemId.get(itemId);

        // Get owner information
        let ownerEmail = '';
        let ownerName = '';
        if (registeredItem) {
          ownerEmail = registeredItem.ownerEmail || '';
          const normalizedOwnerEmail = ownerEmail.trim().toLowerCase();
          const ownerData = usersMap[normalizedOwnerEmail];
          ownerName = ownerData?.name || '';
        }

        // Get ratings for this item (by itemId)
        const itemRatings = ratings.filter(r => parseInt(r.itemId, 10) === itemId);

        // Count unique raters
        const uniqueRaters = new Set();
        itemRatings.forEach(rating => {
          if (rating.email) {
            uniqueRaters.add(rating.email.trim().toLowerCase());
          }
        });
        const numberOfRaters = uniqueRaters.size;

        // Calculate average rating
        let averageRating = '';
        if (itemRatings.length > 0) {
          const sum = itemRatings.reduce((acc, rating) => {
            const ratingValue = parseInt(rating.rating, 10);
            return acc + (isNaN(ratingValue) ? 0 : ratingValue);
          }, 0);
          averageRating = (sum / itemRatings.length).toFixed(2);
        }

        // Calculate sum of ratings for Bayesian formula
        const sumOfRatings = itemRatings.reduce((acc, rating) => {
          const ratingValue = parseInt(rating.rating, 10);
          return acc + (isNaN(ratingValue) ? 0 : ratingValue);
        }, 0);

        // Calculate weighted average using Bayesian formula
        const weightedAvg = calculateWeightedAverage(
          globalAverage,
          totalUsers,
          numberOfRaters,
          sumOfRatings
        );
        const weightedAverage = weightedAvg !== null && weightedAvg !== undefined
          ? weightedAvg.toFixed(2)
          : '';

        // Calculate rating progression (percentage of users who rated this item)
        let ratingProgression = '';
        if (totalUsers > 0) {
          ratingProgression = ((numberOfRaters / totalUsers) * 100).toFixed(2);
        }

        // Calculate rating distribution (count of each rating value)
        const ratingDistribution = {};
        for (let ratingValue = 1; ratingValue <= maxRating; ratingValue++) {
          ratingDistribution[ratingValue] = itemRatings.filter(
            r => parseInt(r.rating, 10) === ratingValue
          ).length;
        }

        // Build export row
        itemExportData.push({
          itemId: itemId,
          name: registeredItem ? (registeredItem.name || '') : '',
          price: registeredItem ? (registeredItem.price !== null && registeredItem.price !== undefined ? registeredItem.price : '') : '',
          description: registeredItem ? (registeredItem.description || '') : '',
          ownerEmail: ownerEmail,
          ownerName: ownerName,
          registeredAt: registeredItem ? (registeredItem.registeredAt || '') : '',
          numberOfRaters: numberOfRaters,
          averageRating: averageRating,
          weightedAverage: weightedAverage,
          ratingProgression: ratingProgression,
          ratingCount1: ratingDistribution[1] || 0,
          ratingCount2: ratingDistribution[2] || 0,
          ratingCount3: ratingDistribution[3] || 0,
          ratingCount4: ratingDistribution[4] || 0
        });
      }

      // Items are already sorted by itemId (1 to numberOfItems)

      // Build column headers
      const columns = [
        'itemId',
        'name',
        'price',
        'description',
        'ownerEmail',
        'ownerName',
        'registeredAt',
        'numberOfRaters',
        'averageRating',
        'weightedAverage',
        'ratingProgression',
        'ratingCount1',
        'ratingCount2',
        'ratingCount3',
        'ratingCount4'
      ];

      // Generate filename with event ID and timestamp
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${itemTerminology.pluralLower}-export-${eventId}-${timestamp}.csv`;

      // Download CSV
      downloadCSV(itemExportData, columns, filename);

      setExportItemsSuccess(`${itemTerminology.singular} details exported successfully`);
      clearSuccessMessage(setExportItemsSuccess);
    } catch (error) {
      console.error('Error exporting items:', error);
      setExportItemsError(error.message || `Failed to export ${itemTerminology.singularLower} details. Please try again.`);
    } finally {
      setIsExportingItems(false);
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

  // Handle item ID assignment
  const handleAssignItemId = async (itemId, itemIdToAssign) => {
    if (!eventId) return;

    setAssigningItemId(itemId);
    setAssignmentErrors({});

    try {
      const updatedItem = await itemService.assignItemId(eventId, itemId, itemIdToAssign);
      
      // Update items list
      setItems(items.map(item => 
        item.id === itemId ? updatedItem : item
      ));
      
      // Show success toast
      if (itemIdToAssign === null) {
        toast.success(`${itemTerminology.singular} ID assignment cleared`);
      } else {
        toast.success(`${itemTerminology.singular} ID ${itemIdToAssign} assigned successfully`);
      }
    } catch (error) {
      const errorMessage = error.message || `Failed to assign ${itemTerminology.singularLower} ID`;
      setAssignmentErrors({ [itemId]: errorMessage });
      toast.error(errorMessage);
    } finally {
      setAssigningItemId(null);
    }
  };

  // Get available item IDs for assignment (not excluded, not already assigned)
  // If currentItemId is provided, include it in available IDs (for reassignment)
  const getAvailableItemIds = (currentItemId = null) => {
    if (!event || !event.itemConfiguration) return [];
    
    // Backend guarantees these values at event creation - no frontend fallbacks needed
    const numberOfItems = event.itemConfiguration.numberOfItems;
    const excludedItemIds = event.itemConfiguration.excludedItemIds || [];
    const assignedItemIds = items
      .filter(item => item.itemId !== null && item.itemId !== undefined)
      .map(item => item.itemId);
    
    const available = [];
    for (let i = 1; i <= numberOfItems; i++) {
      // Include if not excluded and (not assigned OR is the current item's ID for reassignment)
      if (!excludedItemIds.includes(i) && (!assignedItemIds.includes(i) || i === currentItemId)) {
        available.push(i);
      }
    }
    return available;
  };

  // Filter and search items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by status
    if (statusFilter === 'assigned') {
      filtered = filtered.filter(item => item.itemId !== null && item.itemId !== undefined);
    } else if (statusFilter === 'unassigned') {
      filtered = filtered.filter(item => item.itemId === null || item.itemId === undefined);
    }

    // Filter by search query (item name, owner name, and owner email)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(item => {
        // Search in item name
        if (item.name.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search in owner email
        if (item.ownerEmail.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search in owner name (from event.users)
        if (event?.users && event.users[item.ownerEmail]?.name) {
          const ownerName = event.users[item.ownerEmail].name;
          if (ownerName && typeof ownerName === 'string' && ownerName.toLowerCase().includes(query)) {
            return true;
          }
        }
        
        return false;
      });
    }

    return filtered;
  }, [items, searchQuery, statusFilter, event]);

  // Toggle item expansion
  const toggleExpanded = (itemId) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Refresh items when items drawer opens
  useEffect(() => {
    if (openDrawer === 'items') {
      const fetchItems = async () => {
        if (!eventId) return;

        setIsLoadingItems(true);
        setItemsError('');

        try {
          const allItems = await itemService.getItems(eventId);
          setItems(allItems || []);
        } catch (error) {
          console.error('Failed to fetch items:', error);
          setItemsError(error.message || `Failed to load ${itemTerminology.pluralLower}`);
        } finally {
          setIsLoadingItems(false);
        }
      };

      if (eventId) {
        fetchItems();
      }
    }
  }, [openDrawer, eventId, itemTerminology.pluralLower]);

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
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-md mx-auto w-full">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xl font-semibold">Settings</h4>
              {/* Share */}
              <Button
                onClick={handleCopyEventLink}
                variant="outline"
                size="sm"
                className="h-8"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Share link
                  </>
                )}
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {isEditingName ? (
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={editedName}
                    onChange={(e) => {
                      setEditedName(e.target.value);
                      setNameError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSavingName) {
                        handleSaveEventName();
                      } else if (e.key === 'Escape') {
                        handleCancelEditName();
                      }
                    }}
                    disabled={isSavingName}
                    className="font-medium"
                    maxLength={100}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSaveEventName}
                      disabled={isSavingName || !editedName.trim()}
                      size="sm"
                    >
                      {isSavingName ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancelEditName}
                      disabled={isSavingName}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Cancel
                    </Button>
                  </div>
                  {nameError && (
                    <Message type="error" className="text-sm">{nameError}</Message>
                  )}
                  {nameSuccess && (
                    <Message type="success" className="text-sm">{nameSuccess}</Message>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-muted-foreground">
                    <span className="font-medium">{event.name}</span>
                  </p>
                  <Button
                    onClick={handleStartEditName}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    aria-label="Edit event name"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Category Cards */}
          <div className="w-full">
            {/* Items (Configuration & Management) Card */}
            <button
              onClick={() => {
                setOpenDrawer('items');
                // Add to history for browser back navigation
                history.pushState({ drawer: 'items' }, '', window.location.pathname);
              }}
              className="w-full flex items-center justify-between py-4 px-4 border-b hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{itemTerminology.plural}</span>
                  <Badge variant="outline" className="text-xs">
                    {numberOfItems} total
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {itemsSummary.total} registered
                  </Badge>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* Ratings Configuration Card */}
            <button
              onClick={() => {
                setOpenDrawer('ratings-configuration');
                // Add to history for browser back navigation
                history.pushState({ drawer: 'ratings-configuration' }, '', window.location.pathname);
              }}
              className="w-full flex items-center justify-between py-4 px-4 border-b hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Ratings</span>
                  {ratings.length > 0 && (
                    <div className="flex items-center gap-1">
                      {ratings.map((rating) => (
                        <div
                          key={rating.value}
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: rating.color }}
                          title={`Rating ${rating.value}: ${rating.label}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* State Management Card */}
            <button
              onClick={() => {
                setOpenDrawer('state');
                history.pushState({ drawer: 'state' }, '', window.location.pathname);
              }}
              className="w-full flex items-center justify-between py-4 px-4 border-b hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">State</span>
                  <StateBadge state={event.state} />
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* PIN Management Card */}
            <button
              onClick={() => {
                setOpenDrawer('pin');
                // Add to history for browser back navigation
                history.pushState({ drawer: 'pin' }, '', window.location.pathname);
              }}
              className="w-full flex items-center justify-between py-4 px-4 border-b hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex flex-col items-start text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">PIN</span>
                  {event.pin && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {event.pin}
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* Administrators Management Card */}
            <button
              onClick={() => {
                setOpenDrawer('administrators');
                history.pushState({ drawer: 'administrators' }, '', window.location.pathname);
              }}
              className="w-full flex items-center justify-between py-4 px-4 border-b hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold">Administrators</span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>

            {/* Export Data Card */}
            {isCurrentUserAdministrator() && (
              <button
                onClick={() => {
                  setOpenDrawer('export-data');
                  // Add to history for browser back navigation
                  history.pushState({ drawer: 'export-data' }, '', window.location.pathname);
                }}
                className="w-full flex items-center justify-between py-4 px-4 border-b hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span className="font-semibold">Export Data</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}

            {/* Danger Zone Card */}
            {isCurrentUserAdministrator() && (
              <button
                onClick={() => {
                  setOpenDrawer('danger-zone');
                  // Add to history for browser back navigation
                  history.pushState({ drawer: 'danger-zone' }, '', window.location.pathname);
                }}
                className="w-full flex items-center justify-between py-4 px-4 border-b hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-semibold text-destructive">Danger Zone</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Side Drawers */}
      {/* Items Drawer (Configuration & Assignment Tabs) */}
      <SideDrawer
        isOpen={openDrawer === 'items'}
        onClose={() => {
          // Check if current history state has a drawer that matches the open drawer
          // Only go back if we're on a drawer state we created
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
        title={itemTerminology.plural}
        width="w-full max-w-4xl"
      >
        <Tabs value={itemsTab} onValueChange={setItemsTab} className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="configuration" className="flex-1">Configuration</TabsTrigger>
            <TabsTrigger value="assignment" className="flex-1">Assignment</TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-4">
            <div className="text-sm text-muted-foreground font-normal">
              Configure the number of {itemTerminology.pluralLower} and specify which {itemTerminology.singularLower} IDs to exclude from the event
            </div>
            {/* Number of items input */}
            <div>
              <label className="text-sm font-medium">Number of {itemTerminology.plural}</label>
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
                {itemTerminology.plural} will be numbered from 1 to {numberOfItems || 20} (default: 20, max: 100)
              </p>
            </div>

            {/* Excluded item IDs input */}
            <div>
              <label className="text-sm font-medium">Excluded {itemTerminology.singular} IDs</label>
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
                Comma-separated list of {itemTerminology.singularLower} IDs to exclude (e.g., "5,10,15")
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
          </TabsContent>

          {/* Assignment Tab */}
          <TabsContent value="assignment" className="space-y-4">
            <div className="text-sm text-muted-foreground font-normal">
              Summary of registered {itemTerminology.pluralLower} and {itemTerminology.singularLower} ID assignments.
            </div>

          {/* Items error */}
          {itemsError && (
            <Message type="error">{itemsError}</Message>
          )}

          {/* State warning */}
          {(() => {
            const isPaused = event?.state === 'paused';
            return !isPaused && (
              <Message type="warning">
                {itemTerminology.singular} ID assignment is only available when the event is in "paused" state.
                Current state: <strong>{event?.state || 'unknown'}</strong>
              </Message>
            );
          })()}

          {/* Summary statistics */}
          {items.length > 0 && (
            <div className="text-sm space-y-1">
              <div>Total {itemTerminology.plural}: <strong>{itemsSummary.total}</strong></div>
              <div>Assigned: <strong>{itemsSummary.assigned}</strong></div>
              <div>Unassigned: <strong>{itemsSummary.unassigned}</strong></div>
              <div>Available IDs: <strong>{getAvailableItemIds().length}</strong></div>
            </div>
          )}

          {/* Search and Filter Controls */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {/* Status Filter */}
                <div className="relative flex-1">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 pl-9 pr-3 text-sm border rounded-md bg-background w-full"
                  >
                    <option value="all">All {itemTerminology.plural}</option>
                    <option value="assigned">Assigned Only</option>
                    <option value="unassigned">Unassigned Only</option>
                  </select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {filteredItems.length} of {items.length} {itemTerminology.pluralLower}
              </div>
            </div>
          )}

          {/* Items list */}
          {isLoadingItems ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 border rounded-md">
              No {itemTerminology.pluralLower} registered yet.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 border rounded-md">
              No {itemTerminology.pluralLower} match your search criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const isPaused = event?.state === 'paused';
                return filteredItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const hasItemId = item.itemId !== null && item.itemId !== undefined;
                
                return (
                  <div
                    key={item.id}
                    className="border rounded-md hover:shadow-sm transition-shadow"
                  >
                    {/* Compact Row */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm truncate">{item.name}</span>
                            {hasItemId ? (
                              <Badge variant="outline" className="font-mono flex-shrink-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                                {itemTerminology.singular} ID: {item.itemId}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="flex-shrink-0 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
                                Not assigned
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.ownerEmail} • {new Date(item.registeredAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-4 space-y-3">
                        {/* Price */}
                        {item.price !== null && item.price !== undefined && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-24">Price:</span>
                            <span className="text-sm">
                              ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                            </span>
                          </div>
                        )}

                        {/* Description */}
                        {item.description && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Description:</span>
                            <p className="text-sm mt-1">{item.description}</p>
                          </div>
                        )}

                        {/* Assignment Section (only when paused) */}
                        {isPaused && (
                          <div className="pt-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {hasItemId ? 'Change' : 'Assign'} {itemTerminology.singular} ID:
                              </label>
                              <div className="flex items-center gap-2">
                                <select
                                  className="h-9 px-3 text-sm border rounded-md flex-1 max-w-xs"
                                  value={hasItemId ? item.itemId : ''}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                    // Trigger assignment if value changed (including clearing)
                                    if (value !== item.itemId) {
                                      handleAssignItemId(item.id, value);
                                    }
                                  }}
                                  disabled={assigningItemId === item.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="">{hasItemId ? 'Clear assignment' : 'Select ID'}</option>
                                  {getAvailableItemIds(item.itemId).map(id => (
                                    <option key={id} value={id}>
                                      {id}{id === item.itemId ? ' (current)' : ''}
                                    </option>
                                  ))}
                                </select>
                                {assigningItemId === item.id && (
                                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                              {hasItemId && (
                                <div className="text-xs text-muted-foreground">
                                  Currently assigned: <strong>{item.itemId}</strong>. Select a different ID to change it, or select "Clear assignment" to remove it.
                                </div>
                              )}
                              {assignmentErrors[item.id] && (
                                <div className="text-xs text-destructive mt-1">
                                  {assignmentErrors[item.id]}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
                });
              })()}
              {event?.state === 'paused' && (
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md mt-4">
                  <p className="font-medium mb-1">Available IDs: {getAvailableItemIds().join(', ') || 'None'}</p>
                  <p>{itemTerminology.singular} ID assignment is only available when the event is in "paused" state.</p>
                </div>
              )}
            </div>
          )}
          </TabsContent>
        </Tabs>
      </SideDrawer>

      {/* Ratings Configuration Drawer */}
      <SideDrawer
        isOpen={openDrawer === 'ratings-configuration'}
        onClose={() => {
          // Check if current history state has a drawer that matches the open drawer
          // Only go back if we're on a drawer state we created
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
        title="Rating Configuration"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground font-normal">
            Configure how items are rated, including the rating scale, labels, and colors
          </div>
          {event?.state !== 'created' && (
            <Message type="info">
              Rating configuration can only be edited when the event is in "created" state.
            </Message>
          )}
          {/* Max Rating Input */}
          <div>
            <label className="text-sm font-medium">Maximum Rating</label>
            <Input
              type="number"
              min="2"
              max="4"
              value={maxRating}
              onChange={(e) => {
                const value = e.target.value;
                setMaxRating(value);
                setMaxRatingError('');
                setRatingConfigError('');
              }}
              onBlur={(e) => {
                const value = parseInt(e.target.value, 10);
                if (isNaN(value) || value < 2 || value > 4) {
                  setMaxRatingError('Maximum rating must be between 2 and 4');
                } else {
                  setMaxRatingError('');
                }
              }}
              disabled={isSavingRatingConfig || (event?.state !== 'created')}
              className="mt-1"
            />
            {maxRatingError && (
              <p className="text-xs text-red-600 mt-1">{maxRatingError}</p>
            )}
            {!maxRatingError && event?.state === 'created' && (
              <p className="text-xs text-muted-foreground mt-1">
                Rating scale will be from 1 (lowest/worst) to {maxRating || 4} (highest/best)
              </p>
            )}
          </div>

          {/* Ratings Configuration */}
          {ratings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Rating Levels</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToDefaults}
                  disabled={isSavingRatingConfig || (event?.state !== 'created')}
                >
                  Reset to Defaults
                </Button>
              </div>
              <div className="space-y-3">
                {ratings.map((rating) => (
                  <div key={rating.value} className="py-1">
                    <div className="mb-2">
                      <span className="text-sm font-medium">Rating {rating.value}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          type="text"
                          value={rating.label}
                          onChange={(e) => handleLabelChange(rating.value, e.target.value)}
                          onBlur={(e) => handleLabelBlur(rating.value, e.target.value)}
                          disabled={isSavingRatingConfig || (event?.state !== 'created')}
                          maxLength={50}
                          className="h-9"
                        />
                        {labelErrors[rating.value] && (
                          <p className="text-xs text-red-600 mt-0.5">{labelErrors[rating.value]}</p>
                        )}
                        {!labelErrors[rating.value] && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {rating.label.length}/50 characters
                          </p>
                        )}
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleColorDropdown(rating.value)}
                          disabled={isSavingRatingConfig || (event?.state !== 'created')}
                          className="flex h-9 w-12 items-center justify-center gap-1 rounded-md border border-input bg-transparent px-1.5 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div
                            className="w-5 h-5 rounded border border-gray-300"
                            style={{ backgroundColor: rating.color }}
                          />
                          <svg
                            className={`h-3 w-3 transition-transform ${openColorDropdowns[rating.value] ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openColorDropdowns[rating.value] && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => toggleColorDropdown(rating.value)}
                            />
                            <div className="absolute z-20 right-0 mt-1 rounded-md border border-input bg-background shadow-lg p-1">
                              <div className="flex gap-1">
                                {COLOR_PALETTE.map((colorOption) => (
                                  <button
                                    key={colorOption.value}
                                    type="button"
                                    onClick={() => handleColorChange(rating.value, colorOption.value)}
                                    className={`w-8 h-8 rounded border-2 transition-all flex-shrink-0 ${
                                      rating.color === colorOption.value
                                        ? 'border-gray-900 scale-110 ring-2 ring-gray-400'
                                        : 'border-gray-300 hover:border-gray-500'
                                    }`}
                                    style={{ backgroundColor: colorOption.value }}
                                    title={colorOption.label}
                                  />
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {colorErrors[rating.value] && (
                      <p className="text-xs text-red-600 mt-0.5">{colorErrors[rating.value]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note Suggestions Toggle - Only for wine events */}
          {event?.typeOfItem === 'wine' && (
            <div className="flex items-center justify-between py-3 border-t">
              <div className="flex flex-col">
                <label className="text-sm font-medium">Note Suggestions</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable contextual note suggestions when rating wine items
                </p>
              </div>
              <Switch
                checked={noteSuggestionsEnabled}
                onCheckedChange={setNoteSuggestionsEnabled}
                disabled={isSavingRatingConfig || (event?.state !== 'created')}
              />
            </div>
          )}

          {/* Messages */}
          {ratingConfigError && (
            <Message type="error">{ratingConfigError}</Message>
          )}
          {ratingConfigSuccess && (
            <Message type="success">{ratingConfigSuccess}</Message>
          )}

          {/* Save button */}
          <Button
            onClick={handleSaveRatingConfiguration}
            disabled={isSavingRatingConfig || !maxRating || maxRatingError || (event?.state !== 'created')}
            className="w-full"
          >
            {isSavingRatingConfig ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Rating Configuration'
            )}
          </Button>
        </div>
      </SideDrawer>

      {/* State Management Drawer */}
      <SideDrawer
        isOpen={openDrawer === 'state'}
        onClose={() => {
          // Check if current history state has a drawer that matches the open drawer
          // Only go back if we're on a drawer state we created
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
        title="State"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground font-normal">
            Manage the state of this event. The event can be started, paused, or completed.
          </div>
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
        </div>
      </SideDrawer>

      {/* PIN Management Drawer */}
      <SideDrawer
        isOpen={openDrawer === 'pin'}
        onClose={() => {
          // Check if current history state has a drawer that matches the open drawer
          // Only go back if we're on a drawer state we created
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
        title="PIN"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground font-normal">
            Share this PIN with users to grant access to this event
          </div>
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
        </div>
      </SideDrawer>

      {/* Administrators Management Drawer */}
      <SideDrawer
        isOpen={openDrawer === 'administrators'}
        onClose={() => {
          // Check if current history state has a drawer that matches the open drawer
          // Only go back if we're on a drawer state we created
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
        title="Administrators"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground font-normal">
            Manage administrators for this event. The owner cannot be removed.
          </div>
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
        </div>
      </SideDrawer>

      {/* Export Data Drawer */}
      {isCurrentUserAdministrator() && (
        <SideDrawer
          isOpen={openDrawer === 'export-data'}
          onClose={() => {
          // Check if current history state has a drawer that matches the open drawer
          // Only go back if we're on a drawer state we created
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
          title="Export Data"
        >
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground font-normal">
              Export event data as CSV files for analysis and backup purposes.
            </div>

            {exportRatingsError && (
              <Message type="error">{exportRatingsError}</Message>
            )}

            {exportRatingsSuccess && (
              <Message type="success">{exportRatingsSuccess}</Message>
            )}

            {exportMatrixError && (
              <Message type="error">{exportMatrixError}</Message>
            )}

            {exportMatrixSuccess && (
              <Message type="success">{exportMatrixSuccess}</Message>
            )}

            {exportUsersError && (
              <Message type="error">{exportUsersError}</Message>
            )}

            {exportUsersSuccess && (
              <Message type="success">{exportUsersSuccess}</Message>
            )}

            {exportItemsError && (
              <Message type="error">{exportItemsError}</Message>
            )}

            {exportItemsSuccess && (
              <Message type="success">{exportItemsSuccess}</Message>
            )}

            {/* Raw Ratings Data Export */}
            <div className="p-4 border rounded-lg">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Raw Ratings Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Export all ratings data including username, email, timestamp, {itemTerminology.singularLower} ID, rating, and notes.
                  </p>
                </div>
                <Button
                  onClick={handleExportRatings}
                  disabled={isExportingRatings || isExportingMatrix || isExportingUsers || isExportingItems}
                  className="w-full sm:w-auto"
                >
                  {isExportingRatings ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Ratings Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Ratings Matrix Export */}
            <div className="p-4 border rounded-lg">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">Ratings Matrix</h4>
                  <p className="text-sm text-muted-foreground">
                    Export a matrix showing {itemTerminology.singularLower}-to-user ratings with average and weighted ratings for each {itemTerminology.singularLower}. Weighted rating uses the Bayesian formula (same as dashboard) that accounts for {itemTerminology.pluralLower} with fewer ratings.
                  </p>
                </div>
                <Button
                  onClick={handleExportMatrix}
                  disabled={isExportingMatrix || isExportingRatings || isExportingUsers || isExportingItems}
                  className="w-full sm:w-auto"
                >
                  {isExportingMatrix ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Ratings Matrix
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* User Data Export */}
            <div className="p-4 border rounded-lg">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">User Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Export all user data including email, username, registration date, administrator status, {itemTerminology.pluralLower} registered (with IDs and names), ratings given, and average rating given.
                  </p>
                </div>
                <Button
                  onClick={handleExportUsers}
                  disabled={isExportingUsers || isExportingRatings || isExportingMatrix || isExportingItems}
                  className="w-full sm:w-auto"
                >
                  {isExportingUsers ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export User Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Item Details Export */}
            <div className="p-4 border rounded-lg">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-1">{itemTerminology.singular} Details</h4>
                  <p className="text-sm text-muted-foreground">
                    Export all {itemTerminology.pluralLower} (including unregistered) with details including {itemTerminology.singularLower} ID, name, price, description, owner information, and complete rating statistics (number of raters, average rating, weighted average, rating progression, and rating distribution). Unregistered {itemTerminology.pluralLower} will have empty values for name, price, description, and owner information.
                  </p>
                </div>
                <Button
                  onClick={handleExportItems}
                  disabled={isExportingItems || isExportingRatings || isExportingMatrix || isExportingUsers}
                  className="w-full sm:w-auto"
                >
                  {isExportingItems ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export {itemTerminology.singular} Details
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SideDrawer>
      )}

      {/* Danger Zone Drawer */}
      {isCurrentUserAdministrator() && (
        <SideDrawer
          isOpen={openDrawer === 'danger-zone'}
          onClose={() => {
          // Check if current history state has a drawer that matches the open drawer
          // Only go back if we're on a drawer state we created
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
          title="Danger Zone"
        >
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground font-normal">
              Irreversible and destructive actions. Only event administrators can perform these actions.
            </div>

            {deleteEventError && (
              <Message type="error">{deleteEventError}</Message>
            )}

            {deleteRatingsError && (
              <Message type="error">{deleteRatingsError}</Message>
            )}

            {deleteRatingsSuccess && (
              <Message type="success">{deleteRatingsSuccess}</Message>
            )}

            {deleteUsersError && (
              <Message type="error">{deleteUsersError}</Message>
            )}

            {deleteUsersSuccess && (
              <Message type="success">{deleteUsersSuccess}</Message>
            )}

            {deleteUserError && (
              <Message type="error">{deleteUserError}</Message>
            )}

            {deleteUserSuccess && (
              <Message type="success">{deleteUserSuccess}</Message>
            )}

            {/* Users Management Section */}
            {isCurrentUserAdministrator() && (
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-destructive mb-1">Users Management</h4>
                    <p className="text-sm text-muted-foreground">
                      Delete individual users and all their associated data. Administrators can be deleted except the owner or last administrator.
                    </p>
                  </div>
                  
                  {getAllUsersWithStats().length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No users found.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <select
                        data-testid="user-select"
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedUserEmail}
                        onChange={(e) => setSelectedUserEmail(e.target.value)}
                        disabled={isDeletingUser}
                      >
                        <option value="">Select a user to delete...</option>
                        {getAllUsersWithStats().map((user) => {
                          const canDelete = !user.isOwner && 
                            !(user.isAdministrator && Object.keys(administrators || {}).length <= 1);
                          
                          if (!canDelete) return null;
                          
                          const displayText = user.name 
                            ? `${user.name} (${user.email})`
                            : user.email;
                          
                          return (
                            <option key={user.email} value={user.email}>
                              {displayText}
                            </option>
                          );
                        })}
                      </select>
                      <Button
                        data-testid="delete-user-button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (selectedUserEmail) {
                            const user = getAllUsersWithStats().find(u => u.email === selectedUserEmail);
                            if (user) {
                              handleOpenDeleteUserDialog(user.email, user.name, user.isAdministrator);
                              setSelectedUserEmail('');
                            }
                          }
                        }}
                        disabled={!selectedUserEmail || isDeletingUser}
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delete All Users Section */}
            {isCurrentUserAdministrator() && (
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-destructive mb-1">Delete All Users</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete all users (excluding administrators) and all their associated data including items, ratings, bookmarks, and profiles.
                    </p>
                    {getNonAdminUserCount() > 0 && (
                      <p className="text-sm font-medium text-foreground mt-1">
                        {getNonAdminUserCount()} user(s) will be deleted.
                      </p>
                    )}
                  </div>
                  <Button
                    data-testid="delete-all-users-button"
                    variant="destructive"
                    onClick={() => setIsDeleteUsersDialogOpen(true)}
                    disabled={isDeletingUsers || getNonAdminUserCount() === 0}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Users
                  </Button>
                  {getNonAdminUserCount() === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No users to delete (only administrators exist).
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Delete All Ratings Section */}
            {isCurrentUserAdministrator() && (
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-destructive mb-1">Delete All Ratings</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete all ratings and bookmarks for this event. Event configuration and items will remain unchanged.
                    </p>
                  </div>
                  <Button
                    data-testid="delete-all-ratings-button"
                    variant="destructive"
                    onClick={() => setIsDeleteRatingsDialogOpen(true)}
                    disabled={isDeletingRatings}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Ratings
                  </Button>
                </div>
              </div>
            )}

            {/* Delete Event Section - Owner Only */}
            {isCurrentUserOwner() && (
              <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-destructive mb-1">Delete Event</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this event and all of its data. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    data-testid="delete-event-button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isDeletingEvent}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Event
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SideDrawer>
      )}

      {/* Delete Event Dialog */}
      <DeleteEventDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          if (!isDeletingEvent) {
            setIsDeleteDialogOpen(false);
            setDeleteEventError('');
          }
        }}
        onConfirm={handleDeleteEvent}
        eventName={event?.name || eventId}
        isDeleting={isDeletingEvent}
      />

      {/* Delete Ratings Dialog */}
      <DeleteRatingsDialog
        isOpen={isDeleteRatingsDialogOpen}
        onClose={() => {
          if (!isDeletingRatings) {
            setIsDeleteRatingsDialogOpen(false);
            setDeleteRatingsError('');
          }
        }}
        onConfirm={handleDeleteAllRatings}
        eventName={event?.name || eventId}
        isDeleting={isDeletingRatings}
      />

      {/* Delete All Users Dialog */}
      <DeleteAllUsersDialog
        isOpen={isDeleteUsersDialogOpen}
        onClose={() => {
          if (!isDeletingUsers) {
            setIsDeleteUsersDialogOpen(false);
            setDeleteUsersError('');
          }
        }}
        onConfirm={handleDeleteAllUsers}
        eventName={event?.name || eventId}
        userCount={getNonAdminUserCount()}
        isDeleting={isDeletingUsers}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        isOpen={deleteUserDialogState.isOpen}
        onClose={() => {
          if (!isDeletingUser) {
            setDeleteUserDialogState({
              isOpen: false,
              userEmail: null,
              userName: null,
              itemsCount: 0,
              ratingsCount: 0,
              isAdministrator: false
            });
            setDeleteUserError('');
          }
        }}
        onConfirm={handleDeleteUser}
        userEmail={deleteUserDialogState.userEmail || ''}
        userName={deleteUserDialogState.userName}
        itemsCount={deleteUserDialogState.itemsCount}
        ratingsCount={deleteUserDialogState.ratingsCount}
        isAdministrator={deleteUserDialogState.isAdministrator}
        isDeleting={isDeletingUser}
      />
    </div>
  );
}

export default EventAdminPage;
