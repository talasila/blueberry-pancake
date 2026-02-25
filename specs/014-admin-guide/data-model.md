# Data Model: Admin Guide

**Feature**: 014-admin-guide  
**Date**: 2026-02-25

## Overview

The admin guide is a frontend-only feature with no persistent data model or backend changes. All content is static JavaScript data bundled with the application. The only runtime data dependency is the event state, which is already available via the existing `EventContext`.

## Entities

### AdminGuideStep

Static content entity representing a single step in the admin guide.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `string` | Required, unique across all states | Stable identifier for the step (e.g., `'created-1'`, `'started-3'`) |
| `heading` | `string` | Required, non-empty | Short title displayed prominently on the step card |
| `description` | `string` | Required, non-empty, ≤3 sentences | Plain-language explanation of what this setting/action does and why it matters |
| `icon` | `string` | Required, must be a valid lucide-react icon name | Visual element for the step card (resolved to a component at render time) |

**Shape**: Identical to the hosting guide's step shape, enabling reuse of `GuideStepCard`.

### AdminGuideContent (top-level export)

Static object mapping event lifecycle states to arrays of `AdminGuideStep`.

| Key | Type | Step Count | Description |
|-----|------|------------|-------------|
| `created` | `AdminGuideStep[]` | 7 | Setup walkthrough — configuring the event before starting |
| `started` | `AdminGuideStep[]` | 4 | Running phase — what to do while guests are rating |
| `paused` | `AdminGuideStep[]` | 3 | Pause phase — item assignment and resuming |
| `completed` | `AdminGuideStep[]` | 4 | Wrap-up — dashboard, export, and reopening |

**State keys** match the values of `event.state` from the backend API (and `EventContext`): `'created'` | `'started'` | `'paused'` | `'completed'`.

## Runtime Data Dependencies

### Event State (read-only)

The admin guide reads the event lifecycle state from the existing `EventContext`:

```javascript
const { event } = useEventContext();
const eventState = event?.state; // 'created' | 'started' | 'paused' | 'completed'
const steps = adminGuideContent[eventState] || [];
```

- **Source**: `EventContext` (provided by `EventContextProviderForRoute` in `App.jsx`)
- **Freshness**: Updated via polling in `useEventPolling` hook
- **Fallback**: If `event` is `null` or `event.state` is unrecognized, the guide shows an empty state or a fallback message

## State Transitions

None. The admin guide does not modify any data. It is a read-only overlay.

## Validation Rules

Content validation (enforced by unit tests, not runtime):

1. Every step must have all four fields (`id`, `heading`, `description`, `icon`) as non-empty strings
2. All step IDs must be globally unique across all states
3. Each state must have the expected number of steps (7, 4, 3, 4)
4. All `icon` values must correspond to valid lucide-react exports
