# Implementation Plan: Wine Note Suggestions

**Branch**: `001-wine-note-suggestions` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-wine-note-suggestions/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature adds contextual note suggestions for wine rating events. When users select a rating level, the system displays one randomly selected suggestion from each quote type (snarky, poetic, haiku) for that rating level. Users can click suggestions to add them to their note field. Event administrators can enable/disable this feature via a toggle in the Ratings Configuration section. The feature only applies to wine events and defaults to enabled.

## Technical Context

**Language/Version**: Node.js >=22.12.0 (backend), React 19.2.1 (frontend)  
**Primary Dependencies**: Express 5.2.1 (backend), React Router 7.10.1, Vite 6.0.5 (frontend), Tailwind CSS 4.1.17  
**Storage**: File-based JSON storage (`data/events/{eventId}/config.json` for event config, `quotes.json` in root for quotes)  
**Testing**: Vitest (unit/integration), Playwright (e2e), @testing-library/react (component tests)  
**Target Platform**: Web application (React frontend, Express backend)  
**Project Type**: Web application (frontend + backend monorepo)  
**Performance Goals**: Suggestions displayed within 1 second of rating selection (SC-001)  
**Constraints**: Quotes.json must be accessible from frontend, graceful degradation if file missing/corrupted  
**Scale/Scope**: Static quotes file (~300KB), per-event toggle setting, client-side quote selection

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Feature follows existing patterns (RatingForm component, EventService extensions). Code will be structured for clarity and maintainability.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Reuses existing RatingForm component, EventService patterns, and rating configuration structure. No duplication of existing functionality.

### III. Maintainability
✅ **PASS**: Follows established project structure. Quote loading logic will be extracted to reusable service. Toggle setting follows existing rating configuration pattern.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: Will include unit tests for quote service, component tests for RatingForm with suggestions, integration tests for toggle functionality, and e2e tests for user flows.

### V. Security
✅ **PASS**: Quotes.json content will be sanitized to prevent XSS. Toggle setting requires admin authentication. No new security risks introduced.

### VI. User Experience Consistency
✅ **PASS**: Suggestions will use existing UI components (shadcn/ui). Styling follows Tailwind CSS patterns. Consistent with existing rating form design.

### VII. Performance Requirements
✅ **PASS**: Quotes.json will be loaded once and cached. Random selection is O(1) operation. Meets 1-second display target (SC-001).

## Project Structure

### Documentation (this feature)

```text
specs/001-wine-note-suggestions/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── services/
│   │   └── EventService.js          # Extend: add noteSuggestionsEnabled to ratingConfiguration
│   └── api/
│       ├── events.js                 # Extend: include noteSuggestionsEnabled in rating config endpoints
│       └── quotes.js                 # NEW: quotes API endpoint

frontend/
├── src/
│   ├── components/
│   │   └── RatingForm.jsx            # Extend: add suggestion display and click handlers
│   ├── pages/
│   │   └── EventAdminPage.jsx       # Extend: add toggle in Ratings Configuration section
│   ├── services/
│   │   ├── apiClient.js              # Extend: no changes needed (uses existing rating config endpoints)
│   │   └── quoteService.js           # NEW: service to load and manage quotes.json
│   └── hooks/
│       └── useQuotes.js              # NEW: hook to load quotes with caching

quotes.json                             # Existing: root directory, static quote database
```

**Structure Decision**: Web application structure (frontend + backend). Frontend extends RatingForm component and adds new quoteService. Backend extends EventService to include noteSuggestionsEnabled in ratingConfiguration. Quotes.json is static file served from root.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution checks pass.
