# Implementation Plan: Landing Page Redesign

**Branch**: `045-landing-page-redesign` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/045-landing-page-redesign/spec.md`

## Summary

Replace the utilitarian home page (centered on a rarely-used "Join an event" card) with a warm, inviting hero page that communicates the app's purpose at a glance and guides hosts toward event creation. The implementation rewrites `LandingPage.jsx` with a gradient hero section, three-step visual strip, reordered CTAs with a warm accent color, and a demoted event-code input. All changes are confined to one component file, existing CSS utilities, and corresponding test files. No new dependencies are introduced.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1
**Primary Dependencies**: React Router 7.10.1, Radix UI (Button, Input), Tailwind CSS 4.1.17, lucide-react 0.556.0, class-variance-authority
**Storage**: N/A — no backend or data changes
**Testing**: Vitest 1.6.1 (unit), Playwright 1.57.0 (E2E)
**Target Platform**: Web (mobile-first, responsive, 375px+ viewports)
**Project Type**: Web application (frontend-only change)
**Performance Goals**: No new dependencies, same resource footprint, no additional network requests
**Constraints**: Warm accent colors scoped to home page via inline styles; must not alter global CSS variables or affect other pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single component rewrite with clear purpose; removes unused Card import |
| II. DRY | PASS | Reuses existing Button, Input components; oklch values referenced from established theme presets |
| III. Maintainability | PASS | Replaces existing code with cleaner hierarchy; no dead code introduced |
| IV. Testing | PASS | Existing unit (Vitest) and E2E (Playwright) tests will be updated to match new UI |
| V. Security | PASS | No new data handling; auth navigation logic unchanged |
| VI. UX Consistency | PASS (justified deviation) | Uses Tailwind + Radix components. Home page CTA uses inline `style` for warm accent color — justified per FR-014 to avoid global theme pollution. This is page-scoped, not a pattern for other components. |
| VII. Performance | PASS | No new dependencies, images, fonts, or network requests |

## Project Structure

### Documentation (this feature)

```text
specs/045-landing-page-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no data changes)
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (empty — no API changes)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── pages/
│       └── LandingPage.jsx          # PRIMARY — full rewrite
├── tests/
│   ├── unit/
│   │   └── LandingPage.test.jsx     # Unit tests — rewrite to match new UI
│   └── e2e/
│       └── specs/
│           └── landing-page.spec.js  # E2E tests — rewrite to match new UI
```

**Structure Decision**: This feature touches exactly one page component and its two test files. No new files are created in the source tree. The existing `LandingPage.jsx` is rewritten in place.

## Implementation Approach

### Component Architecture

The rewritten `LandingPage.jsx` will contain:

1. **Gradient hero section** — A `div` with a CSS radial gradient background using oklch values. Light mode uses warm rose/peach tones (`oklch(0.95 0.03 350)` → transparent). Dark mode uses deep wine/burgundy (`oklch(0.20 0.04 350)` → transparent). Dark mode detection uses the existing `useDarkMode` hook to select gradient values.

2. **Headline + subtitle** — Static text. Headline: "Blind tastings, scored together." in `text-2xl sm:text-3xl font-bold`. Subtitle in `text-muted-foreground`.

3. **Three-step visual strip** — A data-driven row of three items, each with:
   - A circular `div` with oklch background color (cellar, golden, rosé from `themePresets.js` values)
   - A lucide-react icon (`EyeOff`, `Star`, `Trophy`) in white
   - A label below ("Cover", "Taste", "Reveal")
   - Dark mode variants use the higher-lightness versions of the same hue families

4. **Primary CTA** — Existing `Button` component with inline `style` overriding `backgroundColor` and `color` with warm accent oklch values. Navigation logic preserved from current `handleCreateClick`.

5. **Secondary CTA** — Existing `Button` component with `variant="outline"`. Navigation logic preserved from current `handleMyEventsClick`.

6. **Demoted event code** — A text link ("Have an event code?") that toggles visibility of an inline `Input` + small `Button`. Uses `useState` for toggle and `useRef` + `useEffect` for auto-focus. Navigation logic preserved from current `handleJoinClick`.

7. **Success message** — Preserved as-is from current implementation. Must render above the hero gradient section (first element in the content area) per FR-012.

### Color Values Reference

Sourced directly from existing `themePresets.js` — no new color system:

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Gradient | `oklch(0.95 0.03 350)` → transparent | `oklch(0.20 0.04 350)` → transparent |
| Cover icon bg | `oklch(0.45 0.15 15)` (cellar) | `oklch(0.65 0.15 15)` |
| Taste icon bg | `oklch(0.65 0.17 75)` (golden) | `oklch(0.75 0.15 75)` |
| Reveal icon bg | `oklch(0.65 0.15 350)` (rosé) | `oklch(0.72 0.14 350)` |
| CTA button bg | `oklch(0.45 0.15 15)` (cellar) | `oklch(0.65 0.15 15)` |
| CTA button text | white | white |

### Dark Mode Strategy

The `useDarkMode` hook (already used in `Header.jsx`) returns `{ isDark }`. The component uses `isDark` to select between light/dark oklch values for:
- Gradient background (inline style on wrapper div)
- Icon circle backgrounds (inline style on each circle div)
- CTA button accent (inline style on Button)

This approach avoids adding new CSS custom properties or modifying `globals.css`. All dark-mode color switching is handled in the component via the existing hook.

### Test Strategy

**Unit tests** (`LandingPage.test.jsx`): Rewrite to test:
- Headline and subtitle render
- Three-step icons render with correct labels
- "Host a Tasting" button renders and triggers navigation
- "My Events" button renders and triggers navigation
- "Have an event code?" link renders and toggles input visibility
- Event code input auto-focuses when revealed
- Event code submission triggers navigation
- Success message displays when navigation state present

**E2E tests** (`landing-page.spec.js`): Rewrite to test:
- Page loads with headline, subtitle, three-step strip visible
- "Host a Tasting" navigates to auth (unauthenticated) or create-event (authenticated)
- "My Events" navigates to auth (unauthenticated) or my-events (authenticated)
- "Have an event code?" reveals input; entering code + submit navigates to event page
- Mobile viewport (375px) shows all hero content above fold
- Narrow viewport (320px) shows three-step icon strip in a single horizontal row without wrapping
- Authenticated user flows (create-event, my-events direct navigation)

### Removed Elements

- `Card`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle` imports (no longer used)
- `PlusCircle`, `List` icon imports (replaced by `EyeOff`, `Star`, `Trophy` for the visual strip; CTAs use text only)
- The entire "Join an event" card structure

### Imports Summary (new LandingPage.jsx)

**Added**: `useRef` (from React), `EyeOff`, `Star`, `Trophy` (from lucide-react), `useDarkMode` (from hooks)
**Kept**: `useState`, `useEffect`, `useNavigate`, `useLocation`, `Button`, `Input`, `Message`, `clearSuccessMessage`, `apiClient`
**Removed**: `PlusCircle`, `List`, `Card`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`

## Complexity Tracking

No constitution violations requiring justification. The inline style usage for the warm CTA accent is a scoped, intentional deviation from Principle VI documented in the Constitution Check above.
