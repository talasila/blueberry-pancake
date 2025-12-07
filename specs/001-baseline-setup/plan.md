# Implementation Plan: Baseline Project Setup

**Branch**: `001-baseline-setup` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-baseline-setup/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Establish baseline project infrastructure for a mobile-first web application managing blind tasting events. Setup includes: React frontend with shadcn UI, Node.js backend, file-based data storage with database abstraction layer, Playwright E2E testing with Gherkin, JWT/XSRF security, and caching layer. All configuration in JSON format with environment-specific support.

## Technical Context

**Language/Version**: JavaScript (ES2020+), Node.js 18+  
**Primary Dependencies**: React, Node.js, Express, shadcn UI, Tailwind CSS, Playwright, @cucumber/cucumber, Vitest, jsonwebtoken, csurf/csrf, node-cache, config package (reads JSON configuration files: default.json, development.json, staging.json, production.json)  
**Storage**: File-based (JSON config, CSV data) with database abstraction layer (Repository pattern) for future migration  
**Testing**: Playwright + Cucumber for E2E (Gherkin format), Vitest for unit tests  
**Target Platform**: Web browsers (mobile-first: iOS Safari, Chrome Mobile), Node.js server  
**Project Type**: web (frontend + backend)  
**Performance Goals**: Caching layer (node-cache) reduces file access by 50%, mobile-optimized payload sizes, responsive rendering on 320px-768px viewports  
**Constraints**: No database initially (file-based only), must support future database migration via Repository pattern abstraction, mobile network optimization required  
**Scale/Scope**: Initial setup for single application instance, event data stored in separate directories per event

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality (NON-NEGOTIABLE)
✅ **PASS**: Project structure will enforce clear separation of concerns (frontend/backend), modular architecture, and established patterns from the start.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)
✅ **PASS**: Using battle-tested libraries (React, shadcn UI, Playwright, JWT libraries) instead of custom implementations. Database abstraction layer promotes reuse.

### III. Maintainability
✅ **PASS**: Clear project structure, modular architecture, comprehensive documentation planned. Configuration management supports maintainability.

### IV. Testing Standards (NON-NEGOTIABLE)
✅ **PASS**: E2E testing infrastructure with Playwright and Gherkin is planned. Unit test framework will be selected during research phase.

### V. Security
✅ **PASS**: JWT authentication and XSRF protection are explicitly required. Security best practices will be followed.

### VI. User Experience Consistency
✅ **PASS**: shadcn UI library ensures consistent design system. Centralized styling approach (no inline styles) aligns with constitution.

### VII. Performance Requirements
✅ **PASS**: Caching layer requirement addresses performance. Mobile optimization is explicitly required.

**Overall Status**: ✅ **ALL GATES PASS** - No violations detected. Baseline setup aligns with all constitution principles.

### Post-Design Constitution Check

After Phase 1 design completion:

✅ **I. Code Quality**: Repository pattern and modular structure ensure clear separation of concerns. Configuration management follows established patterns.

✅ **II. DRY**: All technology choices use battle-tested packages (node-cache, jsonwebtoken, Vitest, etc.). No custom implementations where libraries exist.

✅ **III. Maintainability**: Clear project structure, documented data model, and abstraction layers support long-term maintainability.

✅ **IV. Testing Standards**: Comprehensive testing infrastructure (Vitest for unit, Playwright+Cucumber for E2E) established from the start.

✅ **V. Security**: JWT and XSRF libraries selected follow industry best practices. Security considerations integrated into design.

✅ **VI. User Experience Consistency**: shadcn UI + Tailwind CSS ensures centralized styling with no inline styles. Mobile-first approach established.

✅ **VII. Performance Requirements**: Caching layer (node-cache) designed to meet 50% reduction target. Mobile optimization strategy defined.

**Post-Design Status**: ✅ **ALL GATES PASS** - Design decisions align with all constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config/          # Configuration management
│   ├── data/            # Data access layer (abstracted)
│   ├── services/       # Business logic services
│   ├── api/            # API routes and middleware
│   ├── middleware/    # Express middleware (JWT, XSRF, etc.)
│   └── cache/         # Caching layer implementation
├── tests/
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests

frontend/
├── src/
│   ├── components/     # React components (shadcn UI integration)
│   ├── pages/          # Page components
│   ├── services/       # API client services
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   └── styles/        # Centralized styles (no inline styles)
├── tests/
│   └── e2e/            # Playwright E2E tests
│       ├── features/   # Gherkin .feature files
│       └── specs/      # Generated .spec files

data/                   # Event data directory (configurable path)
├── events/             # Event-specific directories
│   └── [event-id]/
│       ├── config.json # Event configuration
│       └── data.csv    # Event data

config/                 # Application configuration
└── app-config.json     # Main application configuration
```

**Structure Decision**: Web application structure selected (Option 2) with separate frontend and backend directories. Data directory is separate and configurable. Test directories organized by type (unit, integration, e2e). Frontend uses component-based React architecture with shadcn UI. Backend uses modular service architecture with abstracted data access layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
