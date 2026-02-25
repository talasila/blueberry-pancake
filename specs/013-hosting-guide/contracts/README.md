# API Contracts: Hosting Guide

**Feature**: 013-hosting-guide  
**Date**: 2026-02-25

## Overview

This feature has no API contracts. The hosting guide is entirely client-side with static content bundled in the frontend. No backend endpoints, API calls, or server interactions are required.

The only external dependency is the existing `apiClient.isAuthenticated()` method, used to determine which CTA to display on the final step (this is a read-only check of locally stored JWT state, not a network call).
