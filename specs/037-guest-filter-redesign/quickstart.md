# Quickstart: Guest List Filter Redesign

**Feature**: 037-guest-filter-redesign
**Date**: 2026-03-19

## What This Feature Does

Replaces confusing filter labels on the admin People tab with a clear question-based segmented control, and reorganizes the layout so search + refresh are on one line and the filter is on the next.

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/pages/EventAdminPage.jsx` | Restructure filter area: move refresh icon next to search, add "{Item} registered?" label, rename filter options to "Any" / "Yes" / "No" |
| `frontend/tests/unit/EventAdminPage.test.jsx` | Update tests referencing old filter labels |

## How to Test Manually

1. Start dev server: `npm run dev`
2. Create a wine event and add some guests (some with bottles, some without)
3. Navigate to the admin page → People tab
4. **Verify label**: Should read "Bottle registered?" (not "Registered")
5. **Verify options**: Should show "Any", "Yes", "No" (not "All", "Registered", "Not registered")
6. **Verify "Any"**: Shows all guests (default)
7. **Verify "Yes"**: Shows only guests who have added at least one bottle
8. **Verify "No"**: Shows only guests who haven't added any bottles
9. **Verify layout**: Search field + refresh icon on first line, filter on second line
10. **Verify refresh**: Tapping refresh icon still refreshes the guest list
11. **Verify search + filter**: Type a name while "No" is selected — both constraints apply
