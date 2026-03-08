# Feature Specification: Event Theme Presets

**Feature Branch**: `026-event-theme-presets`  
**Created**: 2026-03-08  
**Status**: Draft  
**Input**: User description: "Allow event administrators to select a visual theme preset when creating an event, giving each event a distinctive look and feel. The system provides a curated set of mood-based presets (e.g., 'Classic Cellar' — warm burgundy tones; 'Garden Party' — fresh greens; 'Golden Hour' — warm amber; 'Midnight Tasting' — deep navy; 'Rosé All Day' — soft pink). Each preset defines an accent color, surface color, optional header background, optional background gradient, and an optional emoji. A 'Classic' preset matching the current app appearance serves as the default. On the Create Event page, a 'Mood' picker displays all available presets as tappable cards showing the preset name, a short description, an emoji (if any), and small color swatches previewing the palette. The admin selects one preset; 'Classic' is pre-selected if no choice is made. The selected theme is stored as a single string identifier on the event. The backend validates that the value is a recognized preset ID. Events created before this feature have no theme field and default to the 'Classic' preset with no visual change — full backward compatibility. On the frontend, the theme propagates via CSS custom properties scoped to the event layout wrapper. Components consume these variables with fallbacks to the current design tokens, so un-themed events are visually identical to today. The theme affects: the header bar background, unrated item button surface color on the event page, the page background (subtle gradient for presets that define one), the guest welcome bottom sheet surface, the event name display in the header (prefixed with the preset's emoji if one exists), and event cards on the My Events page (accent-colored left border or tinted background per event's theme). Rating colors from ratingConfiguration are NOT overridden by the theme — they remain independent functional colors. The theme is purely cosmetic and does not alter layout, component structure, or behavior. Admins can change the theme on the Event Admin page while the event is in 'created' state. Once the event is started, the theme is locked to prevent mid-experience visual shifts for participants."

## Clarifications

### Session 2026-03-08

- Q: Should the theme lock (preventing changes after "created" state) be enforced server-side, or is frontend-only enforcement sufficient? → A: Backend MUST reject theme update requests when the event is not in "created" state. Server-side enforcement is required in addition to frontend enforcement.
- Q: Should the theme also affect drawer surfaces (rating drawer, item details drawer, similar users drawer), or only the touchpoints listed in FR-012? → A: Drawers remain neutral. The theme does NOT affect rating drawer, item details drawer, or similar users drawer surfaces. These contain functional content where tinted backgrounds could reduce readability or clash with rating colors.
- Q: Should the post-creation welcome bottom sheet (spec 020) also adopt the event's theme styling? → A: Yes. The post-creation welcome bottom sheet adopts the event's theme (surface color, accent on buttons). This provides immediate visual confirmation that the theme selection worked.
- Q: Should the post-creation welcome bottom sheet include a "change theme" row in its "Customize first" section? → A: No. The theme was just selected on the creation form, and the welcome bottom sheet is already themed — adding a change-theme row would be redundant. The admin page theme section (Story 4) is sufficient for post-creation changes.
- Q: How should the mood picker card convey what a theme looks like? → A: Self-styled cards. Each picker card's own background, border, and text colors use the theme's actual palette, so the card itself IS the preview. The card demonstrates the theme by being an example of it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Theme Selection at Event Creation (Priority: P1)

An administrator creates a new event and sees a "Mood" picker on the Create Event page below the existing event name and type fields. The picker displays a set of curated theme presets as tappable cards arranged in a grid. Each card is self-styled using the theme's own palette — its background, border, and text colors demonstrate the preset's look. The card also shows the preset's name, a short description of its character, and an emoji (if the preset includes one). The "Classic" preset — which matches the app's current neutral appearance — is pre-selected by default.

The admin taps a preset card to select it. The selected card shows a clear visual indicator (highlighted border or ring). The admin can change their selection freely before submitting. When the admin submits the form, the selected theme identifier is sent along with the event name and type, and the newly created event stores the theme selection.

If the admin does not interact with the mood picker at all, the event is created with the "Classic" theme, preserving today's look with no action required.

**Why this priority**: This is the entry point for the entire feature. Without the ability to select and store a theme at creation time, no other theme functionality has value. It must be built first and delivers the foundational data model change.

**Independent Test**: Can be fully tested by navigating to the Create Event page, verifying the mood picker is visible with all presets, selecting different presets, creating the event, and confirming the theme identifier is stored on the event data.

**Acceptance Scenarios**:

1. **Given** an authenticated admin is on the Create Event page, **When** the page loads, **Then** a "Mood" picker section is displayed below the existing event name and type fields, showing all available theme presets as tappable cards.
2. **Given** the mood picker is displayed, **When** the admin has not interacted with it, **Then** the "Classic" preset is pre-selected with a visible selection indicator.
3. **Given** the mood picker is displayed, **When** the admin views a preset card, **Then** the card itself is styled using the theme's palette (background, border, and text colors match the preset), and they see the preset's name, a short description, and an emoji (if the preset defines one) — the card IS the preview.
4. **Given** the mood picker is displayed, **When** the admin taps a preset card, **Then** that card becomes selected with a visible selection indicator and any previously selected card is deselected.
5. **Given** the admin has selected a theme preset and filled in the event name, **When** they submit the form, **Then** the event is created with the selected theme identifier stored on the event.
6. **Given** the admin has not interacted with the mood picker, **When** they submit the form, **Then** the event is created with the "Classic" theme as the default.
7. **Given** the admin selects a theme and then changes their mind, **When** they tap a different preset card, **Then** the selection updates to the newly tapped preset before submission.
8. **Given** the admin submits the form with an invalid or unrecognized theme value (e.g., through tampering), **When** the system processes the request, **Then** the event creation is rejected with an appropriate error message.

---

### User Story 2 — Themed Event Experience for Participants (Priority: P1)

A participant (guest or admin) navigates to an event that has a theme preset selected. The event's visual appearance is transformed by the theme — the header bar picks up the theme's background tint, unrated item buttons on the event page use the theme's surface color instead of the default gray, the page background shows a subtle gradient (for presets that define one), and the guest welcome bottom sheet uses the theme's surface color. If the theme includes an emoji, it is displayed as a prefix to the event name in the header.

The themed appearance is consistent across all pages within the event context (event page, profile page, dashboard, admin page). Rated item buttons continue to use their rating-specific colors from the event's rating configuration — the theme does not override these functional colors.

**Why this priority**: This is the payoff — without visible theming on the event pages, selecting a theme at creation would have no user-facing value. This story delivers the visual differentiation that is the core purpose of the feature.

**Independent Test**: Can be fully tested by creating events with different theme presets, navigating to each event as both admin and guest, and verifying that the header, item buttons, page background, bottom sheets, and emoji display all reflect the selected theme. Additionally, verify that an event with the "Classic" theme looks identical to the current un-themed experience.

**Acceptance Scenarios**:

1. **Given** an event has a non-default theme preset selected, **When** a participant navigates to the event page, **Then** the header bar background reflects the theme's header tint (or the theme's accent color if no specific header background is defined).
2. **Given** an event has a theme with an emoji, **When** a participant views the header, **Then** the event name is prefixed with the theme's emoji (e.g., "🍷 Bordeaux Night").
3. **Given** an event has a theme preset selected, **When** a participant views the event page with unrated items, **Then** unrated item buttons display the theme's surface color instead of the default neutral gray.
4. **Given** an event has a theme with a gradient defined, **When** a participant views the event page, **Then** the page background shows a subtle gradient using the theme's gradient colors.
5. **Given** an event has a theme preset selected, **When** a guest sees the welcome bottom sheet, **Then** the bottom sheet's surface uses the theme's surface color.
6. **Given** a participant has rated an item, **When** they view the rated item button on the event page, **Then** the button displays the rating color from the event's rating configuration, NOT the theme's accent color — rating colors are independent of the theme.
7. **Given** an event has the "Classic" (default) theme, **When** a participant navigates to the event, **Then** the visual appearance is identical to the current un-themed experience — no visual changes whatsoever.
8. **Given** an event was created before this feature existed and has no theme field, **When** a participant navigates to the event, **Then** the system treats it as having the "Classic" theme and the appearance is unchanged.
9. **Given** an event has a theme preset selected, **When** a participant navigates between event sub-pages (event page, profile, dashboard, admin), **Then** the themed appearance is consistent across all pages within the event context.

---

### User Story 3 — Themed Event Cards on My Events Page (Priority: P2)

An administrator navigates to the My Events page and sees their list of events. Each event card incorporates the event's theme — either through an accent-colored left border or a subtly tinted card background using the theme's accent color. If the theme includes an emoji, it is displayed alongside the event name on the card.

This allows administrators who manage multiple events to visually distinguish them at a glance, reinforcing each event's identity even outside the event context.

**Why this priority**: This enhances the admin's event management experience but is not required for the core theme feature to function. Events are already distinguishable by name and state — theme adds a visual layer on top.

**Independent Test**: Can be fully tested by creating multiple events with different theme presets, navigating to the My Events page, and verifying that each event card reflects its respective theme through accent coloring and emoji display.

**Acceptance Scenarios**:

1. **Given** an admin has multiple events with different theme presets, **When** they view the My Events page, **Then** each event card displays a visual indicator of its theme (accent-colored left border or tinted background).
2. **Given** an event has a theme with an emoji, **When** the admin views its card on My Events, **Then** the emoji is displayed alongside the event name.
3. **Given** an event has the "Classic" (default) theme or no theme field, **When** the admin views its card on My Events, **Then** the card appears with the current default styling — no accent coloring or emoji.
4. **Given** an admin views the My Events page, **When** they scan the list, **Then** each event's theme indicator is visually distinct enough to differentiate events at a glance.

---

### User Story 4 — Theme Editing on the Admin Page (Priority: P2)

An administrator navigates to the Event Admin page for an event that is in "created" state. They see a theme section displaying the currently selected preset with the same card-style presentation used on the Create Event page. The admin can tap a different preset to change the theme. The change is saved and immediately reflected in the event's appearance.

Once the event transitions to "started" (or any subsequent state), the theme section becomes read-only — the current theme is displayed but cannot be changed. This prevents mid-experience visual shifts that would disorient participants who have already seen the event.

**Why this priority**: This provides flexibility for admins who want to adjust the theme after initial creation but before going live. It depends on the creation-time picker (Story 1) and the visual theming (Story 2) being in place first.

**Independent Test**: Can be fully tested by creating an event with a theme, navigating to the admin page in "created" state, changing the theme, verifying the change is saved and visually applied, then starting the event and confirming the theme can no longer be changed.

**Acceptance Scenarios**:

1. **Given** an admin is on the Event Admin page and the event is in "created" state, **When** they view the theme section, **Then** they see the currently selected theme preset displayed as a card, and other presets are available for selection.
2. **Given** the event is in "created" state, **When** the admin taps a different theme preset, **Then** the theme is updated, the change is saved, and the event's appearance immediately reflects the new theme.
3. **Given** the event has transitioned to "started" state, **When** the admin views the theme section on the admin page, **Then** the current theme is displayed as read-only with a clear indication that it cannot be changed (e.g., a note such as "Theme is locked after the event starts").
4. **Given** the event is in "paused" or "completed" state, **When** the admin views the theme section, **Then** the theme is displayed as read-only and cannot be changed.
5. **Given** the admin changes the theme while in "created" state, **When** they refresh the page or navigate away and back, **Then** the updated theme persists.

---

### User Story 5 — Backward Compatibility (Priority: P1)

Events that were created before this feature was introduced do not have a `theme` field in their stored data. The system gracefully handles these events by treating a missing or absent theme as the "Classic" preset. No migration is needed — the system applies the default at read time.

The "Classic" preset is specifically designed to produce zero visual change compared to the current application appearance. This ensures that all existing events continue to look and behave exactly as they do today with no action from administrators.

**Why this priority**: Without backward compatibility, deploying this feature would visually break every existing event. This is a non-negotiable foundation that must be guaranteed from day one.

**Independent Test**: Can be fully tested by accessing existing events that predate the feature and verifying that their appearance is pixel-identical to the current experience, and that no errors occur from the missing theme field.

**Acceptance Scenarios**:

1. **Given** an event was created before the theme feature existed and has no theme field, **When** any user navigates to that event, **Then** the system treats it as having the "Classic" theme and the appearance is identical to the current experience.
2. **Given** an event has no theme field, **When** the admin views the Event Admin page, **Then** the theme section shows "Classic" as the current selection and allows the admin to change it (if the event is in "created" state).
3. **Given** an event has no theme field, **When** the event data is returned by the API, **Then** no error occurs — the missing field is handled gracefully without requiring a data migration.
4. **Given** the "Classic" preset is applied (explicitly or by default), **When** any user views the event, **Then** the visual appearance is indistinguishable from an event rendered before this feature existed.

---

### Edge Cases

- What happens if an admin creates an event with a valid theme and the preset is later removed from the curated set in a future update? The system should fall back to the "Classic" preset for any unrecognized theme identifier, ensuring the event remains fully functional and visually consistent.
- What happens if a participant views the event on a browser that does not support CSS custom properties? The fallback values in the design tokens ensure the app renders with the default "Classic" appearance. No broken visuals occur.
- What happens if the admin rapidly switches between themes on the admin page? Each tap should update the selection; only the final saved value persists. No race conditions or partial states should occur.
- What happens if two administrators for the same event both try to change the theme simultaneously? Standard last-write-wins applies — the most recently saved theme is what the event displays. No conflict resolution is needed since theme is a single atomic field.
- What happens if the admin taps outside the mood picker without selecting a preset? The pre-selected "Classic" theme remains in effect — no null or empty theme value is possible.
- What happens if the event's theme is set to a dark/moody preset and the participant's device is in dark mode? Each theme preset includes both a light-mode and a dark-mode variant. The system detects the user's preference and applies the appropriate variant. For example, "Midnight Tasting" has a dark palette in light mode and an even deeper palette in dark mode — both intentionally designed. The "Classic" preset's dark variant matches the app's current dark mode appearance exactly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a curated set of at least five theme presets plus one default preset. The initial set MUST include: "Classic" (default — matches current app appearance), "Classic Cellar" (warm burgundy), "Garden Party" (fresh green), "Golden Hour" (warm amber), "Midnight Tasting" (deep navy), and "Rosé All Day" (soft pink).
- **FR-002**: Each theme preset MUST define at minimum: a unique string identifier, a display name, a short description, and an accent color. Presets MAY optionally define: a surface color, a header background color, a background gradient (two colors), and an emoji. Each preset MUST include both a light-mode variant and a dark-mode variant of all its color values.
- **FR-003**: The "Classic" preset MUST produce visual output identical to the current application appearance when no theme feature exists. It MUST NOT alter any existing colors, backgrounds, or visual elements.
- **FR-004**: The Create Event page MUST display a "Mood" picker section showing all available theme presets as tappable cards in a grid layout.
- **FR-005**: Each preset card in the mood picker MUST be self-styled using the theme's own palette — the card's background, border, and text colors use the preset's actual color values, so the card itself serves as a visual preview of the theme. Each card MUST also display the preset's name, short description, and emoji (if defined).
- **FR-006**: The "Classic" preset MUST be pre-selected by default when the Create Event page loads.
- **FR-007**: The admin MUST be able to select exactly one theme preset at a time. Selecting a new preset MUST deselect the previous one.
- **FR-008**: The selected preset card MUST show a clear visual selection indicator (e.g., highlighted border or focus ring) distinguishing it from unselected presets.
- **FR-009**: The selected theme identifier MUST be submitted with the event creation request and stored on the event.
- **FR-010**: The backend MUST validate that the submitted theme identifier is a recognized preset ID. Unrecognized values MUST be rejected with an appropriate error.
- **FR-011**: Events created without a theme field (pre-existing events) MUST default to the "Classic" preset at read time. No data migration is required.
- **FR-012**: The theme MUST visually affect the following touchpoints within the event context: the header bar background, unrated item button surface color, the event page background (gradient for presets that define one), the guest welcome bottom sheet surface color, and the post-creation welcome bottom sheet (surface color and accent on action buttons). The post-creation welcome bottom sheet provides the admin's first visual confirmation that their theme selection has been applied. The post-creation welcome bottom sheet MUST NOT add a "change theme" row to its "Customize first" section — the theme was just selected during creation, and the admin page theme section is the designated place for post-creation changes.
- **FR-013**: If a theme preset defines an emoji, the emoji MUST be displayed as a prefix to the event name in the header bar.
- **FR-014**: Event-specific rating colors from the rating configuration MUST NOT be overridden or affected by the theme. Rating colors remain independent functional indicators.
- **FR-014a**: The theme MUST NOT affect the surfaces of interactive drawers (rating drawer, item details drawer, similar users drawer). These drawers MUST retain their default neutral styling regardless of the event's theme, to preserve readability and avoid clashing with functional rating colors.
- **FR-015**: The theme MUST be purely cosmetic — it MUST NOT alter page layout, component structure, navigation, or application behavior.
- **FR-016**: The themed appearance MUST be consistent across all pages within the event context (event page, profile page, dashboard page, admin page).
- **FR-017**: On the My Events page, each event card MUST incorporate the event's theme through an accent-colored visual indicator (such as a left border or tinted background) and display the theme's emoji (if defined) alongside the event name.
- **FR-018**: The Event Admin page MUST display a theme section showing the currently selected preset.
- **FR-019**: When the event is in "created" state, the theme section on the admin page MUST allow the admin to change the theme by selecting a different preset, with the change saved and immediately reflected.
- **FR-020**: When the event is in "started," "paused," or "completed" state, the theme section on the admin page MUST be read-only. The current theme is displayed but cannot be changed. The backend MUST also reject any API request to update the theme when the event is not in "created" state, returning an appropriate error. Frontend-only enforcement is not sufficient.
- **FR-021**: The read-only theme section MUST include a clear indication that the theme is locked (e.g., explanatory text such as "Theme is locked after the event starts").
- **FR-022**: If an event's stored theme identifier does not match any currently recognized preset (e.g., a preset was retired), the system MUST fall back to the "Classic" preset without error.
- **FR-023**: The theme MUST be applied via scoped styling with fallbacks, ensuring that if theme-specific values are unavailable, the default design tokens are used. This guarantees no visual regression for un-themed or "Classic" themed events.
- **FR-024**: Each theme preset MUST include both a light-mode and a dark-mode variant of its color palette. The system MUST detect the user's display preference and apply the corresponding variant automatically.
- **FR-025**: The "Classic" preset's dark-mode variant MUST match the app's current dark mode appearance exactly, ensuring zero visual change for existing events when viewed in dark mode.

### Key Entities

- **Theme Preset**: A curated visual mood definition. Contains a unique string identifier, a display name, a short description, an accent color, and optionally: a surface color, header background color, background gradient, and emoji. Presets are defined and maintained as a fixed set — they are not user-created. The preset identifier is what gets stored on the event.

- **Event Theme Field**: A single string identifier stored on the event record, referencing one of the available theme presets. Optional — events without this field default to "Classic." Mutable only while the event is in "created" state; read-only in all other states.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created events have a theme preset stored, either explicitly selected by the admin or defaulted to "Classic" — no events are created with a null or invalid theme.
- **SC-002**: Participants viewing a themed event see the theme applied consistently across all event pages (header, event page, bottom sheets, profile, dashboard) with zero visual inconsistencies between pages.
- **SC-003**: Events created before the feature was introduced display identically to their pre-feature appearance — zero visual regression for existing events.
- **SC-004**: Admins can select a theme during event creation in a single tap, adding no more than 5 seconds to the event creation flow.
- **SC-005**: Admins managing multiple events on the My Events page can visually distinguish themed events at a glance through per-event accent coloring and emoji display.
- **SC-006**: Theme changes on the admin page (in "created" state) are reflected immediately — the updated theme is visible without page refresh.
- **SC-007**: Once an event transitions past "created" state, the theme cannot be changed by any user, preventing mid-experience visual disruption for participants.
- **SC-008**: Rating button colors remain unaffected by the theme in 100% of cases — functional rating colors are never overridden by theme styling.

## Assumptions

- The set of theme presets is curated and maintained by the development team. Administrators cannot create custom themes or define their own colors. This keeps the feature simple and ensures every preset meets accessibility contrast requirements.
- Theme preset definitions (names, colors, descriptions, emoji) are stored and managed on the frontend. The backend only stores and validates the theme identifier string — it does not need to know the visual details of each preset.
- The existing design token system (CSS custom properties) provides a natural mechanism for scoped theme application with fallbacks. No architectural changes to the styling approach are required.
- The existing event creation flow submits event data via a single request. Adding a theme field to that request requires no changes to the request structure beyond including the new field.
- The "Classic" preset's visual output is defined to exactly match the current application appearance. This is verified during development, not by dynamic comparison — the preset's values are set to mirror the existing design tokens.
- Accessibility (contrast ratios) for each preset is the responsibility of the development team at preset creation time. Each preset must meet WCAG AA contrast requirements between its accent and accent-foreground colors in both light and dark variants. This is a design-time constraint, not a runtime check.
- Each theme preset includes both a light-mode and dark-mode variant. The system applies the correct variant based on the user's display preference. This means each preset effectively defines two coordinated palettes, but they share a single identifier and are selected as a unit — the admin does not choose light/dark variants separately.
