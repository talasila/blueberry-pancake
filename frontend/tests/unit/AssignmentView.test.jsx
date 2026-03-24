import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AssignmentView from '../../src/components/AssignmentView.jsx';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const makeEvent = (overrides = {}) => ({
  state: 'paused',
  typeOfItem: 'wine',
  itemConfiguration: {
    numberOfItems: 12,
    excludedItemIds: [5, 11],
  },
  users: {
    'sarah@example.com': { name: 'Sarah M.' },
    'mike@example.com': { name: 'Mike T.' },
  },
  ...overrides,
});

const makeItems = () => [
  { id: 'aaa', name: 'Cabernet Sauvignon', ownerEmail: 'sarah@example.com', itemId: null, price: null, description: null },
  { id: 'bbb', name: 'Pinot Noir', ownerEmail: 'mike@example.com', itemId: 2, price: null, description: null },
  { id: 'ccc', name: 'Merlot', ownerEmail: 'jane@example.com', itemId: null, price: null, description: null },
];

const defaultProps = {
  eventId: 'event-1',
  event: makeEvent(),
  items: makeItems(),
  isLoadingItems: false,
  onAssignItem: vi.fn(),
  onPauseEvent: vi.fn(),
  onItemsChange: vi.fn(),
};

describe('AssignmentView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- US1: Number Grid ---

  describe('US1: Number Grid', () => {
    it('renders correct number of buttons excluding excluded IDs', () => {
      render(<AssignmentView {...defaultProps} />);
      const buttons = screen.getAllByTestId(/^assignment-button-/);
      expect(buttons).toHaveLength(10);
      expect(screen.queryByTestId('assignment-button-5')).not.toBeInTheDocument();
      expect(screen.queryByTestId('assignment-button-11')).not.toBeInTheDocument();
    });

    it('shows assigned buttons differently from unassigned', () => {
      render(<AssignmentView {...defaultProps} />);
      const assignedBtn = screen.getByTestId('assignment-button-2');
      const unassignedBtn = screen.getByTestId('assignment-button-1');
      expect(assignedBtn.className).toContain('bg-green-500');
      expect(unassignedBtn.className).toContain('bg-gray-100');
    });

    it('shows instructional text for paused state', () => {
      render(<AssignmentView {...defaultProps} />);
      expect(screen.getByTestId('instruction-text')).toHaveTextContent(
        /Match each numbered bottle.*Tap a number below to assign/,
      );
    });

    it('shows instructional text for started state with paused hint', () => {
      render(<AssignmentView {...defaultProps} event={makeEvent({ state: 'started' })} />);
      const el = screen.getByTestId('instruction-text');
      expect(el).toHaveTextContent(/Match each numbered bottle/);
      expect(el).toHaveTextContent(/Assignment is only available when the event is paused/);
    });

    it('shows instructional text for created state with paused hint', () => {
      render(<AssignmentView {...defaultProps} event={makeEvent({ state: 'created' })} />);
      const el = screen.getByTestId('instruction-text');
      expect(el).toHaveTextContent(/Match each numbered bottle/);
      expect(el).toHaveTextContent(/Assignment is only available when the event is paused/);
    });

    it('shows instructional text for completed state', () => {
      render(<AssignmentView {...defaultProps} event={makeEvent({ state: 'completed' })} />);
      const el = screen.getByTestId('instruction-text');
      expect(el).toHaveTextContent(/Match each numbered bottle/);
      expect(el).toHaveTextContent(/Assignment is not available after the event is completed/);
    });

    it('disables grid when event is not paused', () => {
      render(<AssignmentView {...defaultProps} event={makeEvent({ state: 'started' })} />);
      const button = screen.getByTestId('assignment-button-1');
      expect(button).toBeDisabled();
    });

    it('enables grid when event is paused', () => {
      render(<AssignmentView {...defaultProps} />);
      const button = screen.getByTestId('assignment-button-1');
      expect(button).not.toBeDisabled();
    });
  });

  // --- US2: Assignment via Bottom Sheet ---

  describe('US2: Assignment via Bottom Sheet', () => {
    it('opens bottom sheet when unassigned button is tapped', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('assignment-button-1'));
      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
      expect(screen.getByText('Assign #1')).toBeInTheDocument();
    });

    it('shows only unassigned bottles in the picker', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('assignment-button-1'));
      expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
      expect(screen.getByText('Merlot')).toBeInTheDocument();
      expect(screen.queryByTestId('bottle-option-bbb')).not.toBeInTheDocument();
    });

    it('shows owner display name resolved from event.users', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('assignment-button-1'));
      expect(screen.getByText('Sarah M.')).toBeInTheDocument();
    });

    it('falls back to email when user not in event.users', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('assignment-button-1'));
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('closes sheet and calls onAssignItem when bottle is tapped', async () => {
      const onAssignItem = vi.fn().mockResolvedValue({ id: 'aaa', name: 'Cabernet Sauvignon', ownerEmail: 'sarah@example.com', itemId: 1 });
      render(<AssignmentView {...defaultProps} onAssignItem={onAssignItem} />);
      fireEvent.click(screen.getByTestId('assignment-button-1'));
      fireEvent.click(screen.getByTestId('bottle-option-aaa'));
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(onAssignItem).toHaveBeenCalledWith('aaa', 1);
      });
    });

    it('closes sheet without assigning when backdrop is tapped', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('assignment-button-1'));
      fireEvent.click(screen.getByTestId('bottom-sheet-backdrop'));
      expect(screen.queryByTestId('bottom-sheet')).not.toBeInTheDocument();
      expect(defaultProps.onAssignItem).not.toHaveBeenCalled();
    });

    it('shows empty state when all bottles are assigned', () => {
      const allAssigned = [
        { id: 'aaa', name: 'Cabernet', ownerEmail: 'a@b.com', itemId: 1 },
        { id: 'bbb', name: 'Pinot', ownerEmail: 'c@d.com', itemId: 2 },
      ];
      render(<AssignmentView {...defaultProps} items={allAssigned} />);
      fireEvent.click(screen.getByTestId('assignment-button-3'));
      expect(screen.getByTestId('empty-state')).toHaveTextContent(
        'All registered bottles have been assigned',
      );
    });
  });

  // --- US3: Review and Change ---

  describe('US3: Review and Change', () => {
    it('shows current assignment when assigned button is tapped', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('assignment-button-2'));
      expect(screen.getByText('#2 — Pinot Noir')).toBeInTheDocument();
      expect(screen.getByText('Mike T.')).toBeInTheDocument();
      expect(screen.getByTestId('change-assignment-btn')).toBeInTheDocument();
      expect(screen.getByTestId('clear-assignment-btn')).toBeInTheDocument();
    });

    it('clears assignment when Clear is tapped', async () => {
      const onAssignItem = vi.fn().mockResolvedValue({ id: 'bbb', name: 'Pinot Noir', ownerEmail: 'mike@example.com', itemId: null });
      render(<AssignmentView {...defaultProps} onAssignItem={onAssignItem} />);
      fireEvent.click(screen.getByTestId('assignment-button-2'));
      fireEvent.click(screen.getByTestId('clear-assignment-btn'));
      await waitFor(() => {
        expect(onAssignItem).toHaveBeenCalledWith('bbb', null);
      });
    });

    it('switches to pick mode when Change is tapped', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('assignment-button-2'));
      fireEvent.click(screen.getByTestId('change-assignment-btn'));
      expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
      expect(screen.queryByTestId('change-assignment-btn')).not.toBeInTheDocument();
    });
  });

  // --- US4: Progress Indicator ---

  describe('US4: Progress Indicator', () => {
    it('shows correct progress counts', () => {
      render(<AssignmentView {...defaultProps} />);
      const indicator = screen.getByTestId('progress-indicator');
      expect(indicator).toHaveTextContent('1 of 10 assigned.');
      expect(indicator).toHaveTextContent('2 registered bottles remaining');
    });

    it('shows completion state when all slots assigned', () => {
      const allAssigned = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i}`,
        name: `Bottle ${i}`,
        ownerEmail: `user${i}@test.com`,
        itemId: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12][i],
      }));
      render(<AssignmentView {...defaultProps} items={allAssigned} />);
      expect(screen.getByTestId('progress-indicator')).toHaveTextContent('All assigned ✓');
    });
  });

  // --- US5: Inline Pause CTA ---

  describe('US5: Inline Pause CTA', () => {
    it('shows pause button when event is started', () => {
      render(<AssignmentView {...defaultProps} event={makeEvent({ state: 'started' })} />);
      expect(screen.getByTestId('pause-cta')).toBeInTheDocument();
    });

    it('hides pause button when event is paused', () => {
      render(<AssignmentView {...defaultProps} />);
      expect(screen.queryByTestId('pause-cta')).not.toBeInTheDocument();
    });

    it('calls onPauseEvent when pause button is tapped', async () => {
      const onPauseEvent = vi.fn().mockResolvedValue({});
      render(<AssignmentView {...defaultProps} event={makeEvent({ state: 'started' })} onPauseEvent={onPauseEvent} />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('pause-cta'));
      });
      expect(onPauseEvent).toHaveBeenCalledOnce();
    });

    it('does not show pause button for created or completed states', () => {
      const { rerender } = render(<AssignmentView {...defaultProps} event={makeEvent({ state: 'created' })} />);
      expect(screen.queryByTestId('pause-cta')).not.toBeInTheDocument();
      rerender(<AssignmentView {...defaultProps} event={makeEvent({ state: 'completed' })} />);
      expect(screen.queryByTestId('pause-cta')).not.toBeInTheDocument();
    });
  });

  // --- US6: Registered Bottles List ---

  describe('US6: Registered Bottles List', () => {
    it('is collapsed by default', () => {
      render(<AssignmentView {...defaultProps} />);
      expect(screen.getByTestId('registered-bottles-section')).toBeInTheDocument();
      expect(screen.queryByTestId('registered-bottles-list')).not.toBeInTheDocument();
    });

    it('expands on tap showing all bottles', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('registered-bottles-toggle'));
      expect(screen.getByTestId('registered-bottles-list')).toBeInTheDocument();
      expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument();
      expect(screen.getByText('Pinot Noir')).toBeInTheDocument();
      expect(screen.getByText('Merlot')).toBeInTheDocument();
    });

    it('shows assigned number for assigned bottles', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('registered-bottles-toggle'));
      expect(screen.getByText('#2')).toBeInTheDocument();
    });

    it('shows Unassigned badge for unassigned bottles', () => {
      render(<AssignmentView {...defaultProps} />);
      fireEvent.click(screen.getByTestId('registered-bottles-toggle'));
      const unassignedBadges = screen.getAllByText('Unassigned');
      expect(unassignedBadges.length).toBe(2);
    });

    it('uses dynamic terminology', () => {
      render(<AssignmentView {...defaultProps} />);
      expect(screen.getByText('Registered Bottles')).toBeInTheDocument();
    });

    it('uses item terminology for non-wine events', () => {
      const nonWineEvent = makeEvent({ typeOfItem: 'cheese' });
      render(<AssignmentView {...defaultProps} event={nonWineEvent} />);
      expect(screen.getByText('Registered Items')).toBeInTheDocument();
    });
  });

  // --- Loading state ---

  describe('Loading', () => {
    it('shows loading spinner when items are loading', () => {
      render(<AssignmentView {...defaultProps} isLoadingItems={true} />);
      expect(screen.queryByTestId('assignment-button-1')).not.toBeInTheDocument();
    });
  });
});
