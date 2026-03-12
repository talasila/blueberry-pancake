# Research: Live Participation Ring on Item Buttons

**Branch**: `027-participation-ring` | **Date**: 2026-03-11

## SVG Circular Progress Ring Technique

**Decision**: Use an SVG `<circle>` element with `stroke-dasharray` and `stroke-dashoffset` to render a circular progress arc.

**Rationale**: This is the standard approach for circular progress indicators in web UIs. The math is straightforward: set `stroke-dasharray` to the circle's circumference, then offset by `circumference * (1 - progress)` to reveal the filled portion. CSS transitions on `stroke-dashoffset` provide smooth animation with zero JavaScript overhead. No external library needed.

**Alternatives considered**:
- **Canvas-based rendering**: Rejected — overkill for a static arc; no CSS transition support, requires JS animation loop for smooth updates.
- **CSS `conic-gradient`**: Rejected — cannot produce a ring with rounded stroke caps; limited control over stroke width and anti-aliasing.
- **Third-party library (e.g., react-circular-progressbar)**: Rejected — adds a dependency for ~20 lines of SVG. The constitution (Principle II) favors battle-tested packages, but only when custom implementation is non-trivial. This is trivial.

## Dynamic Color Derivation via CSS `color-mix()`

**Decision**: Use `color-mix(in srgb, <ratingColor> 70%, black)` for the progress arc and `color-mix(in srgb, <ratingColor> 25%, transparent)` for the track.

**Rationale**: `color-mix()` is a CSS-native function that derives a darker shade from any hex color at runtime — no JavaScript color manipulation needed. It works directly in inline `style` attributes, which is how `ratingColor` is already applied to ItemButton. Browser support (Chrome 111+, Safari 16.2+, Firefox 113+) aligns with the project's modern browser targets (React 19, Tailwind 4).

**Alternatives considered**:
- **JavaScript color manipulation (e.g., chroma-js, colord)**: Rejected — adds a runtime dependency for something CSS handles natively. Would require computing the color in JS and passing it as a prop.
- **Predefined color map**: Rejected — `ratingColor` is dynamic (configured per-event via `ratingConfiguration`). A static map would break for custom configurations.
- **CSS `filter: brightness()`**: Rejected — applies to the entire element, not just the stroke. Cannot selectively darken the ring without affecting the button.

## Unrated Button Ring Colors (Tailwind Classes)

**Decision**: For unrated items (no `ratingColor`), use Tailwind utility classes: track at `stroke-gray-300 dark:stroke-gray-600 opacity-20`, progress arc at `stroke-gray-400 dark:stroke-gray-500 opacity-60`.

**Rationale**: Unrated buttons use Tailwind classes for their background (`bg-gray-100 dark:bg-gray-800`). The ring should follow the same pattern for consistency (Constitution Principle VI). These specific gray shades are slightly darker than the button background in both light and dark modes, matching the "darker shade of the button's own color" requirement.

**Alternatives considered**:
- **Using `color-mix()` on the computed background color**: Rejected — would require reading `getComputedStyle()` to get the actual background hex value, adding complexity for no visual benefit. Tailwind classes are simpler and more maintainable.

## Participation Count Derivation

**Decision**: Extract per-item unique rater counts from the existing `allRatings` array (returned by `ratingService.getRatings(eventId)`) using a pure utility function. Store counts as `Record<number, number>` mapping `itemId → uniqueRaterCount`.

**Rationale**: The `allRatings` data is already fetched on EventPage (currently used to filter the current user's ratings). Retaining the full array and deriving counts avoids a new API call. Extracting the derivation to a utility function makes it unit-testable and keeps EventPage lean (Constitution Principle I, III).

**Alternatives considered**:
- **New backend endpoint (`GET /events/:eventId/participation`)**: Rejected — spec explicitly requires no new endpoints (FR-015). Would add backend complexity for data already available client-side.
- **Using the dashboard endpoint**: Rejected — dashboard already computes `numberOfRaters` per item, but it requires admin access or `completed` state for regular users. The raw ratings endpoint has no such restriction.
- **Computing counts in ItemButton**: Rejected — violates separation of concerns. ItemButton should receive computed props, not raw rating data.

## Polling Strategy

**Decision**: Piggyback ratings refresh onto the existing 30-second event poll cycle. When `contextEvent` updates and `event.state === 'started'`, trigger `loadRatings()` in the existing `useEffect` watcher.

**Rationale**: The existing `useEventPolling` hook already polls `GET /events/:eventId` every 30 seconds. Adding a `loadRatings()` call when the event updates keeps both data sources in sync without introducing a new polling interval. The additional `GET /events/:eventId/ratings` call is a single DynamoDB query — lightweight and already cached.

**Alternatives considered**:
- **Separate polling interval for ratings**: Rejected — adds complexity and a second timer. Two independent polls could drift, causing the ring to show stale data relative to the event state.
- **WebSocket / Server-Sent Events**: Rejected — out of scope per spec. Would require backend infrastructure changes.
- **Polling only on user action (e.g., after submitting a rating)**: Rejected — would only reflect the current user's actions, not other participants'. The whole point is room-level awareness.

## Ring Sizing and Layout

**Decision**: SVG element at 68×68px centered on the 60×60px button. 2px stroke width. Absolute positioning with `pointer-events: none`.

**Rationale**: The 4px breathing room on each side (68 - 60 = 8, divided by 2) keeps the ring visually separated from the button edge without overlapping adjacent buttons. The existing grid uses `gap-6` (24px), so the 8px increase is well within bounds. `pointer-events: none` ensures all clicks pass through to the button.

**Alternatives considered**:
- **Ring as a CSS border on the button**: Rejected — CSS borders don't support partial fill (progress). Would require a completely different approach.
- **Ring inside the button (smaller radius)**: Rejected — would reduce the tappable area or overlap with the item number text.
- **Larger ring (e.g., 76px)**: Rejected — approaches the 24px gap limit and could cause visual crowding with many items.
