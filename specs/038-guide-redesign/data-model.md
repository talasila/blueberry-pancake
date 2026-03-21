# Data Model: Guide Redesign

**Branch**: `038-guide-redesign` | **Date**: 2026-03-20

## Entities

### GuideStep

A single step in the event guide content. Static data defined at build time.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique identifier (e.g., `'step-1'`, `'step-17'`) |
| heading | string | yes | Short title displayed as the step label (e.g., "Announce the Event") |
| description | string | yes | Explanatory text, max 3 sentences. Plain, conversational language. |
| icon | string | yes | Lucide React icon name resolved at render time (e.g., `'Megaphone'`, `'Wine'`) |
| phase | enum | yes | One of: `'before-event'`, `'event-day-setup'`, `'during-tasting'`, `'the-reveal'` |
| stepType | enum | yes | One of: `'real-world'`, `'in-app'` |
| position | number | yes | 1-based sequence position (1–17) |

**Validation rules**:
- All `id` values must be unique across the full 17-step array
- `icon` must resolve to a valid lucide-react export
- `description` must be non-empty after trimming
- `heading` must be non-empty after trimming
- `position` must be sequential (1 through 17, no gaps)

**Identity**: Each step is uniquely identified by its `id`. Position determines display order.

### Phase

A grouping of consecutive steps displayed under a section header.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | enum | yes | One of: `'before-event'`, `'event-day-setup'`, `'during-tasting'`, `'the-reveal'` |
| label | string | yes | Display name shown as section header (e.g., "Before the Event") |
| stepRange | [number, number] | yes | Inclusive start and end positions (e.g., `[1, 3]`) |

**Phases** (static, 4 total):

| Phase ID | Label | Steps |
|----------|-------|-------|
| `before-event` | Before the Event | 1–3 |
| `event-day-setup` | Event Day — Setup | 4–10 |
| `during-tasting` | During the Tasting | 11–12 |
| `the-reveal` | The Reveal | 13–17 |

### StepVisualState (derived, not stored)

Computed at render time from the event lifecycle state and the step's position.

| Value | Meaning | Visual Treatment |
|-------|---------|-----------------|
| `done` | Step is in a phase before the current event state | Dimmed/checked, collapsed by default |
| `now` | Step is in the active range for the current event state | Highlighted, auto-expanded |
| `ahead` | Step is in a phase after the current event state | Visible but muted, collapsed by default |

**State mapping** (pure function of `eventState` → step ranges):

| Event State | Done (positions) | Now (positions) | Ahead (positions) |
|-------------|-------------------|------------------|---------------------|
| `created` | 1–6 | 7–10 | 11–17 |
| `started` | 1–10 | 11 | 12–17 |
| `paused` | 1–11 | 12–16 | 17 |
| `completed` | 1–16 | 17 | — |

### HostingOverviewStep (rewritten host path)

Simplified version of GuideStep for the pre-event hosting overview in GuideDrawer.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Unique identifier (e.g., `'host-1'`) |
| heading | string | yes | Short title |
| description | string | yes | Summary-depth text (shorter than event guide steps) |
| icon | string | yes | Lucide React icon name |

**Note**: The hosting overview does not include `phase`, `stepType`, or `position` fields. It uses the same data shape as the existing `guideContent.js` host/guest paths for compatibility with `GuideStepCard` and `GuideDrawer`.

## Relationships

```
EventGuideDrawer
  ├── reads: eventGuideContent (17 GuideSteps + 4 Phases)
  ├── reads: event.state from useEventContext() → computes StepVisualState per step
  └── renders: modified GuideStepCard (with expand/collapse + stepType indicator)

GuideDrawer (unchanged structure)
  ├── reads: guideContent.host (rewritten HostingOverviewSteps)
  ├── reads: guideContent.guest (unchanged)
  └── renders: GuideStepCard (existing behavior, no expand/collapse needed)
```

## Data Not Stored

- Step visual state is computed at render time, never persisted
- Expand/collapse state is local component state, reset on each open
- No backend changes — all data is static JS content files
