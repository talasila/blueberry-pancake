# Data Model: Start Event Guard-Rail (022 — Inline Mismatch Message)

**Feature Branch**: `022-start-event-guardrail`  
**Date**: 2026-03-01

## Overview

This feature is **frontend-only** and does not introduce new entities or storage. It uses existing data already present in EventAdminPage state. This document records the existing entities and derived values used for the inline mismatch message.

## Existing Entities (no changes)

### Event

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `state` | string | `event.state` | Current state: `created`, `started`, `paused`, `completed` |
| `itemConfiguration.numberOfItems` | number | `event.itemConfiguration.numberOfItems` | Total rating slots configured (e.g. 20) |
| `itemConfiguration.excludedItemIds` | number[] | `event.itemConfiguration.excludedItemIds` | IDs excluded from rating |
| `typeOfItem` | string | `event.typeOfItem` | Item type (e.g. `wine`) — drives terminology |

### Items (registered bottles/items)

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `items` | array | EventAdminPage state (e.g. from `itemService.getItems(eventId)`) | Registered items for the event |
| Items load error | string | EventAdminPage state (e.g. `itemsError`) | When items fetch fails; triggers fallback message (FR-007) |

## Derived Values (computed for the message)

| Value | Computation | Example |
|-------|-------------|---------|
| `registeredCount` | `items.length` when items loaded | `3` |
| `availableSlots` | `numberOfItems - (excludedItemIds?.length ?? 0)` | `18` (e.g. 20 − 2) |
| `gapType` | From `getGapType(registeredCount, availableSlots)` | `'more-slots'`, `'fewer-slots'`, `'zero-registrations'`, `'match'` |

## Gap Type Logic

- `registeredCount === 0` → `zero-registrations` (show **info** message).
- `registeredCount > 0` and `availableSlots > registeredCount` → `more-slots` (show **info** message).
- `availableSlots < registeredCount` → `fewer-slots` (show **warning** message).
- Otherwise → `match` (no mismatch message).

When items have failed to load, do not compute `gapType`; show the fallback message (e.g. “Counts unavailable”) and keep Start clickable.

## State Transitions and When the Message Is Shown

The message is shown only when the admin can transition **to** `started`:

- **created → started**: Show message when mismatch (or fallback when load failed).
- **completed → started**: Show message when mismatch (or fallback when load failed).
- **paused → started**: Do **not** show this mismatch message (resume flow; spec says “from created or from completed”).
- **started → paused / started → completed**: Not applicable (no transition to started).
