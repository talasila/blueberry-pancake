import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Settings, LogOut, BarChart3, Plus, X, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';
import { clearAllBookmarks } from '@/utils/bookmarkStorage';
import itemService from '@/services/itemService';
import Message from '@/components/Message';

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
  const { eventId: eventIdParam } = useParams();
  // Ensure eventId is a valid string and matches expected format
  const eventId = eventIdParam && typeof eventIdParam === 'string' && /^[A-Za-z0-9]{8}$/.test(eventIdParam.trim()) 
    ? eventIdParam.trim() 
    : null;
  const navigate = useNavigate();
  const { isAdmin, event } = useEventContext();
  const { singular, singularLower, plural, pluralLower } = useItemTerminology(event);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  // Item registration state
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    price: '',
    description: ''
  });
  const [itemFormErrors, setItemFormErrors] = useState({});
  const [itemFormLoading, setItemFormLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', price: '', description: '' });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editFormLoading, setEditFormLoading] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState(null);

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

  const handleDashboardClick = () => {
    if (eventId) {
      navigate(`/event/${eventId}/dashboard`);
    }
  };

  const handleLogout = () => {
    // Clear JWT token
    apiClient.clearJWTToken();
    
    // Clear PIN session for current event if it exists
    if (eventId) {
      localStorage.removeItem(`pin:session:${eventId}`);
      // Clear email from sessionStorage
      sessionStorage.removeItem(`event:${eventId}:email`);
    }
    
    // Clear all PIN sessions (in case user was logged into multiple events)
    // Iterate through localStorage keys and remove all pin:session:* items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pin:session:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear all bookmarks from sessionStorage (in case user was logged into multiple events)
    clearAllBookmarks();
    
    // Navigate to landing page
    navigate('/', { replace: true });
  };

  // Extract user email from JWT token or PIN session, and load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      let email = '';
      
      // Try to get email from JWT token first (for admins)
      const token = apiClient.getJWTToken();
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            email = payload.email || '';
          }
        } catch (error) {
          console.error('Error extracting email from token:', error);
        }
      }
      
      // If no email from JWT, try to get from PIN session (for regular users)
      if (!email && eventId) {
        const pinEmail = sessionStorage.getItem(`event:${eventId}:email`);
        if (pinEmail) {
          email = pinEmail;
        }
      }
      
      if (email) {
        setUserEmail(email);
        
        // Load user profile data from backend
        try {
          const profile = await apiClient.getUserProfile(eventId, email);
          if (profile.name) {
            setName(profile.name);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Don't show error to user, just log it
        }
      }
    };
    
    if (eventId) {
      loadUserProfile();
    }
  }, [eventId]);

  // Load user's items
  useEffect(() => {
    const loadItems = async () => {
      // Validate eventId format (must be exactly 8 alphanumeric characters)
      if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
        // Don't show error if eventId is just not available yet (undefined/null)
        // Only show error if eventId exists but is invalid format
        if (eventId && eventId.trim() !== '' && !/^[A-Za-z0-9]{8}$/.test(eventId)) {
          setItemsError(`Invalid event ID format. Received: "${eventId}" (length: ${eventId?.length || 0})`);
          console.error('Invalid eventId in loadItems:', { eventId, type: typeof eventId, length: eventId?.length });
        } else {
          setItemsError('');
        }
        setItemsLoading(false);
        return;
      }

      if (!userEmail) {
        setItemsLoading(false);
        return;
      }

      setItemsLoading(true);
      setItemsError('');

      try {
        // Double-check eventId before making API call
        const validatedEventId = eventId.trim();
        if (!/^[A-Za-z0-9]{8}$/.test(validatedEventId)) {
          console.error('EventId validation failed before API call:', { 
            eventId, 
            validatedEventId, 
            type: typeof eventId, 
            length: eventId?.length,
            testResult: /^[A-Za-z0-9]{8}$/.test(validatedEventId)
          });
          setItemsError(`Invalid event ID format. Please check the URL.`);
          setItemsLoading(false);
          return;
        }
        
        const userItems = await itemService.getItems(validatedEventId);
        setItems(userItems || []);
      } catch (err) {
        // Log all errors for debugging, but handle validation errors specially
        if (err.message && err.message.includes('Invalid event ID format')) {
          console.error('Backend rejected eventId:', { 
            eventId, 
            type: typeof eventId, 
            length: eventId?.length,
            error: err.message 
          });
          setItemsError(`Invalid event ID. The URL may be incorrect. (Event ID: "${eventId}")`);
        } else {
          console.error('Error loading items:', err);
          setItemsError(err.message || `Failed to load ${pluralLower}`);
        }
      } finally {
        setItemsLoading(false);
      }
    };

    loadItems();
  }, [eventId, userEmail, pluralLower]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!userEmail) {
        throw new Error('User email is required. Please log in again.');
      }

      // Update user name via API
      await apiClient.updateUserProfile(eventId, name, userEmail);
      
      setSuccess('Profile updated successfully!');
      setLoading(false);
      
      // Navigate to event page after showing success message
      setTimeout(() => {
        if (eventId) {
          navigate(`/event/${eventId}`);
        }
      }, 1500); // Wait 1.5 seconds to show success message
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please try again.');
      setLoading(false);
    }
  };

  // Validate item form
  const validateItemForm = () => {
    const errors = {};

    // Name validation (required, 1-200 chars)
    if (!itemFormData.name || itemFormData.name.trim().length === 0) {
      errors.name = `${singular} name is required`;
    } else if (itemFormData.name.trim().length > 200) {
      errors.name = `${singular} name must be 200 characters or less`;
    }

    // Description validation (optional, max 1000 chars)
    if (itemFormData.description && itemFormData.description.length > 1000) {
      errors.description = `${singular} description must be 1000 characters or less`;
    }

    // Price validation (optional, zero or positive)
    if (itemFormData.price && itemFormData.price.trim() !== '') {
      const priceStr = itemFormData.price.trim().replace(/[$,\s]/g, '');
      const priceNum = parseFloat(priceStr);
      if (isNaN(priceNum)) {
        errors.price = 'Invalid price format';
      } else if (priceNum < 0) {
        errors.price = 'Price cannot be negative';
      }
    }

    setItemFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle item form submission
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateItemForm()) {
      return;
    }

    // Validate eventId format before making API call
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      setItemsError(`Invalid event ID format. Expected 8 alphanumeric characters, got: ${eventId || 'undefined'}`);
      console.error('Invalid eventId in handleItemSubmit:', eventId, typeof eventId);
      return;
    }

    setItemFormLoading(true);
    setItemsError('');

    try {
      const itemData = {
        name: itemFormData.name.trim(),
        price: itemFormData.price.trim() || null,
        description: itemFormData.description.trim() || null
      };

      const newItem = await itemService.registerItem(eventId, itemData);
      
      // Add new item to list
      setItems([...items, newItem]);
      
      // Reset form
      setItemFormData({ name: '', price: '', description: '' });
      setShowItemForm(false);
      setItemFormErrors({});
    } catch (err) {
      setItemsError(err.message || `Failed to register ${singularLower}. Please try again.`);
    } finally {
      setItemFormLoading(false);
    }
  };

  // Check if event state allows item registration
  const canRegisterItems = event && (event.state === 'created' || event.state === 'started');

  // Handle item edit
  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setEditFormData({
      name: item.name,
      price: item.price !== null && item.price !== undefined ? String(item.price) : '',
      description: item.description || ''
    });
    setEditFormErrors({});
    setShowItemForm(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditFormData({ name: '', price: '', description: '' });
    setEditFormErrors({});
  };

  // Validate edit form
  const validateEditForm = () => {
    const errors = {};

    // Name validation (required, 1-200 chars)
    if (!editFormData.name || editFormData.name.trim().length === 0) {
      errors.name = `${singular} name is required`;
    } else if (editFormData.name.trim().length > 200) {
      errors.name = `${singular} name must be 200 characters or less`;
    }

    // Description validation (optional, max 1000 chars)
    if (editFormData.description && editFormData.description.length > 1000) {
      errors.description = `${singular} description must be 1000 characters or less`;
    }

    // Price validation (optional, zero or positive)
    if (editFormData.price && editFormData.price.trim() !== '') {
      const priceStr = editFormData.price.trim().replace(/[$,\s]/g, '');
      const priceNum = parseFloat(priceStr);
      if (isNaN(priceNum)) {
        errors.price = 'Invalid price format';
      } else if (priceNum < 0) {
        errors.price = 'Price cannot be negative';
      }
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }

    // Validate eventId format before making API call
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      setItemsError('Invalid event ID. Please refresh the page and try again.');
      return;
    }

    setEditFormLoading(true);
    setItemsError('');

    try {
      const updateData = {
        name: editFormData.name.trim(),
        price: editFormData.price.trim() || null,
        description: editFormData.description.trim() || null
      };

      const updatedItem = await itemService.updateItem(eventId, editingItemId, updateData);
      
      // Update items list
      setItems(items.map(item => 
        item.id === editingItemId ? updatedItem : item
      ));
      
      handleCancelEdit();
    } catch (err) {
      setItemsError(err.message || `Failed to update ${singularLower}. Please try again.`);
    } finally {
      setEditFormLoading(false);
    }
  };

  // Handle item delete
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    // Validate eventId format before making API call
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      setItemsError('Invalid event ID. Please refresh the page and try again.');
      return;
    }

    setDeletingItemId(itemId);
    setItemsError('');

    try {
      await itemService.deleteItem(eventId, itemId);
      
      // Remove item from list
      setItems(items.filter(item => item.id !== itemId));
    } catch (err) {
      setItemsError(err.message || `Failed to delete ${singularLower}. Please try again.`);
    } finally {
      setDeletingItemId(null);
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
                Admin
              </Button>
            )}
            {/* Dashboard link (for administrators at all times, or regular users when event is completed) */}
            {eventId && (isAdmin || event?.state === 'completed') && (
              <Button
                variant="ghost"
                onClick={handleDashboardClick}
                className="-ml-2 min-h-[44px] active:bg-accent active:opacity-70 touch-manipulation"
                aria-label="Go to dashboard"
              >
                Dashboard
              </Button>
            )}
            {/* Logout button */}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="-ml-2 min-h-[44px] active:bg-accent active:opacity-70 touch-manipulation"
              aria-label="Logout"
            >
              Logout
            </Button>
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

          {/* My Items Section - only show if eventId is valid */}
          {eventId && /^[A-Za-z0-9]{8}$/.test(eventId) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My {plural}</CardTitle>
                  <CardDescription>
                    {plural} you're bringing to this event
                  </CardDescription>
                </div>
                {canRegisterItems && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowItemForm(!showItemForm)}
                    disabled={itemFormLoading}
                  >
                    {showItemForm ? (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add {singular}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Item registration form */}
              {showItemForm && canRegisterItems && (
                <form onSubmit={handleItemSubmit} className="space-y-4 mb-6 pb-6 border-b">
                  <div>
                    <Label htmlFor="itemName">
                      {singular} Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="itemName"
                      type="text"
                      placeholder={`Enter ${singularLower} name`}
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                      disabled={itemFormLoading}
                      className="mt-1"
                      maxLength={200}
                    />
                    {itemFormErrors.name && (
                      <p className="text-xs text-destructive mt-1">{itemFormErrors.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {itemFormData.name.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="itemPrice">Price (optional)</Label>
                    <Input
                      id="itemPrice"
                      type="text"
                      placeholder="e.g., $50.00 or 50"
                      value={itemFormData.price}
                      onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                      disabled={itemFormLoading}
                      className="mt-1"
                    />
                    {itemFormErrors.price && (
                      <p className="text-xs text-destructive mt-1">{itemFormErrors.price}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter price in any format (e.g., $50, 50.00, 50)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="itemDescription">Description (optional)</Label>
                    <textarea
                      id="itemDescription"
                      placeholder={`Enter ${singularLower} description`}
                      value={itemFormData.description}
                      onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                      disabled={itemFormLoading}
                      rows={3}
                      className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      maxLength={1000}
                    />
                    {itemFormErrors.description && (
                      <p className="text-xs text-destructive mt-1">{itemFormErrors.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {itemFormData.description.length}/1000 characters
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={itemFormLoading}
                    className="w-full"
                  >
                    {itemFormLoading ? 'Registering...' : `Register ${singular}`}
                  </Button>
                </form>
              )}

              {/* State-based message */}
              {!canRegisterItems && event && (
                <Message type="warning" className="mb-4">
                  {singular} registration is only available when the event is in "created" or "started" state.
                  Current state: <strong>{event.state}</strong>
                </Message>
              )}

              {/* Items error */}
              {itemsError && (
                <Message type="error" className="mb-4">
                  {itemsError}
                </Message>
              )}

              {/* Items list */}
              {itemsLoading ? (
                <div className="text-sm text-muted-foreground">Loading {pluralLower}...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {canRegisterItems 
                    ? `No ${pluralLower} registered yet. Click "Add ${singular}" to register a ${singularLower}.`
                    : `No ${pluralLower} registered.`}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-md p-3 space-y-2"
                    >
                      {editingItemId === item.id ? (
                        // Edit form
                        <form onSubmit={handleEditSubmit} className="space-y-3">
                          <div>
                            <Label htmlFor={`edit-name-${item.id}`}>
                              {singular} Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`edit-name-${item.id}`}
                              type="text"
                              value={editFormData.name}
                              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                              disabled={editFormLoading}
                              className="mt-1"
                              maxLength={200}
                            />
                            {editFormErrors.name && (
                              <p className="text-xs text-destructive mt-1">{editFormErrors.name}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor={`edit-price-${item.id}`}>Price (optional)</Label>
                            <Input
                              id={`edit-price-${item.id}`}
                              type="text"
                              placeholder="e.g., $50.00 or 50"
                              value={editFormData.price}
                              onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                              disabled={editFormLoading}
                              className="mt-1"
                            />
                            {editFormErrors.price && (
                              <p className="text-xs text-destructive mt-1">{editFormErrors.price}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor={`edit-description-${item.id}`}>Description (optional)</Label>
                            <textarea
                              id={`edit-description-${item.id}`}
                              placeholder={`Enter ${singularLower} description`}
                              value={editFormData.description}
                              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                              disabled={editFormLoading}
                              rows={3}
                              className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              maxLength={1000}
                            />
                            {editFormErrors.description && (
                              <p className="text-xs text-destructive mt-1">{editFormErrors.description}</p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              disabled={editFormLoading}
                              size="sm"
                            >
                              {editFormLoading ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={editFormLoading}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        // Display mode
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              {item.price !== null && (
                                <div className="text-sm text-muted-foreground">
                                  Price: ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                                </div>
                              )}
                              {item.description && (
                                <div className="text-sm text-muted-foreground">
                                  {item.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                Registered: {new Date(item.registeredAt).toLocaleDateString()}
                              </div>
                            </div>
                            {canRegisterItems && (
                              <div className="flex gap-2 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditItem(item)}
                                  disabled={deletingItemId === item.id}
                                  className="h-8 w-8"
                                  aria-label={`Edit ${singularLower}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                  disabled={deletingItemId === item.id}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  aria-label={`Delete ${singularLower}`}
                                >
                                  {deletingItemId === item.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
