import { Router } from 'express';
import itemService from '../services/ItemService.js';
import eventService from '../services/EventService.js';
import loggerService from '../logging/Logger.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/events/:eventId/items
 * Register a new item for an event
 * Only allowed when event is in "created" or "started" state
 */
router.post('/', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userEmail = req.user?.email;

    // Debug logging
    loggerService.debug(`POST /items - eventId: ${eventId}, type: ${typeof eventId}, userEmail: ${userEmail || 'none'}`).catch(() => {});

    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      loggerService.error(`Invalid eventId in POST /items: ${eventId} (type: ${typeof eventId})`).catch(() => {});
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    const { name, price, description } = req.body;

    // Register item
    const item = await itemService.registerItem(eventId, { name, price, description }, userEmail);

    res.status(201).json(item);
  } catch (error) {
    loggerService.error(`Item registration error: ${error.message}`, error).catch(() => {});

    // Handle validation errors (400)
    if (error.message.includes('required') ||
        error.message.includes('invalid') ||
        error.message.includes('cannot be empty') ||
        error.message.includes('characters') ||
        error.message.includes('must be') ||
        error.message.includes('cannot be negative') ||
        error.message.includes('Invalid price')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle state-based access control errors (403)
    if (error.message.includes('not allowed when event is in')) {
      return res.status(403).json({
        error: error.message
      });
    }

    // Handle event not found (404)
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to register item. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

/**
 * GET /api/events/:eventId/items
 * Retrieve items for an event
 * Returns all items for administrators (unless ownItemsOnly=true), or only user's own items for regular users
 * Query parameter: ownItemsOnly - if true, returns only user's own items even for administrators
 */
router.get('/', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userEmail = req.user?.email;
    const ownItemsOnly = req.query.ownItemsOnly === 'true';

    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Get event to check if user is administrator
    const event = await eventService.getEvent(eventId);
    const isAdministrator = eventService.isAdministrator(event, userEmail);

    // If ownItemsOnly is true, force filtering by user email even for admins
    // Otherwise, return all items for admins, filtered for regular users
    const shouldFilterByUser = ownItemsOnly || !isAdministrator;
    const items = await itemService.getItems(eventId, userEmail, !shouldFilterByUser);

    res.json(items);
  } catch (error) {
    loggerService.error(`Get items error: ${error.message}`, error).catch(() => {});

    // Handle event not found (404)
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to retrieve items. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

/**
 * PATCH /api/events/:eventId/items/:itemId/assign-item-id
 * Assign an item ID to a registered item
 * Only allowed when event is in "paused" state. User must be event administrator.
 */
router.patch('/:itemId/assign-item-id', async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Validate itemId format (nanoid, 12 characters)
    if (!itemId || typeof itemId !== 'string' || !/^[A-Za-z0-9]{12}$/.test(itemId)) {
      return res.status(400).json({
        error: 'Invalid item ID format. Item ID must be exactly 12 alphanumeric characters.'
      });
    }

    const { itemId: itemIdToAssign } = req.body;

    // Allow null to clear assignment, but not undefined
    if (itemIdToAssign === undefined) {
      return res.status(400).json({
        error: 'Item ID to assign is required (use null to clear assignment)'
      });
    }

    // Assign item ID (or clear if null)
    const item = await itemService.assignItemId(eventId, itemId, itemIdToAssign, userEmail);

    res.json(item);
  } catch (error) {
    loggerService.error(`Item ID assignment error: ${error.message}`, error).catch(() => {});

    // Handle validation errors (400)
    if (error.message.includes('required') ||
        error.message.includes('invalid') ||
        error.message.includes('must be') ||
        error.message.includes('between') ||
        error.message.includes('excluded') ||
        error.message.includes('already assigned')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle state-based access control errors (403)
    if (error.message.includes('not allowed when event is in') ||
        error.message.includes('Only event administrators')) {
      return res.status(403).json({
        error: error.message
      });
    }

    // Handle item not found (404)
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    // Handle duplicate assignment (409)
    if (error.message.includes('already assigned')) {
      return res.status(409).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to assign item ID. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

/**
 * GET /api/events/:eventId/items/by-item-id/:itemId
 * Get item details by assigned item ID
 * Only available when event is in "completed" state
 */
router.get('/by-item-id/:itemId', async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Validate itemId is a number
    const itemIdNum = parseInt(itemId, 10);
    if (isNaN(itemIdNum)) {
      return res.status(400).json({
        error: 'Invalid item ID format. Item ID must be a number.'
      });
    }

    // Get item by assigned itemId
    const item = await itemService.getItemByItemId(eventId, itemIdNum);

    res.json(item);
  } catch (error) {
    loggerService.error(`Get item by item ID error: ${error.message}`, error).catch(() => {});

    // Handle validation errors (400)
    if (error.message.includes('must be') ||
        error.message.includes('Invalid')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle state-based access control errors (403)
    if (error.message.includes('only available when event is in')) {
      return res.status(403).json({
        error: error.message
      });
    }

    // Handle not found (404)
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to retrieve item details. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

/**
 * PATCH /api/events/:eventId/items/:itemId
 * Update an existing item
 * Only allowed when event is in "created" or "started" state. User must be item owner.
 */
router.patch('/:itemId', async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Validate itemId format (nanoid, 12 characters)
    if (!itemId || typeof itemId !== 'string' || !/^[A-Za-z0-9]{12}$/.test(itemId)) {
      return res.status(400).json({
        error: 'Invalid item ID format. Item ID must be exactly 12 alphanumeric characters.'
      });
    }

    const { name, price, description } = req.body;

    // Update item
    const item = await itemService.updateItem(eventId, itemId, { name, price, description }, userEmail);

    res.json(item);
  } catch (error) {
    loggerService.error(`Item update error: ${error.message}`, error).catch(() => {});

    // Handle validation errors (400)
    if (error.message.includes('required') ||
        error.message.includes('invalid') ||
        error.message.includes('cannot be empty') ||
        error.message.includes('characters') ||
        error.message.includes('must be') ||
        error.message.includes('cannot be negative') ||
        error.message.includes('Invalid price')) {
      return res.status(400).json({
        error: error.message
      });
    }

    // Handle ownership errors (403)
    if (error.message.includes('Only the item owner')) {
      return res.status(403).json({
        error: error.message
      });
    }

    // Handle state-based access control errors (403)
    if (error.message.includes('not allowed when event is in')) {
      return res.status(403).json({
        error: error.message
      });
    }

    // Handle item not found (404)
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to update item. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

/**
 * DELETE /api/events/:eventId/items/:itemId
 * Delete an item
 * Only allowed when event is in "created" or "started" state. User must be item owner.
 */
router.delete('/:itemId', async (req, res) => {
  try {
    const { eventId, itemId } = req.params;
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Validate event ID format
    if (!eventId || typeof eventId !== 'string' || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format. Event ID must be exactly 8 alphanumeric characters.'
      });
    }

    // Validate itemId format (nanoid, 12 characters)
    if (!itemId || typeof itemId !== 'string' || !/^[A-Za-z0-9]{12}$/.test(itemId)) {
      return res.status(400).json({
        error: 'Invalid item ID format. Item ID must be exactly 12 alphanumeric characters.'
      });
    }

    // Delete item
    const result = await itemService.deleteItem(eventId, itemId, userEmail);

    res.json(result);
  } catch (error) {
    loggerService.error(`Item deletion error: ${error.message}`, error).catch(() => {});

    // Handle ownership errors (403)
    if (error.message.includes('Only the item owner')) {
      return res.status(403).json({
        error: error.message
      });
    }

    // Handle state-based access control errors (403)
    if (error.message.includes('not allowed when event is in')) {
      return res.status(403).json({
        error: error.message
      });
    }

    // Handle item not found (404)
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: error.message
      });
    }

    // Handle server errors (500)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to delete item. Please try again.',
      ...(isDevelopment && { details: error.message })
    });
  }
});

export default router;
