# Rate Limiter IPv6 Fix

## Issue
The backend was throwing validation errors when starting:
```
ValidationError: Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper function for IPv6 addresses.
```

## Root Cause
In `rateLimiter.js`, two rate limiters (`otpLimiter` and `passwordResetLimiter`) were using custom `keyGenerator` functions that fell back to `req.ip` directly, which doesn't properly handle IPv6 addresses.

## Solution
Updated the rate limiters to use the `ipKeyGenerator` helper function from `express-rate-limit` package, which properly handles both IPv4 and IPv6 addresses.

## Changes Made

### File: `backend/src/middleware/rateLimiter.js`

1. **Added import:**
```javascript
const { ipKeyGenerator } = require('express-rate-limit');
```

2. **Fixed OTP Limiter (line 56-58):**
```javascript
// Before:
keyGenerator: (req) => {
    return req.body.phone || req.ip;
}

// After:
keyGenerator: (req) => {
    // Use phone number as key, fallback to IP using proper IPv6 handler
    return req.body.phone || ipKeyGenerator(req);
}
```

3. **Fixed Password Reset Limiter (line 82-84):**
```javascript
// Before:
keyGenerator: (req) => {
    return req.body.phone || req.ip;
}

// After:
keyGenerator: (req) => {
    // Use phone number as key, fallback to IP using proper IPv6 handler
    return req.body.phone || ipKeyGenerator(req);
}
```

## Verification
- ✅ Import tested successfully
- ✅ `ipKeyGenerator` is a function (verified)
- ✅ Backend should now start without validation errors

## Testing
Restart the backend server:
```bash
cd backend
npm run dev
```

The validation errors should no longer appear.

## References
- Error Code: `ERR_ERL_KEY_GEN_IPV6`
- Documentation: https://express-rate-limit.github.io/ERR_ERL_KEY_GEN_IPV6/
- Package: express-rate-limit@8.2.1


