# Data Model: Event Progress Stepper

No new database entities or backend changes. This feature is entirely frontend.

## Frontend Data Structures

### STATE_CONFIG (updated in `eventState.jsx`)

Existing structure, updated labels:

| Internal State | Display Label | Icon        | Color Class          | Description                                                       |
|---------------|--------------|-------------|----------------------|-------------------------------------------------------------------|
| `created`     | Setup        | CircleDot   | gray-100/700         | Configure your event. When you're ready, start the tasting.       |
| `started`     | Tasting      | PlayCircle  | green-100/700        | Guests are rating. Pause when it's time to reveal.                |
| `paused`      | Reveal       | PauseCircle | yellow-100/700       | Assign bottles to item numbers and prepare the big reveal.        |
| `completed`   | Results      | CheckCircle2| blue-100/700         | The event is over. Everyone can see how the bottles did.          |

### PHASE_ORDER (new constant in `eventState.jsx`)

Ordered array defining the stepper sequence:

```
['created', 'started', 'paused', 'completed']
```

Used to determine which phases are completed, active, or upcoming relative to the current state.

### Transition Metadata (enriched `getValidTransitions` return)

Each transition object:

| Field                | Type    | Description                                       |
|---------------------|---------|---------------------------------------------------|
| `targetState`       | string  | Internal state value (e.g., `'started'`)          |
| `label`             | string  | Friendly button label (e.g., `'Start Tasting'`)   |
| `isPrimary`         | boolean | Whether this is the expected/forward transition    |
| `requiresConfirmation` | boolean | Whether a dialog is needed before executing    |

**Transition table:**

| Current State | Target State | Button Label       | Primary | Confirmation |
|--------------|-------------|-------------------|---------|-------------|
| created      | started     | Start Tasting      | true    | false       |
| started      | paused      | Pause for Reveal   | true    | false       |
| started      | completed   | Complete Event     | false   | false       |
| paused       | started     | Resume Tasting     | false   | true        |
| paused       | completed   | Announce Results   | true    | false       |
| completed    | started     | Reopen Tasting     | false   | true        |
| completed    | paused      | Back to Reveal     | false   | true        |

### Guardrail Logic

The guardrail note requires two data points from the event object:
- `event.items.length` — number of registered bottles/items
- `event.numberOfItems` — number of available rating slots

Guardrail states (only when `event.state === 'created'`):
- `registered < slots`: Informational note (can still start)
- `registered > slots`: Warning note (adjust item count)
- `registered === 0`: Informational note (no items yet)
- `registered === slots`: No note shown
