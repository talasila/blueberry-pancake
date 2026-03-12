# Feature Specification: Tasting Personality Card

**Feature Branch**: `028-tasting-personality`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "During a blind tasting event, analyze each guest's rating patterns and assign them a funny, shareable tasting personality. The personality updates as more items are rated and is visible to the guest themselves, to other guests via the Similar Users drawer, and to the host via the Dashboard."

## Clarifications

### Session 2026-03-12

- Q: What should happen when a non-wine event runs, given that quote content is wine-specific? → A: Hide personality entirely for non-wine events (feature is invisible — no card, no subtitles, no dashboard section)
- Q: How should a guest learn that their tasting personality is now available? → A: Subtle visual cue (e.g., small dot badge) on the My Progress button when a personality first becomes available, cleared after the guest opens the drawer

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest Sees Their Own Tasting Personality (Priority: P1)

As a guest who has rated enough items during a blind tasting, I see a funny personality card at the top of My Progress that summarizes my rating style in a humorous, shareable way. This is the core "show your friend" moment — I laugh at the description, turn to the person next to me, and say "it called me The Simon Cowell!"

**Why this priority**: Without the guest seeing their own personality, no other surface delivers value. This is the foundational interaction — the personality card must feel accurate, funny, and worth sharing for the feature to succeed.

**Independent Test**: Can be fully tested by having a single user rate 50%+ of items in a `started` event, opening My Progress, and verifying a personality card appears with a name and quote that matches their rating pattern.

**Acceptance Scenarios**:

1. **Given** a guest has rated 5 of 8 items in a `started` event (all rated 4), **When** they open My Progress, **Then** a personality card appears at the top showing "The Golden Retriever" with a randomly selected quote from that personality's quote pool
2. **Given** a guest has rated 4 of 8 items with an average of 1.3, **When** they open My Progress, **Then** the personality card shows "The Simon Cowell" with a quote containing their actual average rating interpolated into the text
3. **Given** a guest has rated only 3 of 8 items (below the 50%/minimum-4 threshold), **When** they open My Progress, **Then** no personality card is displayed
4. **Given** a guest has rated 4 of 6 items (meets the 50% threshold but not the minimum-4 threshold — 50% of 6 is 3, so minimum-4 applies), **When** they open My Progress, **Then** the personality card is displayed (4 >= minimum of 4)
5. **Given** a guest opens My Progress twice, **When** both times they qualify for a personality, **Then** a different quote may be shown for the same personality type (random selection from the pool)
6. **Given** an event in `created` state, **When** a guest opens My Progress, **Then** no personality card is displayed regardless of how many items they have rated
7. **Given** a guest qualifies for a personality, **When** the quote contains template tokens like `{avg}` or `{items}`, **Then** the tokens are replaced with the guest's actual values and the event's item terminology (e.g., "wines")
8. **Given** a guest has just crossed the minimum rating threshold (e.g., rated their 4th of 8 items), **When** they return to the event page, **Then** the My Progress button displays a subtle visual indicator (e.g., dot badge) signaling new content is available
9. **Given** a guest sees the visual indicator on My Progress and opens the drawer, **When** the personality card is displayed, **Then** the visual indicator is cleared and does not reappear for subsequent personality shifts

---

### User Story 2 - Personality Shift Detection (Priority: P1)

As a guest who checks My Progress multiple times during a tasting, I notice when my personality changes as I rate more items. The card shows what I was before, creating a narrative arc ("I was The Golden Retriever but that last wine changed things") and giving me a reason to check back after each rating.

**Why this priority**: Co-equal with P1 because the personality shifting is what makes the feature feel alive rather than static. A personality that never changes after the first assignment would feel like a one-time gimmick. The shift is the replayability.

**Independent Test**: Can be tested by rating items that initially produce one personality (e.g., all high ratings → Golden Retriever), then rating additional items that change the pattern (e.g., several low ratings → Rollercoaster), and verifying the shift is surfaced.

**Acceptance Scenarios**:

1. **Given** a guest was "The Golden Retriever" the last time they opened My Progress, **When** they rate more items that change their pattern and reopen My Progress, **Then** the card shows the new personality and a line reading "Previously: The Golden Retriever"
2. **Given** a guest opens My Progress for the first time with a qualifying number of ratings, **When** no previous personality exists, **Then** only the current personality card is shown with no "Previously" line
3. **Given** a guest's personality has not changed since their last visit, **When** they reopen My Progress, **Then** only the current personality is shown with no "Previously" line
4. **Given** a guest closes and reopens the browser (sessionStorage cleared), **When** they open My Progress, **Then** the current personality is shown with no "Previously" line (shift history is ephemeral)

---

### User Story 3 - See Other Guests' Personalities in Similar Users (Priority: P2)

As a guest browsing the Similar Users drawer, I see each matched user's tasting personality alongside their name and similarity score. Seeing "Sarah — The Golden Retriever" is an instant conversation starter — I walk over to Sarah and say "it says you're The Golden Retriever!"

**Why this priority**: Extends the "share and discuss" value from personal to social. Depends on the core personality detection (P1) being in place, but significantly multiplies the number of share moments at the event.

**Independent Test**: Can be tested by having multiple users rate enough items, opening the Similar Users drawer, and verifying personality names appear as subtitles under each matched user's name.

**Acceptance Scenarios**:

1. **Given** a guest opens the Similar Users drawer and a matched user has rated 50%+ of items, **When** the list renders, **Then** the matched user's row shows their personality name as a subtitle (e.g., "The Rollercoaster · 5 common")
2. **Given** a matched user has not rated enough items to qualify for a personality, **When** the list renders, **Then** that user's row shows only the common item count with no personality subtitle
3. **Given** a guest taps on a matched user who has a personality, **When** the detail view opens, **Then** the detail view includes the matched user's personality name and a randomly selected quote for that personality type
4. **Given** a guest views the Similar Users drawer during a `started` event, **When** another user subsequently rates more items and qualifies for a personality, **Then** the personality appears on the next drawer open (data is fetched fresh each time the drawer opens)

---

### User Story 4 - Host and Guests See All Personalities on the Dashboard (Priority: P2)

As a host (or any guest viewing the completed-event dashboard), I see a "Tasting Personalities" section in the Summary tab showing every participant's personality. This gives the host a fun summary to announce to the room ("We've got three Golden Retrievers and a Simon Cowell!") and guests a way to discover each other's personalities.

**Why this priority**: Extends the feature to a group-level view. Lower priority than the personal card (P1) because it depends on enough participants having personalities assigned. Most impactful when the event is completed and the host is wrapping up.

**Independent Test**: Can be tested by completing an event where multiple users have rated enough items, navigating to the Dashboard Summary tab, and verifying the Tasting Personalities section lists all qualifying participants with their personality names.

**Acceptance Scenarios**:

1. **Given** a completed event where 6 of 8 participants qualify for a personality, **When** anyone views the Dashboard Summary tab, **Then** a "Tasting Personalities" section appears below the statistics cards listing those 6 participants with their display name and personality name
2. **Given** a completed event where no participants qualify for a personality, **When** anyone views the Dashboard Summary tab, **Then** the "Tasting Personalities" section is not displayed
3. **Given** the "Tasting Personalities" section is visible, **When** a user taps on a participant's row, **Then** the User Details drawer opens for that participant (showing their full personality card at the top)
4. **Given** an admin views the Dashboard during a `started` event, **When** some participants have already rated enough items, **Then** the "Tasting Personalities" section shows qualifying participants (not limited to completed state for admins)

---

### User Story 5 - Personality Content Matches the Voice of Existing Quotes (Priority: P1)

As a guest reading my personality quote, the tone and humor match the suggested wine notes I already know — contemporary, self-aware, pop-culture-literate, slightly absurd. The consistency of voice is what makes the feature feel like a natural part of the app rather than an afterthought.

**Why this priority**: Co-equal with the core display because the content IS the feature. A technically flawless personality card with mediocre writing will not generate a single share moment. The content quality directly determines whether someone laughs and shows their phone to a friend.

**Independent Test**: Can be tested by reviewing all personality quotes against the existing wine note suggestions (in `.quotes.txt` files) and verifying tonal consistency. Each quote should independently make someone smile when read in the context of a wine tasting.

**Acceptance Scenarios**:

1. **Given** a personality is displayed for a wine event, **When** the quote references items, **Then** it uses wine-specific terminology (wines, grapes, palate, etc.) matching the event's `typeOfItem`
2. **Given** a personality type has 3-5 quotes in its pool, **When** the personality is displayed, **Then** one quote is selected randomly from the pool
3. **Given** a quote contains template tokens (`{avg}`, `{n}`, `{count}`, `{minutes}`, `{items}`, `{item}`, `{max}`, `{preview}`), **When** rendered, **Then** all tokens are replaced with actual values — no raw tokens are ever visible to the user
4. **Given** any personality quote, **When** read by a user, **Then** it does not reference implementation details, rating algorithms, or technical concepts — it reads as natural, conversational humor

---

### User Story 6 - Accessible Personality Information (Priority: P3)

As a guest using a screen reader, the personality card content (name and quote) is announced as part of the My Progress drawer content, so I have the same "what did I get?" moment as sighted users.

**Why this priority**: Important for inclusivity but depends on the core card (P1) being implemented first. The personality card is text content, which is inherently accessible — this story ensures the structural markup doesn't inadvertently hide it.

**Independent Test**: Can be tested by navigating the My Progress drawer with a screen reader and verifying the personality name and quote are announced in the reading order.

**Acceptance Scenarios**:

1. **Given** a guest using a screen reader opens My Progress with a qualifying personality, **When** the drawer content is read, **Then** the personality name and quote are announced before the Rating Timeline section
2. **Given** a personality shift occurred, **When** the screen reader reads the card, **Then** the "Previously: [name]" text is also announced
3. **Given** the Similar Users drawer shows personality subtitles, **When** a screen reader reads a user row, **Then** the personality name is included in the announced content for that row

---

### Edge Cases

- What happens when the event has only 3 available items? The threshold `max(4, ceil(totalItems * 0.5))` requires all 3 to be rated (since 4 > 2, but totalItems is 3 — so the 50% rule yields 2, but minimum-4 yields 4 which exceeds totalItems). In this case, the effective threshold should be clamped to `totalItems` (all items must be rated), not an impossible 4-of-3.
- What happens when a user re-rates an item (changes their rating)? The personality re-evaluates on the next drawer open. Speed calculations use the span from earliest to latest timestamp across all rated items, not individual inter-rating gaps.
- What happens on a 2-point rating scale (`maxRating: 2`)? Personalities that depend on a "middle" value (The Diplomat) are excluded from detection. Personalities that depend on spread (The Rollercoaster) have reduced applicability. The system falls through to the next matching personality or the Explorer fallback.
- What happens when multiple personality rules could match? Not possible — detection rules are evaluated in strict priority order and the first match wins.
- What happens when a user's ratings produce no personality match above the fallback? The Explorer personality always matches as the final fallback (requires at least 2 distinct rating values). If the user gave the same rating to every item, The Broken Record matches at priority 1.
- What happens when the personality data has not loaded yet? No personality card is rendered. No loading skeleton or placeholder — the drawer shows its existing content (Rating Timeline, etc.) without the card.
- What happens when the personality quote pool for a matched type is empty or missing? The personality name is shown without a quote. The feature degrades gracefully rather than hiding the card entirely.
- What happens when a guest's note count or timestamp data is unavailable? Personalities that depend on missing data (The Novelist, The Speedrun, The Philosopher, The Ghost) are skipped in the detection hierarchy. The system falls through to the next matching rule.
- What happens for non-wine events (e.g., beer, hot sauce)? The personality feature is entirely hidden — no card, no subtitles, no dashboard section. This matches the existing pattern where suggested wine notes are gated by `typeOfItem === "wine"`. When content is added for other event types in the future, the gate can be expanded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST assign a tasting personality to any user who has rated at least `max(4, ceil(totalAvailableItems * 0.5))` items, clamped to `totalAvailableItems` when the total is less than 4
- **FR-002**: Personality detection MUST evaluate rules in a fixed priority order (1 through 11) and return the first matching personality type
- **FR-003**: The system MUST support 11 personality types with the following detection rules evaluated in order:
  1. **The Broken Record**: 75%+ of ratings are the same value
  2. **The Love-Hate Critic**: 70%+ of ratings are min or max value, with less than 15% in the middle
  3. **The Speedrun**: Average time between ratings < 2 minutes AND rated 75%+ of items
  4. **The Golden Retriever**: Average rating >= (maxRating − 0.5)
  5. **The Simon Cowell**: Average rating <= bottom 25% of the rating scale
  6. **The Novelist**: 70%+ of ratings have notes AND average note length > 60 characters
  7. **The Rollercoaster**: Standard deviation > 35% of rating range AND at least 3 distinct rating values used
  8. **The Diplomat**: 65%+ of ratings are middle value(s) AND standard deviation < 20% of rating range
  9. **The Ghost**: Zero notes on any rating AND rated 50%+ of items
  10. **The Philosopher**: Average time between ratings > 8 minutes AND rated 50%+ of items
  11. **The Explorer**: Fallback — at least 2 distinct rating values used (always matches if no prior rule did)
- **FR-004**: Each personality type MUST have 3-5 associated quotes, and the system MUST randomly select one quote each time the personality is displayed
- **FR-005**: Personality quotes MUST support template token interpolation (`{n}`, `{max}`, `{count}`, `{minutes}`, `{avg}`, `{preview}`, `{item}`, `{items}`) replaced with actual computed values at render time
- **FR-006**: The personality card MUST appear at the top of the My Progress drawer, above the Rating Timeline, when the user qualifies
- **FR-007**: The personality card MUST NOT appear when the event is in `created` state
- **FR-008**: The personality card MUST appear when the event is in `started`, `paused`, or `completed` state (provided the user qualifies)
- **FR-009**: The system MUST track the user's previous personality type per event session and display a "Previously: [name]" line when the personality changes between drawer openings
- **FR-010**: Previous personality tracking MUST be ephemeral (session-scoped, not persisted to backend)
- **FR-011**: The Similar Users drawer MUST display each matched user's personality name as a subtitle alongside their name and common item count, when that user qualifies
- **FR-012**: The Similar Users detail view MUST display the matched user's personality name and a randomly selected quote when that user qualifies
- **FR-013**: The Dashboard Summary tab MUST display a "Tasting Personalities" section listing all qualifying participants with their display name and personality name
- **FR-014**: The Dashboard "Tasting Personalities" section MUST NOT be displayed when no participants qualify
- **FR-015**: Tapping a participant row in the Dashboard "Tasting Personalities" section MUST open the User Details drawer for that participant
- **FR-016**: Personality detection rules that depend on a "middle" rating value MUST be excluded when the rating scale has no middle (e.g., `maxRating: 2`)
- **FR-017**: Speed-based personality detection (The Speedrun, The Philosopher) MUST measure speed as the elapsed time from earliest to latest rating timestamp divided by (unique items rated minus 1), representing the average interval between ratings — not per-consecutive-rating gaps
- **FR-018**: Personality detection MUST return `null` (no personality) when the user has not met the minimum rating threshold
- **FR-019**: Quote content for the initial release MUST be written for wine events, using wine-specific terminology (wines, grapes, palate, etc.)
- **FR-020**: Personality type identifiers and detection logic MUST be event-type-agnostic, allowing future addition of content for other event types without changes to detection
- **FR-021**: The personality feature MUST be completely hidden for non-wine events — no personality card in My Progress, no personality subtitles in Similar Users, and no Tasting Personalities section on the Dashboard. The feature activates only when the event's item type is "wine"
- **FR-022**: When a guest first qualifies for a personality (crosses the minimum rating threshold), the My Progress button on the event page MUST display a subtle visual indicator (e.g., small dot badge) signaling new content is available
- **FR-023**: The visual indicator on the My Progress button MUST be cleared once the guest opens the My Progress drawer and views their personality card
- **FR-024**: The visual indicator MUST NOT reappear for subsequent personality shifts — it is a one-time discovery cue for the initial personality assignment only
- **FR-025**: No new API endpoints are required — personality data MUST be added as a field to existing API responses (dashboard user summaries and similar users)
- **FR-026**: No new database entities are required — personality MUST be computed from existing rating data at query time

### Key Entities

- **Tasting Personality**: A humorous label assigned to a user based on their rating patterns. Defined by a type identifier (e.g., `simon-cowell`), a display name (e.g., "The Simon Cowell"), and a pool of 3-5 quotes. Computed from rating data — not stored.
- **Personality Detection Input**: The set of data needed to compute a personality: chronological rating values, rating distribution, average rating, total ratings count, total available items, max rating, note count, and rating timestamps. Derived from existing rating data already available in the system.
- **Personality Quote**: A short, humorous text string associated with a personality type. May contain template tokens (`{avg}`, `{items}`, etc.) that are interpolated at display time. Organized as a content file keyed by personality type identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guest who qualifies for a personality sees their personality card within the existing drawer load time — personality detection completes in under 1ms for typical event sizes (≤ 20 items)
- **SC-002**: Every qualifying user across all three surfaces (My Progress, Similar Users, Dashboard) is assigned the same personality for the same set of ratings — consistency across surfaces
- **SC-003**: Personality quotes are tonally consistent with the existing suggested wine notes — validated by reviewing all personality quotes alongside the existing quote corpus
- **SC-004**: The personality card does not introduce layout shift, overflow, or visual jank in the My Progress drawer at any screen width the app currently supports
- **SC-005**: Personality shift detection correctly identifies when a user's personality changes and displays the "Previously" line — verified by rating items that change the detected pattern
- **SC-006**: Other users' personality names are visible in the Similar Users drawer without requiring any additional API calls beyond the existing similar users fetch
- **SC-007**: The Dashboard "Tasting Personalities" section accurately lists all qualifying participants — verified by cross-referencing with individual user ratings
- **SC-008**: Screen reader users can access personality names and quotes through the standard reading order in all three surfaces
- **SC-009**: The feature adds no new API endpoints and no new database entities — verified by inspection of the API route definitions and data schema
