# Research: Privacy Policy Page

**Feature Branch**: `044-privacy-policy-page`
**Date**: 2026-03-24

## Summary

No NEEDS CLARIFICATION items exist in the technical context. This is a frontend-only feature adding a static content page and links to two existing pages. Research focused on confirming existing patterns to follow.

## Findings

### 1. Routing Pattern for Public Pages

**Decision**: Add `/privacy` as a top-level public route in `App.jsx`, outside any `ProtectedRoute` wrapper.

**Rationale**: Existing public pages (`/`, `/auth`, `/event/:eventId/email`) follow this exact pattern — they are direct `<Route>` elements without access control wrappers.

**Alternatives considered**:
- Nested route under a layout component — rejected, unnecessary complexity for a standalone page.

### 2. Page Layout Pattern

**Decision**: Use the standard Card-based centered layout (`flex items-center justify-center` + `max-w-md` container) consistent with LandingPage and EmailEntryPage.

**Rationale**: All standalone pages in the app follow this pattern. The privacy policy content fits naturally in a Card with sections rendered as headings and paragraphs.

**Alternatives considered**:
- Full-width prose layout without Card — rejected, inconsistent with app styling.

### 3. Privacy Link Placement on Existing Pages

**Decision**: Add a small text link below the Card component on EmailEntryPage and AuthPage, outside the form element.

**Rationale**: Both pages currently end with a Turnstile widget ref after the Card. Placing the privacy link as centered muted text below the Card (but within the max-width container) keeps it visible without disrupting the form layout. Using a React Router `<Link>` ensures client-side navigation and preserves form state on back-button return.

**Alternatives considered**:
- Inside CardFooter — rejected, neither page currently uses CardFooter and adding one changes the Card's visual structure.
- Inside CardContent below the submit button — rejected, clutters the form area.

### 4. Dark Mode Compatibility

**Decision**: Use Tailwind's `text-muted-foreground` for the privacy link text, which automatically adapts to light/dark themes via CSS variables.

**Rationale**: The existing color system uses CSS variables that switch between light and dark themes. No additional dark mode handling is needed.

**Alternatives considered**: None — this is the standard approach in the codebase.
