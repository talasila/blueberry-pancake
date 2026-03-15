import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventProgressStepper from '../../src/components/EventProgressStepper';

function makeEvent(overrides = {}) {
  return {
    state: 'created',
    typeOfItem: 'wine',
    items: [],
    itemConfiguration: { numberOfItems: 5, excludedItemIds: [] },
    ...overrides,
  };
}

describe('EventProgressStepper', () => {
  // ========================================
  // US1: Stepper visual + context sentence
  // ========================================

  describe('stepper visual (US1)', () => {
    it('renders all 4 phase labels', () => {
      render(<EventProgressStepper event={makeEvent()} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText('Setup')).toBeInTheDocument();
      expect(screen.getByText('Tasting')).toBeInTheDocument();
      expect(screen.getByText('Reveal')).toBeInTheDocument();
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    it('shows correct context sentence for created state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'created' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/Configure your event/)).toBeInTheDocument();
    });

    it('shows correct context sentence for started state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'started' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/Guests are rating/)).toBeInTheDocument();
    });

    it('shows correct context sentence for paused state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'paused' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/Assign bottles to item numbers/)).toBeInTheDocument();
    });

    it('shows correct context sentence for completed state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'completed' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/The event is over/)).toBeInTheDocument();
    });

    it('uses item terminology for non-wine events', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'paused', typeOfItem: 'beer' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/Assign items to item numbers/)).toBeInTheDocument();
    });

    it('renders skeleton when event is null', () => {
      render(<EventProgressStepper event={null} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByLabelText('Loading event progress')).toBeInTheDocument();
    });
  });

  // ========================================
  // US2: Action buttons + transitions
  // ========================================

  describe('action buttons (US2)', () => {
    it('shows Start Tasting button in created state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'created' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Start Tasting' })).toBeInTheDocument();
    });

    it('shows Pause for Reveal and Complete Event in started state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'started' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Pause for Reveal' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Complete Event' })).toBeInTheDocument();
    });

    it('shows Announce Results and Resume Tasting in paused state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'paused' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Announce Results' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Resume Tasting' })).toBeInTheDocument();
    });

    it('shows Reopen Tasting and Back to Reveal in completed state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'completed' })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Reopen Tasting' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Reveal' })).toBeInTheDocument();
    });

    it('calls onTransition for forward transitions without confirmation', () => {
      const onTransition = vi.fn();
      render(<EventProgressStepper event={makeEvent({ state: 'created' })} isTransitioning={false} onTransition={onTransition} />);
      fireEvent.click(screen.getByRole('button', { name: 'Start Tasting' }));
      expect(onTransition).toHaveBeenCalledWith('started');
    });

    it('shows confirmation dialog for backward transitions', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'completed' })} isTransitioning={false} onTransition={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Reopen Tasting' }));
      expect(screen.getByText('Reopen Tasting?')).toBeInTheDocument();
      expect(screen.getByText(/Guests may be affected/)).toBeInTheDocument();
    });

    it('calls onTransition after confirming backward transition', () => {
      const onTransition = vi.fn();
      render(<EventProgressStepper event={makeEvent({ state: 'completed' })} isTransitioning={false} onTransition={onTransition} />);
      fireEvent.click(screen.getByRole('button', { name: 'Reopen Tasting' }));
      fireEvent.click(screen.getByRole('button', { name: 'Reopen Tasting' }));
      expect(onTransition).toHaveBeenCalledWith('started');
    });

    it('does not call onTransition when confirmation is cancelled', () => {
      const onTransition = vi.fn();
      render(<EventProgressStepper event={makeEvent({ state: 'completed' })} isTransitioning={false} onTransition={onTransition} />);
      fireEvent.click(screen.getByRole('button', { name: 'Reopen Tasting' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onTransition).not.toHaveBeenCalled();
    });

    it('disables all buttons during transition', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'started' })} isTransitioning={true} onTransition={vi.fn()} />);
      expect(screen.getByRole('button', { name: /Pause for Reveal/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Complete Event/ })).toBeDisabled();
    });
  });

  // ========================================
  // US3: Guardrail notes
  // ========================================

  describe('guardrail notes (US3)', () => {
    const ic = (n, excluded = []) => ({ itemConfiguration: { numberOfItems: n, excludedItemIds: excluded } });

    it('shows info note when fewer items registered than slots', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'created', items: [{ id: 1 }], ...ic(5) })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/1 bottles registered, 5 slots available/)).toBeInTheDocument();
    });

    it('shows warning note when more items registered than slots', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'created', items: [{}, {}, {}, {}, {}], ...ic(3) })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/5 bottles registered but only 3 slots available/)).toBeInTheDocument();
    });

    it('shows info note when zero items registered', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'created', items: [], ...ic(5) })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/No bottles registered yet/)).toBeInTheDocument();
    });

    it('does not show guardrail when counts match', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'created', items: [{}, {}, {}], ...ic(3) })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.queryByText(/registered/)).not.toBeInTheDocument();
    });

    it('does not show guardrail in started state', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'started', items: [{ id: 1 }], ...ic(5) })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.queryByText(/registered.*available/)).not.toBeInTheDocument();
    });

    it('uses correct terminology for non-wine events', () => {
      render(<EventProgressStepper event={makeEvent({ state: 'created', typeOfItem: 'beer', items: [], ...ic(5) })} isTransitioning={false} onTransition={vi.fn()} />);
      expect(screen.getByText(/No items registered yet/)).toBeInTheDocument();
    });
  });
});
