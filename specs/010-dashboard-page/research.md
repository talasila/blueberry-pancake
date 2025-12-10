# Research: Event Dashboard Page

**Feature**: 010-dashboard-page  
**Date**: 2025-01-27  
**Purpose**: Document research decisions and technical choices for dashboard implementation

## Bayesian Average Calculation

**Decision**: Implement Bayesian average using the formula: `(C × global_avg + Σ(ratings)) / (C + n)`, where C = 40% of total_users, n = number_of_raters, global_avg = average rating across all items.

**Rationale**: 
- Bayesian averaging prevents items with few ratings from having extreme averages
- The 40% constant (C) provides a reasonable balance between prior belief (global average) and observed data
- Formula is well-established in rating systems (IMDB, Reddit, etc.)
- Handles edge cases: when n=0, result equals global_avg; when n is large, approaches simple average

**Alternatives considered**:
- Simple average: Rejected - too sensitive to small sample sizes
- Fixed constant C (e.g., 10): Rejected - doesn't scale with event size
- Percentage-based C (40%): Selected - scales appropriately with event size

**Implementation notes**:
- C must be calculated as `Math.floor(total_users * 0.4)` to ensure integer
- Handle edge case when total_users = 0 (C = 0) by displaying "N/A"
- Handle edge case when global_avg is undefined (no ratings) by displaying "N/A"

## Statistics Aggregation Strategy

**Decision**: Calculate statistics on-demand from event configuration and ratings CSV, with caching for performance.

**Rationale**:
- File-based storage requires reading and parsing CSV for ratings
- Event configuration already cached via EventService
- On-demand calculation ensures data freshness
- Caching reduces file I/O for repeated dashboard views

**Alternatives considered**:
- Pre-computed statistics stored in event config: Rejected - adds complexity, requires invalidation on every rating change
- Real-time database queries: Not applicable - using file-based storage
- Background job to pre-compute: Rejected - adds complexity, file-based storage doesn't support efficient updates

**Implementation notes**:
- Cache dashboard statistics with key `dashboard:{eventId}`
- Invalidate cache when ratings are submitted (via RatingService)
- Cache TTL: 30 seconds (matches existing rating cache pattern)

## Table Sorting Implementation

**Decision**: Client-side sorting for table columns using React state management.

**Rationale**:
- Dashboard data is already loaded in memory
- Client-side sorting provides instant feedback (<500ms requirement)
- No additional API calls needed
- Matches existing patterns in the codebase

**Alternatives considered**:
- Server-side sorting: Rejected - unnecessary complexity, data already loaded
- Hybrid (initial server sort, client re-sort): Rejected - adds complexity without benefit

**Implementation notes**:
- Store sort state (column, direction) in component state
- Default sort: Item ID ascending (FR-014a)
- Sort Rating Progression by underlying percentage value (not visual bar)
- Maintain sort state during user session (until page refresh)

## Progress Bar Visual Design

**Decision**: Visual-only progress bar without text labels (percentage or fraction).

**Rationale**:
- Spec requirement (FR-010): "displayed as a visual bar only without text labels"
- Reduces visual clutter
- Progress bar is self-explanatory
- Matches minimalist design aesthetic

**Alternatives considered**:
- Progress bar with percentage text: Rejected - violates spec requirement
- Progress bar with fraction text: Rejected - violates spec requirement
- Progress bar with both: Rejected - violates spec requirement

**Implementation notes**:
- Use HTML5 `<progress>` element or CSS-based bar
- Width represents percentage (number_of_raters / total_users)
- Accessible via aria-label with percentage value

## Access Control Pattern

**Decision**: Use route protection component (similar to AdminRoute) for dashboard access control, with conditional UI visibility in ProfilePage.

**Rationale**:
- Reuses existing AdminRoute pattern for consistency
- ProfilePage already has conditional button rendering (Admin button)
- Centralized access control logic
- Clear separation of concerns

**Alternatives considered**:
- Inline access check in DashboardPage: Rejected - violates DRY, duplicates AdminRoute logic
- Separate DashboardRoute component: Selected - follows existing pattern, reusable

**Implementation notes**:
- Create DashboardRoute component similar to AdminRoute
- Check: isAdmin OR (event.state === 'completed')
- Redirect to event main page if access denied
- ProfilePage: Show dashboard button if isAdmin OR event.state === 'completed'

## Number Formatting

**Decision**: Format all averages to 2 decimal places using JavaScript's `toFixed(2)` or `Number.prototype.toLocaleString()`.

**Rationale**:
- Spec requirement: 2 decimal places for all averages (FR-008, FR-011, SC-006)
- Consistent formatting across all numeric displays
- Standard JavaScript formatting methods

**Alternatives considered**:
- Variable precision: Rejected - violates spec requirement
- 1 decimal place: Rejected - violates spec requirement
- No formatting: Rejected - violates spec requirement

**Implementation notes**:
- Use `parseFloat(value.toFixed(2))` to avoid trailing zeros for whole numbers, OR
- Use `value.toFixed(2)` to always show 2 decimals (e.g., "3.40")
- Based on spec examples, always show 2 decimals is preferred

## Manual Refresh Pattern

**Decision**: Implement manual refresh button that triggers data refetch and cache invalidation.

**Rationale**:
- Spec requirement: Manual refresh button (FR-018)
- User-controlled data freshness
- Simple implementation (no polling infrastructure needed)
- Matches user expectation for dashboard refresh

**Alternatives considered**:
- Automatic polling: Rejected - violates spec requirement, adds complexity
- WebSocket real-time updates: Rejected - overkill, violates spec requirement
- Server-sent events: Rejected - overkill, violates spec requirement

**Implementation notes**:
- Refresh button triggers API call to dashboard endpoint
- Backend invalidates cache before recalculating
- Frontend shows loading state during refresh
- Button disabled during refresh to prevent concurrent requests
