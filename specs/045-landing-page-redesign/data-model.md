# Data Model: Landing Page Redesign

**Date**: 2026-03-24 | **Branch**: `045-landing-page-redesign`

## Overview

This feature introduces no data model changes. It is a purely visual/UI redesign of the landing page with no backend, API, or database modifications.

## Component Data

The following static data structures are defined inline within the `LandingPage` component (no external data file needed):

### Steps Array

A constant array defining the three-step visual strip. Defined outside the component to avoid re-creation on each render.

| Field | Type | Description |
|-------|------|-------------|
| `icon` | React component | lucide-react icon (EyeOff, Star, Trophy) |
| `label` | string | Display label ("Cover", "Taste", "Reveal") |
| `lightBg` | string | oklch background color for light mode |
| `darkBg` | string | oklch background color for dark mode |

### Color Constants

Static oklch values for gradient and CTA accent, sourced from existing theme presets:

| Constant | Light Value | Dark Value | Source Preset |
|----------|-------------|------------|---------------|
| Gradient color | `oklch(0.95 0.03 350)` | `oklch(0.20 0.04 350)` | rosé family |
| Cover circle | `oklch(0.45 0.15 15)` | `oklch(0.65 0.15 15)` | cellar |
| Taste circle | `oklch(0.65 0.17 75)` | `oklch(0.75 0.15 75)` | golden |
| Reveal circle | `oklch(0.65 0.15 350)` | `oklch(0.72 0.14 350)` | rosé |
| CTA accent | `oklch(0.45 0.15 15)` | `oklch(0.65 0.15 15)` | cellar |

## State

| State Variable | Type | Purpose |
|---------------|------|---------|
| `eventId` | string | Controlled input for event code entry |
| `showCodeInput` | boolean | Toggle visibility of event code input |
| `successMessage` | string | Success message from navigation state |
