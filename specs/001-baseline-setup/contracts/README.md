# API Contracts

**Date**: 2025-01-27  
**Feature**: Baseline Project Setup

## Overview

This directory will contain API contract definitions (OpenAPI/Swagger schemas) for the application's REST API endpoints.

## Current Status

**Baseline Setup**: No API contracts defined yet. This directory structure is established for future feature development.

## Structure

When API endpoints are defined in feature specifications, contracts will be added here following this structure:

```
contracts/
├── README.md           # This file
├── openapi.yaml       # Main OpenAPI specification (when APIs are defined)
└── schemas/           # Shared schema definitions
    └── common.yaml    # Common request/response schemas
```

## Contract Standards

When contracts are added, they will follow these standards:

- **Format**: OpenAPI 3.0 specification
- **Naming**: Endpoints follow RESTful conventions
- **Authentication**: JWT tokens in Authorization header
- **XSRF Protection**: XSRF tokens in custom header for state-changing requests
- **Error Responses**: Consistent error response format
- **Versioning**: API versioning strategy (to be determined)

## Notes

- Contracts will be generated during feature planning phases
- Each feature that adds API endpoints will update the OpenAPI specification
- Contracts serve as source of truth for frontend-backend integration
