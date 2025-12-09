# Quick Start: Item Configuration in Event Admin

**Feature**: Item Configuration in Event Admin  
**Date**: 2025-01-27  
**Purpose**: Quick reference guide for implementing and testing item configuration functionality

## Overview

This feature enables event administrators to configure the number of items for blind tasting events and specify which item IDs should be excluded. Items are numbered sequentially from 1 to the configured number, and excluded item IDs are not displayed on the main event page.

## Key Changes

### Backend

1. **EventService Extensions** (`backend/src/services/EventService.js`):
   - `getItemConfiguration(eventId)` - Get item configuration (with defaults)
   - `updateItemConfiguration(eventId, config, requesterEmail)` - Update item configuration
   - `validateItemConfiguration(config)` - Validate item configuration
   - `normalizeExcludedItemIds(input, numberOfItems)` - Parse and normalize excluded item IDs
   - `getAvailableItemIds(event)` - Get list of available item IDs (excluding excluded ones)

2. **API Routes** (`backend/src/api/events.js`):
   - `GET /api/events/:eventId/item-configuration` - Get item configuration
   - `PATCH /api/events/:eventId/item-configuration` - Update item configuration

3. **Data Model**:
   - Add `itemConfiguration` object to event config
   - Structure: `{ numberOfItems: integer, excludedItemIds: array of integers }`
   - Defaults: `{ numberOfItems: 20, excludedItemIds: [] }`

### Frontend

1. **EventAdminPage** (`frontend/src/pages/EventAdminPage.jsx`):
   - Add "Item Configuration" card component
   - Number of items input (number, range 1-100, default 20)
   - Excluded item IDs input (text, comma-separated)
   - Display current configuration
   - Save button with validation feedback

2. **EventPage** (`frontend/src/pages/EventPage.jsx`):
   - Filter item IDs based on itemConfiguration
   - Display only non-excluded item IDs (1 to numberOfItems, excluding excludedItemIds)

3. **API Client** (`frontend/src/services/apiClient.js`):
   - `getItemConfiguration(eventId)` - Fetch item configuration
   - `updateItemConfiguration(eventId, config)` - Update item configuration

## Implementation Steps

### Step 1: Backend - Update EventService

```javascript
// Add to EventService class
getItemConfiguration(eventId) {
  const event = await this.getEvent(eventId);
  
  // Return itemConfiguration or defaults
  return event.itemConfiguration || {
    numberOfItems: 20,
    excludedItemIds: []
  };
}

async updateItemConfiguration(eventId, config, requesterEmail) {
  const event = await this.getEvent(eventId);
  
  // Validate requester is administrator
  if (!this.isAdministrator(event, requesterEmail)) {
    throw new Error('Unauthorized: Only administrators can update item configuration');
  }
  
  // Get current configuration or defaults
  const current = event.itemConfiguration || {
    numberOfItems: 20,
    excludedItemIds: []
  };
  
  // Update numberOfItems if provided
  const numberOfItems = config.numberOfItems !== undefined 
    ? config.numberOfItems 
    : current.numberOfItems;
  
  // Validate numberOfItems
  if (!Number.isInteger(numberOfItems) || numberOfItems < 1 || numberOfItems > 100) {
    throw new Error('Number of items must be an integer between 1 and 100');
  }
  
  // Parse and normalize excludedItemIds
  let excludedItemIds = current.excludedItemIds;
  if (config.excludedItemIds !== undefined) {
    excludedItemIds = this.normalizeExcludedItemIds(
      config.excludedItemIds, 
      numberOfItems
    );
  }
  
  // Check if numberOfItems was reduced
  let warning = null;
  if (numberOfItems < current.numberOfItems) {
    const invalidIds = excludedItemIds.filter(id => id > numberOfItems);
    if (invalidIds.length > 0) {
      excludedItemIds = excludedItemIds.filter(id => id <= numberOfItems);
      warning = `Item IDs ${invalidIds.join(', ')} were removed because they are outside the valid range (1-${numberOfItems})`;
    }
  }
  
  // Validate at least one item remains
  if (excludedItemIds.length >= numberOfItems) {
    throw new Error('At least one item must be available. Cannot exclude all item IDs');
  }
  
  // Update event
  event.itemConfiguration = {
    numberOfItems,
    excludedItemIds
  };
  event.updatedAt = new Date().toISOString();
  
  await dataRepository.saveEvent(event);
  
  return {
    numberOfItems,
    excludedItemIds,
    ...(warning && { warning })
  };
}

normalizeExcludedItemIds(input, numberOfItems) {
  // Handle both string and array input
  const inputArray = Array.isArray(input) ? input : input.split(',');
  
  // Parse, normalize, and validate
  const normalized = inputArray
    .map(id => String(id).trim())
    .filter(id => id.length > 0)
    .map(id => parseInt(id.replace(/^0+/, ''), 10)) // Remove leading zeros
    .filter(id => !isNaN(id) && Number.isInteger(id));
  
  // Validate range
  const invalidIds = normalized.filter(id => id < 1 || id > numberOfItems);
  if (invalidIds.length > 0) {
    throw new Error(`Invalid item IDs: ${invalidIds.join(', ')}. Must be between 1 and ${numberOfItems}`);
  }
  
  // Remove duplicates
  const unique = [...new Set(normalized)];
  
  // Check at least one item remains
  if (unique.length >= numberOfItems) {
    throw new Error('At least one item must be available. Cannot exclude all item IDs');
  }
  
  return unique.sort((a, b) => a - b); // Sort ascending
}

getAvailableItemIds(event) {
  const config = event.itemConfiguration || {
    numberOfItems: 20,
    excludedItemIds: []
  };
  
  const allIds = Array.from({ length: config.numberOfItems }, (_, i) => i + 1);
  return allIds.filter(id => !config.excludedItemIds.includes(id));
}
```

### Step 2: Backend - Add API Routes

```javascript
// Add to backend/src/api/events.js

/**
 * GET /api/events/:eventId/item-configuration
 * Get item configuration for an event
 */
router.get('/:eventId/item-configuration', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;
    
    const event = await eventService.getEvent(eventId);
    
    // Check authorization
    if (!eventService.isAdministrator(event, requesterEmail)) {
      return res.status(403).json({
        error: 'Only administrators can view item configuration'
      });
    }
    
    const config = eventService.getItemConfiguration(eventId);
    res.json(config);
  } catch (error) {
    // Error handling...
  }
});

/**
 * PATCH /api/events/:eventId/item-configuration
 * Update item configuration for an event
 */
router.patch('/:eventId/item-configuration', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const requesterEmail = req.user?.email;
    const { numberOfItems, excludedItemIds } = req.body;
    
    const result = await eventService.updateItemConfiguration(
      eventId,
      { numberOfItems, excludedItemIds },
      requesterEmail
    );
    
    res.json(result);
  } catch (error) {
    // Error handling...
  }
});
```

### Step 3: Frontend - Update API Client

```javascript
// Add to frontend/src/services/apiClient.js

async getItemConfiguration(eventId) {
  const response = await this.request(`/events/${eventId}/item-configuration`, {
    method: 'GET'
  });
  return response;
}

async updateItemConfiguration(eventId, config) {
  const response = await this.request(`/events/${eventId}/item-configuration`, {
    method: 'PATCH',
    body: JSON.stringify(config)
  });
  return response;
}
```

### Step 4: Frontend - Add Item Configuration Card

```jsx
// Add to EventAdminPage.jsx

// In component state
const [itemConfig, setItemConfig] = useState({ numberOfItems: 20, excludedItemIds: [] });
const [numberOfItems, setNumberOfItems] = useState(20);
const [excludedItemIdsInput, setExcludedItemIdsInput] = useState('');
const [isSavingConfig, setIsSavingConfig] = useState(false);
const [configError, setConfigError] = useState('');
const [configSuccess, setConfigSuccess] = useState('');
const [configWarning, setConfigWarning] = useState('');

// Fetch item configuration on load
useEffect(() => {
  const fetchConfig = async () => {
    try {
      const config = await apiClient.getItemConfiguration(eventId);
      setItemConfig(config);
      setNumberOfItems(config.numberOfItems);
      setExcludedItemIdsInput(config.excludedItemIds.join(', '));
    } catch (error) {
      console.error('Failed to fetch item configuration:', error);
    }
  };
  fetchConfig();
}, [eventId]);

// Handle save
const handleSaveItemConfiguration = async () => {
  setIsSavingConfig(true);
  setConfigError('');
  setConfigSuccess('');
  setConfigWarning('');
  
  try {
    const result = await apiClient.updateItemConfiguration(eventId, {
      numberOfItems: parseInt(numberOfItems, 10),
      excludedItemIds: excludedItemIdsInput
    });
    
    setItemConfig(result);
    setConfigSuccess('Item configuration saved successfully');
    if (result.warning) {
      setConfigWarning(result.warning);
    }
    clearSuccessMessage(setConfigSuccess);
  } catch (error) {
    setConfigError(error.message || 'Failed to save item configuration');
  } finally {
    setIsSavingConfig(false);
  }
};

// In JSX, add new Card component
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
        onChange={(e) => setNumberOfItems(e.target.value)}
        disabled={isSavingConfig}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Items will be numbered from 1 to {numberOfItems} (default: 20, max: 100)
      </p>
    </div>
    
    {/* Excluded item IDs input */}
    <div>
      <label className="text-sm font-medium">Excluded Item IDs</label>
      <Input
        type="text"
        placeholder="5,10,15"
        value={excludedItemIdsInput}
        onChange={(e) => setExcludedItemIdsInput(e.target.value)}
        disabled={isSavingConfig}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Comma-separated list of item IDs to exclude (e.g., "5,10,15")
      </p>
    </div>
    
    {/* Messages */}
    {configError && <Message type="error">{configError}</Message>}
    {configWarning && <Message type="warning">{configWarning}</Message>}
    {configSuccess && <Message type="success">{configSuccess}</Message>}
    
    {/* Save button */}
    <Button
      onClick={handleSaveItemConfiguration}
      disabled={isSavingConfig}
      className="w-full"
    >
      {isSavingConfig ? 'Saving...' : 'Save Configuration'}
    </Button>
  </CardContent>
</Card>
```

### Step 5: Frontend - Update EventPage to Filter Item IDs

```jsx
// Update EventPage.jsx to filter item IDs

// In component
const [availableItemIds, setAvailableItemIds] = useState([]);

useEffect(() => {
  if (event) {
    const config = event.itemConfiguration || {
      numberOfItems: 20,
      excludedItemIds: []
    };
    
    // Generate all item IDs
    const allIds = Array.from(
      { length: config.numberOfItems }, 
      (_, i) => i + 1
    );
    
    // Filter out excluded IDs
    const available = allIds.filter(
      id => !config.excludedItemIds.includes(id)
    );
    
    setAvailableItemIds(available);
  }
}, [event]);

// Display available item IDs
{availableItemIds.map(itemId => (
  <div key={itemId}>Item {itemId}</div>
))}
```

## Testing Checklist

### Backend Unit Tests

- [ ] `getItemConfiguration` returns defaults when not configured
- [ ] `getItemConfiguration` returns configured values
- [ ] `normalizeExcludedItemIds` handles comma-separated string
- [ ] `normalizeExcludedItemIds` handles array input
- [ ] `normalizeExcludedItemIds` removes leading zeros
- [ ] `normalizeExcludedItemIds` trims whitespace
- [ ] `normalizeExcludedItemIds` removes duplicates
- [ ] `normalizeExcludedItemIds` validates range
- [ ] `normalizeExcludedItemIds` prevents excluding all items
- [ ] `updateItemConfiguration` validates numberOfItems range
- [ ] `updateItemConfiguration` automatically removes invalid excluded IDs
- [ ] `updateItemConfiguration` returns warning when IDs removed
- [ ] `updateItemConfiguration` prevents excluding all items
- [ ] `getAvailableItemIds` returns correct list

### Backend Integration Tests

- [ ] GET endpoint returns item configuration
- [ ] GET endpoint requires authentication
- [ ] GET endpoint requires administrator authorization
- [ ] PATCH endpoint updates item configuration
- [ ] PATCH endpoint validates numberOfItems
- [ ] PATCH endpoint validates excludedItemIds
- [ ] PATCH endpoint returns warning when IDs removed
- [ ] PATCH endpoint prevents excluding all items

### Frontend E2E Tests

- [ ] Administrator can view item configuration
- [ ] Administrator can update number of items
- [ ] Administrator can update excluded item IDs
- [ ] Validation errors display correctly
- [ ] Warning message displays when IDs removed
- [ ] Success message displays on save
- [ ] Event page displays only non-excluded item IDs
- [ ] Default values applied when not configured

## Common Issues

1. **Leading zeros not normalized**: Ensure `normalizeExcludedItemIds` removes leading zeros before parsing
2. **Whitespace not trimmed**: Ensure input is trimmed before parsing
3. **Duplicates not removed**: Use Set to remove duplicates
4. **All items excluded**: Validate that at least one item remains
5. **Invalid IDs not caught**: Validate range before saving
6. **Warning not shown**: Return warning in API response when IDs removed

## Next Steps

After implementation:
1. Run all tests (unit, integration, E2E)
2. Test with various edge cases (all items excluded, invalid IDs, etc.)
3. Verify UI matches existing patterns (Card component, error messages)
4. Update documentation if needed
