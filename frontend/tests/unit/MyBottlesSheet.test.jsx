import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import MyBottlesSheet from '../../src/components/MyBottlesSheet.jsx';

vi.mock('../../src/services/itemService.js', () => ({
  default: {
    getItems: vi.fn(),
    registerItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    getUserProfile: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

import itemService from '../../src/services/itemService.js';
import apiClient from '../../src/services/apiClient.js';
import { toast } from 'sonner';

const makeEvent = (state = 'created', typeOfItem = 'wine') => ({
  name: 'Wine Night',
  state,
  typeOfItem,
});

const makeItem = (overrides = {}) => ({
  id: 'item-1',
  name: 'Merlot 2020',
  price: 25,
  description: 'A nice red',
  registeredAt: new Date().toISOString(),
  itemId: null,
  ...overrides,
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  event: makeEvent(),
  eventId: 'EVT12345',
};

describe('MyBottlesSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    itemService.getItems.mockResolvedValue([]);
    apiClient.getUserProfile.mockResolvedValue({ name: 'Alice' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ---- Loading ----

  it('shows loading spinner while fetching data', async () => {
    itemService.getItems.mockReturnValue(new Promise(() => {}));
    render(<MyBottlesSheet {...defaultProps} />);
    expect(screen.getByTestId('my-bottles-loading')).toBeInTheDocument();
  });

  // ---- Name field ----

  it('renders name field pre-populated with profile name', async () => {
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('my-bottles-name-input')).toHaveValue('Alice');
    });
  });

  it('auto-saves name on blur when changed', async () => {
    apiClient.updateUserProfile.mockResolvedValue({});
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('my-bottles-name-input')).toHaveValue('Alice'));

    fireEvent.change(screen.getByTestId('my-bottles-name-input'), { target: { value: 'Bob' } });
    fireEvent.blur(screen.getByTestId('my-bottles-name-input'));

    await waitFor(() => {
      expect(apiClient.updateUserProfile).toHaveBeenCalledWith('EVT12345', 'Bob');
      expect(toast.success).toHaveBeenCalledWith('Name updated');
    });
  });

  it('does not save name on blur when unchanged', async () => {
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('my-bottles-name-input')).toHaveValue('Alice'));

    fireEvent.blur(screen.getByTestId('my-bottles-name-input'));
    expect(apiClient.updateUserProfile).not.toHaveBeenCalled();
  });

  it('makes name field read-only during paused state', async () => {
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('paused')} />);
    await waitFor(() => expect(screen.getByTestId('my-bottles-name-input')).toBeInTheDocument());
    expect(screen.getByTestId('my-bottles-name-input')).toHaveAttribute('readonly');
  });

  it('makes name field read-only during completed state', async () => {
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('completed')} />);
    await waitFor(() => expect(screen.getByTestId('my-bottles-name-input')).toBeInTheDocument());
    expect(screen.getByTestId('my-bottles-name-input')).toHaveAttribute('readonly');
  });

  // ---- Empty state ----

  it('shows empty state when no bottles registered during created state', async () => {
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('my-bottles-empty')).toBeInTheDocument();
      expect(screen.getByText(/haven't registered any bottles/i)).toBeInTheDocument();
    });
  });

  // ---- State-based messages ----

  it('shows paused message during paused state', async () => {
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('paused')} />);
    await waitFor(() => {
      expect(screen.getByText(/registration is closed/i)).toBeInTheDocument();
    });
  });

  it('shows completed message during completed state', async () => {
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('completed')} />);
    await waitFor(() => {
      expect(screen.getByText(/event has ended/i)).toBeInTheDocument();
    });
  });

  // ---- Add bottle flow ----

  it('shows add button in empty state during created state', async () => {
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('my-bottles-empty')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Bottle/i })).toBeInTheDocument();
    });
  });

  it('shows standalone add button when items exist', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('my-bottles-add-btn')).toBeInTheDocument();
    });
  });

  it('does not show add button during paused state', async () => {
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('paused')} />);
    await waitFor(() => expect(screen.getByTestId('my-bottles-content')).toBeInTheDocument());
    expect(screen.queryByTestId('my-bottles-add-btn')).not.toBeInTheDocument();
  });

  it('shows add form when add button is clicked', async () => {
    render(<MyBottlesSheet {...defaultProps} />);
    const emptyState = await screen.findByTestId('my-bottles-empty');

    fireEvent.click(within(emptyState).getByRole('button', { name: /Add Bottle/i }));
    expect(screen.getByTestId('my-bottles-add-form')).toBeInTheDocument();
  });

  it('registers a bottle on form submit', async () => {
    const newItem = makeItem({ id: 'item-new' });
    itemService.registerItem.mockResolvedValue(newItem);

    render(<MyBottlesSheet {...defaultProps} />);
    const emptyState = await screen.findByTestId('my-bottles-empty');

    fireEvent.click(within(emptyState).getByRole('button', { name: /Add Bottle/i }));
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: 'Merlot 2020' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Bottle/i }));

    await waitFor(() => {
      expect(itemService.registerItem).toHaveBeenCalledWith('EVT12345', {
        name: 'Merlot 2020',
        price: null,
        description: null,
      });
      expect(toast.success).toHaveBeenCalledWith('Bottle registered');
    });
  });

  // ---- Bottle list rendering ----

  it('renders registered bottles as ListCards', async () => {
    const items = [makeItem(), makeItem({ id: 'item-2', name: 'Pinot Noir' })];
    itemService.getItems.mockResolvedValue(items);

    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Merlot 2020')).toBeInTheDocument();
      expect(screen.getByText('Pinot Noir')).toBeInTheDocument();
    });
  });

  it('shows price when present', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Price: $25.00')).toBeInTheDocument();
    });
  });

  it('shows description when present', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('A nice red')).toBeInTheDocument();
    });
  });

  // ---- Edit flow ----

  it('shows edit button during created/started states', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('edit-btn-item-1')).toBeInTheDocument();
    });
  });

  it('does not show edit button during paused state', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('paused')} />);
    await waitFor(() => expect(screen.getByText('Merlot 2020')).toBeInTheDocument());
    expect(screen.queryByTestId('edit-btn-item-1')).not.toBeInTheDocument();
  });

  it('shows edit form when edit button is clicked', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('edit-btn-item-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-btn-item-1'));
    expect(screen.getByTestId('edit-form-item-1')).toBeInTheDocument();
    expect(screen.getByLabelText(/Bottle Name/)).toHaveValue('Merlot 2020');
  });

  it('saves edited bottle', async () => {
    const updated = makeItem({ name: 'Merlot 2021' });
    itemService.getItems.mockResolvedValue([makeItem()]);
    itemService.updateItem.mockResolvedValue(updated);

    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('edit-btn-item-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-btn-item-1'));
    fireEvent.change(screen.getByLabelText(/Bottle Name/), { target: { value: 'Merlot 2021' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(itemService.updateItem).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Bottle updated');
    });
  });

  // ---- Delete flow (undo toast) ----

  it('shows delete button during created/started states', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('delete-btn-item-1')).toBeInTheDocument();
    });
  });

  it('does not show delete button during completed state', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('completed')} />);
    await waitFor(() => expect(screen.getByText('Merlot 2020')).toBeInTheDocument());
    expect(screen.queryByTestId('delete-btn-item-1')).not.toBeInTheDocument();
  });

  it('optimistically removes item and shows undo toast on delete', async () => {
    itemService.getItems.mockResolvedValue([makeItem()]);
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => expect(screen.getByTestId('delete-btn-item-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('delete-btn-item-1'));

    expect(screen.queryByText('Merlot 2020')).not.toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(
      'Bottle deleted',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Undo' }),
        duration: 5000,
      })
    );
  });

  // ---- Assigned item number in completed state ----

  it('shows assigned item number badge in completed state', async () => {
    const item = makeItem({ itemId: 3 });
    itemService.getItems.mockResolvedValue([item]);
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('completed')} />);
    await waitFor(() => {
      expect(screen.getByText('#3')).toBeInTheDocument();
    });
  });

  it('does not show assigned item number during created state', async () => {
    const item = makeItem({ itemId: 3 });
    itemService.getItems.mockResolvedValue([item]);
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('created')} />);
    await waitFor(() => expect(screen.getByText('Merlot 2020')).toBeInTheDocument());
    expect(screen.queryByText('#3')).not.toBeInTheDocument();
  });

  // ---- Dynamic terminology ----

  it('uses "Item" terminology for generic events', async () => {
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('created', 'generic')} />);
    await waitFor(() => {
      expect(screen.getByText(/haven't registered any items/i)).toBeInTheDocument();
    });
  });

  // ---- Sheet title ----

  it('displays "My Bottles" as sheet title for wine events', async () => {
    render(<MyBottlesSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('My Bottles')).toBeInTheDocument();
    });
  });

  it('displays "My Items" as sheet title for generic events', async () => {
    render(<MyBottlesSheet {...defaultProps} event={makeEvent('created', 'generic')} />);
    await waitFor(() => {
      expect(screen.getByText('My Items')).toBeInTheDocument();
    });
  });

  // ---- Does not render when closed ----

  it('does not render content when isOpen is false', () => {
    render(<MyBottlesSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('my-bottles-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-bottles-loading')).not.toBeInTheDocument();
  });
});
