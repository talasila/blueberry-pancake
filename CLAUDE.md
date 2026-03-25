# blueberry-pancake Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-24

## Active Technologies
- DynamoDB (via DynamoDBRepository) — user records in `event.users` map (035-guest-name-entry)
- DynamoDB (via DynamoDBRepository) — read-only access for public info (036-themed-entry-pages)
- JavaScript (ES Modules), Node.js >= 22.12.0 + React 19.2.1, Radix UI, Tailwind CSS 4.1.17 (037-guest-filter-redesign)
- N/A — no backend changes (037-guest-filter-redesign)
- JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1 + React 19.2.1, Radix UI, Tailwind CSS 4.1.17, lucide-reac (038-guide-redesign)
- N/A (static frontend content, reads existing event state from context) (038-guide-redesign)
- JavaScript (ES Modules), Node.js >= 22.12.0 + React 19.2.1 + Express 5.2.1, Radix UI, Tailwind CSS 4.1.17, lucide-reac (040-personality-toggle)
- DynamoDB (single-table design, nested `ratingConfiguration` object in event CONFIG item) (040-personality-toggle)
- JavaScript (ES Modules), Node.js >= 22.12.0 + React 19.2.1 + Express 5.2.1, Radix UI, Tailwind CSS 4.1.17, nanoid ^5.1.6 (already installed), jsonwebtoken (041-email-privacy-opaque-id)
- DynamoDB (single-table design, nested `users` map in event CONFIG item) (041-email-privacy-opaque-id)
- JavaScript (ES Modules), Node.js >= 22.12.0 + Express 5.2.1 (backend), React 19.2.1 (frontend) (042-structured-error-codes)
- DynamoDB (no schema changes needed) (042-structured-error-codes)
- JavaScript (ES Modules), Node.js >= 22.12.0 + Express 5.2.1 (backend), React 19.2.1 (frontend), jsonwebtoken, Radix UI, Tailwind CSS 4.1.17 (043-fix-pin-session-recovery)
- DynamoDB (single-table design) — refresh tokens stored as `REFRESH#{tokenHash}` items; localStorage for client-side session state (043-fix-pin-session-recovery)
- JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1 + React Router v6, Radix UI, Tailwind CSS 4.1.17, lucide-reac (044-privacy-policy-page)
- N/A — no backend or database changes (044-privacy-policy-page)
- JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1 + React Router 7.10.1, Radix UI (Button, Input), Tailwind CSS 4.1.17, lucide-react 0.556.0, class-variance-authority (045-landing-page-redesign)
- N/A — no backend or data changes (045-landing-page-redesign)

- JavaScript (ES Modules), Node.js >= 22.12.0 + React 19.2.1, Express 5.2.1, Radix UI, Tailwind CSS 4.1.17 (034-codebase-refactor)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

JavaScript (ES Modules), Node.js >= 22.12.0: Follow standard conventions

## Recent Changes
- 045-landing-page-redesign: Added JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1 + React Router 7.10.1, Radix UI (Button, Input), Tailwind CSS 4.1.17, lucide-react 0.556.0, class-variance-authority
- 044-privacy-policy-page: Added JavaScript (ES Modules), Node.js >= 22.12.0, React 19.2.1 + React Router v6, Radix UI, Tailwind CSS 4.1.17, lucide-reac
- 043-fix-pin-session-recovery: Added JavaScript (ES Modules), Node.js >= 22.12.0 + Express 5.2.1 (backend), React 19.2.1 (frontend), jsonwebtoken, Radix UI, Tailwind CSS 4.1.17


<!-- MANUAL ADDITIONS START -->

## System Documentation

For comprehensive system documentation (API endpoints, database schema, security mechanisms, caching strategies, component inventory, deployment config, etc.), see **[SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)**. Consult this document before making architectural decisions or changes that span multiple layers.

**Keeping it current:** After completing any significant change (new/modified API endpoints, new components or pages, database schema changes, security mechanism changes, new dependencies, config changes, or build/deployment updates), update the relevant sections in `SYSTEM_DOCUMENTATION.md` to reflect the changes. Do this as the final step before committing.

<!-- MANUAL ADDITIONS END -->
