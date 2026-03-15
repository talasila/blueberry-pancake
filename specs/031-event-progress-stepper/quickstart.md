# Quickstart: Event Progress Stepper

## Prerequisites

- Node.js 18+
- Frontend dev server: `cd frontend && npm run dev`

## Implementation Order

### 1. Update state utilities (`eventState.jsx`)
- Change `STATE_CONFIG` labels: Created→Setup, Started→Tasting, Paused→Reveal, Completed→Results
- Add `PHASE_ORDER` constant
- Add context sentences to each state config
- Move and enrich `getValidTransitions` from `EventAdminPage.jsx` → `eventState.jsx`
- Replace `StateIcon` with `StateDot` (colored dot, no label/border)

### 2. Add AlertDialog component
```bash
cd frontend && npx shadcn@latest add alert-dialog
```

### 3. Create `EventProgressStepper.jsx`
New component accepting: `event`, `isTransitioning`, `onTransition`
- Renders 4-step horizontal stepper
- Context sentence below
- Guardrail note (created state only)
- Action buttons with primary/secondary styling
- Confirmation dialog for backward transitions

### 4. Update `EventAdminPage.jsx`
- Import and render `EventProgressStepper` between name section and "Event Setup"
- Remove State `SettingsRow`
- Remove State `SideDrawer` block (~160 lines)
- Remove `stateHelpExpanded` state variable
- Remove `getValidTransitions` local function (now in `eventState.jsx`)
- Remove `eventStateHelpContent` import

### 5. Update `Header.jsx`
- Replace `StateIcon` import with `StateDot` (or inline dot)
- Replace badge with small colored dot

### 6. Update `AdminGuideDrawer.jsx`
- Update `CTA_MESSAGES` to reference stepper instead of "state management section"

### 7. Cleanup
- Delete `frontend/src/data/eventStateHelpContent.js`
- Delete `frontend/tests/unit/eventStateHelpContent.test.js`
- Delete `frontend/tests/e2e/specs/event-state-help-guide.spec.js`

### 8. Update tests
- Update `EventAdminPage.test.jsx` unit tests
- Rewrite `event-states.spec.js` e2e tests (stepper buttons instead of drawer)
- Update other e2e specs that reference state labels or State drawer

## Verification

```bash
# Unit tests
cd frontend && npx vitest run tests/unit/EventAdminPage.test.jsx
cd frontend && npx vitest run tests/unit/eventState.test.js

# E2e tests
cd frontend && npx playwright test tests/e2e/specs/event-states.spec.js
```
