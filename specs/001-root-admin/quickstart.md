# Quickstart: Root Admin Dashboard

**Feature**: 001-root-admin  
**Date**: 2024-12-17

## Prerequisites

- Node.js 22+
- Backend and frontend running (see main README)
- At least one event created for testing

## Setup Steps

### 1. Configure Root Admin Email

Add your email to `config/default.json`:

```json
{
  "rootAdmins": ["your-email@example.com"]
}
```

> **Note**: You may need to restart the backend for config changes to take effect.

### 2. Start Development Servers

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### 3. Authenticate as Root

1. Navigate to `http://localhost:3000/auth`
2. Enter your root admin email
3. Use OTP `123456` (dev mode)
4. You're now authenticated

### 4. Access Admin Dashboard

Navigate to `http://localhost:3000/system`

You should see:
- List of all events in the system
- Filter/search controls
- Statistics panel
- Click any event to see details in drawer

## Development Workflow

### Backend Changes

```bash
# Run unit tests
cd backend && npm test

# Run integration tests
cd backend && npm test -- --grep "system"

# Watch mode
cd backend && npm run dev
```

### Frontend Changes

```bash
# Run unit tests
cd frontend && npm test

# Run E2E tests
cd frontend && npm run test:e2e

# Run specific E2E test
cd frontend && npx playwright test system.spec.js
```

### Testing Tips

**E2E Test Setup:**
- Tests should use fixtures from `fixtures.js`
- Create test events via `helpers.js`
- Use test OTP `123456` for root authentication

**Example E2E test:**
```javascript
import { test, expect } from './fixtures.js';
import { createTestEvent, deleteTestEvent } from './helpers.js';

test('root can view all events', async ({ page }) => {
  // Authenticate as root
  await page.goto('/auth');
  await page.fill('input[type="email"]', 'test-root@example.com');
  // ... OTP flow
  
  // Navigate to admin dashboard
  await page.goto('/system');
  
  // Verify event list is visible
  await expect(page.getByText(/events/i)).toBeVisible();
});
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/events` | List all events (paginated) |
| GET | `/api/system/events/:id` | Get event details |
| DELETE | `/api/system/events/:id` | Delete event |
| GET | `/api/system/stats` | Get system statistics |

All endpoints require:
- Valid JWT in Authorization header or cookie
- User email must be in `rootAdmins` config

## Troubleshooting

### "Root access required" error

1. Check your email is in `config/default.json` `rootAdmins` array
2. Restart backend after config changes
3. Re-authenticate (logout and login again)

### Events not loading

1. Check backend is running on port 3001
2. Check browser console for CORS errors
3. Verify JWT cookie is present

### Drawer not opening

1. Check browser console for React errors
2. Verify event click handler is attached
3. Check Radix UI Sheet component is imported

## Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `backend/src/api/system.js` | API routes |
| `backend/src/services/SystemService.js` | Business logic |
| `backend/src/middleware/requireRoot.js` | Authorization |
| `frontend/src/pages/SystemPage.jsx` | Dashboard page |
| `frontend/src/components/EventList.jsx` | Event list |
| `frontend/src/components/EventDrawer.jsx` | Details drawer |
| `frontend/src/components/SystemStats.jsx` | Statistics |
| `frontend/tests/e2e/specs/system.spec.js` | E2E tests |

### Modified Files

| Path | Change |
|------|--------|
| `config/default.json` | Add `rootAdmins` array |
| `backend/src/api/index.js` | Mount `/system` router |
| `backend/src/config/configLoader.js` | Add `isRootAdmin()` method |
| `frontend/src/App.jsx` | Add `/system` route |
