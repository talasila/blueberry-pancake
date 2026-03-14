/**
 * Shared validation for item (bottle) add/edit forms.
 *
 * @param {{ name: string, price: string, description: string }} data
 * @param {{ singular: string }} terminology - e.g. { singular: 'Bottle' }
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateItemForm(data, terminology = { singular: 'Item' }) {
  const errors = {};
  const { singular } = terminology;

  if (!data.name || data.name.trim().length === 0) {
    errors.name = `${singular} name is required`;
  } else if (data.name.trim().length > 200) {
    errors.name = `${singular} name must be 200 characters or less`;
  }

  if (data.description && data.description.length > 1000) {
    errors.description = `${singular} description must be 1000 characters or less`;
  }

  if (data.price && data.price.trim() !== '') {
    const priceStr = data.price.trim().replace(/[$,\s]/g, '');
    const priceNum = parseFloat(priceStr);
    if (isNaN(priceNum)) {
      errors.price = 'Invalid price format';
    } else if (priceNum < 0) {
      errors.price = 'Price cannot be negative';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
