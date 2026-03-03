# Quickstart: Start Event Guard-Rail (022)

**Feature Branch**: `022-start-event-guardrail`

## Manual Test Steps

1. **Open Event Admin**  
   Log in as an admin and open an event whose state is **created** or **completed**.

2. **Open State drawer**  
   Open the State section/drawer so the Start button (and any transition controls) is visible.

3. **Info: fewer registered than slots**  
   - Ensure configured rating slots (e.g. Bottles configuration → 20 slots) > number of registered bottles (e.g. 3).  
   - In State drawer you should see an **info** message stating that fewer bottles are registered than slots; event can be started; bottles can be registered later; only registered bottles can be mapped when paused.  
   - Click **Start** — event should start with one click (no confirmation step).

4. **Warning: more registered than slots**  
   - Set configured slots (e.g. 5) **less than** the number of registered bottles (e.g. 10).  
   - In State drawer you should see a **warning** message stating that more bottles are registered than slots; admin must adjust bottle count in Bottles configuration.  
   - Click **Start** — event should still start (one-click; message is informational only).

5. **Match**  
   - Set slots equal to registered count (e.g. 5 and 5).  
   - No mismatch message should appear above Start.

6. **Load failure fallback**  
   - Simulate items failing to load (e.g. network error or mock).  
   - In State drawer you should see the fallback message "Counts unavailable".  
   - **Start** remains clickable; admin can still start the event.

7. **Terminology**  
   - For a wine event, copy should say “bottles” and “Bottles configuration.”  
   - For a non-wine event, copy should say “items” and “Items configuration.”

8. **Restart (completed → started)**  
   - Use an event in **completed** state; open State drawer.  
   - Same info/warning rules apply when transitioning back to **started**.

## Implementation Entry Points

- **State drawer content**: `frontend/src/pages/EventAdminPage.jsx` — add conditional block above Start (and other transition buttons) that:
  - Computes `availableSlots` and `registeredCount`
  - Calls `getGapType(registeredCount, availableSlots)` (from `eventGuardrail.js` or equivalent)
  - Renders `<Message type="info">` or `<Message type="warning">` with copy from FR-001–FR-004, using `useItemTerminology(event)` for wording

- **Helper (optional)**: `frontend/src/utils/eventGuardrail.js` — `getGapType(registeredCount, availableSlots)` for unit tests.

- **E2E**: Extend or add tests in `frontend/tests/e2e/specs/event-states.spec.js` (or equivalent) for created/completed → started with fewer, more, and match scenarios, plus fallback when items fail to load.
