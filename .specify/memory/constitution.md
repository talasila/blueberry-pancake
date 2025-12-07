<!--
Sync Impact Report:
Version change: N/A → 1.0.0 (initial constitution)
Modified principles: N/A (new constitution)
Added sections: Core Principles (7 principles), Development Standards, Governance
Removed sections: N/A
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section updated
  ✅ spec-template.md - No changes needed (already generic)
  ✅ tasks-template.md - No changes needed (already generic)
  ✅ agent-file-template.md - No changes needed (already generic)
Follow-up TODOs: None
-->

# blueberry-pancake Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

All code MUST meet high quality standards before being merged. Code quality is measured by clarity, correctness, and adherence to established patterns. Every function, class, and module must have a clear purpose and be immediately understandable to other developers. Code reviews MUST verify quality standards are met. Refactoring is not optional—code that degrades quality must be improved before merging.

**Rationale**: High code quality reduces bugs, improves maintainability, and accelerates development velocity by making code easier to understand and modify.

### II. DRY: Avoid Duplication, Promote Reuse (NON-NEGOTIABLE)

Code duplication MUST be eliminated. After the second occurrence of similar logic, it MUST be consolidated into a reusable function, component, or module. Shared functionality MUST be extracted into libraries, utilities, or shared components. Custom implementations MUST NOT be created when battle-tested packages exist that solve the same problem.

**Rationale**: Duplication increases maintenance burden, creates inconsistency, and multiplies bugs. Reuse reduces complexity and leverages proven solutions.

### III. Maintainability

Code MUST be structured for long-term maintainability. This includes: clear naming conventions, modular architecture, comprehensive documentation, and separation of concerns. Dead code (unused imports, functions, variables, commented code) MUST be deleted immediately. Comments MUST be maintained and updated when code changes. Code organization MUST follow established project patterns.

**Rationale**: Maintainable code reduces technical debt, enables faster feature development, and makes onboarding new developers easier.

### IV. Testing Standards (NON-NEGOTIABLE)

All features MUST include appropriate tests. Test coverage requirements: unit tests for business logic, integration tests for workflows, and contract tests for APIs. Tests MUST be written before or alongside implementation (TDD preferred). Tests MUST be independent, repeatable, and clearly named. Flaky tests MUST be fixed immediately. Test code MUST follow the same quality standards as production code.

**Rationale**: Comprehensive testing prevents regressions, enables confident refactoring, and serves as living documentation of system behavior.

### V. Security

Security considerations MUST be integrated into all development work. This includes: input validation, output encoding, secure authentication and authorization, protection against common vulnerabilities (OWASP Top 10), secure handling of sensitive data, and regular dependency updates. Security reviews MUST be conducted for features handling user data or authentication.

**Rationale**: Security vulnerabilities can compromise user data and system integrity. Proactive security practices prevent costly breaches and maintain user trust.

### VI. User Experience Consistency

User interfaces MUST maintain visual and behavioral consistency across the application. Styles MUST NOT be inlined in components—all styling MUST use centralized style systems (CSS modules, styled-components, Tailwind classes, or equivalent). Design patterns and UI components MUST be reused from established design systems. User interactions MUST follow consistent patterns and provide clear feedback.

**Rationale**: Consistent UX reduces user confusion, improves usability, and creates a professional appearance. Centralized styles enable theme management and reduce maintenance.

### VII. Performance Requirements

Performance MUST be considered from the start of development. Applications MUST meet defined performance targets: page load times, API response times, rendering performance, and resource usage. Performance regressions MUST be identified and addressed before merging. Performance-critical paths MUST be optimized and benchmarked. Lazy loading, caching, and efficient algorithms MUST be used where appropriate.

**Rationale**: Poor performance degrades user experience and can impact business metrics. Proactive performance management prevents costly rewrites.

## Development Standards

### Code Review Requirements

- All code MUST be reviewed before merging
- Reviews MUST verify constitution compliance
- Complexity MUST be justified if it violates simplicity principles
- Security-sensitive changes require security review

### Quality Gates

- Tests MUST pass before merging
- Linting and formatting checks MUST pass
- No dead code or unused dependencies
- Performance benchmarks MUST not regress

## Governance

This constitution supersedes all other development practices and guidelines. All pull requests and code reviews MUST verify compliance with these principles. Amendments to this constitution require:

1. Documentation of the proposed change and rationale
2. Approval from project maintainers
3. Migration plan if the change affects existing code
4. Version increment following semantic versioning

**Versioning Policy**: 
- **MAJOR**: Backward incompatible principle removals or redefinitions
- **MINOR**: New principles added or materially expanded guidance
- **PATCH**: Clarifications, wording improvements, typo fixes

**Compliance Review**: All features and pull requests must pass constitution checks before approval. Violations must be justified in the Complexity Tracking section of implementation plans.

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
