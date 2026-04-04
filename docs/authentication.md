# Authentication Flow Documentation

## Overview

This application uses **NextAuth with Credentials Provider** and **JWT-based sessions**.

The authentication flow is intentionally split into **two responsibilities**:

- **Service Layer (`loginUser`)**  
  Responsible for **security rules, rate limiting and credential validation**.
- **NextAuth (`authorize`)**  
  Responsible **only for session creation**.

This results in a **controlled duplication of credential checks**, which is documented and intentional.

---

## Login Flow

1. User submits login form (`identifier` + `password`)
2. Server Action `/login.ts` is executed
3. Input is validated using **Zod**
4. `loginUser()` service is called to validate credentials and security rules:
   - IP-based rate limiting
   - Brute-force protection (IP + identifier)
   - Identifier-based protection
   - User lookup (email or username)
   - Password comparison using bcrypt
5. If any rule fails, a **domain error is thrown** (e.g. `InvalidCredentialsError`, `TooManyLoginAttemptsError`)
6. Server Action catches the error and maps it to UI-friendly messages
7. If validation succeeds, `signIn('credentials')` is called
8. Credentials Provider `authorize()` runs:
   - Fetches user again from database
   - Re-validates password with bcrypt
   - Returns a minimal user object
9. NextAuth `jwt` callback:
   - Stores `id`, `role`, `plan`, `name`, `image` in the JWT
10. NextAuth `session` callback:
    - Exposes these fields via `auth()` / `useSession()`
11. User is redirected to `/`
12. On each authenticated request:
    - NextAuth validates the JWT stored in httpOnly cookies
    - Session expiration is renewed automatically (rolling session)

---

## Credential Validation Duplication

Credential validation happens **twice** during login:

- Once in the `loginUser()` service
- Once inside NextAuth Credentials Provider `authorize()`

This duplication is **intentional** and exists because:

- NextAuth does **not support propagating custom domain errors**
- Security rules must run **before** session creation
- UI error handling must stay outside NextAuth internals

This trade-off is acceptable for MVP and early production stages.

---

## Register Flow

1. User submits register form
2. Server Action `/register.ts` is executed
3. Input is validated using **Zod**
4. Rate limiting is applied (IP-based)
5. Uniqueness checks (email / username) are enforced
6. Password is hashed using bcrypt
7. User is persisted via Prisma
8. Optional auto-login via `signIn('credentials')`
9. JWT and session callbacks run (same as login)

---

## Security Notes

- Passwords are never stored in plaintext
- bcrypt is used for hashing and comparison
- JWT contains only minimal authorization data
- No sensitive data is exposed to the client

---

## Rate Limiting

### Login

- IP-based
- IP + identifier (brute force)
- Identifier-based

### Register

- IP-based ⚠️ NOT IMPLEMENTED

All limits are enforced **before session creation**.

---

## Session Strategy

- JWT stored in httpOnly cookies
- Rolling session expiration
- No refresh token mechanism

Sessions expire naturally after inactivity.

---

## Future Improvements

- Reduce duplicated validation with custom provider
- Centralize rate limit config
- Add auth observability/logging

---

## Notes

This architecture prioritizes:

- Security
- Explicit trade-offs
- Clear separation of concerns
- Simplicity for MVP and early-stage scaling
