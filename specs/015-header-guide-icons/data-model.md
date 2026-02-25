# Data Model: Header Guide Icons

**Feature**: `015-header-guide-icons`  
**Date**: 2026-02-25

## Overview

This feature is a **frontend-only layout change**. No data model changes are required.

- No new entities, fields, or relationships
- No database migrations
- No state transitions beyond existing UI state (`boolean` open/close for drawers)
- No persistent storage (guide open/close state is ephemeral React component state)

The guide content data structures (`guideContent.js`, `adminGuideContent.js`) are unchanged.
