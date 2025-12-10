/**
 * Item Terminology Utility
 * 
 * Provides the correct terminology (item/bottle) based on event type.
 * For wine events, uses "bottle" terminology.
 * For all other event types, uses "item" terminology.
 */

/**
 * Get item terminology based on event type
 * @param {string|null|undefined} typeOfItem - Event type (e.g., 'wine', 'beer', etc.)
 * @returns {object} Object with capitalized and lowercase labels
 */
export function getItemTerminology(typeOfItem) {
  const isWine = typeOfItem === 'wine';
  
  return {
    singular: isWine ? 'Bottle' : 'Item',
    singularLower: isWine ? 'bottle' : 'item',
    plural: isWine ? 'Bottles' : 'Items',
    pluralLower: isWine ? 'bottles' : 'items'
  };
}

/**
 * React hook to get item terminology from event context
 * @param {object|null|undefined} event - Event object with typeOfItem property
 * @returns {object} Object with capitalized and lowercase labels
 */
export function useItemTerminology(event) {
  const typeOfItem = event?.typeOfItem;
  return getItemTerminology(typeOfItem);
}
