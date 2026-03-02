# Research: Event State Management Help Guide

**Feature**: 021-event-state-help-guide  
**Date**: 2026-03-02

## 1. Inline Expandable UI Pattern

**Decision**: Use a single expandable/collapsible block (one “summary” trigger + one content panel) rather than a multi-item accordion for the main help. Optionally use the existing Radix Accordion for sub-sections inside the help (e.g. “Lifecycle” and “What each state means”) so users can expand one section at a time on small screens.

**Rationale**: The spec requires inline expansion within the state management section (no overlay). The project already has `@radix-ui/react-accordion` and `frontend/src/components/ui/accordion.tsx`. For “one panel that expands to show all help,” we can either: (A) use a single AccordionItem with the whole help as content, or (B) use a simple open/close state with a button and a collapsible div. Option (B) avoids accordion semantics (multiple items) when there is only one logical block; (A) is consistent with existing UI. Radix also provides `Collapsible` (optional dependency); if not present, a boolean state + conditional render or CSS is sufficient. Recommendation: implement with one trigger (“Learn about event states”) and one content area that expands/collapses (via existing Accordion with one item, or a simple state-driven panel). If the help content is long, use Accordion inside the panel to separate “Lifecycle” and “Per-state guide” for easier scanning on mobile.

**Alternatives considered**:
- **Bottom sheet (like admin guide)**: Rejected; spec explicitly requires inline expandable, no overlay.
- **Separate route**: Rejected; help must live in the state management section and not navigate away.
- **Tooltip/popover**: Rejected; content is “proper/detailed,” too long for a popover.

---

## 2. Content Structure and Reuse of eventState

**Decision**: Define a static content module (e.g. `eventStateHelpContent.js`) that holds: (1) lifecycle narrative (order of states, allowed transitions, when to use each), and (2) per-state blocks with “admin can” / “guest can” copy. Reuse `STATE_CONFIG` labels from `frontend/src/utils/eventState.jsx` for state names and short descriptions where it avoids duplication; extend with the richer “admin can / guest can” text in the new content file.

**Rationale**: Spec requires lifecycle explanation and, for each of the four states, what admin and guest can do. Existing `STATE_CONFIG` already has a short `description` per state (e.g. “Event is active. Users can provide feedback.”). The new help needs more detail (e.g. “Admin can: pause, complete; Guest can: rate items”). Keeping long-form copy in a dedicated content file keeps the page component clean and makes copy edits easy without touching component logic. Reusing state keys (`created`, `started`, `paused`, `completed`) and optionally labels from `eventState.jsx` ensures consistency with the rest of the app.

**Alternatives considered**:
- **Hardcode all copy in JSX**: Rejected; harder to maintain and test.
- **Fetch content from API**: Rejected; spec and assumptions say content is static and no new backend.

---

## 3. Current-State Indicator When Event Is Loading or Failed

**Decision**: The help entry point is always visible. When expanded, the “current state” line shows a neutral placeholder (e.g. “—” or “Loading…”) when `event` is null or not yet loaded; on load failure, show “—” or “Unable to load” and keep the rest of the help (lifecycle + per-state descriptions) available. Use the same `EventContext` / `useEventContext()` that the state section already uses so the indicator updates in place when the event loads or state changes.

**Rationale**: Spec (clarification): help entry point visible even when event is loading or failed; current-state indicator shows a placeholder until event is available. No new data source; the state section already has access to event (or loading/error). Reusing that keeps behavior consistent and avoids duplicate loading logic.

**Alternatives considered**:
- **Hide help until event loads**: Rejected; spec says entry point remains visible.
- **Disable expand when loading**: Rejected; spec says admin can open help and read general content.

---

## 4. Update-in-Place When Event State Changes

**Decision**: The expanded help content reads `event?.state` (and optional transitions) from `EventContext` at render time. Do not cache state at expand-time. When the context updates (e.g. polling or after another admin changes state), the component re-renders and the “current state” and “next transitions” copy update automatically. No explicit refresh API or close-on-change behavior.

**Rationale**: Spec requires help to update in place when event state changes and not close automatically. EventContext is already updated by existing polling (or equivalent) on the admin page, so the help component will receive new `event.state` on the next render. Ensuring the help is a pure function of context (no local copy of state for display) satisfies FR-009.

**Alternatives considered**:
- **Close help when state changes**: Rejected; spec says update in place, do not close.
- **Explicit “state changed” message then update**: Not required; inline update is sufficient.

---

## 5. Minimum Viewport and Mobile Readability

**Decision**: Do not introduce a new minimum width for this feature. Use the same minimum viewport width as the rest of the application. Document that value (e.g. in quickstart or a shared constants/doc file) so acceptance tests (e.g. SC-004) can run at that width. Style the help content with responsive utilities (e.g. Tailwind) so text and touch targets meet the app’s existing mobile standards; avoid fixed widths or overflow that would force horizontal scroll.

**Rationale**: Spec clarification: “match app minimum” and document for acceptance testing. No separate viewport requirement for the help; consistency with the rest of the admin page avoids special cases and keeps QA simple.

**Alternatives considered**:
- **Define 320px (or another value) only for help**: Rejected; spec says use app minimum.
- **Skip documentation of minimum**: Rejected; spec requires it be documented for testing.
