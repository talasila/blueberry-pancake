# Implementation Plan: Event Progress Stepper

**Branch**: `031-event-progress-stepper` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-event-progress-stepper/spec.md`

## Summary

Replace the State side drawer on the Settings page with an inline Event Progress Stepper component. The stepper shows four phases (Setup → Tasting → Reveal → Results), context sentences, guardrail notes, and one-tap transition buttons. Friendly state labels replace the technical labels app-wide. The Header's StateIcon badge becomes a subtle colored dot. No backend changes — this is entirely a frontend UX improvement.

## Technical Context

**Language/Version**: JavaScript (ES2022), React 18, Vite  
**Primary Dependencies**: React, Tailwind CSS, Lucide React, Sonner (toast), shadcn/ui (add AlertDialog)  
**Storage**: N/A (reads from existing event API via `apiClient`)  
**Testing**: Vitest (unit), Playwright (e2e)  
**Target Platform**: Web (mobile-first, responsive down to 320px)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**: Stepper renders immediately with event data; no additional API calls  
**Constraints**: No backend changes; existing PATCH /events/:eventId/state API unchanged  
**Scale/Scope**: ~10 files modified/created, ~3 files deleted, 1 new component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | New component follows existing patterns (functional components, hooks, Tailwind) |
| II. DRY / Reuse | PASS | State config centralized in `eventState.jsx`; transition metadata shared; `AlertDialog` from shadcn/ui |
| III. Maintainability | PASS | Dead code deleted (State drawer, help content, help guide e2e). Clear separation: stepper component vs page |
| IV. Testing Standards | PASS | Unit tests for stepper + state utils; e2e tests rewritten for new UI; old irrelevant tests deleted |
| V. Security | PASS | No change to auth/authz; admin-only Settings page unchanged |
| VI. UX Consistency | PASS | Stepper uses existing theme colors, Tailwind classes, toast patterns; AlertDialog from shadcn/ui |
| VII. Performance | PASS | No new API calls; stepper renders from existing event data; no lazy loading needed |

**Post-design re-check**: PASS — all decisions align with constitution.

## Project Structure

### Documentation (this feature)

```text
specs/031-event-progress-stepper/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output (no changes — documents existing endpoint)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── EventProgressStepper.jsx    # NEW — stepper component
│   │   ├── Header.jsx                  # MODIFY — StateIcon → colored dot
│   │   ├── SettingsRow.jsx             # UNCHANGED
│   │   ├── SideDrawer.jsx              # UNCHANGED
│   │   ├── guide/
│   │   │   └── AdminGuideDrawer.jsx    # MODIFY — update CTA_MESSAGES
│   │   └── ui/
│   │       └── alert-dialog.jsx        # NEW — shadcn/ui AlertDialog
│   ├── pages/
│   │   ├── EventAdminPage.jsx          # MODIFY — remove State drawer, add stepper
│   │   └── MyEventsPage.jsx            # UNCHANGED (auto-gets new labels via StateBadge)
│   ├── utils/
│   │   └── eventState.jsx              # MODIFY — labels, getValidTransitions, StateDot
│   └── data/
│       └── eventStateHelpContent.js    # DELETE
└── tests/
    ├── unit/
    │   ├── EventAdminPage.test.jsx     # MODIFY — update for stepper
    │   ├── EventProgressStepper.test.jsx # NEW — stepper unit tests
    │   └── eventStateHelpContent.test.js # DELETE
    └── e2e/
        └── specs/
            ├── event-states.spec.js         # MODIFY — rewrite for stepper buttons
            └── event-state-help-guide.spec.js # DELETE
```

**Structure Decision**: Existing web application structure (frontend/ + backend/). All changes are in `frontend/`. The new `EventProgressStepper.jsx` is a component, not a page, since it's embedded inline on `EventAdminPage`.

## File Change Summary

### Files to Create (2)
| File | Purpose |
|------|---------|
| `frontend/src/components/EventProgressStepper.jsx` | Inline stepper: phases, context, guardrail, action buttons, confirmation dialog |
| `frontend/tests/unit/EventProgressStepper.test.jsx` | Unit tests for stepper rendering and interactions |

### Files to Modify (5)
| File | Changes |
|------|---------|
| `frontend/src/utils/eventState.jsx` | Update labels (Setup/Tasting/Reveal/Results), add `PHASE_ORDER`, add `getValidTransitions` with enriched metadata, add `StateDot` component, add context sentences |
| `frontend/src/pages/EventAdminPage.jsx` | Remove State SettingsRow + SideDrawer (~160 lines), remove `stateHelpExpanded`/local `getValidTransitions`, add `EventProgressStepper` inline, remove `eventStateHelpContent` import |
| `frontend/src/components/Header.jsx` | Replace `StateIcon` with colored dot (`StateDot` or inline `<span>`) |
| `frontend/src/components/guide/AdminGuideDrawer.jsx` | Update `CTA_MESSAGES` text to reference stepper |
| `frontend/tests/e2e/specs/event-states.spec.js` | Rewrite locators: stepper buttons (`Start Tasting`, `Pause for Reveal`, etc.) instead of drawer buttons (`Start`, `Pause`) |

### Files to Delete (3)
| File | Reason |
|------|--------|
| `frontend/src/data/eventStateHelpContent.js` | Only used by State drawer (being removed). Not used by AdminGuideDrawer. |
| `frontend/tests/unit/eventStateHelpContent.test.js` | Tests deleted file |
| `frontend/tests/e2e/specs/event-state-help-guide.spec.js` | Tests removed State drawer help section |

### Files Requiring shadcn/ui Addition (1)
| Component | Command |
|-----------|---------|
| AlertDialog | `cd frontend && npx shadcn@latest add alert-dialog` |

### E2E Tests Requiring Label Updates
These files use locators matching state labels (`/state.*created/i`, etc.) that will change with new friendly labels:

| File | Locator Pattern | Update |
|------|-----------------|--------|
| `event-states.spec.js` | `/state.*created/i`, `/state.*started/i`, etc. | Rewrite entirely for stepper UI |
| `event-state-help-guide.spec.js` | State drawer locators | Delete (tests removed feature) |
| Other specs using `changeEventState()` helper | API-level state changes | No change (API values unchanged) |

Note: E2e tests that use `changeEventState()` from helpers call the API with internal state values (`'started'`, `'paused'`), not labels. These are unaffected. Only tests that interact with the UI and match rendered text need updating.

## Complexity Tracking

No constitution violations to justify. All decisions align with core principles.
