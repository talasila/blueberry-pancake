# Data Model: Guest Item Registration Nudge

**Branch**: `025-guest-registration-nudge` | **Date**: 2026-03-03

## Overview

This feature introduces **no new data entities, API endpoints, or persistent storage**. It is a purely frontend feature that relies on existing data already available on the client.

## Data Sources (Existing — Read Only)

### Event Object (from EventContext)

| Field                | Type    | Used For                                                  |
|----------------------|---------|-----------------------------------------------------------|
| `name`               | string  | Bottom sheet greeting ("Welcome to [Event Name]!")        |
| `state`              | string  | Visibility logic (created/started → show; paused/completed → hide) |
| `typeOfItem`         | string  | Item terminology adaptation via `useItemTerminology`      |
| `administrators`     | array   | Admin detection via `isUserAdmin(email, event)`           |

### Navigation State (Ephemeral)

| Field                  | Type    | Lifecycle                                                 |
|------------------------|---------|-----------------------------------------------------------|
| `location.state.guestJustLoggedIn` | boolean | Set by `PINEntryPage` on navigate. Read once by `EventPage`. Cleared via `history.replaceState` on dismiss. Does not survive page refresh. |

### Derived Values (Existing Hooks)

| Hook / Utility          | Returns                          | Used For                        |
|-------------------------|----------------------------------|---------------------------------|
| `useEventContext()`     | `{ event, isAdmin, refetch }`    | Event data + admin check        |
| `useItemTerminology(event)` | `{ singular, singularLower, plural, pluralLower }` | Button label: "Register My [Singular]" |

## State Transitions

No new state transitions are introduced. The feature reacts to the existing event state machine:

```
created ──→ started ──→ paused ──→ completed
   │                        │
   │  Bottom sheet: YES     │  Bottom sheet: NO
   │  Inline prompt: YES    │  Inline prompt: NO
   │                        │
   └── started ─────────────┘
       Bottom sheet: YES
       Inline prompt: NO
```
