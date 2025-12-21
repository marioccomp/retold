# Current Architecture

- Technology Stack
- Redis Provider: Upstash (Serverless Redis)
- Rate Limit Library: @upstash/ratelimit
- Strategy: Sliding Window
- Storage: Redis (REST-based, globally accessible)

# Login Rate Limiting Flow

1. User submits login credentials
2. Authentication flow is triggered
3. Rate limit is checked using a Redis-backed limiter
4. If the limit is exceeded:
   The request is rejected
   A generic error message is returned
5. If allowed:
   Authentication proceeds normally

# Rate Limit Key Strategy (Current)

- Rate limiting is currently keyed by user identifier (username or email)
- All attempts using the same identifier share the same rate limit window
- This approach provides a basic protection layer while keeping the implementation simple.

# Known Limitations

- Current implementation does not isolate users by IP
- Multiple clients using the same identifier may affect each other
- No local fallback is implemented if Redis is unavailable
- These limitations are acknowledged and planned to be addressed.

# Planned Improvements

- Use a composite key combining:
  - Client IP address
  - User identifier
- Introduce independent IP-based rate limiting
- Add rate limiting to:
  - Registration
  - Password reset
