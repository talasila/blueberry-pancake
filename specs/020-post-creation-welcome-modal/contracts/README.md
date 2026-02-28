# API Contracts: Post-Creation Welcome Bottom Sheet

**Feature**: Post-Creation Welcome Bottom Sheet  
**Date**: 2026-02-27

## No New API Endpoints

This feature is entirely frontend. It introduces no new backend API endpoints, no new data models, and no modifications to existing API contracts.

The bottom sheet reads event data that is already fetched by `EventAdminPage` through existing endpoints:

| Data | Existing Endpoint | Used For |
|------|-------------------|----------|
| Event PIN | `GET /api/events/:eventId` | PIN display and copy |
| Item configuration | `GET /api/events/:eventId` | Active item count badge |
| Rating configuration | `GET /api/events/:eventId/rating-configuration` | Rating scale badge |
| Administrators | `GET /api/events/:eventId` | Admin count badge |

No changes to request/response shapes are required.
