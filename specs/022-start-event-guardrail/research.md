# Research: Start Event Guard-Rail (022 — Inline Mismatch Message)

**Feature Branch**: `022-start-event-guardrail`  
**Date**: 2026-03-01  
**Purpose**: Resolve technical unknowns and document design decisions for the inline bottle-count mismatch message.

## Decision 1: Reuse Message Component for Info and Warning

**Decision**: Use the existing `Message` component with `type="info"` for the “fewer registered than slots” case and `type="warning"` for the “more registered than slots” case.

**Rationale**: The codebase already has a `Message` component that supports `error`, `success`, `warning`, and `info` (see `frontend/src/components/Message.jsx`). Reusing it keeps styling consistent and avoids duplication (Constitution II).

**Alternatives considered**:
- **Custom inline alert**: Rejected — would duplicate styling and behavior already in Message.
- **Radix Alert**: Rejected — no Radix Alert in current dependencies; Message is the established pattern.

## Decision 2: Gap Type Logic and Data Sources

**Decision**: Compute “available slots” as `numberOfItems - excludedItemIds.length` from `event.itemConfiguration`. Use `items.length` as registered count when items have loaded; when items fail to load, show the fallback message (FR-007) and keep Start clickable.

**Rationale**: Matches spec and existing data model: rating slots come from item configuration, registered count from the items list. No new API; EventAdminPage already fetches items and has event in state.

**Alternatives considered**:
- **New API for “readiness”**: Rejected — spec and constraints require no new APIs; existing data is sufficient.
- **Block start when items fail to load**: Rejected — clarification chose “allow start with fallback” (Option B).

## Decision 3: Shared getGapType Helper

**Decision**: Use or add a small pure function `getGapType(registeredCount, availableSlots)` returning `'zero-registrations' | 'more-slots' | 'fewer-slots' | 'match'`. If the codebase already has this (e.g. from a prior guard-rail feature), reuse it; otherwise add it in `frontend/src/utils/eventGuardrail.js` (or equivalent).

**Rationale**: Keeps UI logic in the page simple and makes gap-type logic unit-testable (Constitution IV). Single place for the comparison rules.

**Alternatives considered**:
- **Inline conditionals only in EventAdminPage**: Acceptable for a single use, but a small util is easier to test and document.
- **Different module name**: `eventGuardrail.js` is consistent with “guard-rail” feature naming; alternative would be a more generic name (e.g. `itemSlotGap.js`).

## Decision 4: Where to Render the Message in the State Drawer

**Decision**: Render the message block inside the State `SideDrawer` content, **above** the block that lists transition buttons (Start, Pause, Complete). Only when the current state allows transitioning to `started` (i.e. `event.state` is `created` or `completed`).

**Rationale**: Spec (FR-005, clarifications) requires the message inside the State drawer/section, above the Start button. EventAdminPage already has a State SideDrawer; adding a conditional block at the top of its content satisfies placement.

**Alternatives considered**:
- **Message on main admin page**: Rejected — clarification chose “inside State drawer” (Option A).
- **Message below Start button**: Rejected — spec says “above the Start button.”

## Decision 5: Terminology (Bottles vs Items)

**Decision**: Use `useItemTerminology(event)` (or equivalent) so that copy says “bottles”/“Bottles configuration” for wine events and “items”/“Items configuration” for other event types (FR-006, Assumptions).

**Rationale**: Spec and assumptions require terminology to match event type; the app already has this pattern in `itemTerminology.js`.

**Alternatives considered**:
- **Hardcode “bottles”**: Rejected — spec says “or equivalent” and assumptions mention items terminology for non-wine events.
