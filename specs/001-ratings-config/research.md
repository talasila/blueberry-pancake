# Research: Ratings Configuration

**Feature**: Ratings Configuration  
**Date**: 2025-01-27  
**Purpose**: Document technical decisions and research findings

## Technical Decisions

### Color Picker Component

**Decision**: Use HTML5 color input (`<input type="color">`) for color selection, with optional hex text input for manual entry.

**Rationale**: 
- Native browser support, no additional dependencies
- Works well on mobile devices
- Provides visual color picker interface
- Can be styled with CSS to match design system
- Supports hex format natively
- Simple integration with React

**Alternatives Considered**:
- Third-party color picker libraries (react-color, @uiw/react-color-picker) - Rejected: Adds dependency, native input is sufficient for this use case
- Custom color picker component - Rejected: Unnecessary complexity, native input provides required functionality

### Color Format Conversion

**Decision**: Use JavaScript built-in color conversion utilities or simple regex-based parsing to convert RGB/HSL input to hex format for storage.

**Rationale**:
- Hex format is standard for web applications
- Simple conversion logic can be implemented inline or as utility function
- No additional dependencies required
- Consistent storage format simplifies validation and display

**Implementation Approach**:
- Accept hex input directly (validate format: `#RRGGBB` or `#RGB`)
- For RGB input (e.g., `rgb(255, 59, 48)`), parse and convert to hex
- For HSL input (e.g., `hsl(4, 100%, 60%)`), convert to RGB then to hex
- Store all colors as hex codes (e.g., `#FF3B30`)

**Alternatives Considered**:
- Store in original format - Rejected: Inconsistent storage, harder to validate and display
- Use color library (color, chroma-js) - Rejected: Adds dependency for simple conversion, can be implemented with built-in JavaScript

### Default Rating Presets Structure

**Decision**: Define default rating presets as a static configuration object in EventService, keyed by maxRating value.

**Rationale**:
- Centralized default definitions
- Easy to maintain and extend
- Can be used for both initialization and reset operations
- Follows existing pattern of default values in EventService

**Structure**:
```javascript
const DEFAULT_RATING_PRESETS = {
  2: [
    { value: 1, label: "Poor", color: "#FF3B30" },
    { value: 2, label: "Good", color: "#28A745" }
  ],
  3: [
    { value: 1, label: "Poor", color: "#FF3B30" },
    { value: 2, label: "Average", color: "#FFCC00" },
    { value: 3, label: "Good", color: "#34C759" }
  ],
  4: [
    { value: 1, label: "What is this crap?", color: "#FF3B30" },
    { value: 2, label: "Meh...", color: "#FFCC00" },
    { value: 3, label: "Not bad...", color: "#34C759" },
    { value: 4, label: "Give me more...", color: "#28A745" }
  ]
};
```

**Alternatives Considered**:
- Store defaults in separate config file - Rejected: Over-engineering, defaults are code-level constants
- Generate defaults dynamically - Rejected: Less maintainable, harder to customize specific presets

### Optimistic Locking Pattern

**Decision**: Reuse existing optimistic locking pattern from event state transitions for rating configuration updates.

**Rationale**:
- Pattern already established and tested in codebase
- Consistent approach across event configuration updates
- Prevents concurrent modification conflicts
- Uses event `updatedAt` timestamp for version checking

**Implementation Approach**:
- Check event `updatedAt` timestamp before saving rating configuration
- If event was modified by another admin, reject with 409 Conflict error
- Client displays error message prompting user to refresh and retry
- Follows same pattern as `transitionEventState` method

**Alternatives Considered**:
- First write wins (reject all subsequent writes) - Rejected: Less user-friendly, optimistic locking allows last write after refresh
- Allow concurrent edits to different fields - Rejected: Rating configuration is atomic, partial updates could create inconsistent state

### Rating Configuration Data Structure

**Decision**: Store rating configuration as `ratingConfiguration` object in event config, similar to `itemConfiguration` pattern.

**Rationale**:
- Follows existing event configuration pattern
- Consistent with other event configuration objects
- Simple structure that's easy to validate and query
- Default values can be applied when not configured

**Structure**:
```json
{
  "ratingConfiguration": {
    "maxRating": 4,
    "ratings": [
      { "value": 1, "label": "What is this crap?", "color": "#FF3B30" },
      { "value": 2, "label": "Meh...", "color": "#FFCC00" },
      { "value": 3, "label": "Not bad...", "color": "#34C759" },
      { "value": 4, "label": "Give me more...", "color": "#28A745" }
    ]
  }
}
```

**Alternatives Considered**:
- Separate endpoints/files for rating configuration - Rejected: adds complexity, event config is already centralized
- Storing ratings as object keyed by value - Rejected: array is easier to iterate and maintain order, consistent with sequential rating values

### Validation Strategy

**Decision**: Validate on both client and server, with server as source of truth. Client validation provides immediate feedback (on blur and submit), server validation ensures security and data integrity.

**Rationale**:
- Client-side validation improves UX with immediate feedback
- Server-side validation is required for security and data integrity
- Follows existing validation patterns in the codebase (e.g., event name, email validation)
- Validation timing (blur + submit) provides good balance of feedback without being intrusive

**Alternatives Considered**:
- Client-only validation - Rejected: security risk, no guarantee of data integrity
- Server-only validation - Rejected: poor UX, users must submit to see errors
- Real-time validation as user types - Rejected: too intrusive, blur + submit provides better balance

### iOS Color Definitions

**Decision**: Use standard iOS color hex values as defaults:
- iOS Red: `#FF3B30`
- iOS Yellow: `#FFCC00`
- iOS light green: `#34C759`
- iOS dark green: `#28A745`

**Rationale**:
- Matches user specification
- Standard iOS design system colors
- Well-documented and consistent
- Good contrast for accessibility

**Alternatives Considered**:
- Custom color palette - Rejected: User specified iOS colors
- Material Design colors - Rejected: User specified iOS colors

