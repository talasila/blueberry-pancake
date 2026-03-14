import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemForm from '../../src/components/ItemForm.jsx';

const terminology = { singular: 'Bottle', singularLower: 'bottle' };

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  terminology,
};

describe('ItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders name, price, and description fields', () => {
    render(<ItemForm {...defaultProps} />);
    expect(screen.getByLabelText(/Bottle Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
  });

  it('shows name as required', () => {
    render(<ItemForm {...defaultProps} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', () => {
    render(<ItemForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Add Bottle/i }));
    expect(screen.getByText('Bottle name is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when name exceeds 200 characters', () => {
    render(<ItemForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: 'a'.repeat(201) } });
    fireEvent.click(screen.getByRole('button', { name: /Add Bottle/i }));
    expect(screen.getByText(/200 characters or less/)).toBeInTheDocument();
  });

  it('shows validation error for negative price', () => {
    render(<ItemForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: 'Merlot' } });
    fireEvent.change(screen.getByLabelText(/Price/), { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Bottle/i }));
    expect(screen.getByText('Price cannot be negative')).toBeInTheDocument();
  });

  it('shows validation error for invalid price format', () => {
    render(<ItemForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: 'Merlot' } });
    fireEvent.change(screen.getByLabelText(/Price/), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Bottle/i }));
    expect(screen.getByText('Invalid price format')).toBeInTheDocument();
  });

  it('accepts flexible price formats ($50, 50.00, 50)', () => {
    render(<ItemForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: 'Merlot' } });
    fireEvent.change(screen.getByLabelText(/Price/), { target: { value: '$50.00' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Bottle/i }));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      name: 'Merlot',
      price: '$50.00',
      description: null,
    });
  });

  it('calls onSubmit with trimmed data on valid submit', () => {
    render(<ItemForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: '  Merlot  ' } });
    fireEvent.change(screen.getByLabelText(/Price/), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Nice red' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Bottle/i }));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      name: 'Merlot',
      price: '25',
      description: 'Nice red',
    });
  });

  it('calls onCancel when cancel is clicked', () => {
    render(<ItemForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders "Save" button in edit mode', () => {
    render(<ItemForm {...defaultProps} isEditing />);
    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
  });

  it('pre-fills initialValues in edit mode', () => {
    render(
      <ItemForm
        {...defaultProps}
        isEditing
        initialValues={{ name: 'Pinot Noir', price: '45', description: 'Fruity' }}
      />
    );
    expect(screen.getByLabelText(/Bottle Name/)).toHaveValue('Pinot Noir');
    expect(screen.getByLabelText(/Price/)).toHaveValue('45');
    expect(screen.getByLabelText(/Description/)).toHaveValue('Fruity');
  });

  it('disables fields when isLoading is true', () => {
    render(<ItemForm {...defaultProps} isLoading />);
    expect(screen.getByLabelText(/Bottle Name/)).toBeDisabled();
    expect(screen.getByLabelText(/Price/)).toBeDisabled();
    expect(screen.getByLabelText(/Description/)).toBeDisabled();
  });

  it('uses dynamic terminology for generic events', () => {
    render(<ItemForm {...defaultProps} terminology={{ singular: 'Item', singularLower: 'item' }} />);
    expect(screen.getByLabelText(/Item Name/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
  });

  it('does not render cancel button when onCancel is not provided', () => {
    render(<ItemForm onSubmit={vi.fn()} terminology={terminology} />);
    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
  });

  it('displays character count for name field', () => {
    render(<ItemForm {...defaultProps} />);
    expect(screen.getByText('0/200 characters')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: 'Merlot' } });
    expect(screen.getByText('6/200 characters')).toBeInTheDocument();
  });
});
