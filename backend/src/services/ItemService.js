import { customAlphabet } from 'nanoid';
import eventService from './EventService.js';
import loggerService from '../logging/Logger.js';
import cacheService from '../cache/CacheService.js';
import { getEventConfigKey } from '../cache/cacheKeys.js';

// Use alphanumeric alphabet for 12-character item IDs (unique within event)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 12);

/**
 * ItemService
 * Handles item registration and management business logic
 */
class ItemService {
  /**
   * Normalize price input to decimal number
   * Handles various input formats: "$50", "50.00", "50", 50, etc.
   * @param {string|number|null|undefined} price - Price input
   * @returns {number|null} Normalized price as decimal number, or null if not provided
   * @throws {Error} If price is negative or invalid format
   */
  normalizePrice(price) {
    // Handle null, undefined, or empty string
    if (price === null || price === undefined || price === '') {
      return null;
    }

    // If already a number, validate and return
    if (typeof price === 'number') {
      if (price < 0) {
        throw new Error('Price cannot be negative');
      }
      return price;
    }

    // If string, parse it
    if (typeof price === 'string') {
      // Remove currency symbols and whitespace
      const cleaned = price.trim().replace(/[$,\s]/g, '');
      
      // Empty string after cleaning means no price provided
      if (cleaned === '') {
        return null;
      }

      // Parse as float
      const parsed = parseFloat(cleaned);
      
      if (isNaN(parsed)) {
        throw new Error(`Invalid price format: ${price}`);
      }

      if (parsed < 0) {
        throw new Error('Price cannot be negative');
      }

      return parsed;
    }

    throw new Error(`Invalid price type: ${typeof price}`);
  }

  /**
   * Validate item registration data
   * @param {object} itemData - Item data to validate
   * @param {string} itemData.name - Item name (required, 1-200 chars)
   * @param {string|number|null|undefined} itemData.price - Item price (optional, zero or positive)
   * @param {string|null|undefined} itemData.description - Item description (optional, max 1000 chars)
   * @returns {{valid: boolean, error?: string, normalized?: object}} Validation result with normalized data
   */
  validateItemRegistration(itemData) {
    if (!itemData || typeof itemData !== 'object') {
      return { valid: false, error: 'Item data is required' };
    }

    // Validate name (required, 1-200 characters)
    if (!itemData.name || typeof itemData.name !== 'string') {
      return { valid: false, error: 'Item name is required' };
    }

    const trimmedName = itemData.name.trim();
    if (trimmedName.length === 0) {
      return { valid: false, error: 'Item name cannot be empty' };
    }

    if (trimmedName.length > 200) {
      return { valid: false, error: 'Item name must be 200 characters or less' };
    }

    // Validate description (optional, max 1000 characters)
    let description = null;
    if (itemData.description !== null && itemData.description !== undefined && itemData.description !== '') {
      if (typeof itemData.description !== 'string') {
        return { valid: false, error: 'Item description must be a string' };
      }
      
      if (itemData.description.length > 1000) {
        return { valid: false, error: 'Item description must be 1000 characters or less' };
      }
      
      description = itemData.description.trim() || null;
    }

    // Normalize and validate price
    let normalizedPrice = null;
    try {
      normalizedPrice = this.normalizePrice(itemData.price);
    } catch (error) {
      return { valid: false, error: error.message };
    }

    return {
      valid: true,
      normalized: {
        name: trimmedName,
        price: normalizedPrice,
        description: description
      }
    };
  }

  /**
   * Validate item ID assignment
   * @param {number} itemId - Item ID to assign (integer, 1 to numberOfItems)
   * @param {number} numberOfItems - Maximum number of items configured for event
   * @param {number[]} excludedItemIds - Array of excluded item IDs
   * @param {number[]} existingAssignments - Array of already assigned item IDs
   * @returns {{valid: boolean, error?: string}} Validation result
   */
  validateItemIdAssignment(itemId, numberOfItems, excludedItemIds, existingAssignments) {
    // Validate itemId is an integer
    if (!Number.isInteger(itemId)) {
      return { valid: false, error: 'Item ID must be an integer' };
    }

    // Validate range (1 to numberOfItems)
    if (itemId < 1 || itemId > numberOfItems) {
      return { valid: false, error: `Item ID must be between 1 and ${numberOfItems}` };
    }

    // Validate not in excludedItemIds
    if (excludedItemIds && Array.isArray(excludedItemIds) && excludedItemIds.includes(itemId)) {
      return { valid: false, error: `Item ID ${itemId} is excluded and cannot be assigned` };
    }

    // Validate uniqueness (not already assigned)
    if (existingAssignments && Array.isArray(existingAssignments) && existingAssignments.includes(itemId)) {
      return { valid: false, error: `Item ID ${itemId} is already assigned to another item` };
    }

    return { valid: true };
  }

  /**
   * Initialize items array in event config if it doesn't exist
   * @param {object} event - Event object
   * @returns {boolean} True if items array was initialized, false if it already existed
   */
  initializeItemsArray(event) {
    if (!event.items || !Array.isArray(event.items)) {
      event.items = [];
      return true;
    }
    return false;
  }

  /**
   * Validate event state allows item registration
   * @param {string} state - Event state
   * @throws {Error} If state doesn't allow item registration
   */
  validateRegistrationState(state) {
    if (state !== 'created' && state !== 'started') {
      throw new Error(`Item registration is not allowed when event is in "${state}" state. Only allowed in "created" or "started" states.`);
    }
  }

  /**
   * Register a new item for an event
   * @param {string} eventId - Event identifier
   * @param {object} itemData - Item data (name, price, description)
   * @param {string} ownerEmail - Email of user registering the item
   * @returns {Promise<object>} Registered item with generated ID and timestamp
   * @throws {Error} If validation fails or event state doesn't allow registration
   */
  async registerItem(eventId, itemData, ownerEmail) {
    // Validate event ID format
    const eventIdValidation = eventService.validateEventId(eventId);
    if (!eventIdValidation.valid) {
      throw new Error(eventIdValidation.error);
    }

    // Validate owner email
    if (!ownerEmail || typeof ownerEmail !== 'string') {
      throw new Error('Owner email is required');
    }

    const normalizedEmail = ownerEmail.trim().toLowerCase();

    // Validate item registration data
    const validation = this.validateItemRegistration(itemData);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Get event and validate state
    const event = await eventService.getEvent(eventId);
    this.validateRegistrationState(event.state);

    // Initialize items array if needed
    const wasInitialized = this.initializeItemsArray(event);
    if (wasInitialized) {
      loggerService.info(`Initialized items array for event: ${eventId}`);
    }

    // Generate unique item ID
    let itemId;
    let attempts = 0;
    const maxAttempts = 10;
    do {
      itemId = nanoid();
      attempts++;
      
      // Check for collision (should be extremely rare with 12-char nanoid)
      const existingItem = event.items.find(item => item.id === itemId);
      if (!existingItem) {
        break;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique item ID after multiple attempts');
      }
      
      loggerService.warn(`Item ID collision detected: ${itemId}, retrying...`);
    } while (attempts < maxAttempts);

    // Create item object
    const item = {
      id: itemId,
      name: validation.normalized.name,
      price: validation.normalized.price,
      description: validation.normalized.description,
      ownerEmail: normalizedEmail,
      registeredAt: new Date().toISOString(),
      itemId: null
    };

    // Add item to event
    event.items.push(item);
    event.updatedAt = new Date().toISOString();

    // Persist updated event (write-through)
    await cacheService.setWithPersist(getEventConfigKey(eventId), event, 'config', eventId);

    loggerService.info(`Item registered for event: ${eventId}, itemId: ${itemId}, owner: ${normalizedEmail}`);

    return item;
  }

  /**
   * Get items for an event
   * Returns all items for administrators, or only user's own items for regular users
   * @param {string} eventId - Event identifier
   * @param {string} userEmail - Email of requesting user
   * @param {boolean} isAdministrator - Whether user is an administrator
   * @returns {Promise<object[]>} Array of items
   * @throws {Error} If event not found
   */
  async getItems(eventId, userEmail, isAdministrator = false) {
    // Validate event ID format
    const eventIdValidation = eventService.validateEventId(eventId);
    if (!eventIdValidation.valid) {
      throw new Error(eventIdValidation.error);
    }

    // Get event
    const event = await eventService.getEvent(eventId);

    // Initialize items array if needed
    this.initializeItemsArray(event);

    // If administrator, return all items
    if (isAdministrator) {
      return event.items || [];
    }

    // For regular users, return only their own items
    const normalizedEmail = userEmail.trim().toLowerCase();
    return (event.items || []).filter(item => item.ownerEmail === normalizedEmail);
  }

  /**
   * Validate event state allows item ID assignment
   * @param {string} state - Event state
   * @throws {Error} If state doesn't allow item ID assignment
   */
  validateAssignmentState(state) {
    if (state !== 'paused') {
      throw new Error(`Item ID assignment is not allowed when event is in "${state}" state. Only allowed in "paused" state.`);
    }
  }

  /**
   * Assign an item ID to a registered item (or clear assignment if null)
   * @param {string} eventId - Event identifier
   * @param {string} itemId - Item unique identifier (nanoid)
   * @param {number|null} itemIdToAssign - Item ID to assign (integer, 1 to numberOfItems) or null to clear
   * @param {string} adminEmail - Email of administrator performing assignment
   * @returns {Promise<object>} Updated item with assigned itemId
   * @throws {Error} If validation fails or event state doesn't allow assignment
   */
  async assignItemId(eventId, itemId, itemIdToAssign, adminEmail) {
    // Validate event ID format
    const eventIdValidation = eventService.validateEventId(eventId);
    if (!eventIdValidation.valid) {
      throw new Error(eventIdValidation.error);
    }

    // Validate admin email
    if (!adminEmail || typeof adminEmail !== 'string') {
      throw new Error('Administrator email is required');
    }

    const normalizedEmail = adminEmail.trim().toLowerCase();

    // Get event and validate state
    const event = await eventService.getEvent(eventId);
    this.validateAssignmentState(event.state);

    // Validate administrator
    if (!eventService.isAdministrator(event, normalizedEmail)) {
      throw new Error('Only event administrators can assign item IDs');
    }

    // Initialize items array if needed
    this.initializeItemsArray(event);

    // Find item by id
    const foundItem = event.items.find(i => i.id === itemId);
    if (!foundItem) {
      throw new Error(`Item not found: ${itemId}`);
    }

    // If clearing assignment (null), just set to null and skip validation
    if (itemIdToAssign === null) {
      foundItem.itemId = null;
      event.updatedAt = new Date().toISOString();

      // Persist updated event (write-through)
      await cacheService.setWithPersist(getEventConfigKey(eventId), event, 'config', eventId);

      loggerService.info(`Item ID cleared for event: ${eventId}, itemId: ${itemId}, admin: ${normalizedEmail}`);

      return foundItem;
    }

    // Get item configuration for validation
    const itemConfig = event.itemConfiguration || {};
    const numberOfItems = itemConfig.numberOfItems || 20;
    const excludedItemIds = itemConfig.excludedItemIds || [];

    // Get existing item ID assignments (excluding current item if it already has one)
    const existingAssignments = event.items
      .filter(i => i.id !== itemId && i.itemId !== null && i.itemId !== undefined)
      .map(i => i.itemId);

    // Validate item ID assignment
    const validation = this.validateItemIdAssignment(itemIdToAssign, numberOfItems, excludedItemIds, existingAssignments);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Assign itemId to item
    foundItem.itemId = itemIdToAssign;
    event.updatedAt = new Date().toISOString();

    // Persist updated event (write-through)
    await cacheService.setWithPersist(getEventConfigKey(eventId), event, 'config', eventId);

    loggerService.info(`Item ID assigned for event: ${eventId}, itemId: ${itemId}, assigned itemId: ${itemIdToAssign}, admin: ${normalizedEmail}`);

    return foundItem;
  }

  /**
   * Validate event state allows item details view
   * @param {string} state - Event state
   * @throws {Error} If state doesn't allow item details view
   */
  validateDetailsViewState(state) {
    if (state !== 'completed') {
      throw new Error(`Item details are only available when event is in "completed" state. Current state: "${state}"`);
    }
  }

  /**
   * Get item by assigned item ID (for display after event completion)
   * @param {string} eventId - Event identifier
   * @param {number} itemId - Assigned item ID (integer, 1 to numberOfItems)
   * @returns {Promise<object>} Item object with details
   * @throws {Error} If event not found, item not found, or state doesn't allow viewing
   */
  async getItemByItemId(eventId, itemId) {
    // Validate event ID format
    const eventIdValidation = eventService.validateEventId(eventId);
    if (!eventIdValidation.valid) {
      throw new Error(eventIdValidation.error);
    }

    // Validate itemId is an integer
    if (!Number.isInteger(itemId)) {
      throw new Error('Item ID must be an integer');
    }

    // Get event and validate state
    const event = await eventService.getEvent(eventId);
    this.validateDetailsViewState(event.state);

    // Initialize items array if needed
    this.initializeItemsArray(event);

    // Find item by assigned itemId
    const item = event.items.find(i => i.itemId === itemId);
    if (!item) {
      throw new Error(`Item with ID ${itemId} not found`);
    }

    return item;
  }

  /**
   * Update an existing item
   * @param {string} eventId - Event identifier
   * @param {string} itemId - Item unique identifier (nanoid)
   * @param {object} updates - Item data updates (name, price, description)
   * @param {string} ownerEmail - Email of user updating the item
   * @returns {Promise<object>} Updated item
   * @throws {Error} If validation fails, item not found, or user is not owner
   */
  async updateItem(eventId, itemId, updates, ownerEmail) {
    // Validate event ID format
    const eventIdValidation = eventService.validateEventId(eventId);
    if (!eventIdValidation.valid) {
      throw new Error(eventIdValidation.error);
    }

    // Validate owner email
    if (!ownerEmail || typeof ownerEmail !== 'string') {
      throw new Error('Owner email is required');
    }

    const normalizedEmail = ownerEmail.trim().toLowerCase();

    // Get event and validate state
    const event = await eventService.getEvent(eventId);
    this.validateRegistrationState(event.state);

    // Initialize items array if needed
    this.initializeItemsArray(event);

    // Find item by id
    const item = event.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`Item not found: ${itemId}`);
    }

    // Validate ownership
    if (item.ownerEmail !== normalizedEmail) {
      throw new Error('Only the item owner can update this item');
    }

    // Prepare update data (only update provided fields)
    const updateData = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }
    if (updates.price !== undefined) {
      updateData.price = updates.price;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    // Validate update data
    const validation = this.validateItemRegistration({
      name: updateData.name !== undefined ? updateData.name : item.name,
      price: updateData.price !== undefined ? updateData.price : item.price,
      description: updateData.description !== undefined ? updateData.description : item.description
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Apply updates
    if (updateData.name !== undefined) {
      item.name = validation.normalized.name;
    }
    if (updateData.price !== undefined) {
      item.price = validation.normalized.price;
    }
    if (updateData.description !== undefined) {
      item.description = validation.normalized.description;
    }

    event.updatedAt = new Date().toISOString();

    // Persist updated event (write-through)
    await cacheService.setWithPersist(getEventConfigKey(eventId), event, 'config', eventId);

    loggerService.info(`Item updated for event: ${eventId}, itemId: ${itemId}, owner: ${normalizedEmail}`);

    return item;
  }

  /**
   * Delete an item
   * @param {string} eventId - Event identifier
   * @param {string} itemId - Item unique identifier (nanoid)
   * @param {string} ownerEmail - Email of user deleting the item
   * @returns {Promise<{message: string}>} Success message
   * @throws {Error} If validation fails, item not found, or user is not owner
   */
  async deleteItem(eventId, itemId, ownerEmail) {
    // Validate event ID format
    const eventIdValidation = eventService.validateEventId(eventId);
    if (!eventIdValidation.valid) {
      throw new Error(eventIdValidation.error);
    }

    // Validate owner email
    if (!ownerEmail || typeof ownerEmail !== 'string') {
      throw new Error('Owner email is required');
    }

    const normalizedEmail = ownerEmail.trim().toLowerCase();

    // Get event and validate state
    const event = await eventService.getEvent(eventId);
    this.validateRegistrationState(event.state);

    // Initialize items array if needed
    this.initializeItemsArray(event);

    // Find item by id
    const itemIndex = event.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const item = event.items[itemIndex];

    // Validate ownership
    if (item.ownerEmail !== normalizedEmail) {
      throw new Error('Only the item owner can delete this item');
    }

    // Note: If item has itemId assigned, it becomes available for reassignment
    // (no special handling needed - just remove the item)

    // Remove item from array
    event.items.splice(itemIndex, 1);
    event.updatedAt = new Date().toISOString();

    // Persist updated event (write-through)
    await cacheService.setWithPersist(getEventConfigKey(eventId), event, 'config', eventId);

    loggerService.info(`Item deleted for event: ${eventId}, itemId: ${itemId}, owner: ${normalizedEmail}`);

    return { message: 'Item deleted successfully' };
  }
}

// Export singleton instance
const itemService = new ItemService();
export default itemService;
