# Quick Start: Landing Page Feature

**Feature**: Landing Page (002-landing-page)  
**Date**: 2025-01-27

## Overview

This guide helps developers quickly understand and work with the landing page feature. This is a view-only React component that displays three interactive UI elements with no functional behavior.

## Feature Summary

- **Component**: Landing page with event ID input + Join button, Create button, and Sign in button
- **Behavior**: View-only - all buttons provide visual feedback but no functional actions
- **Location**: `frontend/src/pages/LandingPage.jsx` (or `frontend/src/components/LandingPage.jsx`)

## Prerequisites

- Node.js >=22.12.0
- Frontend dependencies installed: `cd frontend && npm install`
- Development server running: `npm run dev` (runs on http://localhost:3000)

## Component Structure

```
LandingPage Component
├── Event ID Input Field (controlled input)
├── Join Button (onClick with no-op handler)
├── Create Button (onClick with no-op handler)
└── Sign In Button (onClick with no-op handler)
```

## Key Requirements

1. **FR-001 to FR-004**: All three UI elements must be visible
2. **FR-005**: Buttons must provide visual feedback (hover, click states)
3. **FR-006**: No navigation, API calls, or functional actions on button click
4. **FR-007**: No validation or processing of event ID input
5. **FR-008**: All elements displayed simultaneously

## Implementation Checklist

- [ ] Create LandingPage component in `frontend/src/pages/` or `frontend/src/components/`
- [ ] Add event ID input field (controlled React input)
- [ ] Add Join button with onClick handler (preventDefault, no navigation)
- [ ] Add Create button with onClick handler (preventDefault, no navigation)
- [ ] Add Sign In button with onClick handler (preventDefault, no navigation)
- [ ] Apply Tailwind CSS classes for styling (use existing theme)
- [ ] Ensure responsive design (320px to 2560px width)
- [ ] Add visual feedback states (hover, active) via Tailwind
- [ ] Update React Router to use LandingPage component at root route "/"
- [ ] Write unit tests (Vitest) for component rendering
- [ ] Write E2E tests (Playwright/Cucumber) for user scenarios

## Testing

### Unit Tests
```bash
cd frontend
npm test
```

Test coverage:
- Component renders all three UI elements
- Input field accepts text input
- Buttons provide visual feedback
- No functional actions triggered

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

Test scenarios (from spec.md):
- User Story 1: Event ID input and Join button visible and interactive
- User Story 2: Create button visible and interactive
- User Story 3: Sign In button visible and interactive

## Styling Guidelines

- Use Tailwind CSS utility classes only (no inline styles)
- Follow existing theme configuration from `tailwind.config.js`
- Use responsive breakpoints: xs (320px), sm (640px), md (768px), lg (1024px)
- Ensure accessibility: keyboard navigation, focus states, ARIA labels if needed

## Common Patterns

### Controlled Input
```jsx
const [eventId, setEventId] = useState('');

<input
  type="text"
  value={eventId}
  onChange={(e) => setEventId(e.target.value)}
  placeholder="Enter event ID"
/>
```

### Button with Visual Feedback Only
```jsx
<button
  onClick={(e) => {
    e.preventDefault();
    // No functional action - visual feedback handled by CSS
  }}
  className="hover:bg-primary/90 active:scale-95 transition-all"
>
  Join
</button>
```

## Success Criteria Verification

- **SC-001**: Page load <2 seconds - verify with browser DevTools
- **SC-002**: Button interaction feedback <100ms - verify with CSS transitions
- **SC-003**: No functional actions - verify with E2E tests and browser network tab
- **SC-004**: Responsive design - test across viewport sizes
- **SC-005**: Input handles 1000 characters - test with long text input

## Related Files

- Specification: `specs/002-landing-page/spec.md`
- Implementation Plan: `specs/002-landing-page/plan.md`
- Research: `specs/002-landing-page/research.md`
- Frontend App: `frontend/src/App.jsx`
- Tailwind Config: `frontend/tailwind.config.js`

## Next Steps

After implementing this view-only feature:
1. Run tests to verify all requirements
2. Check responsive design across viewport sizes
3. Verify no network requests on button clicks
4. Proceed to `/speckit.tasks` to break down implementation into tasks
