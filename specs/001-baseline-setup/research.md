# Research: Baseline Project Setup

**Date**: 2025-01-27  
**Feature**: Baseline Project Setup  
**Purpose**: Resolve technical decisions for project infrastructure setup

## 1. Caching Library Selection

### Decision: Use `node-cache` for in-memory file system caching

**Rationale**:
- Lightweight and simple for file system caching needs
- In-memory caching is appropriate for reducing file I/O operations
- Configurable TTL (time-to-live) supports requirement PERF-002
- No external dependencies (Redis/Memcached) needed for initial implementation
- Can be easily replaced with Redis later if needed for distributed scenarios

**Alternatives Considered**:
- **Redis**: Overkill for single-instance file caching, requires external service
- **Memcached**: Similar to Redis, adds complexity for initial setup
- **Custom implementation**: Violates DRY principle (battle-tested package exists)

**Implementation Notes**:
- Use TTL-based expiration for cached file contents
- Implement cache invalidation on file writes
- Monitor cache hit rates to validate 50% reduction target (SC-006)

## 2. Unit Test Framework Selection

### Decision: Use Vitest for unit testing

**Rationale**:
- Faster test execution than Jest (important for development velocity)
- Native ESM support aligns with modern JavaScript practices
- API compatible with Jest (familiar syntax, easy migration if needed)
- Better integration with modern build tools
- Lower overhead for JavaScript projects

**Alternatives Considered**:
- **Jest**: Mature ecosystem but slower, more complex setup for ESM
- **Mocha**: More manual configuration required, less feature-rich

**Implementation Notes**:
- Use Vitest for unit tests in both frontend and backend
- Playwright remains for E2E tests (separate concern)
- Configure Vitest to work with JavaScript (not TypeScript) per TS-003

## 3. Playwright with Gherkin Integration

### Decision: Use `@cucumber/cucumber` with Playwright for BDD testing

**Rationale**:
- Cucumber.js provides Gherkin support for JavaScript/Node.js
- Playwright provides browser automation
- Integration pattern: Cucumber step definitions call Playwright APIs
- Supports .feature files as required by TI-002
- Can generate .spec files from .feature files via build process

**Implementation Pattern**:
- `.feature` files in `frontend/tests/e2e/features/`
- Step definitions in `frontend/tests/e2e/step-definitions/`
- Playwright browser automation in step definitions
- Build script generates `.spec` files for CI/CD if needed

**Alternatives Considered**:
- **Playwright Test with custom Gherkin parser**: More complex, reinventing wheel
- **Cypress with Cucumber**: Playwright chosen for better mobile support

## 4. JWT and XSRF Security Implementation

### Decision: Use `jsonwebtoken` and `csurf` (or `csrf` package)

**Rationale**:
- `jsonwebtoken` is the standard, battle-tested JWT library for Node.js
- `csurf` (or `csrf`) provides XSRF token generation and validation
- Both follow industry best practices (SEC-003)
- Well-documented and widely used

**Best Practices to Implement**:
- JWT tokens: Short expiration times, secure storage (httpOnly cookies preferred over localStorage)
- XSRF tokens: Include in all POST/PUT/DELETE requests
- Token refresh mechanism for long-lived sessions
- Validate tokens on all state-changing endpoints (SEC-004)

**Alternatives Considered**:
- **Custom JWT implementation**: Violates DRY, security risk
- **Passport.js**: Overkill for JWT-only authentication initially

## 5. Database Abstraction Layer Pattern

### Decision: Repository pattern with interface-based abstraction

**Rationale**:
- Repository pattern provides clean separation between data access and business logic
- Interface-based design allows swapping implementations (file-based → database)
- Aligns with DS-005 and DS-006 requirements
- Common pattern, well-understood by developers

**Implementation Structure**:
```javascript
// Abstract interface
class DataRepository {
  async readEventConfig(eventId) { throw new Error('Not implemented'); }
  async writeEventConfig(eventId, config) { throw new Error('Not implemented'); }
  // ... other methods
}

// File-based implementation
class FileDataRepository extends DataRepository {
  // File system operations
}

// Future: Database implementation
class DatabaseDataRepository extends DataRepository {
  // Database operations
}
```

**Alternatives Considered**:
- **ORM approach (Sequelize/TypeORM)**: Too heavy for file-based storage, adds complexity
- **Direct file access**: No abstraction, violates DS-005 requirement

## 6. shadcn UI Setup and Mobile Optimization

### Decision: Use shadcn UI with Tailwind CSS, mobile-first responsive design

**Rationale**:
- shadcn UI is built on Tailwind CSS (centralized styling, no inline styles)
- Components are copy-paste (not npm package), allowing customization
- Tailwind provides mobile-first responsive utilities
- Aligns with UX consistency principle (no inline styles)

**Mobile Optimization Strategy**:
- Use Tailwind's responsive breakpoints (sm:, md:, lg:)
- Touch-friendly component sizes (minimum 44px touch targets)
- Optimize bundle size (tree-shaking, code splitting)
- Lazy load components where appropriate

**Implementation Notes**:
- Install shadcn UI via CLI: `npx shadcn-ui@latest init`
- Configure Tailwind for mobile-first breakpoints
- Use shadcn components as base, customize for mobile optimization
- Ensure all styles via Tailwind classes (no inline styles per constitution)

## 7. React + Node.js Project Structure

### Decision: Monorepo structure with separate package.json files

**Rationale**:
- Clear separation of frontend and backend dependencies
- Independent versioning and deployment possible
- Shared utilities can be extracted to common package if needed
- Standard pattern for full-stack JavaScript applications

**Structure**:
- `frontend/package.json` - React dependencies
- `backend/package.json` - Node.js dependencies
- Root `package.json` - Workspace scripts, shared dev dependencies

**Alternatives Considered**:
- **Single package.json**: Mixes frontend/backend deps, harder to manage
- **Separate repositories**: Overkill for single application

## 8. Configuration Management

### Decision: Use `config` package or custom JSON loader with environment support

**Rationale**:
- `config` package provides environment-based configuration (dev/staging/prod)
- Supports CFG-003 requirement
- Can watch for file changes (supports CFG-004 where feasible)
- Simple JSON structure for application config

**Structure**:
```
config/
├── default.json          # Base configuration
├── development.json       # Development overrides
├── staging.json          # Staging overrides
└── production.json       # Production overrides
```

**Alternatives Considered**:
- **Environment variables only**: Less flexible, harder to version control
- **Custom JSON parser**: Reinventing wheel, `config` package is battle-tested

## Summary of Technology Choices

| Category | Technology | Rationale |
|----------|-----------|-----------|
| Caching | `node-cache` | Lightweight, in-memory, configurable TTL |
| Unit Testing | Vitest | Fast, ESM support, Jest-compatible API |
| E2E Testing | Playwright + Cucumber | Gherkin support, mobile viewport testing |
| JWT | `jsonwebtoken` | Standard, battle-tested library |
| XSRF | `csurf` or `csrf` | Standard protection library |
| UI Library | shadcn UI + Tailwind | No inline styles, mobile-first |
| Config | `config` package | Environment support, file watching |

All choices align with constitution principles:
- ✅ DRY: Using battle-tested packages
- ✅ Code Quality: Standard, well-documented libraries
- ✅ Maintainability: Common patterns, clear structure
- ✅ Security: Industry-standard security libraries
- ✅ UX Consistency: Centralized styling via Tailwind
