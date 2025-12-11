import { useParams, useNavigate } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Search, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Message from '@/components/Message';
import LoadingSpinner from '@/components/LoadingSpinner';
import itemService from '@/services/itemService';
import { useItemTerminology } from '@/utils/itemTerminology';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

/**
 * ItemAssignmentPage Component
 * 
 * Dedicated page for assigning item IDs to registered items.
 * Only accessible when event is in "paused" state.
 * Only accessible to event administrators.
 */
function ItemAssignmentPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event: contextEvent } = useEventContext();
  const { event: polledEvent } = useEventPolling(eventId);
  const [event, setEvent] = useState(contextEvent);
  const itemTerminology = useItemTerminology(event);
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [assigningItemId, setAssigningItemId] = useState(null);
  const [assignmentErrors, setAssignmentErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Check for OTP authentication (JWT token) - admin pages require OTP
  useEffect(() => {
    const jwtToken = apiClient.getJWTToken();
    if (!jwtToken) {
      navigate('/auth', { 
        state: { from: { pathname: `/event/${eventId}/admin/items/assign` } },
        replace: true 
      });
    }
  }, [eventId, navigate]);

  // Update event when context or polling updates
  useEffect(() => {
    if (polledEvent) {
      setEvent(polledEvent);
    } else if (contextEvent) {
      setEvent(contextEvent);
    }
  }, [contextEvent, polledEvent]);

  // Fetch items on load
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
        setItemsError(error.message || `Failed to load ${itemTerminology.pluralLower}`);
      } finally {
        setIsLoadingItems(false);
      }
    };

    if (eventId) {
      fetchItems();
    }
  }, [eventId]);

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
    
    const numberOfItems = event.itemConfiguration.numberOfItems || 20;
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

  // Calculate summary statistics
  const summary = {
    total: items.length,
    assigned: items.filter(item => item.itemId !== null && item.itemId !== undefined).length,
    unassigned: items.filter(item => item.itemId === null || item.itemId === undefined).length,
    availableIds: getAvailableItemIds().length
  };

  // Check if event is in paused state
  const isPaused = event?.state === 'paused';

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
      const query = searchQuery.toLowerCase().trim();
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
  }, [items, searchQuery, statusFilter]);

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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/event/${eventId}/admin`)}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{itemTerminology.singular} ID Assignment</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assign {itemTerminology.singularLower} IDs to registered {itemTerminology.pluralLower}
            </p>
          </div>
        </div>

        {/* State warning */}
        {!isPaused && (
          <Message type="warning" className="mb-4">
            {itemTerminology.singular} ID assignment is only available when the event is in "paused" state.
            Current state: <strong>{event?.state || 'unknown'}</strong>
          </Message>
        )}

        {/* Summary statistics */}
        {items.length > 0 && (
          <div className="mb-6 text-sm space-y-1">
            <div>Total {itemTerminology.plural}: <strong>{summary.total}</strong></div>
            <div>Assigned: <strong>{summary.assigned}</strong></div>
            <div>Unassigned: <strong>{summary.unassigned}</strong></div>
            <div>Available IDs: <strong>{summary.availableIds}</strong></div>
          </div>
        )}

        {/* Items error */}
        {itemsError && (
          <Message type="error" className="mb-4">{itemsError}</Message>
        )}

        {/* Search and Filter Controls */}
        {items.length > 0 && (
          <div className="mb-4 space-y-3">
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
            {filteredItems.map((item) => {
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
            })}
            {isPaused && (
              <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md mt-4">
                <p className="font-medium mb-1">Available IDs: {getAvailableItemIds().join(', ') || 'None'}</p>
                <p>{itemTerminology.singular} ID assignment is only available when the event is in "paused" state.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemAssignmentPage;
