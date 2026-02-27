export function validateEventId(eventId) {
  if (!eventId || typeof eventId !== 'string' || eventId.trim() === '' || eventId === 'undefined' || eventId === 'null') {
    throw new Error('Event ID is required');
  }
}

export function validateItemId(itemId) {
  const str = String(itemId ?? '');
  if (!str || str.trim() === '' || str === 'undefined' || str === 'null') {
    throw new Error('Item ID is required');
  }
}
