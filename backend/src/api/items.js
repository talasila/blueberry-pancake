import { Router } from 'express';
import itemService from '../services/ItemService.js';
import eventService from '../services/EventService.js';
import loggerService from '../logging/Logger.js';
import requireAuth from '../middleware/requireAuth.js';
import { validateEventId, validateItemId, validateNumericItemId, validateAuthentication } from '../utils/validators.js';
import { handleApiError, badRequestError, unauthorizedError } from '../utils/apiErrorHandler.js';

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

    // Validate authentication
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, authValidation.error);
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      loggerService.error(`Invalid eventId in POST /items: ${eventId} (type: ${typeof eventId})`).catch(() => {});
      return badRequestError(res, eventIdValidation.error);
    }

    const { name, price, description } = req.body;

    // Register item
    const item = await itemService.registerItem(eventId, { name, price, description }, userEmail);

    res.status(201).json(item);
  } catch (error) {
    return handleApiError(res, error, 'register item');
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

    // Validate authentication
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, authValidation.error);
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
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
    return handleApiError(res, error, 'retrieve items');
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

    // Validate authentication
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, authValidation.error);
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate itemId format (nanoid, 12 characters)
    const itemIdValidation = validateItemId(itemId);
    if (!itemIdValidation.valid) {
      return badRequestError(res, itemIdValidation.error);
    }

    const { itemId: itemIdToAssign } = req.body;

    // Allow null to clear assignment, but not undefined
    if (itemIdToAssign === undefined) {
      return badRequestError(res, 'Item ID to assign is required (use null to clear assignment)');
    }

    // Assign item ID (or clear if null)
    const item = await itemService.assignItemId(eventId, itemId, itemIdToAssign, userEmail);

    res.json(item);
  } catch (error) {
    return handleApiError(res, error, 'assign item ID');
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

    // Validate authentication
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, authValidation.error);
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate itemId is a number
    const itemIdValidation = validateNumericItemId(itemId);
    if (!itemIdValidation.valid) {
      return badRequestError(res, itemIdValidation.error);
    }

    // Get item by assigned itemId
    const item = await itemService.getItemByItemId(eventId, itemIdValidation.value);

    res.json(item);
  } catch (error) {
    return handleApiError(res, error, 'retrieve item details');
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

    // Validate authentication
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, authValidation.error);
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate itemId format (nanoid, 12 characters)
    const itemIdValidation = validateItemId(itemId);
    if (!itemIdValidation.valid) {
      return badRequestError(res, itemIdValidation.error);
    }

    const { name, price, description } = req.body;

    // Update item
    const item = await itemService.updateItem(eventId, itemId, { name, price, description }, userEmail);

    res.json(item);
  } catch (error) {
    return handleApiError(res, error, 'update item');
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

    // Validate authentication
    const authValidation = validateAuthentication(userEmail);
    if (!authValidation.valid) {
      return unauthorizedError(res, authValidation.error);
    }

    // Validate event ID format
    const eventIdValidation = validateEventId(eventId);
    if (!eventIdValidation.valid) {
      return badRequestError(res, eventIdValidation.error);
    }

    // Validate itemId format (nanoid, 12 characters)
    const itemIdValidation = validateItemId(itemId);
    if (!itemIdValidation.valid) {
      return badRequestError(res, itemIdValidation.error);
    }

    // Delete item
    const result = await itemService.deleteItem(eventId, itemId, userEmail);

    res.json(result);
  } catch (error) {
    return handleApiError(res, error, 'delete item');
  }
});

export default router;
