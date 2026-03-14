import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateItemForm } from '@/utils/itemFormValidation';

/**
 * Shared form for adding and editing items (bottles).
 *
 * @param {object}   props
 * @param {object}   [props.initialValues]  - Pre-filled values for edit mode
 * @param {function} props.onSubmit         - Called with { name, price, description }
 * @param {function} [props.onCancel]       - Called when cancel is tapped
 * @param {boolean}  [props.isEditing]      - True for edit mode, false for add mode
 * @param {boolean}  [props.isLoading]      - Disables inputs while saving
 * @param {object}   props.terminology      - { singular, singularLower } from useItemTerminology
 */
export default function ItemForm({
  initialValues = { name: '', price: '', description: '' },
  onSubmit,
  onCancel,
  isEditing = false,
  isLoading = false,
  terminology,
}) {
  const { singular, singularLower } = terminology;
  const [formData, setFormData] = useState({
    name: initialValues.name || '',
    price: initialValues.price != null ? String(initialValues.price) : '',
    description: initialValues.description || '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateItemForm(formData, { singular });
    setErrors(validationErrors);
    if (!isValid) return;

    onSubmit({
      name: formData.name.trim(),
      price: formData.price.trim() || null,
      description: formData.description.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="item-name">
          {singular} Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="item-name"
          type="text"
          placeholder={`Enter ${singularLower} name`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={isLoading}
          className="mt-1"
          maxLength={200}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formData.name.length}/200 characters
        </p>
      </div>

      <div>
        <Label htmlFor="item-price">Price (optional)</Label>
        <Input
          id="item-price"
          type="text"
          placeholder="e.g., $50.00 or 50"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          disabled={isLoading}
          className="mt-1"
        />
        {errors.price && (
          <p className="text-xs text-destructive mt-1">{errors.price}</p>
        )}
      </div>

      <div>
        <Label htmlFor="item-description">Description (optional)</Label>
        <textarea
          id="item-description"
          placeholder={`Enter ${singularLower} description`}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isLoading}
          rows={2}
          className="mt-1 flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          maxLength={1000}
        />
        {errors.description && (
          <p className="text-xs text-destructive mt-1">{errors.description}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} size="sm" className="flex-1">
          {isLoading
            ? (isEditing ? 'Saving...' : 'Registering...')
            : (isEditing ? 'Save' : `Add ${singular}`)}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
