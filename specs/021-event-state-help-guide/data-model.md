# Data Model: Event State Management Help Guide

**Feature**: 021-event-state-help-guide  
**Date**: 2026-03-02

## Overview

This feature is frontend-only. There is no new persistent data model or backend storage. All help content is static JavaScript data bundled with the application. The only runtime data dependency is the event state (and optional loading/error state) from the existing `EventContext`.

## Entities

### EventStateHelpContent (static module)

Static content for the inline help. No database or API; exported from a single module (e.g. `eventStateHelpContent.js`).

#### Lifecycle block

| Field | Type | Description |
|-------|------|-------------|
| `lifecycleTitle` | `string` | Section heading (e.g. "Event lifecycle") |
| `lifecycleSteps` | `Array<{ state, transitions, whenToUse }>` | Ordered list: state key, allowed transitions from that state, short "when to use" copy |
| `reopenNote` | `string` | Optional note that from "completed" the event can be reopened to started or paused |

State keys match `event.state`: `'created'` \| `'started'` \| `'paused'` \| `'completed'`.

#### Per-state block (admin + guest)

One entry per state key.

| Field | Type | Description |
|-------|------|-------------|
| `state` | `string` | `'created'` \| `'started'` \| `'paused'` \| `'completed'` |
| `adminCan` | `string` or `string[]` | What the administrator can do in this state (plain language) |
| `adminCannot` | `string` or `string[]` | Optional; what is locked or unavailable in this state |
| `guestCan` | `string` or `string[]` | What the guest can do in this state |
| `guestCannot` | `string` or `string[]` | Optional; what the guest cannot do |

Content must satisfy FR-002 (lifecycle + transitions + when to use), FR-003 (admin can/cannot per state), and FR-004 (guest can/cannot per state). No persistence; shape is validated by unit tests.

### Runtime data dependencies

#### Event state (read-only)

- **Source**: `EventContext` (same as event state management section).
- **Usage**: Current state label (“You are here: Started”), list of next transitions, and optional highlight in lifecycle.
- **When event is null or loading**: Show placeholder for current state (e.g. “—” or “Loading…”); rest of help remains visible.
- **When event state changes**: Help re-renders with new state (update in place; no close).

#### No new entities

- No new API endpoints.
- No new database tables or fields.
- No user-generated content; all copy is static.

## State transitions (display only)

The help describes the existing event state machine; it does not modify state. Allowed transitions (for copy and “next steps”):

- `created` → started  
- `started` → paused, completed  
- `paused` → started, completed  
- `completed` → started, paused  

## Validation rules

- **Content**: Each of the four state keys must have admin and guest copy. Lifecycle array must include all four states in a coherent order. Enforce via unit tests on the exported content object.
- **Runtime**: Current-state indicator must show a placeholder when `event == null` or when event has failed to load; otherwise show `event.state` (or “unknown” if not one of the four).
