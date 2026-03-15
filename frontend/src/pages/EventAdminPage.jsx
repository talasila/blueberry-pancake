import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Copy, Check, Trash2, X, AlertTriangle, Download, Search, Palette, LayoutList, Star, ShieldCheck, Users, UserPlus, Share2 } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import SideDrawer from '@/components/SideDrawer';
import { cn } from '@/lib/utils';
import { isValidEmailFormat, clearSuccessMessage, downloadCSV } from '@/utils/helpers';
import { calculateWeightedAverage } from '@/utils/bayesianAverage';
import { useItemTerminology } from '@/utils/itemTerminology';
import itemService from '@/services/itemService';
import { ratingService } from '@/services/ratingService';
import DeleteEventDialog from '@/components/DeleteEventDialog';
import DeleteRatingsDialog from '@/components/DeleteRatingsDialog';
import DeleteAllUsersDialog from '@/components/DeleteAllUsersDialog';
import DeleteUserDialog from '@/components/DeleteUserDialog';
import { toast } from 'sonner';
import AssignmentView from '@/components/AssignmentView';
import ListCard from '@/components/ListCard';
import SettingsRow from '@/components/SettingsRow';
import EventProgressStepper from '@/components/EventProgressStepper';
import WelcomeBottomSheet from '@/components/WelcomeBottomSheet';
import ThemePicker from '@/components/ThemePicker';
import { getPreset } from '@/utils/themePresets';
import InviteQRCard from '@/components/InviteQRCard';
import { formatInvitationMessage, downloadQRImage } from '@/utils/inviteUtils';

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

function EventAdminPage({ onOpenAdminGuide }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { event: contextEvent, refetch } = useEventContext();
  const { event: polledEvent } = useEventPolling(eventId);
  const [event, setEvent] = useState(contextEvent);
  const [pendingTheme, setPendingTheme] = useState(null);
  const itemTerminology = useItemTerminology(event);
  const [isLoading, setIsLoading] = useState(!contextEvent);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState('');
  const [regenerateSuccess, setRegenerateSuccess] = useState('');
  const [invitationCopied, setInvitationCopied] = useState(false);
  const qrCanvasRef = useRef(null);
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
  const [numberOfItems, setNumberOfItems] = useState(20);
  const [excludedItemIds, setExcludedItemIds] = useState([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const saveNameRef = useRef(null);
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
  const [itemsTab, setItemsTab] = useState('configuration'); // 'configuration' or 'assignment'
  
  
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
  // Guests drawer state
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [guestRegistrationFilter, setGuestRegistrationFilter] = useState('all'); // 'all' | 'registered' | 'unregistered'
  const [isRefreshingGuests, setIsRefreshingGuests] = useState(false);
  
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

  // Check for OTP authentication - admin pages require OTP even if accessed via PIN
  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      navigate('/auth', { 
        state: { from: { pathname: `/event/${eventId}/admin` } },
        replace: true 
      });
    } else {
      setCurrentUserEmail(apiClient.getUserEmail());
    }
  }, [eventId, navigate]);

  const [showWelcome, setShowWelcome] = useState(() => !!location.state?.eventCreated);

  const handleWelcomeDismiss = useCallback(() => {
    setShowWelcome(false);
    window.history.replaceState({}, document.title);
  }, []);

  const handleOpenGuideFromWelcome = useCallback(() => {
    setShowWelcome(false);
    window.history.replaceState({}, document.title);
    if (onOpenAdminGuide) onOpenAdminGuide();
  }, [onOpenAdminGuide]);

  // Handle browser back/forward navigation (popstate) — always close all drawers
  useEffect(() => {
    const handlePopState = () => {
      setOpenDrawer(null);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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

  // Clear optimistic theme override once polling confirms the change
  useEffect(() => {
    if (pendingTheme && event?.theme === pendingTheme) {
      setPendingTheme(null);
    }
  }, [event?.theme, pendingTheme]);

  // Keep the local name in sync with server unless the user is mid-save
  useEffect(() => {
    if (event && !isSavingName) {
      setEditedName(event.name || '');
    }
  }, [event?.name]);

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
    let cancelled = false;
    const fetchItems = async () => {
      if (!eventId) return;

      setIsLoadingItems(true);
      setItemsError('');

      try {
        const allItems = await itemService.getItems(eventId);
        if (cancelled) return;
        setItems(allItems || []);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch items:', error);
        setItemsError(error.message || 'Failed to load items');
      } finally {
        if (!cancelled) setIsLoadingItems(false);
      }
    };

    if (eventId) {
      fetchItems();
    }
    return () => { cancelled = true; };
  }, [eventId]);

  // Calculate summary statistics
  const itemsSummary = {
    total: items.length,
    assigned: items.filter(item => item.itemId !== null && item.itemId !== undefined).length,
    unassigned: items.filter(item => item.itemId === null || item.itemId === undefined).length
  };

  // Fetch item configuration on load
  useEffect(() => {
    let cancelled = false;
    const fetchItemConfiguration = async () => {
      if (!eventId) return;
      
      try {
        const config = await apiClient.getItemConfiguration(eventId);
        if (cancelled) return;
        setNumberOfItems(config.numberOfItems);
        setExcludedItemIds(config.excludedItemIds || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch item configuration:', error);
        }
      }
    };

    fetchItemConfiguration();
    return () => { cancelled = true; };
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

  // Handle save item configuration (called automatically on changes)
  const saveItemConfigRef = useRef(null);
  const handleSaveItemConfiguration = useCallback(async (count, excluded) => {
    const parsed = parseInt(count, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) return;

    setIsSavingConfig(true);
    try {
      const result = await apiClient.updateItemConfiguration(eventId, {
        numberOfItems: parsed,
        excludedItemIds: excluded,
      });

      setNumberOfItems(result.numberOfItems);
      setExcludedItemIds(result.excludedItemIds || []);
      setEvent(prev => prev ? {
        ...prev,
        itemConfiguration: {
          ...prev.itemConfiguration,
          numberOfItems: result.numberOfItems,
          excludedItemIds: result.excludedItemIds || []
        }
      } : prev);

      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(`${itemTerminology.singular} configuration saved`);
      }
    } catch (error) {
      toast.error(error.message || `Failed to save ${itemTerminology.singularLower} configuration`);
    } finally {
      setIsSavingConfig(false);
    }
  }, [eventId, itemTerminology]);

  const debouncedSaveConfig = useCallback((count) => {
    if (saveItemConfigRef.current) clearTimeout(saveItemConfigRef.current);
    saveItemConfigRef.current = setTimeout(() => {
      const parsed = parseInt(count, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 100) return;
      setExcludedItemIds(prev => {
        const kept = prev.filter(id => id <= parsed);
        handleSaveItemConfiguration(parsed, kept);
        return kept;
      });
    }, 800);
  }, [handleSaveItemConfiguration]);

  const handleNumberOfItemsChange = useCallback((value) => {
    setNumberOfItems(value);
    debouncedSaveConfig(value);
  }, [debouncedSaveConfig]);

  const handleToggleExcludedId = useCallback((id) => {
    const next = excludedItemIds.includes(id)
      ? excludedItemIds.filter(x => x !== id)
      : [...excludedItemIds, id].sort((a, b) => a - b);
    setExcludedItemIds(next);
    handleSaveItemConfiguration(numberOfItems, next);
  }, [excludedItemIds, numberOfItems, handleSaveItemConfiguration]);

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

  const saveName = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === event?.name) return;
    if (trimmed.length > 100) {
      toast.error('Event name must be 100 characters or less');
      setEditedName(event.name);
      return;
    }

    setIsSavingName(true);
    try {
      const updatedEvent = await apiClient.updateEventName(eventId, trimmed);
      setEvent(updatedEvent);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to update event name');
      setEditedName(event.name);
    } finally {
      setIsSavingName(false);
    }
  }, [event?.name, eventId]);

  const handleNameChange = useCallback((value) => {
    setEditedName(value);
    setNameSaved(false);
    if (saveNameRef.current) clearTimeout(saveNameRef.current);
    saveNameRef.current = setTimeout(() => saveName(value), 800);
  }, [saveName]);

  const handleNameBlur = useCallback(() => {
    if (saveNameRef.current) clearTimeout(saveNameRef.current);
    saveName(editedName);
  }, [editedName, saveName]);

  const handleThemeChange = async (newTheme) => {
    setPendingTheme(newTheme);
    try {
      await apiClient.updateTheme(eventId, newTheme);
      refetch();
      toast.success('Theme updated');
    } catch (error) {
      setPendingTheme(null);
      toast.error(error.message || 'Failed to update theme');
    }
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
      
      const userItemNames = userItems.map(item => item.name).filter(Boolean);

      return {
        email,
        normalizedEmail,
        name: userData?.name || null,
        registeredAt: userData?.registeredAt || null,
        isAdministrator: isAdmin,
        isOwner,
        itemsCount: userItems.length,
        itemNames: userItemNames,
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

  const refreshGuestsData = async () => {
    setIsRefreshingGuests(true);
    try {
      const refreshedEvent = await apiClient.getEvent(eventId);
      setEvent(refreshedEvent);
      const allItems = await itemService.getItems(eventId);
      setItems(allItems || []);
      await fetchAdministrators();
    } catch (error) {
      console.error('Failed to refresh guests data:', error);
    } finally {
      setIsRefreshingGuests(false);
    }
  };

  useEffect(() => {
    if (openDrawer === 'guests' && eventId) {
      refreshGuestsData();
    }
  }, [openDrawer === 'guests']);

  const filteredGuests = useMemo(() => {
    let guests = getAllUsersWithStats();
    if (guestRegistrationFilter === 'registered') {
      guests = guests.filter(g => g.itemsCount > 0);
    } else if (guestRegistrationFilter === 'unregistered') {
      guests = guests.filter(g => g.itemsCount === 0);
    }
    if (!guestSearchQuery.trim()) return guests;
    const query = guestSearchQuery.trim().toLowerCase();
    return guests.filter(guest => {
      if (guest.name?.toLowerCase().includes(query)) return true;
      if (guest.email.toLowerCase().includes(query)) return true;
      if (guest.itemNames.some(name => name.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [event?.users, items, administrators, guestSearchQuery, guestRegistrationFilter]);

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

  const handleStateTransition = async (newState) => {
    if (!event) return;

    setIsTransitioning(true);
    try {
      const updatedEvent = await apiClient.transitionEventState(eventId, newState, event.state);
      setEvent(updatedEvent);
      toast.success('Event state updated');
    } catch (error) {
      if (error.status === 409) {
        toast.error('State changed by another admin. Refreshing…');
        try {
          const refreshedEvent = await apiClient.getEvent(eventId);
          setEvent(refreshedEvent);
        } catch {
          toast.error('Failed to refresh. Please reload the page.');
        }
      } else {
        toast.error(error.message || 'Failed to transition state. Please try again.');
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAssignItemId = async (itemId, itemIdToAssign) => {
    if (!eventId) return;
    const updatedItem = await itemService.assignItemId(eventId, itemId, itemIdToAssign);
    if (itemIdToAssign === null) {
      toast.success(`${itemTerminology.singular} ID assignment cleared`);
    } else {
      toast.success(`${itemTerminology.singular} ID ${itemIdToAssign} assigned successfully`);
    }
    return updatedItem;
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

  const openDrawerWithHistory = (drawer) => {
    setOpenDrawer(drawer);
    history.pushState({ drawer }, '', window.location.pathname);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-md mx-auto w-full">
        <div className="space-y-6">
          {/* Header: inline-editable event name */}
          <div>
            <Input
              value={editedName}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') {
                  if (saveNameRef.current) clearTimeout(saveNameRef.current);
                  setEditedName(event.name);
                  e.target.blur();
                }
              }}
              disabled={isSavingName}
              maxLength={100}
              className="text-base font-semibold border-transparent bg-transparent px-0 h-auto py-0 focus-visible:border-input focus-visible:bg-background focus-visible:px-3 focus-visible:py-1.5 transition-all truncate"
              aria-label="Event name"
            />
            {(nameSaved || isSavingName) && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                {nameSaved ? (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Saved</span>
                  </>
                ) : (
                  'Saving\u2026'
                )}
              </p>
            )}
          </div>

          {/* Event Progress Stepper */}
          <div className="rounded-xl border-2 border-primary/30 ring-1 ring-primary/10 bg-card px-4 py-3">
            <EventProgressStepper
              event={event}
              isTransitioning={isTransitioning}
              onTransition={handleStateTransition}
            />
          </div>

          {/* Settings rows */}
          <div className="w-full border-t">
            <SettingsRow
              icon={<UserPlus className="h-4 w-4" />}
              label="Invite"
              badge={event.pin ? <Badge variant="outline" className="font-mono text-xs">{event.pin}</Badge> : null}
              onClick={() => openDrawerWithHistory('invite')}
            />
            <SettingsRow
              icon={<Palette className="h-4 w-4" />}
              label="Mood"
              badge={event.theme ? <Badge variant="outline" className="text-xs">{getPreset(event.theme).name}</Badge> : null}
              onClick={() => openDrawerWithHistory('theme')}
            />
            <SettingsRow
              icon={<LayoutList className="h-4 w-4" />}
              label={itemTerminology.plural}
              badge={
                <>
                  <Badge variant="outline" className="text-xs">{parseInt(numberOfItems, 10) - excludedItemIds.length} for rating</Badge>
                  <Badge variant="outline" className="text-xs">{itemsSummary.total} registered</Badge>
                </>
              }
              onClick={() => openDrawerWithHistory('items')}
            />
            <SettingsRow
              icon={<Star className="h-4 w-4" />}
              label="Ratings"
              onClick={() => openDrawerWithHistory('ratings-configuration')}
            />
            <SettingsRow
              icon={<Users className="h-4 w-4" />}
              label="Guests"
              badge={<Badge variant="outline">{getNonAdminUserCount()} registered</Badge>}
              onClick={() => openDrawerWithHistory('guests')}
            />
            <SettingsRow
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Administrators"
              onClick={() => openDrawerWithHistory('administrators')}
            />

            {isCurrentUserAdministrator() && (
              <>
                <SettingsRow
                  icon={<Download className="h-4 w-4" />}
                  label="Export Data"
                  onClick={() => openDrawerWithHistory('export-data')}
                />
                <SettingsRow
                  icon={<AlertTriangle className="h-4 w-4" />}
                  label="Danger Zone"
                  variant="destructive"
                  onClick={() => openDrawerWithHistory('danger-zone')}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Side Drawers */}
      {/* Theme Drawer */}
      <SideDrawer
        isOpen={openDrawer === 'theme'}
        onClose={() => setOpenDrawer(null)}
        title="Mood"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set the vibe for your event. Pick a mood and your guests will see it reflected throughout the experience.
          </p>
          {event?.state !== 'created' && event?.state !== 'paused' && (
            <Message type="info" className="text-sm">
              Theme can only be changed before the event is started or while paused.
            </Message>
          )}
          <ThemePicker
            selectedTheme={pendingTheme || event?.theme || 'classic'}
            onSelect={handleThemeChange}
            disabled={event?.state !== 'created' && event?.state !== 'paused'}
          />
        </div>
      </SideDrawer>

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
            {(() => {
              const isEditable = event?.state === 'created' || event?.state === 'started';
              const count = parseInt(numberOfItems, 10);
              const validCount = !isNaN(count) && count >= 1;
              const ids = validCount ? Array.from({ length: Math.min(count, 100) }, (_, i) => i + 1) : [];
              const activeCount = ids.length - excludedItemIds.length;

              return (
                <>
                  <p className="text-sm text-muted-foreground">
                    Set the highest number you want to assign to a {itemTerminology.singularLower} — your numbers will go from 1 up to that value.
                    Then mark any that aren't in use so they won't appear on the rating screen.
                    {' '}<span className="font-semibold text-foreground">You can adjust both until the event is paused.</span> Changes save automatically.
                  </p>

                  {!isEditable && (
                    <Message type="info">
                      Configuration is locked while the event is {event?.state}.
                    </Message>
                  )}

                  {/* Total IDs input */}
                  <div>
                    <label className="text-sm font-medium">Highest Number</label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={numberOfItems}
                      onChange={(e) => handleNumberOfItemsChange(e.target.value)}
                      disabled={isSavingConfig || !isEditable}
                      className="mt-1"
                      data-testid="number-of-items-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max: 100
                    </p>
                  </div>

                  {/* Tap-to-toggle grid */}
                  {validCount && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium">Mark unused numbers</label>
                        {excludedItemIds.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {activeCount} active · {excludedItemIds.length} unused
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {isEditable
                          ? "Tap to toggle. Unused numbers won't appear on the rating screen."
                          : "Dimmed numbers are not in use and won't appear on the rating screen."}
                      </p>
                      <div className="flex flex-wrap gap-1.5" data-testid="config-grid-preview">
                        {ids.map(id => {
                          const isExcluded = excludedItemIds.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => isEditable && handleToggleExcludedId(id)}
                              disabled={!isEditable || isSavingConfig}
                              className={cn(
                                'w-9 h-9 rounded-full text-xs font-medium transition-all',
                                'flex items-center justify-center',
                                isExcluded
                                  ? 'bg-muted text-muted-foreground/40 line-through'
                                  : 'bg-primary/10 text-primary',
                                isEditable && !isExcluded && 'hover:bg-primary/20',
                                isEditable && isExcluded && 'hover:bg-muted-foreground/10',
                                !isEditable && 'cursor-default opacity-60',
                              )}
                              data-testid={`config-grid-${id}`}
                            >
                              {id}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isSavingConfig && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Saving…
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>

          {/* Assignment Tab */}
          <TabsContent value="assignment" className="space-y-4">
            <AssignmentView
              eventId={eventId}
              event={event}
              items={items}
              isLoadingItems={isLoadingItems}
              onAssignItem={handleAssignItemId}
              onPauseEvent={() => handleStateTransition('paused')}
              onItemsChange={setItems}
            />
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
        title="Ratings"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground font-normal">
            How guests rate each item.
          </div>
          {event?.state !== 'created' && (
            <Message type="info">
              Ratings can only be edited during Setup.
            </Message>
          )}

          {/* Max Rating — segmented button group */}
          <div>
            <label className="text-sm font-medium">Rating Scale</label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              Guests rate from 1 to {maxRating || 4}
            </p>
            <div className="flex gap-1">
              {[2, 3, 4].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={parseInt(maxRating, 10) === n ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  disabled={isSavingRatingConfig || (event?.state !== 'created')}
                  onClick={() => {
                    setMaxRating(n);
                    setMaxRatingError('');
                    setRatingConfigError('');
                  }}
                >
                  1–{n}
                </Button>
              ))}
            </div>
          </div>

          {/* Rating levels — compact rows */}
          {ratings.length > 0 && (
            <div className="space-y-2">
              {ratings.map((rating) => (
                <div key={rating.value} className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-4 text-center shrink-0">{rating.value}</span>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleColorDropdown(rating.value)}
                      disabled={isSavingRatingConfig || (event?.state !== 'created')}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-input transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: rating.color }}
                      />
                    </button>
                    {openColorDropdowns[rating.value] && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => toggleColorDropdown(rating.value)}
                        />
                        <div className="absolute z-20 left-0 mt-1 rounded-md border border-input bg-background shadow-lg p-1.5">
                          <div className="flex gap-1">
                            {COLOR_PALETTE.map((colorOption) => (
                              <button
                                key={colorOption.value}
                                type="button"
                                onClick={() => handleColorChange(rating.value, colorOption.value)}
                                className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                                  rating.color === colorOption.value
                                    ? 'border-foreground scale-110 ring-2 ring-primary/40'
                                    : 'border-transparent hover:border-muted-foreground/50'
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
                  <Input
                    type="text"
                    value={rating.label}
                    onChange={(e) => handleLabelChange(rating.value, e.target.value)}
                    onBlur={(e) => handleLabelBlur(rating.value, e.target.value)}
                    disabled={isSavingRatingConfig || (event?.state !== 'created')}
                    maxLength={50}
                    className="h-8 flex-1"
                  />
                </div>
              ))}
              {Object.entries(labelErrors).map(([key, msg]) => msg && (
                <p key={key} className="text-xs text-red-600">{msg}</p>
              ))}
              {Object.entries(colorErrors).map(([key, msg]) => msg && (
                <p key={key} className="text-xs text-red-600">{msg}</p>
              ))}
            </div>
          )}

          {/* Note Suggestions Toggle — wine events only */}
          {event?.typeOfItem === 'wine' && (
            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium">Note Suggestions</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Show tasting note hints when rating
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

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetToDefaults}
              disabled={isSavingRatingConfig || (event?.state !== 'created')}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              onClick={handleSaveRatingConfiguration}
              disabled={isSavingRatingConfig || !maxRating || maxRatingError || (event?.state !== 'created')}
              className="flex-1"
            >
              {isSavingRatingConfig ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </SideDrawer>

      {/* Invite Drawer */}
      <SideDrawer
        isOpen={openDrawer === 'invite'}
        onClose={() => {
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
        title="Invite"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground font-normal">
            Share the link and PIN below to invite guests. They can scan the QR code or enter the PIN manually.
          </div>

          {/* QR Card */}
          <InviteQRCard
            eventUrl={`${window.location.origin}/event/${eventId}`}
            pin={event.pin}
            onCanvasReady={(el) => { qrCanvasRef.current = el; }}
          />

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={async () => {
                const msg = formatInvitationMessage(
                  event.name,
                  `${window.location.origin}/event/${eventId}`,
                  event.pin
                );
                try {
                  await navigator.clipboard.writeText(msg);
                  setInvitationCopied(true);
                  toast.success('Invitation copied');
                  setTimeout(() => setInvitationCopied(false), 2000);
                } catch {
                  toast.error('Failed to copy invitation');
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              {invitationCopied ? 'Copied!' : 'Copy'}
            </Button>
            {typeof navigator !== 'undefined' && navigator.canShare?.({ text: 'test' }) && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  const msg = formatInvitationMessage(
                    event.name,
                    `${window.location.origin}/event/${eventId}`,
                    event.pin
                  );
                  try {
                    await navigator.share({ text: msg });
                  } catch (err) {
                    if (err.name !== 'AbortError') {
                      toast.error('Failed to share');
                    }
                  }
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (qrCanvasRef.current) {
                  downloadQRImage(qrCanvasRef.current, event.name, event.pin);
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>

          {/* Regenerate PIN */}
          <div className="pt-6 space-y-3">
            <div>
              <p className="text-sm font-medium">Regenerate PIN</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Creates a new PIN. Only affects new logins — guests already in the event keep access. Previously shared links, printed QR codes, and invitations will have an outdated PIN.
              </p>
            </div>

            {regenerateError && (
              <Message type="error">{regenerateError}</Message>
            )}
            {regenerateSuccess && (
              <Message type="success">{regenerateSuccess}</Message>
            )}

            <Button
              onClick={async () => {
                setIsRegenerating(true);
                setRegenerateError('');
                setRegenerateSuccess('');
                try {
                  const result = await apiClient.regeneratePIN(eventId);
                  toast.success(`PIN regenerated: ${result.pin}`);
                  setEvent(prev => ({
                    ...prev,
                    pin: result.pin,
                    pinGeneratedAt: result.pinGeneratedAt,
                    updatedAt: result.pinGeneratedAt
                  }));
                } catch (err) {
                  setRegenerateError(err.message || 'Failed to regenerate PIN.');
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
            Administrators can manage event settings, control the event state, and view the dashboard. Add others by email — they'll have full access once they join the event. The event owner is always an administrator and cannot be removed.
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
                  <ListCard key={email}>
                    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{email}</span>
                          {data.owner && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Owner</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Added {new Date(data.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!data.owner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove ${email} as an administrator?`)) {
                              handleDeleteAdministrator(email);
                            }
                          }}
                          disabled={isDeletingAdmin}
                          aria-label={`Delete administrator ${email}`}
                          className="shrink-0 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </ListCard>
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

      {/* Guests Drawer */}
      <SideDrawer
        isOpen={openDrawer === 'guests'}
        onClose={() => {
          if (history.state?.drawer === openDrawer) {
            history.back();
          } else {
            setOpenDrawer(null);
          }
        }}
        title="Guests"
        width="w-full max-w-2xl"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground font-normal">
            Everyone who has joined the event using the PIN. You can search by name, email, or registered {itemTerminology.singularLower}. Removing a guest deletes all their data including ratings, items, and bookmarks.
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search by name, email, or ${itemTerminology.singularLower}...`}
              value={guestSearchQuery}
              onChange={(e) => setGuestSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {['all', 'registered', 'unregistered'].map((filter) => (
                <Button
                  key={filter}
                  variant={guestRegistrationFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={() => setGuestRegistrationFilter(filter)}
                >
                  {filter === 'all' ? 'All' : filter === 'registered' ? 'Registered' : 'Not registered'}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshGuestsData}
              disabled={isRefreshingGuests}
              className="shrink-0 h-7 w-7"
              aria-label="Refresh guests"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingGuests ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {deleteUserError && (
            <Message type="error">{deleteUserError}</Message>
          )}

          {deleteUserSuccess && (
            <Message type="success">{deleteUserSuccess}</Message>
          )}

          {(() => {
            const allGuests = getAllUsersWithStats();
            const displayGuests = filteredGuests;

            if (allGuests.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No guests registered yet
                </p>
              );
            }

            return (
              <>
                <p className="text-sm text-muted-foreground">
                  {(guestSearchQuery.trim() || guestRegistrationFilter !== 'all')
                    ? `Showing ${displayGuests.length} of ${allGuests.length} guests`
                    : `${allGuests.length} guests`}
                </p>

                {displayGuests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {guestSearchQuery.trim() ? 'No guests match your search' : 'No guests match this filter'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {displayGuests.map((guest) => (
                      <ListCard key={guest.email}>
                        <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">
                                {guest.name || guest.email}
                              </span>
                              {guest.isOwner && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Owner</Badge>
                              )}
                              {guest.isAdministrator && !guest.isOwner && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Admin</Badge>
                              )}
                              {guest.itemsCount > 0 ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                                  {guest.itemsCount} {guest.itemsCount === 1 ? itemTerminology.singularLower : itemTerminology.pluralLower}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                  No {itemTerminology.pluralLower}
                                </Badge>
                              )}
                            </div>
                            {guest.name && (
                              <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
                            )}
                            {guest.itemsCount > 0 && guest.itemNames.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                {guest.itemNames.join(', ')}
                              </p>
                            )}
                          </div>
                          {!guest.isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteUserDialog(guest.email, guest.name, guest.isAdministrator)}
                              disabled={isRefreshingGuests}
                              className="shrink-0 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </ListCard>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
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
              These actions are permanent and cannot be undone. Please be certain before proceeding.
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

      {/* Post-creation welcome bottom sheet */}
      <WelcomeBottomSheet
        isOpen={showWelcome && !!event}
        onDismiss={handleWelcomeDismiss}
        onOpenAdminGuide={handleOpenGuideFromWelcome}
        event={event}
      />

    </div>
  );
}

export default EventAdminPage;
