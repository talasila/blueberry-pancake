# Feature Specification: Codebase Refactoring & Simplification

**Feature Branch**: `034-codebase-refactor`
**Created**: 2026-03-16
**Status**: Draft
**Input**: User description: "Systematic refactoring to eliminate code duplication, reduce complexity, and standardize patterns across the blueberry-pancake codebase (React frontend + Express backend)."

## Clarifications

### Session 2026-03-16

- Q: If refactoring reveals an area with no test coverage, should new tests be written as part of this effort? → A: Add tests only for newly extracted utilities and shared components; do not expand scope to cover pre-existing gaps.
- Q: Must each priority tier (P1, P2, P3) be fully completed and merged before the next begins? → A: Strict phase gates — complete and merge all P1 before starting P2, all P2 before P3.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer eliminates backend utility duplication (Priority: P1)

A developer working on the backend encounters duplicated cookie-clearing logic, rate-limit formatting, email normalization, and timestamp formatting scattered across multiple files. They consolidate each into a single shared utility, then update all call sites to use the shared version. All existing tests continue to pass, and future changes to these patterns require editing only one location.

**Why this priority**: These are the smallest, safest changes with the highest confidence of not introducing regressions. They establish the pattern for later phases and immediately reduce maintenance burden.

**Independent Test**: Can be fully tested by running the existing backend test suite after each extraction. Delivers immediate value by reducing duplicated code and ensuring consistency.

**Acceptance Scenarios**:

1. **Given** cookie-clearing logic exists in 3 places in auth.js, **When** a developer extracts it into a `clearAuthCookies(res)` utility, **Then** all 3 call sites use the shared utility and logout/refresh/failure paths behave identically.
2. **Given** rate-limit retry formatting is duplicated in auth.js and events.js, **When** a developer extracts `formatRateLimitResponse(res, result)`, **Then** both routes produce identical 429 responses via the shared utility.
3. **Given** manual `.trim().toLowerCase()` calls exist alongside `normalizeEmail()` imports, **When** all manual calls are replaced with the utility, **Then** email normalization is consistent across every backend file.
4. **Given** ISO 8601 timestamp formatting is repeated in multiple services, **When** a developer extracts `formatTimestamp()`, **Then** all services use the shared utility.
5. **Given** `EmailService.isValidEmail()` wraps `isValidEmailUtil()` with no added logic, **When** the wrapper is removed and callers use the utility directly, **Then** email validation behaves identically.

---

### User Story 2 - Developer removes unnecessary frontend wrappers and consolidates validation (Priority: P1)

A developer identifies thin wrapper hooks and services that add no value (useQuotes with hardcoded loading, usePINVerification wrapping usePIN, dashboardService wrapping a single API call). They inline or remove these wrappers and consolidate event ID validation from 3+ implementations into one. All consuming components are updated and existing tests pass.

**Why this priority**: Removing unnecessary abstractions reduces cognitive load and file count. Consolidating validation prevents divergent behavior.

**Independent Test**: Can be tested by verifying all components that previously used the removed wrappers still function correctly. Event ID validation can be tested with unit tests against the single consolidated module.

**Acceptance Scenarios**:

1. **Given** `useQuotes.js` wraps `quoteService` with a hardcoded `loading: false`, **When** the hook is removed and consumers use `quoteService` directly, **Then** quote functionality works identically.
2. **Given** `usePINVerification.js` wraps `usePIN()` with no added logic, **When** consumers import `usePIN()` directly, **Then** PIN verification behaves identically.
3. **Given** `dashboardService.js` contains a single-line wrapper over `apiClient.get()`, **When** consumers call `apiClient` directly, **Then** dashboard data loading works identically.
4. **Given** event ID validation exists in `eventIdValidation.js`, `serviceValidation.js`, inline in `ratingService.js`, and `itemService.js`, **When** consolidated into a single module, **Then** all validation call sites use one import and produce consistent results.

---

### User Story 3 - Developer consolidates delete dialogs into a reusable component (Priority: P2)

A developer notices that 4 delete dialog components (DeleteUserDialog, DeleteEventDialog, DeleteRatingsDialog, DeleteAllUsersDialog) share ~75% identical code: backdrop, confirmation input, header layout, and button styling. They create a single `DestructiveActionDialog` component that accepts configuration props, then replace all 4 dialogs with thin wrappers or direct usage. Visual appearance and behavior remain identical.

**Why this priority**: This is the largest single source of frontend duplication (~350 lines). It requires more careful testing since it touches user-facing UI, but the pattern is clear and well-bounded.

**Independent Test**: Can be tested by opening each delete action in the UI and verifying the confirmation flow, styling, and error handling match the original behavior exactly.

**Acceptance Scenarios**:

1. **Given** all 4 delete dialogs share identical backdrop, header, confirmation input, and button patterns, **When** a developer creates `DestructiveActionDialog` accepting title, description, confirmationText, icon, and onConfirm props, **Then** the component renders correctly for all 4 use cases.
2. **Given** the consolidated component is in use, **When** a user triggers any delete action, **Then** the confirmation flow (type phrase, submit, loading state, error display) behaves identically to the original.
3. **Given** the original 4 files totaled ~543 lines, **When** consolidation is complete, **Then** the total line count for dialog-related code is reduced by at least 300 lines.

---

### User Story 4 - Developer standardizes route protection and Header component (Priority: P2)

A developer extracts the shared loading spinner and permission-checking pattern from ProtectedRoute, AdminRoute, and DashboardRoute into a reusable hook or wrapper. They also refactor Header.jsx by extracting a `useDarkMode()` hook and defining menu items as a data array instead of conditional rendering blocks.

**Why this priority**: These changes improve maintainability and make it easier to add new routes or menu items in the future. They require moderate effort but have clear, bounded scope.

**Independent Test**: Route protection can be tested by navigating to protected, admin, and dashboard routes in various auth states. Header can be tested by verifying menu rendering, theme toggle, and dark mode detection.

**Acceptance Scenarios**:

1. **Given** 3 route protection components share identical loading UI and redirect logic, **When** extracted into a shared abstraction, **Then** all protected routes render the same loading state and redirect correctly on permission failure.
2. **Given** Header.jsx contains 8 handler functions and 4 conditional menu sections, **When** menu items are defined as a data array with handler mappings, **Then** the Header renders identically with fewer lines and adding a new menu item requires only a data entry.
3. **Given** dark mode detection uses an inline MutationObserver in Header, **When** extracted to `useDarkMode()`, **Then** the hook returns the current theme state and the Header consumes it cleanly.

---

### User Story 5 - Developer standardizes backend error handling and extracts RatingForm utilities (Priority: P2)

A developer adopts `handleApiError()` consistently across all backend route handlers, replacing manual error classification patterns. On the frontend, they extract the RatingForm's retry logic into a `retryWithBackoff()` utility and the character-limit logic into `appendWithCharLimit()`.

**Why this priority**: Error handling standardization prevents inconsistent API responses. RatingForm utility extraction makes complex logic testable in isolation.

**Independent Test**: Backend error handling can be tested by triggering various error conditions across API endpoints and verifying consistent response formats. RatingForm utilities can be unit tested independently.

**Acceptance Scenarios**:

1. **Given** some routes use `handleApiError()` while others manually check `error.message.includes('not found')`, **When** all routes adopt `handleApiError()`, **Then** error responses follow a consistent format across all endpoints.
2. **Given** RatingForm contains inline retry logic with 3 levels of exponential backoff, **When** extracted to `retryWithBackoff(fn, maxRetries)`, **Then** the utility is independently testable and the form component is simplified.
3. **Given** RatingForm contains inline character-limit logic for suggestions, **When** extracted to `appendWithCharLimit()`, **Then** the utility handles edge cases correctly and is reusable.

---

### User Story 6 - Developer splits large components and services (Priority: P3)

A developer breaks down ItemDetailsDrawer.jsx (589 lines) by extracting calculation logic (weighted average, ranking, distribution) into utility functions and sorting into a custom hook. They also split EventService.js into focused services: core CRUD, admin management, and configuration. All existing functionality is preserved.

**Why this priority**: These are the largest, most complex changes that touch critical code paths. They should only be attempted after the earlier phases establish confidence in the refactoring approach and test coverage.

**Independent Test**: ItemDetailsDrawer can be tested by opening item details in the UI and verifying all calculations, sorting, and display are correct. EventService split can be tested by exercising all event management operations through the API.

**Acceptance Scenarios**:

1. **Given** ItemDetailsDrawer.jsx contains 5+ useMemo calculations for averages, rankings, and distributions, **When** calculation logic is extracted to utility functions, **Then** the drawer component is reduced to ~300-350 lines and calculations are independently testable.
2. **Given** ItemDetailsDrawer manages sorting state inline, **When** sorting is extracted to a custom hook, **Then** the hook manages sort column/direction state and the drawer consumes it cleanly.
3. **Given** EventService.js handles event CRUD, state transitions, admin management, user management, rating config, item config, and bookmarks, **When** split into EventService, EventAdminService, and EventConfigService, **Then** each service has a single responsibility and all API routes function identically.

---

### Edge Cases

- What happens when a removed wrapper (e.g., useQuotes) is imported by a file not identified during analysis? All imports must be exhaustively searched before removal.
- How does the system behave if the consolidated `DestructiveActionDialog` receives unexpected prop combinations? The component must validate required props and fail gracefully.
- What happens if `handleApiError()` encounters an error type it doesn't recognize? It must fall back to a generic 500 response rather than crashing.
- What if EventService split introduces circular dependencies between the new services? Service boundaries must be designed to avoid circular imports.
- What happens during deployment if frontend and backend are deployed at different times? All changes must be backward-compatible within each deployment unit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All duplicated cookie-clearing logic in the backend auth module MUST be replaced with a single shared utility function.
- **FR-002**: All duplicated rate-limit response formatting MUST be replaced with a single shared utility function.
- **FR-003**: All email normalization in the backend MUST use the existing `normalizeEmail()` utility — no manual `.trim().toLowerCase()` calls.
- **FR-004**: All ISO 8601 timestamp formatting in backend services MUST use a single shared utility function.
- **FR-005**: Unnecessary frontend wrapper hooks (useQuotes, usePINVerification) and services (dashboardService) MUST be removed, with consumers updated to use the underlying implementations directly.
- **FR-006**: Event ID validation MUST be consolidated into a single module used by all call sites.
- **FR-007**: The `EmailService.isValidEmail()` wrapper MUST be removed, with callers using the utility directly.
- **FR-008**: The 4 delete dialog components MUST be consolidated into a single reusable component that supports all 4 use cases through configuration props.
- **FR-009**: Route protection components MUST share a common loading state and permission-checking abstraction.
- **FR-010**: Header.jsx MUST extract dark mode detection into a custom hook and define menu items as data rather than inline conditionals.
- **FR-011**: All backend route error handling MUST use `handleApiError()` consistently.
- **FR-012**: RatingForm retry logic and character-limit logic MUST be extracted into independently testable utility functions.
- **FR-013**: ItemDetailsDrawer calculation logic MUST be extracted into utility functions, reducing the component to 350 lines or fewer.
- **FR-014**: EventService.js MUST be split into focused services with single responsibilities (core CRUD, admin management, configuration).
- **FR-015**: All refactored code MUST pass existing unit and E2E tests without modification to test assertions. Test file updates are allowed only for import path changes.
- **FR-016**: No user-visible behavior changes are permitted — all refactoring MUST be transparent to end users.
- **FR-017**: Unit tests MUST be written for all newly extracted utilities and shared components (e.g., clearAuthCookies, formatRateLimitResponse, formatTimestamp, retryWithBackoff, appendWithCharLimit, DestructiveActionDialog, useDarkMode). Pre-existing coverage gaps are out of scope.
- **FR-018**: Phase gates MUST be enforced — all P1 items must be completed and merged before P2 work begins, and all P2 items before P3.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Total lines of code across the 4 delete dialog files is reduced by at least 300 lines after consolidation.
- **SC-002**: Zero instances of manual `.trim().toLowerCase()` for email normalization remain in backend source files.
- **SC-003**: Cookie-clearing logic exists in exactly 1 location in the backend codebase.
- **SC-004**: All existing unit tests pass without changes to test assertions (import path changes are acceptable).
- **SC-005**: All existing E2E tests pass without modification.
- **SC-006**: ItemDetailsDrawer.jsx is reduced to 350 lines or fewer.
- **SC-007**: EventService.js is split into 3 or more focused service files, none exceeding 300 lines.
- **SC-008**: Zero unnecessary wrapper hooks or services remain (useQuotes.js, usePINVerification.js, dashboardService.js are removed or repurposed).
- **SC-009**: Event ID validation is imported from exactly 1 module across the entire codebase.
- **SC-010**: All backend route handlers use `handleApiError()` for error response formatting — zero instances of manual error.message pattern matching for HTTP response selection.
- **SC-011**: Every newly extracted utility and shared component has at least one unit test covering its primary behavior.
- **SC-012**: P1 items are merged to the feature branch before any P2 work begins; P2 items are merged before any P3 work begins.

### Assumptions

- The existing test suite provides sufficient coverage to detect regressions from these refactoring changes.
- The `handleApiError()` utility already handles the full range of error types encountered across all routes, or can be extended to do so without changing its public interface.
- Removing wrapper hooks will not break any third-party integrations or plugins.
- The EventService split will not require changes to the DynamoDB repository layer.
- All changes are deployed atomically within each deployment unit (frontend bundle, backend Lambda).
