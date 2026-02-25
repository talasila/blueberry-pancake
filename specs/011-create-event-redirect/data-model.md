# Data Model: Redirect to Admin Page After Event Creation

**Feature**: 011-create-event-redirect  
**Date**: 2026-02-24

## Overview

No data model changes. This feature modifies only frontend navigation behavior. The existing event entity and API response are unchanged.

## Navigation State (transient, client-side only)

The redirect passes a transient state object via `react-router-dom`'s navigation:

| Field | Type | Purpose |
|-------|------|---------|
| `eventCreated` | boolean | Signals the admin page to display the success toast |

This state exists only in the browser's history entry and is not persisted. It is consumed once on page load and cleared by replacing the history state.
