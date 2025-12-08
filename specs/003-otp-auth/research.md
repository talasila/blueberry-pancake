# Research: OTP Authentication

**Feature**: OTP Authentication  
**Date**: 2025-01-27  
**Purpose**: Research technical decisions for implementing email-based OTP authentication

## 1. Resend Email Service Integration

### Decision: Use Resend SDK for email delivery

**Rationale**:
- Resend is a modern email API service with excellent deliverability
- Official Node.js SDK provides simple integration
- Supports transactional emails with good documentation
- API key can be stored in config with environment variable override (aligns with FR-012)
- From email address can be configured per spec (FR-013)

**Implementation Pattern**:
```javascript
import { Resend } from 'resend';

const resend = new Resend(apiKey);
await resend.emails.send({
  from: 'sreeni@7155421.xys',
  to: email,
  subject: 'Your OTP Code',
  html: `<p>Your OTP code is: <strong>${otp}</strong></p>`
});
```

**Alternatives Considered**:
- **Nodemailer with SMTP**: More complex setup, requires SMTP server configuration
- **SendGrid**: Similar features but Resend chosen for simplicity and modern API
- **AWS SES**: Overkill for current needs, more complex setup

**Error Handling**:
- Resend SDK throws errors for delivery failures
- Wrap in try-catch and return user-friendly error messages (FR-018)
- Log errors for debugging but don't expose internal details to users

## 2. OTP Generation and Storage

### Decision: Generate 6-digit random OTP, store in node-cache with expiration

**Rationale**:
- 6-digit OTP is user-friendly and secure enough for email-based auth
- node-cache already in use, provides TTL support for 10-minute expiration (FR-006)
- In-memory storage is fast and sufficient for single-instance deployment
- Can migrate to Redis later if scaling horizontally

**Implementation Pattern**:
```javascript
// Generate cryptographically secure 6-digit OTP
const otp = crypto.randomInt(100000, 999999).toString().padStart(6, '0');

// Store in cache with 10-minute TTL
cacheService.set(`otp:${email}`, {
  code: otp,
  email: email,
  createdAt: Date.now(),
  expiresAt: Date.now() + 10 * 60 * 1000
}, 10 * 60); // 10 minutes in seconds
```

**OTP Invalidation**:
- When new OTP requested, delete existing OTP for that email (FR-014)
- Cache key: `otp:${email}` ensures only one OTP per email
- Setting new OTP automatically replaces old one in cache

**Test OTP Handling**:
- Check environment variable (NODE_ENV) before OTP validation
- If dev/test and OTP is "123456", bypass all validation (FR-019)
- No email sent, no cache storage, no rate limiting, no suspension checks

**Alternatives Considered**:
- **Database storage**: Overkill for current scale, adds latency
- **File-based storage**: Slower than in-memory, unnecessary complexity
- **External OTP service**: Adds dependency, cost, complexity

## 3. Rate Limiting Implementation

### Decision: Use node-cache with sliding window pattern for rate limiting

**Rationale**:
- node-cache already in use, no new dependencies
- Sliding window pattern tracks requests per time window
- Separate tracking for email addresses and IP addresses (FR-011)
- Fast in-memory lookups (<50ms performance target)

**Implementation Pattern**:
```javascript
// Rate limit key: `ratelimit:email:${email}` or `ratelimit:ip:${ip}`
// Value: { count: number, windowStart: timestamp }
// TTL: 15 minutes (window duration)

function checkRateLimit(identifier, type) {
  const key = `ratelimit:${type}:${identifier}`;
  const limit = type === 'email' ? 3 : 5; // 3 per email, 5 per IP
  const window = 15 * 60 * 1000; // 15 minutes
  
  const record = cacheService.get(key);
  const now = Date.now();
  
  if (!record || (now - record.windowStart) > window) {
    // New window
    cacheService.set(key, { count: 1, windowStart: now }, 15 * 60);
    return { allowed: true };
  }
  
  if (record.count >= limit) {
    return { allowed: false, retryAfter: window - (now - record.windowStart) };
  }
  
  record.count++;
  cacheService.set(key, record, 15 * 60);
  return { allowed: true };
}
```

**Rate Limit Scope**:
- Apply limits independently: check both email AND IP limits
- Request blocked if EITHER limit exceeded
- Separate cache keys prevent conflicts

**Alternatives Considered**:
- **express-rate-limit**: Good package but adds dependency, node-cache sufficient
- **Redis-based**: Overkill for single instance, can migrate later
- **Fixed window**: Sliding window provides better user experience

## 4. Suspension Tracking

### Decision: Store suspension state in node-cache with file-based persistence option

**Rationale**:
- Suspension is temporary (5 minutes), in-memory cache is appropriate
- Can add file-based persistence later if needed for multi-instance
- Fast lookups for suspension checks
- Automatic expiration via TTL matches suspension duration

**Implementation Pattern**:
```javascript
// Suspension key: `suspension:${email}`
// Value: { email, startTime, endTime, reason }
// TTL: 5 minutes (suspension duration)

function suspendEmail(email) {
  const now = Date.now();
  const endTime = now + 5 * 60 * 1000; // 5 minutes
  
  cacheService.set(`suspension:${email}`, {
    email,
    startTime: now,
    endTime,
    reason: 'failed_attempts_exceeded'
  }, 5 * 60); // 5 minutes in seconds
  
  // Also reset failed attempt counter
  cacheService.del(`failed_attempts:${email}`);
}

function isSuspended(email) {
  const suspension = cacheService.get(`suspension:${email}`);
  return suspension !== undefined;
}
```

**Failed Attempt Tracking**:
- Track attempts per email: `failed_attempts:${email}`
- Increment on failed OTP verification
- Reset on successful verification or suspension
- Max 5 attempts before suspension (FR-007, FR-008)

**Alternatives Considered**:
- **Database storage**: Unnecessary for temporary state
- **File-based only**: Slower than in-memory, cache provides better performance

## 5. Test OTP Implementation

### Decision: Environment-based test OTP bypass with comprehensive restriction bypass

**Rationale**:
- Test OTP "123456" streamlines development and testing
- Environment check (NODE_ENV !== 'production') ensures security
- Bypassing all restrictions (rate limits, suspension, expiration) maximizes development speed
- Clear separation: test OTP logic isolated from production OTP flow

**Implementation Pattern**:
```javascript
function verifyOTP(email, otp) {
  // Test OTP check (dev/test only)
  if (process.env.NODE_ENV !== 'production' && otp === '123456') {
    // Bypass all checks: rate limiting, suspension, expiration, failed attempts
    return { valid: true, bypass: true };
  }
  
  // Normal OTP validation flow
  // ... check suspension, rate limits, expiration, etc.
}
```

**Security Considerations**:
- Test OTP only works in development/test environments
- Production environment check is non-negotiable
- Log test OTP usage for audit purposes in dev/test

**Alternatives Considered**:
- **Test OTP with restrictions**: Defeats purpose of test bypass
- **Separate test endpoint**: Adds complexity, test OTP in same flow is simpler

## 6. Frontend Authentication Flow

### Decision: React Router protected routes with authentication state management

**Rationale**:
- React Router 7.10.1 already in use, supports route protection patterns
- JWT token stored in localStorage (existing pattern from apiClient.js)
- ProtectedRoute component wraps routes requiring authentication
- Redirect to landing page on unauthenticated access (FR-001)

**Implementation Pattern**:
```javascript
// ProtectedRoute component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('jwtToken');
  const location = useLocation();
  
  if (!token) {
    // Store intended destination for post-auth redirect
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return children;
}

// App.jsx routing
<Route path="/" element={<LandingPage />} />
<Route path="/auth" element={<AuthPage />} />
<Route path="/protected/*" element={
  <ProtectedRoute>
    <ProtectedPages />
  </ProtectedRoute>
} />
```

**Post-Authentication Redirect**:
- Store intended destination in route state or query param
- After successful OTP verification, redirect to stored destination or landing page (FR-009)
- Landing page accessible without authentication

**Alternatives Considered**:
- **Context-based auth**: More complex, localStorage simpler for JWT
- **Cookie-based auth**: JWT in localStorage already established pattern

## 7. Error Handling and User Feedback

### Decision: Consistent error messages with user-friendly language

**Rationale**:
- Clear error messages improve user experience
- Security: Don't reveal system internals (email existence, etc.)
- Consistent error format across all endpoints
- Error codes for frontend handling

**Error Response Format**:
```javascript
{
  error: "User-friendly error message",
  code: "RATE_LIMIT_EXCEEDED", // Optional: for frontend handling
  retryAfter: 300 // Optional: seconds until retry allowed
}
```

**Error Scenarios**:
- Invalid email format: "Please enter a valid email address"
- Rate limit exceeded: "Too many requests. Please try again in X minutes"
- Suspended email: "Account temporarily suspended. Please try again in X minutes"
- Invalid OTP: "Invalid OTP code. X attempts remaining"
- Expired OTP: "OTP code has expired. Please request a new one"
- Email delivery failure: "Unable to send email. Please try again later"

**Alternatives Considered**:
- **Generic error messages**: Less helpful for users
- **Detailed technical errors**: Security risk, exposes internals

## 8. Configuration Management

### Decision: Store Resend API key in config with environment variable override

**Rationale**:
- Follows existing pattern (configLoader.js)
- Environment variable takes precedence (FR-012)
- Supports different keys per environment
- Secure: API key never in code

**Configuration Structure**:
```json
{
  "email": {
    "resendApiKey": "re_6RipC75d_PhQmhfHdnnhT542ZaRHjwhqu",
    "fromAddress": "sreeni@7155421.xys"
  }
}
```

**Environment Variable**:
- `RESEND_API_KEY` overrides config file value
- Checked in configLoader or EmailService initialization

**Alternatives Considered**:
- **Hardcoded API key**: Security risk, violates best practices
- **Environment variable only**: Less flexible, config file provides defaults
