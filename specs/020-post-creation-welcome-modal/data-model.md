# Data Model: Post-Creation Welcome Bottom Sheet

**Feature**: Post-Creation Welcome Bottom Sheet  
**Date**: 2026-02-27  
**Purpose**: Define data structures and relationships for the welcome bottom sheet

## Entities

### WelcomeBottomSheet (Component State)

This feature introduces no new persisted entities. The bottom sheet is a purely client-side, transient UI component whose visibility is controlled by ephemeral navigation state.

**Component Props**:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | boolean | Yes | Controls visibility of the bottom sheet |
| `onDismiss` | function | Yes | Called when user dismisses the bottom sheet (Got it, overlay tap, back button) |
| `onOpenDrawer` | function(drawerName: string) | Yes | Called when user taps a customization row; receives drawer identifier |
| `onOpenAdminGuide` | function | Yes | Called when user taps "Show me the setup guide" |
| `event` | object | Yes | Event object containing PIN, item config, rating config, administrators |

**Event Object Shape** (read-only, already exists):

| Attribute | Type | Used For |
|-----------|------|----------|
| `event.pin` | string | Displayed with copy button in the "Start quickly" section |
| `event.itemConfiguration.numberOfItems` | number | Displayed as item count badge (total pool) |
| `event.itemConfiguration.excludedItemIds` | array | Used to calculate active item count (numberOfItems - excludedItemIds.length) |
| `event.ratingConfiguration.maxRating` | number | Displayed as rating scale badge ("Scale 1–{maxRating}") |
| `event.ratingConfiguration.noteSuggestionsEnabled` | boolean | Displayed as tasting notes status in defaults summary |
| `event.administrators` | object | Used to calculate admin count badge or "Just you" label |

**Internal State**:

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `pinCopied` | boolean | false | Tracks whether PIN was just copied to clipboard; resets after 2 seconds |

### Navigation State (Existing, Modified)

The existing `location.state.eventCreated` flag is reused without changes. Its consumer changes from the toast `useEffect` to the bottom sheet visibility logic.

| Attribute | Type | Set By | Consumed By |
|-----------|------|--------|-------------|
| `eventCreated` | boolean | `CreateEventPage` on redirect | `EventAdminPage` to control bottom sheet visibility |

**Lifecycle**:
1. `CreateEventPage` sets `location.state.eventCreated = true` on redirect
2. `EventAdminPage` reads the flag and sets bottom sheet `isOpen = true`
3. On any dismiss action, `window.history.replaceState` clears the flag
4. Subsequent visits/refreshes find no flag → bottom sheet stays closed

## Relationships

```
CreateEventPage ──(sets eventCreated flag)──> EventAdminPage
                                                    │
                                              reads flag
                                                    │
                                                    ▼
                                          WelcomeBottomSheet
                                           │    │    │    │
                                           │    │    │    └── onOpenAdminGuide → App.jsx AdminGuideDrawer
                                           │    │    └── onOpenDrawer('administrators') → setOpenDrawer
                                           │    └── onOpenDrawer('ratings-configuration') → setOpenDrawer
                                           └── onOpenDrawer('items') → setOpenDrawer
```

## Validation Rules

No validation rules apply — the bottom sheet displays read-only event data. Input validation for the event data itself is handled by existing services upstream.

## Storage

No new storage. The bottom sheet reads from existing in-memory event state (via `useEventContext` or prop). The visibility trigger (`location.state.eventCreated`) is an ephemeral browser navigation state entry that is cleared on dismiss.
