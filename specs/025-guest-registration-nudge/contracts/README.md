# Contracts: Guest Item Registration Nudge

No new API contracts are introduced by this feature. It is entirely frontend with no backend changes.

All data consumed by this feature is already provided by existing endpoints:

- **GET /events/:eventId** — provides event name, state, typeOfItem, administrators (via EventContext polling)
- **POST /events/:eventId/verify-pin** — PIN verification (existing, no changes needed; navigation state is added client-side)

## Component Contracts

### GuestWelcomeBottomSheet

```
Props:
  isOpen: boolean          — controls visibility
  onDismiss: () => void    — called on skip, overlay tap, or browser back
  onRegister: () => void   — called on "Register My [Item]" tap; navigates to profile
  event: {                 — event object from context
    name: string
    state: string
    typeOfItem: string
  }
```

### Inline Registration Prompt (embedded in EventPage)

No standalone component contract — rendered inline within EventPage's existing `created` state conditional, guarded by `!isAdmin`.
