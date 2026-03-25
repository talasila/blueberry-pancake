# Research: Landing Page Redesign

**Date**: 2026-03-24 | **Branch**: `045-landing-page-redesign`

## Research Tasks

### 1. Dark Mode Color Switching Approach

**Decision**: Use the existing `useDarkMode` hook to conditionally select oklch color values via inline styles.

**Rationale**: The hook is already used in `Header.jsx` for theme-aware logo colors. It watches `document.documentElement` for the `.dark` class via MutationObserver and returns `{ isDark, toggleDark }`. Using inline styles with conditional oklch values avoids touching `globals.css` or adding new CSS custom properties, keeping the change fully scoped to `LandingPage.jsx`.

**Alternatives considered**:
- Adding new CSS custom properties to `globals.css` with `.dark` overrides — rejected because it would pollute the global stylesheet for a single page's decorative colors.
- Using Tailwind's `dark:` variant classes — rejected because oklch values with specific chroma and hue parameters can't be expressed as Tailwind utility classes without extending the config. Inline styles are simpler.
- Creating a new `useLandingTheme` hook — rejected as over-engineering for a single component.

### 2. Gradient CSS Compatibility

**Decision**: Use CSS `radial-gradient()` with oklch color values. Falls back gracefully to solid `background-color` in browsers that don't support oklch.

**Rationale**: oklch is supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 15.4+). The app already uses oklch extensively in `globals.css` and `themePresets.js`. If oklch is unsupported, the gradient declaration is ignored and the element shows the standard `background-color` from the theme — no visual breakage, just no gradient.

**Alternatives considered**:
- Using HSL fallback values alongside oklch — rejected as unnecessary complexity given the app's existing oklch commitment.
- Using a background image — rejected per FR-015 (no new assets).

### 3. Warm Accent Button Approach

**Decision**: Apply warm accent color via inline `style` prop on the existing `Button` component, overriding `backgroundColor` and `color`.

**Rationale**: The `Button` component uses `class-variance-authority` with the `default` variant applying `bg-primary text-primary-foreground`. An inline `style` with `backgroundColor` and `color` overrides the Tailwind-generated class values. This is the simplest approach that keeps the change scoped to the landing page without modifying the Button component, adding new variants, or changing global CSS variables.

**Alternatives considered**:
- Adding a new `warm` variant to the Button's cva config — rejected because this is a one-off landing page treatment, not a reusable pattern.
- Creating a `LandingButton` wrapper component — rejected as over-engineering.
- Using CSS custom properties scoped via a wrapper class — viable but more complex for a single button.

### 4. Event Code Toggle Interaction

**Decision**: Use `useState` boolean toggle with conditional rendering. Auto-focus via `useRef` + `useEffect` triggered by the toggle state.

**Rationale**: Standard React pattern. The toggle shows/hides a small inline form (Input + Button). When the input appears, a `useEffect` watching the toggle state calls `inputRef.current?.focus()`. Clicking the text link again could optionally collapse it, but the spec doesn't require this — keeping it simple with a one-way reveal is sufficient.

**Alternatives considered**:
- Radix Collapsible component — rejected as bringing in an unnecessary dependency for a simple show/hide.
- CSS-only toggle with `details`/`summary` — rejected because auto-focus requires JS anyway.

### 5. Existing Test Impact

**Decision**: Rewrite both the unit test file (`LandingPage.test.jsx`) and E2E test file (`landing-page.spec.js`) to match the new UI structure.

**Rationale**: The current tests reference elements that will no longer exist (event ID input with `#event-id`, Join button, "Create an Event" button text, "My Events" as small outline button). A full rewrite is cleaner than patching selectors piecemeal. The test structure (describe blocks, helper functions, authenticated/unauthenticated flows) is preserved but assertions are updated to the new UI elements.

**Alternatives considered**:
- Incremental test patching — rejected because nearly every selector changes; rewriting is faster and less error-prone.
- Deleting tests and re-adding later — rejected per constitution Principle IV (tests must accompany implementation).

### 6. Three-Step Icon Circle Sizing

**Decision**: Use `h-14 w-14 sm:h-16 sm:w-16` for icon circles with `h-6 w-6 sm:h-7 sm:w-7` for icons. Labels use `text-xs sm:text-sm`.

**Rationale**: These sizes ensure the three circles fit comfortably within the `max-w-md` (448px) container with even spacing. At the smallest supported width (320px), three 56px circles with gaps fit within the content area. The `sm:` breakpoint bumps to 64px circles for slightly larger screens.

**Alternatives considered**:
- Larger circles (`h-20 w-20`) — rejected because they'd crowd the layout on narrow screens and push the CTA below the fold.
- Using the Radix Avatar component for circles — rejected as semantically wrong (these aren't avatars) and unnecessarily complex.
