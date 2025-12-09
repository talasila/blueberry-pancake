# Quickstart: Event PIN Access

**Feature**: Event PIN Access (006-event-pin-access)  
**Date**: 2025-01-27

## Overview

This guide provides a quick reference for implementing PIN-based event access control. It covers the essential steps, key components, and integration points.

## Prerequisites

- Event creation feature (004-create-event) must be implemented
- OTP authentication system (003-otp-auth) must be implemented
- Event feature (005-event-feature) must be implemented
- RateLimitService must be available
- CacheService must be available
- EventService must be available

## Implementation Checklist

### Backend

- [ ] Create `PINService.js` in `backend/src/services/`
- [ ] Extend `EventService.js` to generate PIN on event creation
- [ ] Extend `EventService.js` to add `regeneratePIN` method
- [ ] Create `requirePIN.js` middleware in `backend/src/middleware/`
- [ ] Extend `events.js` API route with PIN endpoints:
  - [ ] `POST /api/events/:eventId/verify-pin`
  - [ ] `POST /api/events/:eventId/regenerate-pin`
- [ ] Update `GET /api/events/:eventId` to accept PIN verification sessions
- [ ] Integrate RateLimitService for PIN attempt rate limiting
- [ ] Use CacheService for PIN verification session storage
- [ ] Add unit tests for `PINService`
- [ ] Add unit tests for PIN generation/regeneration in `EventService`
- [ ] Add integration tests for PIN endpoints

### Frontend

- [ ] Create `PINEntryPage.jsx` in `frontend/src/pages/` (similar to AuthPage)
- [ ] Create `PINContext.jsx` in `frontend/src/contexts/` for session management
- [ ] Create `usePINVerification.js` hook in `frontend/src/hooks/`
- [ ] Extend `EventPage.jsx` to check PIN verification before rendering
- [ ] Extend `EventAdminPage.jsx` to add PIN regeneration UI
- [ ] Extend `EventAdminPage.jsx` to enforce OTP requirement
- [ ] Update `apiClient.js` to add `verifyPIN` and `regeneratePIN` methods
- [ ] Add PIN session ID to API requests (header or cookie)
- [ ] Add route protection for PIN entry flow
- [ ] Add unit tests for PIN components
- [ ] Add integration tests for PIN entry flow
- [ ] Add E2E tests for complete PIN access flow

## Key Components

### Backend: PINService

```javascript
// backend/src/services/PINService.js
import crypto from 'crypto';
import cacheService from '../cache/CacheService.js';
import rateLimitService from '../services/RateLimitService.js';
import eventService from './EventService.js';

class PINService {
  generatePIN() {
    // Generate 6-digit random number (100000-999999)
    return crypto.randomInt(100000, 1000000).toString().padStart(6, '0');
  }
  
  async verifyPIN(eventId, pin, ipAddress) {
    // 1. Validate PIN format (6 digits)
    // 2. Check rate limits (per IP and per event)
    // 3. Get event and compare PIN
    // 4. If valid: create session, return sessionId
    // 5. If invalid: record attempt, return error
  }
  
  createPINSession(eventId) {
    // 1. Generate session ID (UUID)
    // 2. Store in cache: pin:verified:{eventId}:{sessionId}
    // 3. Return sessionId
  }
  
  checkPINSession(eventId, sessionId) {
    // Check if session exists in cache
    return cacheService.get(`pin:verified:${eventId}:${sessionId}`);
  }
  
  invalidatePINSessions(eventId) {
    // Delete all sessions for event from cache
  }
}

export default new PINService();
```

### Backend: requirePIN Middleware

```javascript
// backend/src/middleware/requirePIN.js
import pinService from '../services/PINService.js';

function requirePIN(req, res, next) {
  const { eventId } = req.params;
  const sessionId = req.headers['x-pin-session-id'] || req.cookies.pinSessionId;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'PIN verification required' });
  }
  
  const verified = pinService.checkPINSession(eventId, sessionId);
  if (!verified) {
    return res.status(401).json({ error: 'PIN verification expired or invalid' });
  }
  
  req.pinVerified = true;
  req.eventId = eventId;
  next();
}

export default requirePIN;
```

### Backend: Events API Route (PIN Endpoints)

```javascript
// backend/src/api/events.js (extend existing)
import { Router } from 'express';
import pinService from '../services/PINService.js';
import eventService from '../services/EventService.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePIN from '../middleware/requirePIN.js';

const router = Router();

// Verify PIN
router.post('/events/:eventId/verify-pin', async (req, res) => {
  const { eventId } = req.params;
  const { pin } = req.body;
  const ipAddress = req.ip;
  
  try {
    const result = await pinService.verifyPIN(eventId, pin, ipAddress);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Regenerate PIN (admin only)
router.post('/events/:eventId/regenerate-pin', requireAuth, async (req, res) => {
  const { eventId } = req.params;
  const administratorEmail = req.user.email; // From JWT
  
  try {
    const result = await eventService.regeneratePIN(eventId, administratorEmail);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Get event (PIN or OTP)
router.get('/events/:eventId', async (req, res) => {
  // Check PIN session first, then JWT token
  const sessionId = req.headers['x-pin-session-id'];
  const jwtToken = req.headers.authorization?.replace('Bearer ', '');
  
  // ... validation and event retrieval
});

export default router;
```

### Frontend: PINEntryPage Component

```jsx
// frontend/src/pages/PINEntryPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import apiClient from '@/services/apiClient';

function PINEntryPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyPIN = async () => {
    setError('');
    setLoading(true);
    
    try {
      const response = await apiClient.verifyPIN(eventId, pin);
      // Store sessionId
      localStorage.setItem(`pin:session:${eventId}`, response.sessionId);
      // Navigate to event page
      navigate(`/event/${eventId}`);
    } catch (err) {
      setError(err.message || 'Invalid PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enter Event PIN</CardTitle>
        <CardDescription>Enter the 6-digit PIN to access this event</CardDescription>
      </CardHeader>
      <CardContent>
        <InputOTP maxLength={6} value={pin} onChange={setPin} />
        {error && <div className="text-destructive">{error}</div>}
        <Button onClick={handleVerifyPIN} disabled={loading || pin.length !== 6}>
          Verify PIN
        </Button>
      </CardContent>
    </Card>
  );
}

export default PINEntryPage;
```

### Frontend: PIN Context

```jsx
// frontend/src/contexts/PINContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const PINContext = createContext();

export function PINProvider({ children }) {
  const { eventId } = useParams();
  const [pinVerified, setPinVerified] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    if (eventId) {
      const stored = localStorage.getItem(`pin:session:${eventId}`);
      if (stored) {
        setSessionId(stored);
        setPinVerified(true);
      }
    }
  }, [eventId]);

  return (
    <PINContext.Provider value={{ pinVerified, sessionId, setPinVerified }}>
      {children}
    </PINContext.Provider>
  );
}

export function usePIN() {
  return useContext(PINContext);
}
```

### Frontend: API Client Extension

```javascript
// frontend/src/services/apiClient.js (extend existing)
class ApiClient {
  // ... existing methods

  async verifyPIN(eventId, pin) {
    const response = await fetch(`${this.baseURL}/events/${eventId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return response.json();
  }

  async regeneratePIN(eventId) {
    const token = localStorage.getItem('jwtToken');
    const response = await fetch(`${this.baseURL}/events/${eventId}/regenerate-pin`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return response.json();
  }

  // Add PIN session ID to requests
  async request(url, options = {}) {
    const eventId = this.getEventIdFromUrl(url);
    if (eventId) {
      const sessionId = localStorage.getItem(`pin:session:${eventId}`);
      if (sessionId) {
        options.headers = {
          ...options.headers,
          'X-PIN-Session-Id': sessionId
        };
      }
    }
    return super.request(url, options);
  }
}
```

## Integration Points

### Event Creation (Extend Existing)

```javascript
// backend/src/services/EventService.js (extend)
import pinService from './PINService.js';

async createEvent(name, typeOfItem, administratorEmail) {
  // ... existing event creation logic
  const pin = pinService.generatePIN();
  const event = {
    // ... existing fields
    pin,
    pinGeneratedAt: new Date().toISOString()
  };
  // ... persist event
}
```

### Event Page Access (Extend Existing)

```jsx
// frontend/src/pages/EventPage.jsx (extend)
import { usePIN } from '@/contexts/PINContext';
import { useNavigate } from 'react-router-dom';

function EventPage() {
  const { pinVerified } = usePIN();
  const navigate = useNavigate();
  const { eventId } = useParams();

  useEffect(() => {
    // Check if PIN verified or OTP authenticated
    const jwtToken = localStorage.getItem('jwtToken');
    if (!pinVerified && !jwtToken) {
      navigate(`/event/${eventId}/pin`);
    }
  }, [pinVerified, eventId, navigate]);

  // ... rest of component
}
```

### Admin Page OTP Requirement (Extend Existing)

```jsx
// frontend/src/pages/EventAdminPage.jsx (extend)
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function EventAdminPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const jwtToken = localStorage.getItem('jwtToken');
    if (!jwtToken) {
      // Redirect to OTP auth, preserve destination
      navigate('/auth', { 
        state: { from: { pathname: `/event/${eventId}/admin` } } 
      });
    }
  }, [eventId, navigate]);

  // ... rest of component with PIN regeneration UI
}
```

## Testing Checklist

### Unit Tests

- [ ] PIN generation (6 digits, random)
- [ ] PIN format validation
- [ ] PIN verification logic
- [ ] Rate limiting logic
- [ ] Session creation/validation
- [ ] Session invalidation
- [ ] PIN regeneration authorization

### Integration Tests

- [ ] POST /api/events/:eventId/verify-pin (success)
- [ ] POST /api/events/:eventId/verify-pin (invalid PIN)
- [ ] POST /api/events/:eventId/verify-pin (rate limit)
- [ ] POST /api/events/:eventId/regenerate-pin (success)
- [ ] POST /api/events/:eventId/regenerate-pin (unauthorized)
- [ ] GET /api/events/:eventId (with PIN session)
- [ ] GET /api/events/:eventId (with JWT token)
- [ ] GET /api/events/:eventId (no auth)

### E2E Tests

- [ ] User enters PIN, accesses event
- [ ] User enters invalid PIN, sees error
- [ ] User hits rate limit, sees error
- [ ] Admin regenerates PIN, old PIN invalid
- [ ] Admin accesses via PIN, redirected to OTP for admin page
- [ ] PIN session persists across page navigation
- [ ] PIN session invalidated on regeneration

## Common Pitfalls

1. **PIN Storage**: Don't hash PINs - they're meant to be shared
2. **Session Management**: Use cache keys with eventId to scope sessions
3. **Rate Limiting**: Apply limits independently (IP AND event)
4. **Session Invalidation**: Clear all sessions when PIN regenerated
5. **UI Consistency**: PIN entry should match OTP entry UI pattern
6. **Admin Access**: Always require OTP for admin pages, even if accessed via PIN
7. **Test OTP**: Only works in dev/test environments, not production

## Next Steps

1. Implement backend PINService
2. Extend EventService for PIN generation
3. Create PIN middleware
4. Add API endpoints
5. Implement frontend PIN entry page
6. Add PIN context and hooks
7. Extend event pages for PIN integration
8. Add tests
9. Update documentation
