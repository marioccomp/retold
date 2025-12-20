# Authentication Flow Documentation

## Login Flow

1. User submits login form (identifier + password)
2. Server Action `/login.ts` is executed
3. Zod validates input
4. Rate limit is checked (IP + identifier) ⚠️ NOT IMPLEMENTED YET
5. `signIn('credentials')` is called
6. Credentials Provider `authorize()` runs
7. `loginUser()` service:
   - Fetches user from database
   - Compares password with bcrypt
   - Returns minimal user object (id, role, plan)
8. NextAuth `jwt` callback:
   - Stores id, role, plan in JWT
9. NextAuth `session` callback:
   - Exposes id, role, plan to `auth()` / `useSession`
10. User is redirected to `/`
11. On each request, NextAuth validates the JWT stored in cookies and renews the session expiration (rolling session)

## Register Flow

1. User submits register form
2. Server Action `/register.ts` is executed
3. Zod validates input
4. Rate limit is checked (IP) ⚠️ NOT IMPLEMENTED YET
5. Password is hashed with bcrypt
6. User is persisted in database via Prisma
7. Optional auto-login via `signIn('credentials')`
8. JWT + Session callbacks run (same as login)

## Security Notes

- Passwords are never stored in plaintext
- JWT contains only minimal authorization data

## Rate Limiting

- Login: 5 attempts / 10 minutes (IP + identifier) ⚠️ NOT IMPLEMENTED YET
- Register: 3 attempts / hour (IP)

### Session Strategy

The application uses a rolling session strategy based on JWT stored in httpOnly cookies.

While the user is active, the session expiration is automatically extended on each request. No refresh token mechanism is implemented.
