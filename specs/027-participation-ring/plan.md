# Implementation Plan: Live Participation Ring on Item Buttons

**Branch**: `027-participation-ring` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/027-participation-ring/spec.md`

## Summary

Add a subtle SVG participation ring around each item button on the event page that fills clockwise as more participants rate that item. The ring uses a darker shade of the button's own color (not a theme accent), only appears during `started` state, and derives all data from existing API responses — no new backend endpoints. The rating drawer also surfaces the exact count as text. Participation data piggybacks on the existing 30-second event polling cycle.

## Technical Context

**Language/Version**: JavaScript (Node.js 22 / ES Modules), React 19  
**Primary Dependencies**: React 19, Vite 6, Tailwind CSS 4, Radix UI, Lucide icons  
**Storage**: N/A (no new backend storage; data derived from existing DynamoDB-backed API responses)  
**Testing**: Vitest (unit), Playwright (e2e)  
**Target Platform**: Mobile-first web (modern browsers: Chrome 111+, Safari 16.2+, Firefox 113+)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: No perceptible latency added to event page load or interaction. Ring animation at 60fps via CSS transitions (no JS animation loops).  
**Constraints**: No new API endpoints. Data freshness bounded by existing 30-second polling cadence. CSS `color-mix()` required for dynamic color derivation (graceful degradation on unsupported browsers).  
**Scale/Scope**: Events with up to 20 items and dozens of participants. Frontend-only changes + 1 existing API call piggybacked on polling.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Feature is a self-contained UI enhancement. SVG ring logic is encapsulated in ItemButton. Participation count derivation is a pure function. |
| II. DRY | PASS | Ring rendering is added once in ItemButton (reused by all items). Count derivation uses existing `allRatings` data — no duplicate fetching. |
| III. Maintainability | PASS | New props are optional with graceful fallback. No dead code introduced. Clear separation: data derivation in EventPage, rendering in ItemButton. |
| IV. Testing Standards | PASS | Unit tests for count derivation logic, ItemButton ring rendering. E2e test for ring visibility across event states. |
| V. Security | PASS | No new endpoints. No sensitive data exposed (ring shows aggregate counts, not identities or rating values). Data already accessible to authenticated event participants. |
| VI. UX Consistency | PASS | Ring uses the button's own color (darker shade via `color-mix`), not a new color. Styling via Tailwind classes + inline styles (consistent with existing ItemButton pattern). |
| VII. Performance | PASS | CSS-only animation (stroke-dashoffset transition). One additional ratings fetch piggybacked on existing 30s poll — no new polling intervals. SVG is lightweight (~200 bytes per button). |

**Gate Result**: ALL PASS — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/027-participation-ring/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── README.md        # Contract documentation
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ItemButton.jsx          # MODIFY: Add SVG ring, new props (ratedCount, totalParticipants, showRing)
│   │   └── RatingDrawer.jsx        # MODIFY: Add participation count text line
│   ├── pages/
│   │   └── EventPage.jsx           # MODIFY: Derive itemRaterCounts from allRatings, pass to ItemButton
│   └── utils/
│       └── participationCounts.js  # NEW: Pure function to derive per-item rater counts from ratings array
└── tests/
    ├── unit/
    │   ├── participationCounts.test.js  # NEW: Unit tests for count derivation
    │   └── ItemButton.test.jsx          # NEW or MODIFY: Ring rendering tests
    └── e2e/
        └── specs/
            └── participation-ring.spec.js  # NEW: E2e test for ring visibility across states
```

**Structure Decision**: Frontend-only changes. The participation count derivation logic is extracted to a utility function (`participationCounts.js`) for testability and reuse (DRY principle). No backend changes required.

## Complexity Tracking

No constitution violations to justify. The feature adds:
- 1 new utility file (pure function, ~15 lines)
- Modifications to 3 existing components (ItemButton, RatingDrawer, EventPage)
- 3 new test files

All within existing architectural patterns.

| Pattern | Principle | Justification |
|---------|-----------|---------------|
| Inline `style` for `color-mix()` on SVG ring | VI. UX Consistency ("Styles MUST NOT be inlined") | `ratingColor` is a runtime hex value from event configuration — cannot be expressed as a Tailwind class. The existing `ItemButton.jsx` already uses `style={{ backgroundColor: ratingColor }}` for the same reason. Ring color derivation follows this established pattern. Unrated items use Tailwind classes as expected. |
