# Data Model: Codebase Refactoring & Simplification

**Branch**: `034-codebase-refactor` | **Date**: 2026-03-16

## Overview

This refactoring introduces no new data entities or schema changes. All changes are structural (code organization) and behavioral (consolidation of duplicated logic). The existing DynamoDB single-table design is unaffected.

## Affected Code Entities

### New Utilities (Backend)

| Utility | Location | Purpose |
|---------|----------|---------|
| `clearAuthCookies(res)` | `middleware/jwtAuth.js` | Consolidated cookie clearing for JWT + refresh tokens |
| `formatRateLimitResponse(res, result, message?)` | `utils/apiErrorHandler.js` | Standardized 429 response formatting |
| `getCurrentTimestamp(options?)` | `utils/timestamps.js` | Centralized ISO 8601 timestamp generation |

### New Utilities (Frontend)

| Utility | Location | Purpose |
|---------|----------|---------|
| `retryWithBackoff(fn, maxRetries, baseDelay)` | `utils/retryWithBackoff.js` | Generic async retry with exponential backoff |
| `appendWithCharLimit(text, newText, maxLen)` | `utils/appendWithCharLimit.js` | Text append respecting character limit |
| `itemCalculations.js` | `utils/itemCalculations.js` | Rating distribution, weighted average, ranking, progression |

### New Components (Frontend)

| Component | Location | Purpose |
|-----------|----------|---------|
| `DestructiveActionDialog` | `components/DestructiveActionDialog.jsx` | Reusable confirmation dialog for destructive actions |
| `RouteGuard` | `components/RouteGuard.jsx` | Shared route protection wrapper with loading state |

### New Hooks (Frontend)

| Hook | Location | Purpose |
|------|----------|---------|
| `useDarkMode()` | `hooks/useDarkMode.js` | MutationObserver-based dark mode detection and toggle |
| `useColumnSort(defaultCol, defaultDir)` | `hooks/useColumnSort.js` | Generic column sorting state management |

### New Services (Backend)

| Service | Location | Purpose |
|---------|----------|---------|
| `EventAdminService` | `services/EventAdminService.js` | Administrator CRUD, PIN regeneration, user deletion, bulk ops |
| `EventConfigService` | `services/EventConfigService.js` | Rating config, item config, theme, bookmarks, user profiles |

### Removed Files

| File | Reason |
|------|--------|
| `frontend/src/hooks/useQuotes.js` | Unnecessary wrapper over quoteService |
| `frontend/src/hooks/usePINVerification.js` | Unnecessary wrapper over usePIN |
| `frontend/src/services/dashboardService.js` | Single-line wrapper over apiClient |
| `frontend/src/components/DeleteUserDialog.jsx` | Replaced by DestructiveActionDialog |
| `frontend/src/components/DeleteEventDialog.jsx` | Replaced by DestructiveActionDialog |
| `frontend/src/components/DeleteRatingsDialog.jsx` | Replaced by DestructiveActionDialog |
| `frontend/src/components/DeleteAllUsersDialog.jsx` | Replaced by DestructiveActionDialog |

### Modified Files (Service Split)

| Original | Becomes | Methods Retained |
|----------|---------|-----------------|
| `EventService.js` (2,146 lines) | `EventService.js` (~800 lines) | Core CRUD, state transitions, getEvent, updateEvent, validation, user registration, migrations |
| — | `EventAdminService.js` (~500 lines) | getAdministrators, addAdministrator, deleteAdministrator, regeneratePIN, deleteUser, deleteAllUsers |
| — | `EventConfigService.js` (~600 lines) | getRatingConfiguration, updateRatingConfiguration, getItemConfiguration, updateItemConfiguration, updateTheme, getUserBookmarks, saveUserBookmarks, getUserProfile, updateUserName |

## Dependency Graph (Post-Split)

```
emailUtils.js ──────────────────────────┐
                                         │
validators.js ───────────────────────────┤
                                         ▼
                              ┌──────────────────┐
                              │  EventService.js  │ (core CRUD, helpers)
                              │  ~800 lines       │
                              └──────────────────┘
                                   ▲         ▲
                                   │         │
                    ┌──────────────┘         └──────────────┐
                    │                                        │
          ┌─────────────────────┐              ┌─────────────────────┐
          │ EventAdminService.js │              │ EventConfigService.js│
          │ ~500 lines           │              │ ~600 lines           │
          └─────────────────────┘              └─────────────────────┘
```

No circular dependencies. Both child services depend on core EventService only.
