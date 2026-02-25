# API Contracts: Redirect to Admin Page After Event Creation

**Feature**: 011-create-event-redirect  
**Date**: 2026-02-24

## Overview

No API changes. The existing `POST /api/events` endpoint and its response format are unchanged. The only change is on the frontend: how the response is handled after a successful creation (redirect instead of modal).

### Existing Endpoint (unchanged)

**POST /api/events**

- **Request**: `{ name: string, typeOfItem: string }`
- **Response 201**: `{ eventId: string, name: string, typeOfItem: string, state: "created", pin: string, ... }`
- **Auth**: JWT required (sets updated JWT cookie with new event in response)

No new endpoints are needed for this feature.
