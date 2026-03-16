# Feature Specification: Dashboard Summary Redesign

**Feature Branch**: `033-dashboard-summary-redesign`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Redesign Dashboard Summary tab into a narrative highlight reel with top-rated bottle hero card, full-width ratings progress bar, global average rating, most divisive item, and personality summary strip"

## Clarifications

### Session 2026-03-16

- Q: Should the redesign address the current bland color palette? → A: Yes. Use existing theme colors as the primary source, and complementary colors where theme colors are insufficient.
- Q: How should the hero card visually stand out from other stat cards? → A: Subtle accent background — a light tint of the theme primary color to distinguish it from regular stat cards.
- Q: Should each half-width stat card have its own distinct color accent? → A: Yes. Each stat card gets a unique muted accent color (e.g., teal for People, amber for Bottles, orange for Avg Rating, red-orange for Most Divisive — mapped to theme chart variables) to make them visually scannable.
- Q: Should the progress bar color respond dynamically to completion percentage? → A: No. Use a single theme primary color at all percentages — fill width alone communicates progress. A traffic-light model doesn't fit a tasting event.
- Q: Should the personality summary strip use personality-specific colors? → A: Yes. Each personality entry uses a color matching its character (e.g., warm gold for "Golden Retriever", cool blue for "Simon Cowell") to make the strip vibrant and reinforce personality branding.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Top-Rated Bottle Hero Card (Priority: P1)

When a host or guest opens the Dashboard Summary tab, they immediately see which bottle won the tasting — displayed as a prominent, full-width card at the top. This is the single most important piece of information after a blind tasting event.

**Why this priority**: The #1 question every participant has after a tasting is "which bottle won?" Surfacing this front-and-center delivers the most emotional payoff and makes the dashboard feel purposeful.

**Independent Test**: Can be fully tested by creating an event with rated bottles and verifying the top-rated bottle appears as a hero card. Delivers immediate value even without the other summary redesign changes.

**Acceptance Scenarios**:

1. **Given** an event with at least one rated bottle, **When** the user opens the Summary tab, **Then** a full-width hero card is displayed at the top showing the top-rated bottle's ID (e.g., "Bottle #5"), its weighted average rating formatted as "{score} / {maxRating}", and a trophy visual indicator.
2. **Given** an event with no ratings yet, **When** the user opens the Summary tab, **Then** the hero card displays a "No ratings yet" message in muted text instead of a bottle.
3. **Given** the hero card is visible and the user is an admin or the event is completed, **When** the user taps the hero card, **Then** the item details drawer opens for that bottle.
4. **Given** two or more bottles are tied for the highest weighted average, **When** the Summary tab is displayed, **Then** the bottle with the lower item ID is shown (deterministic tie-breaking).

---

### User Story 2 - Full-Width Ratings Progress Bar (Priority: P1)

The current Ratings card shows just a number (e.g., "87") with a subtle fill background. The redesigned version shows actual vs expected ratings and a human-readable completion message as a full-width card.

**Why this priority**: During an active tasting, the host needs to know at a glance how far along the group is. "87 / 96 — 91% complete" is instantly actionable; "87" alone requires mental math.

**Independent Test**: Can be tested by creating an event with known user and bottle counts, submitting some ratings, and verifying the progress display shows correct actual/expected counts and percentage.

**Acceptance Scenarios**:

1. **Given** an event with 12 people and 8 bottles where 87 ratings have been submitted, **When** the user opens the Summary tab, **Then** the progress card displays "87 / 96" as the main value and "91% complete · 9 to go" as the subtitle.
2. **Given** an event with no users or no bottles configured, **When** the user opens the Summary tab, **Then** the progress card displays "0" with subtitle "No ratings possible yet".
3. **Given** all expected ratings have been submitted (100%), **When** the user views the progress card, **Then** the progress bar is fully filled and the subtitle reads "100% complete".

---

### User Story 3 - Global Average Rating Card (Priority: P2)

Replace the "Ratings per Bottle" card (which shows a non-intuitive decimal like "10.88") with an "Avg Rating" card that shows the global average on the familiar 1-to-max rating scale that participants actually used.

**Why this priority**: The average rating is immediately understandable ("the group averaged 3.2 out of 4") whereas "10.88 ratings per bottle" requires context to interpret. This uses data already computed by the backend but currently hidden from the Summary tab.

**Independent Test**: Can be tested by submitting known ratings and verifying the displayed average matches the expected calculation on the 1-to-max scale.

**Acceptance Scenarios**:

1. **Given** an event with ratings submitted and a max rating of 4, **When** the user views the Summary tab, **Then** an "Avg Rating" card displays the global average formatted to 1 decimal place (e.g., "3.2") with a subtitle "out of 4".
2. **Given** an event with no ratings, **When** the user views the Summary tab, **Then** the "Avg Rating" card displays "N/A".

---

### User Story 4 - Most Divisive Item Card (Priority: P2)

Rename "Most Controversial" to "Most Divisive" and add the average rating as a subtitle for context. Remove the "Least Controversial" card to reduce clutter.

**Why this priority**: Knowing which bottle divided opinion is more interesting than knowing which one everyone agreed on. Adding the average rating gives context — "Most Divisive: #3, avg 2.8" tells a story; "#3" alone does not.

**Independent Test**: Can be tested by submitting divergent ratings for one bottle and verifying it appears as the most divisive with its average rating shown.

**Acceptance Scenarios**:

1. **Given** an event with items that have varying standard deviations in ratings (at least 3 ratings per item), **When** the Summary tab is displayed, **Then** the card shows "Most Divisive" as the title, the item ID as the value (e.g., "#3"), and "avg {averageRating}" as a subtitle.
2. **Given** the most divisive card is visible, **When** the user taps it, **Then** the item details drawer opens for that item.
3. **Given** no items have at least 3 ratings, **When** the Summary tab is displayed, **Then** the "Most Divisive" card is not shown.

---

### User Story 5 - Personality Summary Strip (Priority: P3)

Show an aggregated personality breakdown at the bottom of the Summary tab — a fun, shareable moment that highlights the different tasting styles present at the event.

**Why this priority**: The personality feature is one of the app's most delightful aspects but is currently buried in the People tab. Surfacing a summary on the main Summary tab adds entertainment value and encourages exploration of the People tab. Lower priority because it's supplementary — the core stats are more important.

**Independent Test**: Can be tested by creating an event where multiple users have distinct personality types and verifying the summary strip aggregates and displays them correctly.

**Acceptance Scenarios**:

1. **Given** an event where 4 users have "Golden Retriever", 2 have "Simon Cowell", and 1 has "Speedrun" personalities, **When** the Summary tab is displayed, **Then** a full-width personality summary card appears showing each personality type with its icon, count, and name, sorted by count descending.
2. **Given** an event where no users have been assigned a personality (not enough ratings or non-wine event), **When** the Summary tab is displayed, **Then** the personality summary strip is not rendered at all.
3. **Given** an event where only 1 personality type exists among all users, **When** the Summary tab is displayed, **Then** the personality strip shows that single entry.

---

### User Story 6 - Mixed Layout and Dead Code Cleanup (Priority: P1)

The Summary tab layout changes from a uniform 2x2 grid of identical cards to a mixed layout with full-width hero/progress cards and half-width stat cards. All removed features must have their associated code fully cleaned up.

**Why this priority**: The layout change is what transforms the tab from a spreadsheet into a narrative. Cleanup is essential to avoid dead code accumulation.

**Independent Test**: Can be tested by verifying the visual layout order, card widths, and confirming no orphaned code (unused imports, unreferenced variables, stale comments) remains.

**Acceptance Scenarios**:

1. **Given** the Summary tab is loaded, **When** viewed on a mobile device, **Then** the cards appear in this order: (1) Top-Rated Bottle hero — full-width, (2) People — half-width, (3) Bottles — half-width, (4) Ratings Progress — full-width, (5) Avg Rating — half-width, (6) Most Divisive — half-width (conditional), (7) Personality Summary — full-width (conditional).
2. **Given** the "Least Controversial" card has been removed, **When** the codebase is inspected, **Then** there are no references to `leastControversial` in the frontend rendering code, no orphaned JSX blocks, and no unused imports related to it.
3. **Given** the "Ratings per Bottle" card has been removed, **When** the codebase is inspected, **Then** there are no references to `averageRatingsPerItem` in `DashboardPage.jsx`, and the associated `tooltipMessage` logic for "No bottles configured" is removed.
4. **Given** the doc comment at the top of `DashboardPage.jsx` references old card names, **When** the changes are complete, **Then** the doc comment is updated to reflect the new layout.
5. **Given** all changes are complete, **When** the existing e2e tests are updated and run, **Then** all tests pass, including assertions for the new card labels and layout.

---

### Edge Cases

- What happens when only 1 bottle exists and it has ratings? The hero card shows it as the winner (it is, trivially).
- What happens when all bottles have the same weighted average? The hero card shows the bottle with the lowest item ID (deterministic tie-breaking).
- What happens when the personality strip would show many personality types (e.g., 10+)? All are displayed — the strip scrolls naturally within the page layout.
- What happens when the event type is not "wine"? Personality detection is skipped by the backend, so the personality strip simply won't render (no special handling needed).
- What happens when the expected ratings count is 0 (no users or no bottles)? The progress card shows "0" with "No ratings possible yet" — division by zero is avoided.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Summary tab MUST display the top-rated bottle (by weighted average) as a full-width hero card at the top of the tab.
- **FR-002**: Hero card MUST show the item ID, weighted average formatted as "{score} / {maxRating}", and a trophy visual indicator. It MUST use a subtle accent background (light tint of the theme primary color) to visually distinguish it from regular stat cards.
- **FR-003**: Hero card MUST be tappable to open the item details drawer (when user is admin or event is completed).
- **FR-004**: Summary tab MUST display a full-width ratings progress card showing "{actual} / {expected}" with a subtitle of "{percentage}% complete · {remaining} to go". The progress bar MUST use the theme primary color at all percentages (no dynamic color transitions).
- **FR-005**: Summary tab MUST display an "Avg Rating" card showing the global average rating on the 1-to-max scale, with a subtitle "out of {maxRating}".
- **FR-006**: Summary tab MUST rename "Most Controversial" to "Most Divisive" and display the item's average rating as a subtitle.
- **FR-007**: Summary tab MUST remove the "Least Controversial" card entirely.
- **FR-008**: Summary tab MUST remove the "Ratings per Bottle" card entirely.
- **FR-009**: Summary tab MUST display a full-width personality summary strip at the bottom, aggregating personality counts from all users, sorted by count descending — only when at least one user has an assigned personality. Each personality entry MUST use a personality-specific color that matches its character identity.
- **FR-010**: All removed features (Least Controversial card, Ratings per Bottle card) MUST have their associated code fully cleaned up — no orphaned JSX, unused imports, stale variables, or outdated comments.
- **FR-011**: All existing e2e test assertions referencing removed or renamed elements MUST be updated to reflect the new layout and labels.
- **FR-012**: No backend changes are required — all data needed is already returned by the existing dashboard API endpoint.
- **FR-013**: All new and redesigned cards MUST use colors from the existing theme palette. Where theme colors are insufficient, complementary colors MUST be used to add visual interest and reduce the bland appearance of the current dashboard.
- **FR-014**: Each half-width stat card (People, Bottles, Avg Rating, Most Divisive) MUST have its own unique muted accent color to create an at-a-glance visual language for quick scanning.

### Key Entities

- **Top-Rated Item**: The item from `itemSummaries` with the highest `weightedAverage`. Derived on the frontend from existing backend data.
- **Ratings Progress**: Computed from `statistics.totalRatings`, `statistics.totalUsers`, and `statistics.totalItems`. Expected ratings = totalUsers × totalItems.
- **Global Average**: The `globalAverage` field already returned by the backend dashboard endpoint.
- **Personality Counts**: Aggregated from `userSummaries[].personality` — a map of personality ID to count of users with that personality.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The top-rated bottle is immediately visible without scrolling when the Summary tab loads.
- **SC-002**: The ratings progress card communicates completion status in under 2 seconds of reading (actual/expected + percentage + remaining).
- **SC-003**: The "Avg Rating" value is on the same 1-to-max scale that participants used when rating, making it instantly interpretable.
- **SC-004**: The personality summary strip is only shown when personality data exists, avoiding empty/confusing UI states.
- **SC-005**: All existing e2e tests pass after updates, with no reduction in test coverage for dashboard functionality.
- **SC-006**: No dead code remains from removed features — zero orphaned imports, variables, JSX blocks, or stale comments related to "Least Controversial", "Ratings per Bottle", or "Total" prefixed labels.
- **SC-007**: The Summary tab layout uses a clear visual hierarchy: hero card (most prominent) → core stats → progress → secondary stats → personality strip (supplementary).
