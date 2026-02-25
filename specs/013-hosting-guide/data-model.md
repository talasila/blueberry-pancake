# Data Model: Hosting Guide

**Feature**: 013-hosting-guide  
**Date**: 2026-02-25

## Overview

This feature has no persistent data model. All guide content is static, client-side, and bundled with the application. There are no database entities, no server-side storage, and no data lifecycle concerns.

## Client-Side Data Structure

The guide content is represented as a static JavaScript data structure:

### GuideStep

| Field       | Type     | Description                                                    |
|-------------|----------|----------------------------------------------------------------|
| id          | string   | Unique step identifier (e.g., `host-1`, `guest-3`)            |
| heading     | string   | Short step title (2-5 words)                                   |
| description | string   | Brief explanation (1-3 sentences, max ~60 words)               |
| icon        | string   | Lucide icon name for the visual element (e.g., `Wine`, `Users`)|

### GuideContent

| Field  | Type          | Description                     |
|--------|---------------|---------------------------------|
| host   | GuideStep[]   | Array of 8 host path steps      |
| guest  | GuideStep[]   | Array of 4 guest path steps     |

### Component State (ephemeral, not persisted)

| State          | Type              | Description                                             |
|----------------|-------------------|---------------------------------------------------------|
| isOpen         | boolean           | Whether the guide drawer is open                        |
| selectedRole   | `null \| 'host' \| 'guest'` | Currently selected role path, null = role selection screen |
| currentStep    | number            | Zero-based index of the current step within the role path |

State resets to initial values (`isOpen: false`, `selectedRole: null`, `currentStep: 0`) when the guide is closed.
