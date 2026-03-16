export function validateItemId(itemId) {
  const str = String(itemId ?? '');
  if (!str || str.trim() === '' || str === 'undefined' || str === 'null') {
    throw new Error('Item ID is required');
  }
}
